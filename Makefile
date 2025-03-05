commit:
	@./src/commit.sh

generate:
	@git add -A && git --no-pager diff --cached | jq -Rs '{"diff": .}' | curl -s -N -X POST "http://localhost" -H "Content-Type: application/json" -d @- | while read -r line; do \
		if echo "$$line" | grep -q "^data:"; then \
			token=$$(echo "$$line" | sed 's/^data: //g' | jq -r '.token // empty'); \
			if [ ! -z "$$token" ]; then \
				printf "\033[33m%s\033[0m" "$$token"; \
			fi; \
		fi; \
	done; printf "\n" && git reset -q

debug-generate:
	@git add -A && git --no-pager diff --cached | jq -Rs '{"diff": .}' | curl -s -N -X POST "http://localhost" -H "Content-Type: application/json" -d @- | while read -r line; do \
		if echo "$$line" | grep -q "^data:"; then \
			echo "\033[36m[RAW] $$line\033[0m"; \
			token=$$(echo "$$line" | sed 's/^data: //g' | jq -r '.token // empty'); \
			if [ ! -z "$$token" ]; then \
				echo "\033[35m[TOKEN] '$$token'\033[0m"; \
				printf "\033[33m%s\033[0m" "$$token"; \
			fi; \
			done=$$(echo "$$line" | sed 's/^data: //g' | jq -r '.done // empty'); \
			if [ ! -z "$$done" ]; then \
				echo "\n\033[32m[DONE] Stream completed\033[0m"; \
			fi; \
			error=$$(echo "$$line" | sed 's/^data: //g' | jq -r '.error // empty'); \
			if [ ! -z "$$error" ]; then \
				echo "\n\033[31m[ERROR] $$error\033[0m"; \
			fi; \
		fi; \
	done; printf "\n" && git reset -q

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
