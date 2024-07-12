commit:
	@git add -A
	@aicommits --type conventional

send:
	@git --no-pager diff | jq -Rs '{"diff": .}' | curl -X POST "http://localhost" -H "Content-Type: application/json" -d @-

push:
	@npm run test
	@npm run format
	@git add -A
	@aicommits --type conventional
	@git push --no-verify

test:
	@npm run test

# build:
# 	@mkdir -p bin
# 	@go build -o bin/commit ./cmd/commit

run:
	@npm run dev

format:
	@npm run format
