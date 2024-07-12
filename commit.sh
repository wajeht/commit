#!/bin/bash

git add -A

message=$(git --no-pager diff --cached | jq -Rs '{"diff": .}' | curl -s -X POST "http://localhost" -H "Content-Type: application/json" -d @- | jq -r '.message')

if [ -z "$message" ]; then
    echo "Aborting commit due to empty commit message."
    exit 1
else
    echo "$message"
    read -p "Do you want to use this commit message? (y/n, Enter for yes): " confirm
    if [ -z "$confirm" ] || [ "$confirm" = "y" ]; then
        git commit -m "$message" --no-verify
    else
        echo "Aborting commit."
        exit 1
    fi
fi