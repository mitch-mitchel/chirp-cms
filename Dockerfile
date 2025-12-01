# ================================
# CHIRP CMS - Production Dockerfile
# ================================
# Multi-stage build for Next.js + Payload CMS
# Optimized for small image size and fast builds

# --------------------------------
# Stage 1: Dependencies
# --------------------------------
FROM node:20-alpine AS deps

# Install dependencies for native modules (sharp, better-sqlite3)
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (skip prepare scripts like husky)
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# --------------------------------
# Stage 2: Builder
# --------------------------------
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies, skip prepare scripts)
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Generate Payload types
RUN npm run generate:types

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV ESLINT_NO_DEV_ERRORS=true
ENV DISABLE_ESLINT_PLUGIN=true

RUN npm run build

# --------------------------------
# Stage 3: Runner (Production)
# --------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies for sharp
RUN apk add --no-cache \
    libc6-compat \
    vips-dev

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/payload.config.ts ./
COPY --from=builder /app/payload-types.ts ./
COPY --from=builder /app/tsconfig.json ./

# Copy Next.js build output
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy production node_modules
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy source files needed at runtime
COPY --from=builder --chown=nextjs:nodejs /app/src ./src

# Copy scripts directory needed for poller
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Create media directory with proper permissions
RUN mkdir -p media && chown nextjs:nodejs media

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=development
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check (using /admin endpoint since Payload CMS intercepts /api routes)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/admin', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start the application
CMD ["npm", "start"]
