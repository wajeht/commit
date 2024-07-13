#!/bin/bash

get_commit_message() {
    response=$(git --no-pager diff --cached | jq -Rs '{"diff": .}' | curl -s -w "\n%{http_code}" -X POST "http://localhost" -H "Content-Type: application/json" -d @-)
    http_status=$(echo "$response" | tail -n1)
    message=$(echo "$response" | sed '$d' | jq -r '.message')
}

commit_with_message() {
    local commit_message=$1
    if [ -z "$commit_message" ]; then
        echo "Aborting commit due to empty commit message."
        exit 1
    else
        git commit -m "$commit_message" --no-verify
        exit 0
    fi
}

while true; do
    get_commit_message

    if [ "$http_status" -ne 200 ] || [ -z "$message" ]; then
        echo "Failed to get commit message from server or empty message."
        read -p "Enter custom commit message: " custom_message < /dev/tty
        commit_with_message "$custom_message"
    else
        echo "$message"
        read -p "Do you want to use this commit message? (y/n/r, Enter for yes): " confirm < /dev/tty

        if [ -z "$confirm" ] || [[ "$confirm" =~ ^[yY]$ ]]; then
            commit_with_message "$message"
        elif [[ "$confirm" =~ ^[nN]$ ]]; then
            read -p "Enter custom commit message: " custom_message < /dev/tty
            commit_with_message "$custom_message"
        elif [[ "$confirm" =~ ^[rR]$ ]]; then
            continue
        else
            echo "Invalid option. Please enter y, n, or r."
        fi
    fi
done
