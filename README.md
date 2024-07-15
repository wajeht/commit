https://github.com/user-attachments/assets/9b584dec-057c-4533-ad1b-c5835bf1cb52

# 🤖 Commit

[![Node.js CI](https://github.com/wajeht/commit/actions/workflows/ci.yml/badge.svg?branch=node)](https://github.com/wajeht/commit/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/wajeht/commit/blob/main/LICENSE) [![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/wajeht/commit)

Generate conventional commits using `OpenAI` based on `git diff`

# 📖 Usage

Ensure you have `jq`, `git`, `tail`, `sed`, and `curl` installed on your system. Most developers will already have these tools, but if you need to install them, use the following commands for your operating system:

```bash
# macOS
$ brew install jq git curl tail sed

# Linux (Debian-based)
$ sudo apt install jq git curl tail sed

# Linux (Red Hat-based)
$ sudo dnf install jq git curl tail sed

# Linux (Arch-based)
$ sudo pacman -S jq git curl tail sed
```

After confirming the installation of these tools, navigate to any project directory that uses `git`. Within this directory, execute the commit script with the following command:

```bash
$ curl -s http://commit.jaw.dev/commit.sh | sh
```

# 🧑‍🍳 Recipe

If you prefer a single command to push changes to your `git` repository, follow these steps:

1. Create a `Makefile`:

```bash
$ touch Makefile
```

2. Add the following operations to the `Makefile`:

```make
push:
  @git add -A
  @curl -s http://commit.jaw.dev/commit.sh | sh
  @git push --no-verify
```

3. After making changes in your `git` project, run this single command to push them:

```bash
$ make push
```

## Git

1. Open up `.gitconfig`

```bash
$ cd ~
$ vim .gitconfig
```

2. Add the following alias to `.gitconfig`

```bash
[alias]
	undo = reset --soft HEAD^             # Undo the last commit, keeping changes staged
	push = push --no-verify               # Push changes without verification
	aicommit = "!f() { curl -s https://commit.jaw.dev/commit.sh | sh; }; f"
```

4. Now we can just do `git add -A && git aicommit && git push`

💋🎤👋 BOOM!

# 📑 Docs

- See [DEVELOPMENT](./docs/development.md) for `development` guide.
- See [CONTRIBUTION](./docs/contribution.md) for `contribution` guide.

# 📜 License

Distributed under the MIT License © wajeht. See [LICENSE](./LICENSE) for more information.
