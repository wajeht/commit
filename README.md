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
$ curl -fsSL https://commit.jaw.dev/install.sh | bash
```

On the first run, Commit asks for your OpenRouter API key and preferred model. It
uses `openrouter/free` when you press Enter at the model prompt, then
creates `~/.config/commit/config.json` with private permissions automatically:

```bash
$ git add .
$ curl -fsSL https://commit.jaw.dev/ | bash
```

The generated configuration looks like this:

```json
{
  "api_key": "YOUR_OPENROUTER_API_KEY",
  "model": "openrouter/free"
}
```

Create an API key at [openrouter.ai/keys](https://openrouter.ai/keys). Run setup
again at any time:

```bash
$ curl -fsSL https://commit.jaw.dev/ | bash -s -- --setup
```

Set `OPENROUTER_API_KEY` to avoid saving a key locally. `--model` overrides
`COMMIT_MODEL`, which overrides the model saved in the configuration. Browse
valid model IDs at
[openrouter.ai/models](https://openrouter.ai/models), or list them from the API:

```bash
$ curl -fsSL https://openrouter.ai/api/v1/models | jq -r '.data[].id'
```

After setup, stage changes and run the normal command:

```bash
$ curl -fsSL https://commit.jaw.dev/ | bash
```

### Options

- `-m`, `--model` Override the configured OpenRouter model for one run
- `--dry-run` Run the script without making any changes
- `-y`, `--yes` Accept the generated message without confirmation
- `-v`, `--verbose` Enable verbose logging
- `--setup` Configure the saved API key and model
- `-h`, `--help` Display this help message

### Example Commands

```bash
$ curl -fsSL https://commit.jaw.dev/ | bash -s -- --yes
$ curl -fsSL https://commit.jaw.dev/ | bash -s -- --dry-run
$ curl -fsSL https://commit.jaw.dev/ | bash -s -- --model openrouter/auto
$ curl -fsSL https://commit.jaw.dev/ | bash -s -- -v
$ curl -fsSL https://commit.jaw.dev/ | bash -s -- -h
$ curl -fsSL https://commit.jaw.dev/ | bash
```

The configuration path follows `$XDG_CONFIG_HOME` when set and defaults to
`~/.config/commit/config.json`. Set `COMMIT_CONFIG` to use another path. The
default model is `openrouter/free`, which randomly selects an available free
model. Free models have lower rate limits and may be less consistent. Pass a
model ID exactly as OpenRouter displays it, for example `openrouter/auto`, to
override the default. Model IDs must not contain whitespace. Diffs larger than
1 MiB are rejected before an API request is made.

# Docs

- See [RECIPE](./docs/recipe.md) for `recipe` guide.
- See [DEVELOPMENT](./docs/development.md) for `development` guide.
- See [CONTRIBUTION](./docs/contribution.md) for `contribution` guide.
- See [MANUAL QA](./docs/manual-qa.md) for the security and release checklist.

# License

Distributed under the MIT License © [wajeht](https://github.com/wajeht). See [LICENSE](./LICENSE) for more information.
