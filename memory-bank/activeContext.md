# CoreDataStore Swagger MCP Server - Active Context

## Current Focus
We are currently focusing on fixing the GitHub Actions deployment workflow. The deployment to Google Cloud Run was failing due to authentication issues with Google's container registries.

## Recent Changes
1. **VSCode Configuration Setup**: Added complete VSCode configuration to enhance development experience.
   - Created `.vscode/settings.json` with linting, formatting, and editor preferences
   - Added `.vscode/launch.json` with debug configurations for Node.js development
   - Created `.vscode/extensions.json` with recommended extensions for this project
   - Added ESLint configuration (`.eslintrc.json`) aligned with project's coding standards
   - Added Prettier configuration (`.prettierrc`) for consistent code formatting
   - Added EditorConfig (`.editorconfig`) for editor-agnostic style definitions
   - Added JavaScript configuration (`jsconfig.json`) for better IntelliSense

2. **Code Quality Tooling Enhancements**:
   - Using ESLint version 8.57.0 (compatible with .eslintrc.json configuration)
   - Added Prettier version 3.2.5 for code formatting
   - Added Husky and lint-staged for Git hooks
   - Created script for setting up pre-commit hooks (`scripts/setup-git-hooks.sh`)
   - Created script for code formatting and linting (`scripts/format-code.sh`)
   - Added npm scripts for linting and formatting tasks
   - Fixed dependency loop issue in Git hooks and formatting scripts
   - Separated Git hooks setup from npm prepare lifecycle to prevent loops

2. **GitHub Actions Workflow Update**: We've modified the deployment workflow to use Google Artifact Registry consistently instead of mixing Container Registry and Artifact Registry references.
   - Changed image name format from `gcr.io/PROJECT_ID/...` to `us-east4-docker.pkg.dev/PROJECT_ID/coredatastore/...`
   - Added a step to create the Artifact Registry repository if it doesn't exist
   - Updated step names to reflect the correct registry type
   - Fixed YAML syntax issues in the workflow file

3. **Service Account Authentication**: Verified the service account has the necessary permissions to interact with Artifact Registry and Cloud Run.

## Active Issues
1. **Deployment Authentication Error**: The previous deployment was failing with this error:
   ```
   unauthorized: You don't have the needed permissions to perform this operation, and you may have invalid credentials. To authenticate your request, follow the steps in: https://cloud.google.com/container-registry/docs/advanced-authentication
   ```
   This was caused by a mismatch between the Docker authentication configuration (for Artifact Registry) and the image name format (for Container Registry).

## Next Steps
1. ~~**Apply ESLint and Prettier to Codebase**~~: Formatting and linting has been successfully applied to the codebase.

2. **Verify Deployment Success**: After the workflow changes, we need to verify that the deployment succeeds without authentication errors.

2. **Review Service Account Permissions**: If deployment issues persist, we should review the service account permissions to ensure it has:
   - `roles/artifactregistry.writer` for pushing images
   - `roles/run.admin` for deploying to Cloud Run
   - `roles/iam.serviceAccountUser` for acting as the service account

3. **Potential Enhancements**:
   - Add automated tests to verify MCP tool generation and functionality
   - Implement caching for Swagger specification to improve startup performance
   - Enhance error handling and reporting for API requests
   - Add monitoring and analytics for tool usage

## Current Decisions
1. **Google Artifact Registry**: We've decided to use Google Artifact Registry instead of the older Container Registry for Docker images, as it's Google's recommended and more feature-rich container registry service.

2. **Region Selection**: We're using `us-east4` for both Artifact Registry and Cloud Run services to minimize latency and data transfer costs.

3. **Repository Structure**: The "coredatastore" repository in Artifact Registry will contain all Docker images related to this project.

## Open Questions
1. Should we implement versioning for the Docker images beyond the GitHub run number?
2. Do we need to implement any additional authentication mechanisms for the API requests?
3. Would it be beneficial to add resource-based access controls for the deployed service?
