#!/bin/bash

git add -A

message=$(git --no-pager diff | jq -Rs '{"diff": .}' | curl -s -X POST "http://localhost" -H "Content-Type: application/json" -d @- | jq -r '.message')

echo "$message"

if [ -z "$message" ]; then
    echo "Aborting commit due to empty commit message."
    exit 1
else
    git commit -m "$message" --no-verify
fi
