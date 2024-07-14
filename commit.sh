#!/bin/bash

# Define color codes for output
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
NC="\033[0m" # No Color

# Function to get the commit message from the server
get_commit_message() {
    response=$(git --no-pager diff --cached | jq -Rs '{"diff": .}' | curl -s -w "\n%{http_code}" -X POST "http://localhost" -H "Content-Type: application/json" -d @-)
    echo $response;
    http_status=$(echo "$response" | tail -n1)
    message=$(echo "$response" | sed '$d' | jq -r '.message')
}

# Function to commit with a given message
commit_with_message() {
    local commit_message=$1
    if [ -z "$commit_message" ]; then
        echo "${RED}Aborting commit due to empty commit message.${NC}"
        exit 1
    else
        git commit -m "$commit_message" --no-verify
        echo "${GREEN}$commit_message${NC}"
        exit 0
    fi
}

# Function to prompt for a custom commit message
prompt_for_custom_message() {
    read -p "Enter custom commit message: " custom_message < /dev/tty
    commit_with_message "$custom_message"
}

# Main loop to handle commit process
while true; do
    get_commit_message

    if [ "$http_status" -ne 200 ] || [ -z "$message" ]; then
        echo "${RED}Failed to get commit message from server or empty message.${NC}"
        prompt_for_custom_message
    else
        echo "${YELLOW}$message${NC}"
        read -p "Do you want to use this commit message? (y/n/r, Enter for yes): " confirm < /dev/tty

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
                echo "${RED}Invalid option. Please enter y, n, or r.${NC}"
                ;;
        esac
    fi
done
