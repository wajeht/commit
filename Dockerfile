FROM golang:1.27-alpine@sha256:26402d86be3d72e6a9410afa0108f03529f51f0c1b5eb7f503d0bc44cc7857ac AS build

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
