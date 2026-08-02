https://github.com/user-attachments/assets/9b584dec-057c-4533-ad1b-c5835bf1cb52

# Commit

[![CI](https://github.com/wajeht/commit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wajeht/commit/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/wajeht/commit/blob/main/LICENSE) [![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/wajeht/commit)

Generate Conventional Commit messages with AI. The downloaded script sends your
Git diff directly to OpenRouter; API keys and diffs do not pass through
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

On the first run, Commit asks for your OpenRouter model and API key. It then
creates `~/.config/commit/config.json` with private permissions automatically:

```bash
$ git add .
$ curl -s https://commit.jaw.dev/ | bash
```

The generated configuration looks like this:

```json
{
  "api_key": "YOUR_OPENROUTER_API_KEY",
  "model": "google/gemini-2.5-flash-lite"
}
```

Create an API key at [openrouter.ai/keys](https://openrouter.ai/keys). Run setup
again at any time:

```bash
$ curl -s https://commit.jaw.dev/ | bash -s -- --setup
```

You can also use the `OPENROUTER_API_KEY` and `COMMIT_MODEL` environment
variables. These take precedence and avoid saving a key locally.

After setup, stage changes and run the normal command:

```bash
$ curl -s https://commit.jaw.dev/ | bash
```

### Options

- `-k`, `--api-key` Override the configured API key for one run
- `-m`, `--model` Override the configured OpenRouter model for one run
- `-dr`, `--dry-run` Run the script without making any changes
- `-nv`, `--no-verify` Skip message selection
- `-v`, `--verbose` Enable verbose logging
- `--setup` Create or update the saved configuration
- `-h`, `--help` Display this help message

### Example Commands

```bash
$ curl -s https://commit.jaw.dev/ | bash -s -- --no-verify
$ curl -s https://commit.jaw.dev/ | bash -s -- --dry-run
$ curl -s https://commit.jaw.dev/ | bash -s -- --model openrouter/auto
$ curl -s https://commit.jaw.dev/ | bash -s -- -nv
$ curl -s https://commit.jaw.dev/ | bash -s -- -dr
$ curl -s https://commit.jaw.dev/ | bash -s -- -v
$ curl -s https://commit.jaw.dev/ | bash -s -- -h
$ curl -s https://commit.jaw.dev/ | bash
```

The configuration path follows `$XDG_CONFIG_HOME` when set and defaults to
`~/.config/commit/config.json`. Set `COMMIT_CONFIG` to use another path. The
default model is `google/gemini-2.5-flash-lite`.

# Docs

- See [RECIPE](./docs/recipe.md) for `recipe` guide.
- See [DEVELOPMENT](./docs/development.md) for `development` guide.
- See [CONTRIBUTION](./docs/contribution.md) for `contribution` guide.

# License

Distributed under the MIT License © [wajeht](https://github.com/wajeht). See [LICENSE](./LICENSE) for more information.
