#!/bin/bash

git add -A

response=$(git --no-pager diff --cached | jq -Rs '{"diff": .}' | curl -s -w "\n%{http_code}" -X POST "http://localhost" -H "Content-Type: application/json" -d @-)
http_status=$(echo "$response" | tail -n1)
message=$(echo "$response" | sed '$d' | jq -r '.message')

if [ "$http_status" -ne 200 ] || [ -z "$message" ]; then
    echo "Failed to get commit message from server or empty message. Please enter commit message manually."
    read -p "Enter custom commit message: " custom_message
    if [ -z "$custom_message" ]; then
        echo "Aborting commit due to empty custom commit message."
        exit 1
    else
        git commit -m "$custom_message" --no-verify
    fi
else
    echo "$message"
    read -p "Do you want to use this commit message? (y/n, Enter for yes): " confirm
    if [ -z "$confirm" ] || [ "$confirm" = "y" ]; then
        git commit -m "$message" --no-verify
    else
        read -p "Enter custom commit message: " custom_message
        if [ -z "$custom_message" ]; then
            echo "Aborting commit due to empty custom commit message."
            exit 1
        else
            git commit -m "$custom_message" --no-verify
        fi
    fi
fi
