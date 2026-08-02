# Manual QA

Use this checklist before releasing changes to the Commit client. Never paste an
API key into an issue, pull request, terminal recording, or chat.

## OpenRouter account

- Create a dedicated key for Commit and set a small spending limit.
- Keep input/output logging and data-sharing disabled unless explicitly needed.
- Disable routing to providers that train on prompts; enable zero-data-retention
  routing when repository policy requires it.
- Revoke and replace any key that has been exposed.

References: [OpenRouter data collection](https://openrouter.ai/docs/guides/privacy/data-collection),
[provider logging](https://openrouter.ai/docs/guides/privacy/provider-logging/), and
[zero data retention](https://openrouter.ai/docs/guides/features/zdr).

## Automated baseline

Run from the repository root:

```bash
$ bash -n assets/sh/commit.sh
$ go test ./...
$ go test -race ./...
$ go vet ./...
$ git diff --check
```

Expected: every command exits successfully. The integration test verifies that
the API key is not included in curl process arguments.

If ShellCheck is installed, also run:

```bash
$ shellcheck assets/sh/commit.sh assets/sh/install.sh
```

## Local configuration

Create or replace the configuration without putting the key in shell history:

```bash
$ ./assets/sh/commit.sh --setup
$ stat -c '%a' ~/.config/commit ~/.config/commit/config.json
$ jq -e 'keys == ["api_key"] and (.api_key | type == "string" and length > 0)' ~/.config/commit/config.json >/dev/null
```

On macOS, use `stat -f '%Lp'` for the permission checks. Expected directory and
file modes are `700` and `600`. The JSON validation exits successfully without
printing the key.

Confirm that credentials were not committed:

```bash
$ git grep -n 'sk-or-v1-' -- ':!docs/manual-qa.md'
```

Expected: no matches.

## Live dry run

Use a disposable repository so the test cannot modify real work:

```bash
$ qa_root=$(mktemp -d)
$ qa_repo="$qa_root/repo"
$ mkdir "$qa_repo"
$ cd "$qa_repo"
$ git init -q
$ printf 'manual QA\n' > qa.txt
$ git add qa.txt
$ /path/to/commit/assets/sh/commit.sh --dry-run
```

Expected:

- OpenRouter returns a one-line Conventional Commit message.
- The output lists `qa.txt` and does not create a commit.
- The default request uses `google/gemini-2.5-flash-lite`.
- The key and complete request body are never printed without `--verbose`.

Repeat once with an advanced model override:

```bash
$ /path/to/commit/assets/sh/commit.sh --dry-run --model openrouter/auto
```

Expected: another valid message without changing the saved configuration.

## Interactive commit

Still inside the disposable repository, run without `--dry-run` and accept the
message. Then verify the result:

```bash
$ /path/to/commit/assets/sh/commit.sh
$ git log -1 --format='%s'
$ git status --short
```

Expected: the selected message is the latest commit subject and the worktree is
clean. Regenerate and suggestion choices may be tested with another staged dummy
change; each regeneration makes another billable request.

## Failure paths

Verify these cases without using a real repository:

- `--model` without a value exits with `--model requires a value`.
- Unknown options and missing option values exit with status `2`.
- Every real commit requires an explicit confirmation response by default.
- `--yes` is the explicit exception and accepts without confirmation.
- Git commit hooks are always skipped by the Commit client.
- Missing configuration starts setup instead of sending a request.
- Invalid JSON is rejected before any request.
- Config mode `644` is rejected with the `chmod 600` instruction.
- An invalid or revoked key returns OpenRouter's error and creates no commit.
- A network stall ends within the configured 10-second connection and 60-second
  total request timeouts.

## Deployed endpoint

After deployment:

```bash
$ curl -fsSL https://commit.jaw.dev/ | bash -s -- --help
$ curl -fsSL https://commit.jaw.dev/install.sh | bash
```

Expected: HTTP failures stop the pipeline, help lists only OpenRouter settings,
and the install script reports all required commands.
