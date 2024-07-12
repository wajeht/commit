commit:
	@git add -A
	@bash -c 'message=$$(git --no-pager diff | jq -Rs '\''{"diff": .}'\'' | curl -s -X POST "http://localhost" -H "Content-Type: application/json" -d @- | jq -r '\''.message'\''); \
	if [ -z "$$message" ]; then \
		echo "Aborting commit due to empty commit message."; \
		exit 1; \
	else \
		git commit -m "$$message" --no-verify;\
	fi'

send:
	@git --no-pager diff | jq -Rs '{"diff": .}' | curl -s -X POST "http://localhost" -H "Content-Type: application/json" -d @- | jq -r '.message'

push:
	@make format
	@make test
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
