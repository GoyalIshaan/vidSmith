FROM golang:tip-alpine3.22 AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o transcoder .


FROM alpine:3.22

RUN apk add --no-cache ffmpeg ca-certificates && update-ca-certificates


COPY --from=builder /app/transcoder /usr/local/bin/transcoder

RUN mkdir -p /tmp && chmod 1777 /tmp

ENTRYPOINT ["/usr/local/bin/transcoder"]