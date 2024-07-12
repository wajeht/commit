# 🤖 Commit
[![Node.js CI](https://github.com/wajeht/commit/actions/workflows/ci.yml/badge.svg?branch=node)](https://github.com/wajeht/commit/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/wajeht/commit/blob/main/LICENSE) [![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/wajeht/commit)

Generate conventional commits using `OpenAI` based on `git diff`

# 📖 Documentation

You must have `jq`, `git`, and `curl` installed in your system.

Save the follow script as `commit.sh` and give it executable permission `chmod +x ./commit.sh`

```bash
#!/bin/bash

git add -A

message=$(git --no-pager diff --cached | jq -Rs '{"diff": .}' | curl -s -X POST "https://commit.jaw.dev/" -H "Content-Type: application/json" -d @- | jq -r '.message')

if [ -z "$message" ]; then
    echo "Aborting commit due to empty commit message."
    exit 1
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

```

Now just run `./commit.sh` inside a `git` folder after any changes in version control.

# 💻 Development

Clone the repository

```bash
$ git clone https://github.com/wajeht/commit.git
```

Copy `.env.example` to `.env`

```bash
$ cp .env.example .env
```

Install dependencies

```bash
$ npm install
```

Run development server

```bash
$ npm run dev
```

Test the application

```bash
$ npm run test
```

Test the application

```bash
$ npm run test
```

# 📜 License

Distributed under the MIT License © wajeht. See [LICENSE](./LICENSE) for more information.
