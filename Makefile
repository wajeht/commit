commit:
	@git add -A
	@aicommits --type conventional

send:
	@git --no-pager diff | jq -Rs '{"diff": .}' | curl -X POST "http://localhost" -H "Content-Type: application/json" -d @-

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
