# CoreDataStore Swagger MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.ai/) server that dynamically generates MCP tools from the CoreDataStore API's Swagger/OpenAPI specification. This server enables AI assistants to interact with NYC landmarks data through a standardized protocol.

## Overview

This MCP server connects to the [CoreDataStore API](https://api.coredatastore.com/) and does the following:

1. Fetches and parses the Swagger/OpenAPI specification
2. Dynamically creates MCP tools based on the API endpoints
3. Provides a proxy for direct API requests
4. Enables AI assistants to access NYC landmarks data

## Features

- **Dynamic Tool Generation**: Automatically creates tools from the Swagger specification
- **Proxy Support**: Provides a local proxy for direct API access
- **Health Checks**: Includes health check endpoints for monitoring
- **Docker Support**: Includes Dockerfile for containerization
- **Google Cloud Deployment**: Includes GitHub Actions workflow for Cloud Run deployment

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/stuartshay/coredatastore-swagger-mcp.git
cd coredatastore-swagger-mcp

# Install dependencies
npm install

# Make the entry point executable
chmod +x ./src/index.js

# Start the server
npm start
```

### Environment Variables

The server can be configured using the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | The port on which the server will listen | `3500` |
| `SWAGGER_URL` | URL of the Swagger/OpenAPI specification | `https://api.coredatastore.com/swagger/v1/swagger.json` |
| `API_BASE_URL` | Base URL for the API requests | `https://api.coredatastore.com` |

### Using with MCP Client

Add the following configuration to your MCP client settings:

```json
{
  "mcpServers": {
    "coredatastore-swagger-mcp": {
      "autoApprove": [],
      "disabled": false,
      "timeout": 60,
      "command": "node",
      "args": ["path/to/coredatastore-swagger-mcp/src/index.js"],
      "env": {
        "SWAGGER_URL": "https://api.coredatastore.com/swagger/v1/swagger.json",
        "API_BASE_URL": "https://api.coredatastore.com",
        "PORT": "3500"
      },
      "transportType": "stdio"
    }
  }
}
```

## Docker

You can build and run the server using Docker:

```bash
# Build the Docker image
docker build -t coredatastore-swagger-mcp .

# Run the container
docker run -p 3500:3500 coredatastore-swagger-mcp
```

## Deployment to Google Cloud Run

The repository includes a GitHub Actions workflow for deploying to Google Cloud Run. To use it:

1. Set up the following secrets in your GitHub repository:
   - `GCP_PROJECT_ID`: Your Google Cloud project ID
   - `GCP_SA_KEY`: A service account key with permissions to deploy to Cloud Run

2. Push to the main branch or manually trigger the workflow.

### Manually deploying to Cloud Run

```bash
# Build the image
docker build -t gcr.io/[PROJECT_ID]/coredatastore-swagger-mcp .

# Push to Google Container Registry
docker push gcr.io/[PROJECT_ID]/coredatastore-swagger-mcp

# Deploy to Cloud Run
gcloud run deploy coredatastore-swagger-mcp \
  --image gcr.io/[PROJECT_ID]/coredatastore-swagger-mcp \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## API Endpoints

- `GET /health`: Health check endpoint that returns the server status and number of available tools
- `GET /api/LpcReport/:lpcId`: Proxy endpoint for fetching landmark data by ID

## Development

```bash
# Install dependencies including dev dependencies
npm install

# Run in development mode with hot reloading
npm run dev

# Run linting
npm run lint
```

## Architecture

The server is built with the following components:

- **MCP Server**: Implements the Model Context Protocol for tool handling
- **Express Server**: Provides HTTP endpoints for proxy functionality
- **Swagger Integration**: Fetches and parses the API specification
- **Tool Generator**: Creates MCP tools from API endpoints

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [CoreDataStore API](https://api.coredatastore.com/) for providing NYC landmarks data
- [Model Context Protocol](https://modelcontextprotocol.ai/) for the standardized protocol
