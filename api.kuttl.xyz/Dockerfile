# STAGE 1: Build the binary
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Build the full API server (not the proxy)
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/server

# STAGE 2: Run the binary
FROM alpine:latest
RUN adduser -D appuser
USER appuser
WORKDIR /app
# Copy the binary and migrations from the builder stage
COPY --from=builder /app/main .
COPY --from=builder /app/migrations ./migrations
CMD ["./main"]
