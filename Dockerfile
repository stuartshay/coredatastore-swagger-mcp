FROM node:20-alpine

# Create app directory
WORKDIR /app

# Set npm configurations to avoid issues
RUN npm config set registry https://registry.npmjs.org/
RUN npm config set fetch-retry-maxtimeout 300000

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

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
EXPOSE ${PORT}

# Set user to non-root for security
USER node

# Start the application
CMD ["node", "src/index.js"]
