# 🤖 Commit

[![Node.js CI](https://github.com/wajeht/commit/actions/workflows/ci.yml/badge.svg?branch=node)](https://github.com/wajeht/commit/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/wajeht/commit/blob/main/LICENSE) [![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/wajeht/commit)

Generate conventional commits using `OpenAI` based on `git diff`

# 📖 Usage

You must have `jq`, `git`, and `curl` installed on your system.

```bash
# macOS
brew install jq git curl

# Linux (Debian-based)
sudo apt install jq git curl

# Linux (Red Hat-based)
sudo dnf install jq git curl

# Linux (Arch-based)
sudo pacman -S jq git curl
```

Now, go to any project that uses `git` and run the following command:


```bash
$ curl -s http://commit.jaw.dev/commit.sh | sh
```

💋🎤👋 BOOM!


# 📑 Docs

- See [DEVELOPMENT](./docs/development.md.md) for `development` guide.
- See [CONTRIBUTION](./docs/contribution.md.md) for `contribution` guide.


# 📜 License

Distributed under the MIT License © wajeht. See [LICENSE](./LICENSE) for more information.
