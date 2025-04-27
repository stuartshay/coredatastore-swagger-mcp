# CoreDataStore Swagger MCP Server

[![Deploy to Google Cloud Run](https://github.com/stuartshay/coredatastore-swagger-mcp/actions/workflows/deploy.yml/badge.svg)](https://github.com/stuartshay/coredatastore-swagger-mcp/actions/workflows/deploy.yml)

A [Model Context Protocol (MCP)](https://modelcontextprotocol.ai/) server that dynamically generates MCP tools from the CoreDataStore API's Swagger/OpenAPI specification. This server enables AI assistants to interact with NYC landmarks data through a standardized protocol.

**Production URL:** [mcp.coredatastore.com](https://mcp.coredatastore.com)

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

### Development Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/stuartshay/coredatastore-swagger-mcp.git
   cd coredatastore-swagger-mcp
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up Git hooks (for code quality):

   ```bash
   npm run hooks:setup
   ```

   This sets up Husky and lint-staged to ensure all committed code is properly linted and formatted.

4. Start the development server:
   ```bash
   npm run dev
   ```

### Code Quality Tools

The project uses several tools to maintain code quality:

- **ESLint**: Lints JavaScript code
- **Prettier**: Formats code consistently
- **Husky**: Runs pre-commit hooks
- **lint-staged**: Runs linters on staged files

Pre-commit hooks will automatically:

- Run ESLint to check for code issues
- Run Prettier to ensure consistent formatting
- Prevent commits with linting errors

You can manually run these tools with:

```bash
npm run lint        # Check code with ESLint
npm run lint:fix    # Fix linting issues
npm run format      # Format code with Prettier
npm run format:all  # Format all code files
```

### Environment Variables

The server can be configured using the following environment variables:

| Variable       | Description                              | Default                                                 |
| -------------- | ---------------------------------------- | ------------------------------------------------------- |
| `PORT`         | The port on which the server will listen | `3500`                                                  |
| `SWAGGER_URL`  | URL of the Swagger/OpenAPI specification | `https://api.coredatastore.com/swagger/v1/swagger.json` |
| `API_BASE_URL` | Base URL for the API requests            | `https://api.coredatastore.com`                         |

### Using with MCP Client

#### Option 1: Production Server (Recommended)

Use the publicly deployed MCP server:

```json
{
  "mcpServers": {
    "coredatastore-swagger-mcp": {
      "autoApprove": [],
      "disabled": false,
      "timeout": 60,
      "command": "curl",
      "args": ["https://mcp.coredatastore.com/mcp"],
      "transportType": "stdio"
    }
  }
}
```

#### Option 2: Local Development

For local development or customization, run your own instance:

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

## Deployment

### Production Deployment

The server is deployed and publicly available at:

```
https://mcp.coredatastore.com
```

This is a fully managed instance running on Google Cloud Run, providing access to all the CoreDataStore API capabilities through the MCP protocol.

### Deploying to Google Cloud Run

The repository includes a GitHub Actions workflow for deploying to Google Cloud Run. To use it:

1. Set up the following secrets in your GitHub repository:

   - `GCP_PROJECT_ID`: Your Google Cloud project ID
   - `GCP_SA_KEY`: A service account key with permissions to deploy to Cloud Run

2. Push to the master branch or manually trigger the workflow.

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
# Important: Install dependencies first
npm install

# Run in development mode with hot reloading
npm run dev

# Run linting
npm run lint

# Run linting with auto-fix
npm run lint:fix

# Format code with Prettier
npm run format

# Check if files are formatted correctly
npm run format:check

# Run both linting and formatting
npm run format:all

# Set up Git hooks
npm run hooks:setup
```

> **Note:** If you encounter any dependency issues or things aren't working correctly,
> run `./scripts/setup-dev.sh --clean` to clean your installation and reinstall everything.
> This script will ensure all tools are properly installed and configured.

### Git Hooks

This project uses Husky and lint-staged to enforce code quality on commit:

1. **Pre-commit Hook**: Automatically runs ESLint and Prettier on staged files
2. **Setup**: Run `npm run hooks:setup` to set up the Git hooks

The pre-commit hook ensures that:

- Code is properly formatted with Prettier
- ESLint rules are enforced
- No code quality issues are committed

### VSCode Setup

This project includes VSCode configuration files to enhance your development experience:

- **Settings**: Preconfigured editor settings for consistent code style
- **Launch Configurations**: Debug configurations for the Node.js application
- **Extensions**: Recommended extensions for JavaScript/Node.js development

#### Recommended Extensions

Install the recommended extensions to get the best development experience:

- **ESLint**: JavaScript linting
- **Prettier**: Code formatting
- **Docker**: Container support
- **OpenAPI (Swagger) Editor**: API specification editing
- **GitLens**: Enhanced Git capabilities
- **GitHub Actions**: Workflow visualization

Simply open the Extensions view in VSCode and search for `@recommended` to see all the recommended extensions for this project.

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
