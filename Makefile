commit:
	@./commit.sh

generate:
	@git --no-pager diff --cached | jq -Rs '{"diff": .}' | curl -s -X POST "http://localhost" -H "Content-Type: application/json" -d @- | jq -r '.message'

push:
	@make format
	@make lint
	@make test
	@git add -A
	@make commit
	@git push --no-verify

test:
	@npm run test

build:
	@rm -rf ./dist
	@npm run build

run:
	@npm run dev

format:
	@npm run format

lint:
	@npm run lint
