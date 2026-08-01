https://github.com/user-attachments/assets/9b584dec-057c-4533-ad1b-c5835bf1cb52

# Commit

[![CI](https://github.com/wajeht/commit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wajeht/commit/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/wajeht/commit/blob/main/LICENSE) [![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/wajeht/commit)

Generate Conventional Commit messages with AI. The downloaded script sends your
Git diff directly to Gemini or OpenAI; API keys and diffs do not pass through
`commit.jaw.dev`.

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

Create a private configuration file:

```bash
$ mkdir -p ~/.config/commit
$ ${EDITOR:-vi} ~/.config/commit/config.json
$ chmod 600 ~/.config/commit/config.json
```

Add your preferred provider and API key:

```json
{
  "provider": "gemini",
  "gemini_api_key": "YOUR_GEMINI_API_KEY",
  "openai_api_key": "YOUR_OPENAI_API_KEY"
}
```

Only the key for your selected provider is required. You can also use the
`GEMINI_API_KEY`, `OPENAI_API_KEY`, and `COMMIT_PROVIDER` environment variables.

After configuring a key, navigate to any Git repository, stage your changes,
and run:

```bash
$ curl -s https://commit.jaw.dev/ | bash
```

### Options

- `-ai`, `--ai-provider` Specify AI provider (openai or gemini, default: gemini)
- `-k`, `--api-key` Override the configured API key for one run
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
$ curl -s https://commit.jaw.dev/ | bash -s -- -nv
$ curl -s https://commit.jaw.dev/ | bash -s -- -dr
$ curl -s https://commit.jaw.dev/ | bash -s -- -v
$ curl -s https://commit.jaw.dev/ | bash -s -- -h
$ curl -s https://commit.jaw.dev/ | bash
```

The configuration path follows `$XDG_CONFIG_HOME` when set and defaults to
`~/.config/commit/config.json`. Set `COMMIT_CONFIG` to use another path. Optional
`gemini_model` and `openai_model` fields override the default models.

# Docs

- See [RECIPE](./docs/recipe.md) for `recipe` guide.
- See [DEVELOPMENT](./docs/development.md) for `development` guide.
- See [CONTRIBUTION](./docs/contribution.md) for `contribution` guide.

# License

Distributed under the MIT License © [wajeht](https://github.com/wajeht). See [LICENSE](./LICENSE) for more information.
