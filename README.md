https://github.com/user-attachments/assets/9b584dec-057c-4533-ad1b-c5835bf1cb52

# 🤖 Commit

[![Node.js CI](https://github.com/wajeht/commit/actions/workflows/ci.yml/badge.svg?branch=node)](https://github.com/wajeht/commit/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/wajeht/commit/blob/main/LICENSE) [![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/wajeht/commit)

Generate conventional commits with AI

# 📖 Usage

Ensure you have `read`, `tr`, `jq`, `git`, `tail`, `sed`, and `curl` installed on your system. Most developers will already have these tools, but if you need to install them, use the following commands for your operating system:

```bash
# macOS
$ brew install jq git curl tail sed read tr

# Linux (Debian-based)
$ sudo apt install jq git curl tail sed read tr

# Linux (Red Hat-based)
$ sudo dnf install jq git curl tail sed read tr

# Linux (Arch-based)
$ sudo pacman -S jq git curl tail sed read tr
```

Or if you already have `curl` you can run the following script to detect OS and install it automatically.

```bash
$ curl -s http://commit.jaw.dev/install.sh | sh
```

After confirming the installation of these tools, navigate to any project directory that uses `git`. Within this directory, execute the commit script with the following command:

```bash
$ curl -s http://commit.jaw.dev/ | sh
```

### Options

- `-ai`, `--ai-provider` Specify AI provider (openai, claudeai, deepseek, or gemini, default: openai)
- `-k`, `--api-key` Specify the API key for the AI provider
- `-dr`, `--dry-run` Run the script without making any changes
- `-nv`, `--no-verify` Skip message selection
- `-h`, `--help` Display this help message

### Example Commands

```bash
$ curl -s http://commit.jaw.dev/ | sh -s -- --no-verify
$ curl -s http://commit.jaw.dev/ | sh -s -- --dry-run
$ curl -s http://commit.jaw.dev/ | sh -s -- -ai openai
$ curl -s http://commit.jaw.dev/ | sh -s -- -ai claudeai
$ curl -s http://commit.jaw.dev/ | sh -s -- -ai deepseek
$ curl -s http://commit.jaw.dev/ | sh -s -- -ai gemini
$ curl -s http://commit.jaw.dev/ | sh -s -- -ai openai --api-key YOUR_API_KEY
$ curl -s http://commit.jaw.dev/ | sh -s -- -ai claudeai --api-key YOUR_API_KEY
$ curl -s http://commit.jaw.dev/ | sh -s -- -ai deepseek --api-key YOUR_API_KEY
$ curl -s http://commit.jaw.dev/ | sh -s -- -ai gemini --api-key YOUR_API_KEY
$ curl -s http://commit.jaw.dev/ | sh -s -- -nv
$ curl -s http://commit.jaw.dev/ | sh -s -- -dr
$ curl -s http://commit.jaw.dev/ | sh -s -- -h
$ curl -s http://commit.jaw.dev/ | sh
```

# 📑 Docs

- See [RECIPE](./docs/recipe.md) for `recipe` guide.
- See [DEVELOPMENT](./docs/development.md) for `development` guide.
- See [CONTRIBUTION](./docs/contribution.md) for `contribution` guide.

# ✅ Roadmap

- [ ] diff current branch against main and generate pr description and pr title
  - `git --no-pager diff main... && git --no-pager diff && git --no-pager diff --cached`

# 📜 License

Distributed under the MIT License © [wajeht](https://github.com/wajeht). See [LICENSE](./LICENSE) for more information.
