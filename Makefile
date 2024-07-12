commit:
	@git add -A
	commitMessage=$$(git --no-pager diff | jq -Rs '{"diff": .}' | curl -s -X POST "http://localhost" -H "Content-Type: application/json" -d @- 2>/dev/null | jq -r '.message'); \
	echo "Commit message: '$$commitMessage'"; \
	if [ -z "$$commitMessage" ]; then \
		echo "Aborting commit due to empty commit message."; \
		exit 1; \
	else \
		git commit -m "$$commitMessage"; \
	fi

send:
	@git --no-pager diff | jq -Rs '{"diff": .}' | curl -s -X POST "http://localhost" -H "Content-Type: application/json" -d @- | jq -r '.message'

push:
	@npm run test
	@npm run format
	@git add -A
	@aicommits --type conventional
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
