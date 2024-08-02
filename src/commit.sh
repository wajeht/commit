#!/bin/bash

GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
NC="\033[0m"

NO_VERIFY=false
DRY_RUN=false
VERBOSE=false
AI_PROVIDER="openai"  # Default to OpenAI
API_KEY=""

unstaged_diff_output=""
combined_diff_output=""
files=""
sanitized_diff_output=""
response=""
http_status=""
message=""

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${YELLOW}[VERBOSE] $1${NC}"
    fi
}

log_verbose_json() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${YELLOW}[VERBOSE JSON] $1${NC}"
        echo "$2" | jq '.'
    fi
}

show_help() {
    log_verbose "Displaying help message"
    printf "${GREEN}Usage: commit.sh [options]${NC}\n"
    printf "\n"
    printf "${YELLOW}Options:${NC}\n"
    printf "  ${GREEN}-dr, --dry-run${NC}        Run the script without making any changes\n"
    printf "  ${GREEN}-nv, --no-verify${NC}      Skip message selection\n"
    printf "  ${GREEN}-ai, --ai-provider${NC}    Specify AI provider (openai or claude, default: openai)\n"
    printf "  ${GREEN}-k, --api-key${NC}         Specify the API key for the AI provider\n"
    printf "  ${GREEN}-v, --verbose${NC}         Enable verbose logging\n"
    printf "  ${GREEN}-h, --help${NC}            Display this help message\n"
    printf "\n"
    printf "${YELLOW}Example Usage:${NC}\n"
    printf "  ${GREEN}Basic usage:${NC}\n"
    printf "    curl -s http://localhost | sh\n"
    printf "  ${GREEN}Skip message selection:${NC}\n"
    printf "    curl -s http://localhost | sh -s -- --no-verify\n"
    printf "  ${GREEN}Dry run:${NC}\n"
    printf "    curl -s http://localhost | sh -s -- --dry-run\n"
    printf "  ${GREEN}Use Claude AI with API key:${NC}\n"
    printf "    curl -s http://localhost | sh -s -- --ai-provider claude --api-key YOUR_API_KEY\n"
    printf "  ${GREEN}Enable verbose logging:${NC}\n"
    printf "    curl -s http://localhost | sh -s -- --verbose\n"
    printf "\n"
    log_verbose "Help message displayed"
    exit 0
}

parse_arguments() {
    log_verbose "Parsing command line arguments"
    while [[ $# -gt 0 ]]; do
        log_verbose "Processing argument: $1"
        case $1 in
            -nv|--no-verify)
                NO_VERIFY=true
                log_verbose "No-verify option set to true"
                shift
                ;;
            -dr|--dry-run)
                DRY_RUN=true
                log_verbose "Dry-run option set to true"
                shift
                ;;
            -ai|--ai-provider)
                AI_PROVIDER=$2
                log_verbose "AI provider set to: $AI_PROVIDER"
                if [[ "$AI_PROVIDER" != "openai" && "$AI_PROVIDER" != "claudeai" ]]; then
                    log_verbose "Invalid AI provider specified"
                    echo -e "${RED}Invalid AI provider. Please use 'openai' or 'claudeai'.${NC}\n"
                    exit 1
                fi
                shift 2
                ;;
            -k|--api-key)
                API_KEY=$2
                log_verbose "API key provided (value hidden for security)"
                shift 2
                ;;
            -v|--verbose)
                VERBOSE=true
                log_verbose "Verbose mode enabled"
                shift
                ;;
            -h|--help)
                log_verbose "Help option selected"
                show_help
                ;;
            *)
                log_verbose "Invalid option detected: $1"
                echo -e "${RED}Invalid option: $1${NC}\n"
                show_help
                ;;
        esac
    done
    log_verbose "Arguments parsed: NO_VERIFY=$NO_VERIFY, DRY_RUN=$DRY_RUN, AI_PROVIDER=$AI_PROVIDER, VERBOSE=$VERBOSE"
}

get_diff_output() {
    log_verbose "Starting to get diff output"
    if [ "$DRY_RUN" = true ]; then
        log_verbose "Dry run mode: Getting unstaged changes"
        unstaged_diff_output=$(git --no-pager diff)
        log_verbose_json "Unstaged diff output:" "$(git --no-pager diff)"
        if [ -z "$unstaged_diff_output" ]; then
            log_verbose "No unstaged changes found, getting staged changes"
            combined_diff_output=$(git --no-pager diff --cached)
            log_verbose_json "Staged diff output:" "$(git --no-pager diff --cached)"
            files=$(git diff --cached --name-only)
            log_verbose "Files with staged changes: $files"
        else
            log_verbose "Unstaged changes found"
            combined_diff_output="$unstaged_diff_output"
            files=$(git diff --name-only)
            log_verbose "Files with unstaged changes: $files"
        fi
    else
        log_verbose "Normal mode: Getting staged changes"
        combined_diff_output=$(git --no-pager diff --cached)
        log_verbose_json "Staged diff output:" "$(git --no-pager diff --cached)"
        files=$(git diff --cached --name-only)
        log_verbose "Files with staged changes: $files"
    fi

    if [ -z "$combined_diff_output" ]; then
        log_verbose "No changes found for commit"
        printf "${RED}No changes found for commit.${NC}\n"
        exit 1
    fi
    log_verbose "Diff output retrieved successfully"
}

