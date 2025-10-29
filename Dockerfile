FROM golang:1.25-alpine AS build

WORKDIR /app

COPY . .

RUN go build -o commit ./cmd

FROM alpine:latest

RUN apk --no-cache add ca-certificates curl

RUN addgroup -g 1001 -S commit && adduser -S commit -u 1001 -G commit

WORKDIR /app

COPY --from=build /app/commit ./commit

USER commit

EXPOSE 80

HEALTHCHECK CMD curl -f http://localhost/healthz || exit 1

CMD ["./commit"]
