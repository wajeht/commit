# 🧑‍🍳 Recipe

If you prefer a single command to push changes to your `git` repository, follow these steps:

## 🍳 `Makefile`

1. Create a `Makefile`:

```bash
$ touch Makefile
```

2. Add the following operations to the `Makefile`:

```make
push:
  @git add -A
  @curl -fsSL https://commit.jaw.dev/ | bash
  @git push --no-verify
```

3. After making changes in your `git` project, run this single command to push them:

```bash
$ make push
```

## ⛬ `Git`

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
	aicommit = "!f() { curl -fsSL https://commit.jaw.dev/ | bash; }; f"
```

3. After making changes in your `git` project, run this single command to push them:

```bash
$ git add -A && git aicommit && git push
```

4. Or preview the generated message without creating a commit:

```bash
$ git add -A && curl -fsSL https://commit.jaw.dev/ | bash -s -- --dry-run
```

💋🎤👋 BOOM!
