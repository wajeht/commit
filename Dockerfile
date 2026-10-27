FROM golang:1.27-alpine@sha256:d200d2dd76b03a99b52651fd1325aff7dcd35422c35c01bac56571b0507f3deb AS build

WORKDIR /app

COPY . .

RUN go build -o commit ./cmd

FROM alpine:latest@sha256:be2656061b536c1883c4034790e21d0a09c5aaaf51968b89368a3c0371ea2c9a

RUN apk --no-cache add ca-certificates curl

RUN addgroup -g 1000 -S commit && adduser -S commit -u 1000 -G commit

WORKDIR /app

COPY --from=build /app/commit ./commit

USER commit

EXPOSE 80

HEALTHCHECK CMD curl -f http://localhost/healthz || exit 1

CMD ["./commit"]
