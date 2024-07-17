#!/bin/bash

GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
NC="\033[0m"

VERBOSE=false
NO_VERIFY=false

show_help() {
    printf "${GREEN}Usage: commit.sh [options]${NC}\n"
    printf "\n"
    printf "${YELLOW}Options:${NC}\n"
    printf "  ${GREEN}-v, --verbose${NC}         Enable verbose output\n"
    printf "  ${GREEN}-nv, --no-verify${NC}      Skip message selection\n"
    printf "  ${GREEN}-h, --help${NC}            Display this help message\n"
    printf "\n"
    exit 0
}

for arg in "$@"; do
    case $arg in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -nv|--no-verify)
            NO_VERIFY=true
            shift
            ;;
        -h|--help)
            show_help
            ;;
        *)
            echo -e "${RED}Invalid option: $arg${NC}"
            show_help
            ;;
    esac
done

get_commit_message() {
    diff_output=$(git --no-pager diff --cached)

    if [ -z "$diff_output" ]; then
        printf "${RED}No changes staged for commit.${NC}\n"
        exit 1
    fi

    sanitized_diff_output=$(echo "$diff_output" | jq -Rs '. | @text')

    response=$(echo "$sanitized_diff_output" | jq -Rs '{"diff": .}' | curl -s -w "\n%{http_code}" -X POST "http://localhost" -H "Content-Type: application/json" -d @-)

    http_status=$(echo "$response" | tail -n1)

    message=$(echo "$response" | sed '$d' | tr '\n' ' ' | jq -r '.message')

    if [ "$http_status" -ne 200 ]; then
        printf "${RED}$message${NC}\n"
        exit 1
    fi

    if [ "$VERBOSE" = true ]; then
        printf "${YELLOW}Diff Output:${NC}\n$diff_output\n"
        printf "${YELLOW}Sanitized Diff Output:${NC}\n$sanitized_diff_output\n"
        printf "${YELLOW}Response from server:${NC}\n$response\n"
        printf "${YELLOW}HTTP Status:${NC} $http_status\n"
        printf "${YELLOW}Message:${NC} $message\n"
    fi
}

commit_with_message() {
    local commit_message=$1
    if [ -z "$commit_message" ]; then
        printf "${RED}Aborting due to empty commit message.${NC}\n"
        exit 1
    else
        git commit -m "$commit_message" --no-verify
        # printf "${GREEN}$commit_message${NC}\n"
        exit 0
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

while true; do
    get_commit_message

    if [ -z "$message" ]; then
        printf "${RED}Failed to get commit message from server or empty message.${NC}\n"
        exit 1
    else
        printf "${YELLOW}$message${NC}\n"

        if [ "$NO_VERIFY" = true ]; then
            commit_with_message "$message"
        else
            read -p "Do you want to use this commit message? (y)es, (n)o, or (r)egenerate: " confirm < /dev/tty

            case "$confirm" in
                [yY] | "" )
                    commit_with_message "$message"
                    ;;
                [nN] )
                    prompt_for_custom_message
                    ;;
                [rR] )
                    continue
                    ;;
                * )
                    printf "${RED}Invalid option. Please enter y(es), n(o), or r(egenerate).${NC}\n"
                    ;;
            esac
        fi
    fi
done
