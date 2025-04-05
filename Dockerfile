# Multi-stage build for environment-specific deployments
FROM node:20-alpine AS base

# Create app directory
WORKDIR /app

# Set npm configurations to avoid issues
RUN npm config set registry https://registry.npmjs.org/
RUN npm config set fetch-retry-maxtimeout 300000

# Copy package files and npmrc to disable scripts
COPY package*.json .npmrc ./

# Install production dependencies (scripts disabled via .npmrc)
RUN npm install --omit=dev

# Copy application code
COPY . .

# Make the entry point script executable
RUN chmod +x ./src/index.js

# Build argument for environment selection
# Default to production if not specified
ARG APP_ENV=production
ENV NODE_ENV=${APP_ENV}

# Expose port
ENV PORT=3500
EXPOSE ${PORT}

# Add health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Set user to non-root for security
USER node

# Start the application
CMD ["node", "src/index.js"]
