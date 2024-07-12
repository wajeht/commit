commit:
	@git add -A
	@bash -c 'message=$$(git --no-pager diff --cached | jq -Rs '\''{"diff": .}'\'' | curl -s -X POST "http://localhost" -H "Content-Type: application/json" -d @- | jq -r '\''.message'\''); \
	if [ -z "$$message" ]; then \
		echo "Aborting commit due to empty commit message."; \
		exit 1; \
	else \
		echo "$$message"; \
		read -p "Do you want to use this commit message? (y/n, Enter for yes): " confirm; \
		if [ -z "$$confirm" ] || [ "$$confirm" = "y" ]; then \
			git commit -m "$$message" --no-verify; \
		else \
			echo "Aborting commit."; \
			exit 1; \
		fi \
	fi'

generate:
	@git --no-pager diff --cached | jq -Rs '{"diff": .}' | curl -s -X POST "http://localhost" -H "Content-Type: application/json" -d @- | jq -r '.message'

push:
	@make format
	@make lint
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

lint:
	@npm run lint
