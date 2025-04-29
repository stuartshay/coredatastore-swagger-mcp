# CoreDataStore Swagger MCP Server - Active Context

## Current Focus
We're currently focused on converting the CoreDataStore Swagger MCP server to use SSE transport protocol instead of StdioServerTransport to enable remote access functionality. This will allow the server to function as a fully-featured remote MCP server that can be accessed by AI assistants like Cline through the SSE protocol.

## Recent Changes
1. **Docker Configuration Fix**: Modified the Dockerfile to create the logs directory during the build process and set the appropriate permissions before switching to the non-root "node" user. This resolves the "Error: EACCES: permission denied, mkdir '/app/logs'" issue that was occurring when deploying to GCP.

2. **File-based Logging System**: Implemented a comprehensive file-based logging system that writes all server requests and responses to log files in a dedicated logs directory. Key features include:
   - Timestamped log file names (yyyy_mm_dd_hh_mm format) for easy sorting and identification
   - Automatic log rotation based on configurable time intervals
   - Exclusion of logs from source control via .gitignore
   - Correlation IDs to track requests across the system
   - Detailed logging of MCP requests and API calls

3. **Local MCP Server Setup**: Due to 403 Forbidden errors from the remote server at `mcp.coredatastore.com`, we've set up the MCP server to run locally. The local server successfully fetches the Swagger specification and creates MCP tools.

4. **Documentation Update**: Updated README.md with the production URL and instructions for using the deployed server.

5. **Code Quality Improvements**:
   - Fixed ESLint warnings in test files (April 6, 2025)
   - Removed unused imports (sanitizeData from logger.test.js, ErrorHandler from validator.test.js)
   - Added eslint-disable directive for console statements in test files
   - Successfully ran npm run lint:fix to resolve all linting issues

6. **VSCode Configuration Setup**: Added complete VSCode configuration to enhance development experience.
   - Created `.vscode/settings.json` with linting, formatting, and editor preferences
   - Added `.vscode/launch.json` with debug configurations for Node.js development
   - Created `.vscode/extensions.json` with recommended extensions for this project
   - Added ESLint configuration (`.eslintrc.json`) aligned with project's coding standards
   - Added Prettier configuration (`.prettierrc`) for consistent code formatting
   - Added EditorConfig (`.editorconfig`) for editor-agnostic style definitions
   - Added JavaScript configuration (`jsconfig.json`) for better IntelliSense

7. **Code Quality Tooling Enhancements**:
   - Using ESLint version 8.57.0 (compatible with .eslintrc.json configuration)
   - Added Prettier version 3.2.5 for code formatting
   - Added Husky and lint-staged for Git hooks
   - Created script for setting up pre-commit hooks (`scripts/setup-git-hooks.sh`)
   - Created script for code formatting and linting (`scripts/format-code.sh`)
   - Added npm scripts for linting and formatting tasks
   - Fixed dependency loop issue in Git hooks and formatting scripts
   - Separated Git hooks setup from npm prepare lifecycle to prevent loops

8. **GitHub Actions Workflow Update**: We've modified the deployment workflow to use Google Artifact Registry consistently instead of mixing Container Registry and Artifact Registry references.
   - Changed image name format from `gcr.io/PROJECT_ID/...` to `us-east4-docker.pkg.dev/PROJECT_ID/coredatastore/...`
   - Added a step to create the Artifact Registry repository if it doesn't exist
   - Updated step names to reflect the correct registry type
   - Fixed YAML syntax issues in the workflow file

9. **Service Account Authentication**: Verified the service account has the necessary permissions to interact with Artifact Registry and Cloud Run.

## Active Issues

1. **Local Development Setup**: Using the local MCP server for development, which requires the server to be running whenever we want to use the MCP tools.

## Recent Accomplishments

1. **Core Functionality Implementations**:
   - Implemented input validation using Ajv JSON Schema validation
   - Added standardized error handling and response formatting
   - Implemented structured logging system with different log levels
   - Added API response caching with time-based expiration
   - Implemented support for paginated API responses
   - Created utility modules for all of the above

## Next Steps
1. **Enhance Local Development Experience**: Consider improving the local development setup to make it more seamless:
   - Add scripts to easily start/stop the local MCP server
   - Automate the MCP configuration process

2. **Update Documentation**: Update relevant documentation to reflect the current state of the MCP server access.

3. **Implement Automated Testing**: Now that we have the core functionality in place, we should add:
   - ~~Unit tests for utility classes~~ (Completed)
   - Integration tests for API interactions
   - End-to-end tests for MCP tool execution

4. **Review Service Account Permissions**: If deployment issues persist, we should review the service account permissions to ensure it has:
   - `roles/artifactregistry.writer` for pushing images
   - `roles/run.admin` for deploying to Cloud Run
   - `roles/iam.serviceAccountUser` for acting as the service account

5. **Additional Potential Enhancements**:
   - Add more API endpoints to the Express proxy
   - Implement more refined error handling for specific API errors
   - Add monitoring and analytics for tool usage

## Current Decisions
1. **SSE Transport Protocol**: We've decided to implement the SSE transport protocol in place of the current StdioServerTransport to enable remote access functionality:
   - This will allow AI assistants to connect to the MCP server remotely
   - No authentication will be implemented in the initial version since the API is read-only
   - Standard logging will be maintained for SSE connections
   - The server will continue to run on port 3500 to avoid conflicts with other services

2. **Remote MCP Client Configuration**: Once implemented, clients can connect to the server using this configuration:
   ```json
   "coredatastore-swagger-mcp": {
     "autoApprove": [],
     "disabled": false,
     "timeout": 60,
     "url": "http://node-2.internal:3500/sse",
     "transportType": "sse"
   }
   ```

3. **McpServer Implementation**: We'll migrate from the older Server class to the newer McpServer class from the MCP SDK, which provides better support for the SSE transport protocol.

4. **Google Artifact Registry**: We're still using Google Artifact Registry for Docker images when deploying, as it's Google's recommended and more feature-rich container registry service.

5. **Region Selection**: We're continuing to use `us-east4` for both Artifact Registry and Cloud Run services to minimize latency and data transfer costs.

## Open Questions
1. Should we implement authentication for our local MCP server to match potential security requirements of the remote server?
2. Should we implement versioning for the Docker images beyond the GitHub run number?
3. Do we need to implement any additional authentication mechanisms for the API requests?
4. Would it be beneficial to add resource-based access controls for the deployed service?
