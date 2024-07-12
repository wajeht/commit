# 🤖 Commit

[![Node.js CI](https://github.com/wajeht/commit/actions/workflows/ci.yml/badge.svg?branch=node)](https://github.com/wajeht/commit/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/wajeht/commit/blob/main/LICENSE) [![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/wajeht/commit)

Generate conventional commits using `OpenAI` based on `git diff`

# 📖 Usage

You must have `jq`, `git`, `tail`, `sed`, and `curl` installed on your system. If you're a developer, you probably already have them installed.
For those who need to install these tools, here are the commands for different operating systems:

```bash
# macOS
brew install jq git curl tail sed

# Linux (Debian-based)
sudo apt install jq git curl tail sed

# Linux (Red Hat-based)
sudo dnf install jq git curl tail sed

# Linux (Arch-based)
sudo pacman -S jq git curl tail sed
```

Once you have ensured that all the necessary tools are installed, navigate to any project directory that uses `git`. Within this directory, you can run the following command to execute the commit script:

```bash
$ curl -s http://commit.jaw.dev/commit.sh | sh
```

💋🎤👋 BOOM!

# 📑 Docs

- See [DEVELOPMENT](./docs/development.md) for `development` guide.
- See [CONTRIBUTION](./docs/contribution.md) for `contribution` guide.

# 📜 License

Distributed under the MIT License © wajeht. See [LICENSE](./LICENSE) for more information.
