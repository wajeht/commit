commit:
	@./assets/sh/commit.sh

generate:
	@git add -A && ./assets/sh/commit.sh --dry-run && git reset -q

push:
	@make format
	@make lint
	@make test
	@git add -A
	@make commit
	# @curl -s https://commit.jaw.dev/ | bash
	@git push --no-verify

dev:
	@export $$(grep -v '^#' .env | xargs) && go run github.com/cosmtrek/air@v1.43.0 \
		--build.cmd "make build" --build.bin "./commit" --build.delay "100" \
		--build.exclude_dir "" \
		--build.include_ext "go, tpl, tmpl, html, css, scss, js, ts, sql, jpeg, jpg, gif, png, bmp, svg, webp, ico, md" \
		--misc.clean_on_exit "true"

build:
	@go build -o ./commit ./cmd

run: build
	@./commit

clean:
	@rm -f commit*

test:
	@go test ./...

lint:
	@go vet ./...

format:
	@go mod tidy -v
	@go fmt ./...

fix_git:
	@git rm -r --cached .
	@git add .
	@git commit -m "Untrack files in .gitignore"
