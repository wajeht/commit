#!/bin/bash

GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
NC="\033[0m"

NO_VERIFY=false
DRY_RUN=false
AI_PROVIDER="openai"  # Default to OpenAI

unstaged_diff_output=""
combined_diff_output=""
files=""
sanitized_diff_output=""
response=""
http_status=""
message=""

show_help() {
    printf "${GREEN}Usage: commit.sh [options]${NC}\n"
    printf "\n"
    printf "${YELLOW}Options:${NC}\n"
    printf "  ${GREEN}-dr, --dry-run${NC}        Run the script without making any changes\n"
    printf "  ${GREEN}-nv, --no-verify${NC}      Skip message selection\n"
    printf "  ${GREEN}-ai, --ai-provider${NC}    Specify AI provider (openai or claude, default: openai)\n"
    printf "  ${GREEN}-h, --help${NC}            Display this help message\n"
    printf "\n"
    printf "${YELLOW}Example Usage:${NC}\n"
    printf "  ${GREEN}Basic usage:${NC}\n"
    printf "    curl -s http://localhost/ | sh\n"
    printf "  ${GREEN}Skip message selection:${NC}\n"
    printf "    curl -s http://localhost/ | sh -s -- --no-verify\n"
    printf "  ${GREEN}Dry run:${NC}\n"
    printf "    curl -s http://localhost/ | sh -s -- --dry-run\n"
    printf "  ${GREEN}Use Claude AI:${NC}\n"
    printf "    curl -s http://localhost/ | sh -s -- --ai-provider claude\n"
    printf "\n"
    exit 0
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -nv|--no-verify)
                NO_VERIFY=true
                shift
                ;;
            -dr|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -ai|--ai-provider)
                AI_PROVIDER=$2
                if [[ "$AI_PROVIDER" != "openai" && "$AI_PROVIDER" != "claudeai" ]]; then
                    echo -e "${RED}Invalid AI provider. Please use 'openai' or 'claudeai'.${NC}\n"
                    exit 1
                fi
                shift 2
                ;;
            -h|--help)
                show_help
                ;;
            *)
                echo -e "${RED}Invalid option: $1${NC}\n"
                show_help
                ;;
        esac
    done
}

get_diff_output() {
    if [ "$DRY_RUN" = true ]; then
        unstaged_diff_output=$(git --no-pager diff)
        if [ -z "$unstaged_diff_output" ]; then
            combined_diff_output=$(git --no-pager diff --cached)
            files=$(git diff --cached --name-only)
        else
            combined_diff_output="$unstaged_diff_output"
            files=$(git diff --name-only)
        fi
    else
        combined_diff_output=$(git --no-pager diff --cached)
    fi

    if [ -z "$combined_diff_output" ]; then
        printf "${RED}No changes found for commit.${NC}\n"
        exit 1
    fi
}

get_commit_message() {
    get_diff_output

    sanitized_diff_output=$(echo "$combined_diff_output" | jq -Rs '. | @text')

    response=$(echo "$sanitized_diff_output" | jq -Rs '{"diff": ., "provider": "'"$AI_PROVIDER"'"}' | curl -s -w "\n%{http_code}" -X POST "http://localhost" -H "Content-Type: application/json" -d @-)

    http_status=$(echo "$response" | tail -n1)

    message=$(echo "$response" | sed '$d' | tr '\n' ' ' | jq -r '.message')

    if [ "$http_status" -ne 200 ]; then
        printf "${RED}$message${NC}\n"
        exit 1
    fi
}

commit_with_message() {
    local commit_message=$1
    if [ -z "$commit_message" ]; then
        printf "${RED}Aborting due to empty commit message.${NC}\n"
        exit 1
    else
        if [ "$DRY_RUN" = true ]; then
            if [ -n "$unstaged_diff_output" ]; then
                printf "${YELLOW}Unstaged changes:${NC}\n"
                printf "$files\n"
            else
                printf "${YELLOW}Staged changes:${NC}\n"
                printf "$files\n"
            fi
            printf "${YELLOW}The commit message would have been:${NC}\n"
            printf "$commit_message\n"
            exit 0
        else
            git commit -m "$commit_message" --no-verify
            exit 0
        fi
    fi
}

prompt_for_custom_message() {
    read -p "Enter custom commit message: " custom_message < /dev/tty
    if [ -z "$custom_message" ]; then
        printf "${RED}Aborting due to empty custom commit message.${NC}\n"
        exit 1
    else
        commit_with_message "$custom_message"
    fi
}

confirm_commit_message() {
    read -p "Do you want to use this commit message? (y)es, (n)o, or (r)egenerate: " confirm < /dev/tty
    case "$confirm" in
        [yY] | "" )
            commit_with_message "$message"
            ;;
        [nN] )
            prompt_for_custom_message
            ;;
        [rR] )
            return 1
            ;;
        * )
            printf "${RED}Invalid option. Please enter y(es), n(o), or r(egenerate).${NC}\n"
            ;;
    esac
}

main() {
    parse_arguments "$@"

    while true; do
        get_commit_message

        if [ -z "$message" ]; then
            printf "${RED}Failed to get commit message from server or empty message.${NC}\n"
            exit 1
        fi

        if [ "$DRY_RUN" = false ]; then
            printf "${YELLOW}$message${NC}\n"
        fi

        if [ "$DRY_RUN" = true ] || [ "$NO_VERIFY" = true ]; then
            commit_with_message "$message"
            continue
        fi

        if ! confirm_commit_message; then
            continue
        fi
    done
}

main "$@"
