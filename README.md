https://github.com/user-attachments/assets/9b584dec-057c-4533-ad1b-c5835bf1cb52

# Commit

[![CI](https://github.com/wajeht/commit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wajeht/commit/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/wajeht/commit/blob/main/LICENSE) [![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/wajeht/commit)

Generate conventional commits with AI

Open [commit.jaw.dev](https://commit.jaw.dev) in a browser to view the usage guide. Requests made with `curl` continue to return the commit script.

# Usage

Ensure you have `tr`, `jq`, `git`, `tail`, `sed`, and `curl` installed on your system. Most developers will already have these tools, but if you need to install them, use the following commands for your operating system:

```bash
# macOS
$ brew install jq git curl coreutils gnu-sed

# Linux (Debian-based)
$ sudo apt-get install jq git curl coreutils sed

# Linux (Red Hat-based)
$ sudo dnf install jq git curl coreutils sed

# Linux (Arch-based)
$ sudo pacman -S jq git curl coreutils sed
```

Or if you already have `curl` you can run the following script to detect OS and install it automatically.

```bash
$ curl -s https://commit.jaw.dev/install.sh | bash
```

After confirming the installation of these tools, navigate to any project directory that uses `git`. Within this directory, execute the commit script with the following command:

```bash
$ curl -s https://commit.jaw.dev/ | bash
```

### Options

- `-ai`, `--ai-provider` Specify AI provider (openai or gemini, default: gemini)
- `-k`, `--api-key` Specify the API key for the AI provider
- `-dr`, `--dry-run` Run the script without making any changes
- `-nv`, `--no-verify` Skip message selection
- `-v`, `--verbose` Enable verbose logging
- `-h`, `--help` Display this help message

### Example Commands

```bash
$ curl -s https://commit.jaw.dev/ | bash -s -- --no-verify
$ curl -s https://commit.jaw.dev/ | bash -s -- --dry-run
$ curl -s https://commit.jaw.dev/ | bash -s -- -ai openai
$ curl -s https://commit.jaw.dev/ | bash -s -- -ai gemini
$ curl -s https://commit.jaw.dev/ | bash -s -- -ai openai --api-key YOUR_API_KEY
$ curl -s https://commit.jaw.dev/ | bash -s -- -ai gemini --api-key YOUR_API_KEY
$ curl -s https://commit.jaw.dev/ | bash -s -- -nv
$ curl -s https://commit.jaw.dev/ | bash -s -- -dr
$ curl -s https://commit.jaw.dev/ | bash -s -- -v
$ curl -s https://commit.jaw.dev/ | bash -s -- -h
$ curl -s https://commit.jaw.dev/ | bash
```

# Docs

- See [RECIPE](./docs/recipe.md) for `recipe` guide.
- See [DEVELOPMENT](./docs/development.md) for `development` guide.
- See [CONTRIBUTION](./docs/contribution.md) for `contribution` guide.

# License

Distributed under the MIT License © [wajeht](https://github.com/wajeht). See [LICENSE](./LICENSE) for more information.
