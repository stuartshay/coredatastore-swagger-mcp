# CoreDataStore Swagger MCP Server - Technical Context

## Technologies Used

### Core Technologies
- **Node.js**: Server-side JavaScript runtime (v18+ required)
- **JavaScript (ES Modules)**: Modern JavaScript with ES module syntax
- **Express.js**: Web server framework for API proxying and health checks
- **Model Context Protocol**: Standard for tool-based AI assistant integrations
- **Swagger/OpenAPI**: API specification standard used to generate tools

### Key Dependencies
- **@modelcontextprotocol/sdk**: MCP server implementation
- **express**: HTTP server framework
- **node-fetch**: HTTP client for API requests
- **nodemon**: Development tool for hot reloading (dev only)
- **eslint**: Code quality and style checking (dev only)

### Infrastructure
- **Docker**: Containerization for consistent deployment
- **GitHub Actions**: CI/CD pipeline for testing and deployment
- **Google Cloud Run**: Serverless deployment platform
- **Google Artifact Registry**: Container registry for Docker images

## Development Setup

### Local Development
```bash
# Clone repository
git clone https://github.com/stuartshay/coredatastore-swagger-mcp.git
cd coredatastore-swagger-mcp

# Install dependencies
npm install

# Make entry point executable
chmod +x ./src/index.js

# Start server in development mode
npm run dev
```

### Environment Configuration
Local development requires the following environment variables:
- `SWAGGER_URL`: URL to the Swagger specification (default: https://api.coredatastore.com/swagger/v1/swagger.json)
- `API_BASE_URL`: Base URL for API requests (default: https://api.coredatastore.com)
- `PORT`: Port for the Express server (default: 3500)

### Docker Development
```bash
# Build Docker image
docker build -t coredatastore-swagger-mcp .

# Run Docker container
docker run -p 3500:3500 coredatastore-swagger-mcp
```

## Technical Constraints

### MCP Protocol Limitations
- Limited to tool-based interactions
- No streaming responses supported
- No direct file upload/download capabilities
- Requires a stdio transport for communication

### API Integration Limitations
- Dependent on stable Swagger specification
- Cannot handle endpoints missing from Swagger
- Limited support for complex nested schemas
- Authentication methods limited to those exposed via Swagger

### Performance Considerations
- Response time affected by CoreDataStore API performance
- Tool generation happens at startup, affecting initialization time
- No caching mechanism for API responses
- Single-threaded Node.js process

### Cloud Run Constraints
- Memory limited to configuration settings
- Cold starts may impact intermittent usage
- Request timeout limits
- Stateless operation required

## Deployment Pipeline

### GitHub Actions Workflow
1. **Build**: Constructs Docker image with application
2. **Publish**: Pushes image to Google Artifact Registry
3. **Deploy**: Deploys image to Google Cloud Run

### Required Secrets
- `GCP_PROJECT_ID`: Google Cloud project identifier
- `GCP_SA_KEY`: Service account key with necessary permissions

### Cloud Run Configuration
- Memory allocation: 256MB
- CPU allocation: 1 vCPU
- Concurrency: 80 requests per instance
- Region: us-east4
- Unauthenticated access for public availability

## Testing Strategy

### Manual Testing
- Health check endpoint verification
- Tool listing verification
- Tool execution testing for key endpoints
- Direct API proxy testing

### Automated Testing
- Currently limited to workflow deployment validation
- Future enhancements may include:
  - Unit tests for tool generation
  - Integration tests for API communication
  - End-to-end tests for MCP client interaction

## Maintenance Considerations

### Dependency Management
- Regular updates to @modelcontextprotocol/sdk for protocol changes
- Security updates for Express and other dependencies
- Node.js version compatibility checks

### Monitoring
- Cloud Run built-in monitoring
- HTTP response code tracking
- Error rate monitoring
- Request latency metrics
