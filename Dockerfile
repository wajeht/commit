FROM golang:1.26-alpine@sha256:3889b425f035be855a72fb4755265311293b6d414521f0a519d819df32222d83 AS build

WORKDIR /app

COPY . .

RUN go build -o commit ./cmd

FROM alpine:latest@sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b

RUN apk --no-cache add ca-certificates curl

RUN addgroup -g 1000 -S commit && adduser -S commit -u 1000 -G commit

WORKDIR /app

COPY --from=build /app/commit ./commit

USER commit

EXPOSE 80

HEALTHCHECK CMD curl -f http://localhost/healthz || exit 1

CMD ["./commit"]
