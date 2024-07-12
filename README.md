# 🤖 Commit

[![Node.js CI](https://github.com/wajeht/commit/actions/workflows/ci.yml/badge.svg?branch=node)](https://github.com/wajeht/commit/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/wajeht/commit/blob/main/LICENSE) [![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/wajeht/commit)

Generate conventional commits using `OpenAI` based on `git diff`

# 📖 Documentation

1. You must have `jq`, `git`, `wget`, and `curl` installed in your system.

2. Download `commit` script via `wget http://localhost/commit.sh`.

3. Save the follow script as `commit.sh` and give it executable permission `chmod +x ./commit.sh`

4. Now just run `./commit.sh` inside a `git` folder after any changes in version control.

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

# 📜 License

Distributed under the MIT License © wajeht. See [LICENSE](./LICENSE) for more information.
