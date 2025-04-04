FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Make the entry point script executable
RUN chmod +x ./src/index.js

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3500
ENV SWAGGER_URL=https://api.coredatastore.com/swagger/v1/swagger.json
ENV API_BASE_URL=https://api.coredatastore.com

# Expose port
EXPOSE 3500

# Set user to non-root for security
USER node

# Start the application
CMD ["node", "src/index.js"]
