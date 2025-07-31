FROM oven/bun:alpine

# Set the working directory as /app
WORKDIR /app

# Copy the bun.lockb and package.json files to the working directory
COPY bun.lockb package.json ./
RUN bun install

# Copy the rest of the application code
COPY . .

EXPOSE 3000

RUN apk add --no-cache ca-certificates && update-ca-certificates

# Default command to run the application
ENTRYPOINT ["bun", "run", "dev"]