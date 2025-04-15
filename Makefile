commit:
	@git add -A
	@git auto

send:
	@git --no-pager diff | jq -Rs '{"diff": .}' | curl -X POST "http://localhost" -H "Content-Type: application/json" -d @-

push:
	@go test ./...
	@go fmt ./...
	@git add -A
	@git auto
	@git push --no-verify

test:
	@go test ./...

run:
	@go run ./cmd/web

format:
	@go fmt ./...
