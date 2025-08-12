# Build stage
FROM oven/bun:alpine AS builder

# Set the working directory as /app
WORKDIR /app

# Copy the bun.lockb and package.json files to the working directory
COPY bun.lockb package.json ./

# Install all dependencies (including devDependencies for building)
RUN bun install

# Copy the rest of the application code
COPY . .

# Build the application (this will create optimized bundles with sourcemaps)
RUN bun build src/index.ts --outdir ./dist --target bun --sourcemap

# Production stage
FROM oven/bun:alpine AS production

# Set the working directory as /app
WORKDIR /app

# Copy package.json and bun.lockb for production dependencies
COPY package.json bun.lockb ./

# Install only production dependencies
RUN bun install --production

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist

# Copy any additional runtime files that might be needed
COPY --from=builder /app/src/schema.graphql ./src/schema.graphql
COPY --from=builder /app/drizzle ./drizzle

# Install ca-certificates for SSL/TLS
RUN apk add --no-cache ca-certificates && update-ca-certificates

EXPOSE 3000

# Run the built application
ENTRYPOINT ["bun", "run", "dist/index.js"]