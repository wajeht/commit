commit:
	@./src/commit.sh

generate:
	@git add -A && git --no-pager diff --cached | jq -Rs '{"diff": .}' | curl -s -X POST "http://localhost" -H "Content-Type: application/json" -d @- | jq -r '.message' && git reset -q

generate-openai:
	@git add -A && git --no-pager diff --cached | jq -Rs '{"diff": ., "provider": "openai"}' | curl -s -X POST "http://localhost" -H "Content-Type: application/json" -d @- | jq -r '.message' && git reset -q

generate-claudeai:
	@git add -A && git --no-pager diff --cached | jq -Rs '{"diff": ., "provider": "claudeai"}' | curl -s -X POST "http://localhost" -H "Content-Type: application/json" -d @- | jq -r '.message' && git reset -q

generate-deepseek:
	@git add -A && git --no-pager diff --cached | jq -Rs '{"diff": ., "provider": "deepseek"}' | curl -s -X POST "http://localhost" -H "Content-Type: application/json" -d @- | jq -r '.message' && git reset -q

generate-gemini:
	@git add -A && git --no-pager diff --cached | jq -Rs '{"diff": ., "provider": "gemini"}' | curl -s -X POST "http://localhost" -H "Content-Type: application/json" -d @- | jq -r '.message' && git reset -q

push:
	@make format
	@make lint
	@make test
	@git add -A
	@make commit
	# @curl -s https://commit.jaw.dev/ | sh
	@git push --no-verify

test:
	@npm run test

build:
	@rm -rf ./dist
	@npm run build

install:
	@npm install

clean:
	@rm -rf ./dist
	@rm -rf ./node_modules

run:
	@npm run dev

format:
	@npm run format

lint:
	@npm run lint

fix-git:
	@git rm -r --cached . -f
	@git add .
	@git commit -m "Untrack files in .gitignore"
