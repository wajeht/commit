dev:
	@go run github.com/cosmtrek/air@v1.43.0 \
		--build.cmd "make build" --build.bin "/tmp/bin/web" --build.delay "100" \
		--build.exclude_dir "" \
		--build.include_ext "go, tpl, tmpl, html, css, scss, js, ts, sql, jpeg, jpg, gif, png, bmp, svg, webp, ico" \
		--misc.clean_on_exit "true"

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

format:
	@go mod tidy -v
	@go fmt ./...

