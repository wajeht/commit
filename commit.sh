#!/bin/bash

GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
NC="\033[0m" # No Color
VERBOSE=false
NO_VERIFY=false

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
    esac
done

get_commit_message() {
    diff_output=$(git --no-pager diff --cached)

    if [ -z "$diff_output" ]; then
        echo "${RED}No changes staged for commit.${NC}"
        exit 1
    fi

    sanitized_diff_output=$(echo "$diff_output" | jq -Rs '. | @text')

    response=$(echo "$sanitized_diff_output" | jq -Rs '{"diff": .}' | curl -s -w "\n%{http_code}" -X POST "http://localhost" -H "Content-Type: application/json" -d @-)

    http_status=$(echo "$response" | tail -n1)

    message=$(echo "$response" | sed '$d' | tr '\n' ' ' | jq -r '.message')

    if [ "$http_status" -ne 200 ]; then
        echo "${RED}$message${NC}"
        exit 1
    fi

    if [ "$VERBOSE" = true ]; then
        echo "${YELLOW}Diff Output:${NC}\n$diff_output"
        echo "${YELLOW}Sanitized Diff Output:${NC}\n$sanitized_diff_output"
        echo "${YELLOW}Response from server:${NC}\n$response"
        echo "${YELLOW}HTTP Status:${NC} $http_status"
        echo "${YELLOW}Message:${NC} $message"
    fi
}

commit_with_message() {
    local commit_message=$1
    if [ -z "$commit_message" ]; then
        echo "${RED}Aborting due to empty commit message.${NC}"
        exit 1
    else
        git commit -m "$commit_message" --no-verify
        echo "${GREEN}$commit_message${NC}"
        exit 0
    fi
}

prompt_for_custom_message() {
    read -p "Enter custom commit message: " custom_message < /dev/tty
    if [ -z "$custom_message" ]; then
        echo "${RED}Aborting due to empty custom commit message.${NC}"
        exit 1
    else
        commit_with_message "$custom_message"
    fi
}

while true; do
    get_commit_message

    if [ -z "$message" ]; then
        echo "${RED}Failed to get commit message from server or empty message.${NC}"
        exit 1
    else
        echo "${YELLOW}$message${NC}"

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
                    echo -e "${RED}Invalid option. Please enter y(yes), n(no), or r(regenerate).${NC}"
                    ;;
            esac
        fi
    fi
done