get_commit_message() {
    log_verbose "Starting to get commit message"
    get_diff_output

    log_verbose "Sanitizing diff output"
    sanitized_diff_output=$(echo "$combined_diff_output" | jq -Rs '. | @text')
    log_verbose "Diff output sanitized"
    log_verbose_json "Sanitized diff output:" "$sanitized_diff_output"

    log_verbose "Preparing request body for AI service"
    local request_body=$(jq -n \
        --arg diff "$sanitized_diff_output" \
        --arg provider "$AI_PROVIDER" \
        --arg apiKey "$API_KEY" \
        '{diff: $diff, provider: $provider, apiKey: $apiKey}')
    log_verbose "Request body prepared"
    log_verbose_json "Request body:" "$request_body"

    log_verbose "Sending request to AI service"
    response=$(echo "$request_body" | curl -s -w "\n%{http_code}" -X POST "http://localhost" -H "Content-Type: application/json" -d @-)

    http_status=$(echo "$response" | tail -n1)
    log_verbose "Received HTTP status: $http_status"

    message=$(echo "$response" | sed '$d' | tr '\n' ' ' | jq -r '.message')
    log_verbose "Commit message received from AI service"
    log_verbose_json "AI service response:" "$message"

    if [ "$http_status" -ne 200 ]; then
        log_verbose "Error: Non-200 status code received"
        printf "${RED}$message${NC}\n"
        exit 1
    fi
}

commit_with_message() {
    local commit_message=$1
    log_verbose "Attempting to commit with message: $commit_message"
    if [ -z "$commit_message" ]; then
        log_verbose "Error: Empty commit message"
        printf "${RED}Aborting due to empty commit message.${NC}\n"
        exit 1
    else
        if [ "$DRY_RUN" = true ]; then
            log_verbose "Dry run mode: Displaying changes and commit message"
            if [ -n "$unstaged_diff_output" ]; then
                printf "${YELLOW}Unstaged changes:${NC}\n"
                printf "$files\n"
            else
                printf "${YELLOW}Staged changes:${NC}\n"
                printf "$files\n"
            fi
            printf "${YELLOW}The commit message would have been:${NC}\n"
            printf "$commit_message\n"
            log_verbose "Dry run completed"
            exit 0
        else
            log_verbose "Committing changes"
            git commit -m "$commit_message" --no-verify
            log_verbose "Commit successful"
            exit 0
        fi
    fi
}

prompt_for_custom_message() {
    log_verbose "Prompting user for custom commit message"
    read -p "Enter custom commit message: " custom_message < /dev/tty
    log_verbose "User entered custom message: $custom_message"
    if [ -z "$custom_message" ]; then
        log_verbose "Error: Empty custom commit message"
        printf "${RED}Aborting due to empty custom commit message.${NC}\n"
        exit 1
    else
        log_verbose "Custom message received, proceeding to commit"
        commit_with_message "$custom_message"
    fi
}

confirm_commit_message() {
    log_verbose "Prompting user to confirm commit message"
    read -p "Do you want to use this commit message? (y)es, (n)o, or (r)egenerate: " confirm < /dev/tty
    log_verbose "User response: $confirm"
    case "$confirm" in
        [yY] | "" )
            log_verbose "User confirmed commit message"
            commit_with_message "$message"
            ;;
        [nN] )
            log_verbose "User chose to enter custom message"
            prompt_for_custom_message
            ;;
        [rR] )
            log_verbose "User chose to regenerate commit message"
            return 1
            ;;
        * )
            log_verbose "Invalid option entered by user"
            printf "${RED}Invalid option. Please enter y(es), n(o), or r(egenerate).${NC}\n"
            ;;
    esac
}

main() {
    log_verbose "Script started"
    parse_arguments "$@"

    while true; do
        log_verbose "Starting new iteration of main loop"
        get_commit_message

        if [ -z "$message" ]; then
            log_verbose "Error: Empty message received from AI service"
            printf "${RED}Failed to get commit message from server or empty message.${NC}\n"
            exit 1
        fi

        if [ "$DRY_RUN" = false ]; then
            log_verbose "Displaying generated commit message to user"
            printf "${YELLOW}$message${NC}\n"
        fi

        if [ "$DRY_RUN" = true ] || [ "$NO_VERIFY" = true ]; then
            log_verbose "Dry run or no-verify mode: proceeding with commit"
            commit_with_message "$message"
            continue
        fi

        log_verbose "Prompting user for confirmation"
        if ! confirm_commit_message; then
            log_verbose "User chose to regenerate message, continuing loop"
            continue
        fi
    done
}

log_verbose "Script loaded, calling main function"
main "$@"
