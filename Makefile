commit:
	@./src/commit.sh

generate:
	@git add -A && \
	git --no-pager diff --cached | jq -Rs '{"diff": ., "stream": true}' | \
	curl -s -N -X POST "http://localhost" -H "Content-Type: application/json" -d @- | \
	while read -r line; do \
		if echo "$$line" | grep -q "^data:"; then \
			token=$$(echo "$$line" | sed 's/^data: //g' | jq -r '.token // empty'); \
			if [ ! -z "$$token" ]; then \
				printf "\033[33m%s\033[0m" "$$token"; \
			fi; \
		fi; \
	done; \
	printf "\n" && git reset -q

generate-debug:
	@git add -A && \
	git --no-pager diff --cached | jq -Rs '{"diff": ., "stream": true}' | \
	curl -v -N -X POST "http://localhost" -H "Content-Type: application/json" -d @-

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
