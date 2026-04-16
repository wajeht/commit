FROM golang:1.26-alpine@sha256:27f829349da645e287cb195a9921c106fc224eeebbdc33aeb0f4fca2382befa6 AS build

WORKDIR /app

COPY . .

RUN go build -o commit ./cmd

FROM alpine:latest@sha256:5b10f432ef3da1b8d4c7eb6c487f2f5a8f096bc91145e68878dd4a5019afde11

RUN apk --no-cache add ca-certificates curl

RUN addgroup -g 1000 -S commit && adduser -S commit -u 1000 -G commit

WORKDIR /app

COPY --from=build /app/commit ./commit

USER commit

EXPOSE 80

HEALTHCHECK CMD curl -f http://localhost/healthz || exit 1

CMD ["./commit"]
