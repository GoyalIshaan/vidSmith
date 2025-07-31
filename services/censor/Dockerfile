FROM golang:tip-alpine3.22 AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o censor-service .


FROM alpine:3.22

EXPOSE 4000

RUN apk add --no-cache ca-certificates && update-ca-certificates


COPY --from=builder /app/censor-service /usr/local/bin/censor-service

ENTRYPOINT ["/usr/local/bin/censor-service"]