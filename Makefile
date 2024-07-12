commit:
	@git add -A
	@aicommits --type conventional

push:
	@go test ./...
	@go fmt ./...
	@git add -A
	@aicommits --type conventional
	@git push --no-verify

test:
	@go test ./...

build:
	@mkdir -p bin
	@go build -o bin/commit ./cmd/commit

run:
	@go run ./cmd/commit

format:
	@go fmt ./...
