# GitHub Integration

This module provides GitHub API integration for the CareerAI project using the official Octokit REST API client.

## Setup

1. **Generate a GitHub Personal Access Token (PAT)**:
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Click "Generate new token"
   - Select the scopes you need (e.g., `repo`, `read:user`)
   - Copy the generated token

2. **Set the environment variable**:
   ```bash
   # Add to your .env.local file
   GITHUB_TOKEN=your_github_personal_access_token
   ```

## Usage

### Basic Client Usage

```typescript
import { githubClient, githubOperations } from "@/lib/github/client";

// Get authenticated user
const user = await githubOperations.getAuthenticatedUser();

// List repositories
const repos = await githubOperations.listUserRepos();

// Search repositories
const searchResults = await githubOperations.searchRepositories("react");

// Get repository details
const repo = await githubOperations.getRepository("owner", "repo-name");
```

### API Endpoints

The following API endpoints are available:

- `GET /api/github/repos` - List repositories for authenticated user
- `GET /api/github/repos?username=someuser` - List repositories for a specific user
- `GET /api/github/search?q=query` - Search GitHub repositories

### Example Component

See `components/github-repos-example.tsx` for a complete example of how to use the GitHub integration in a React component.

## Available Operations

- `getAuthenticatedUser()` - Get the authenticated user's information
- `searchRepositories(query)` - Search for repositories
- `getRepository(owner, repo)` - Get repository details
- `listUserRepos(username?)` - List repositories for a user
- `createIssue(owner, repo, title, body?)` - Create an issue
- `createPullRequest(owner, repo, title, head, base, body?)` - Create a pull request
- `getFileContent(owner, repo, path)` - Get file content from a repository
- `searchCode(query)` - Search for code across GitHub

## Security Notes

- Never commit your GitHub token to version control
- The token should be stored in environment variables
- Use tokens with minimal required permissions
- Rotate tokens regularly

## Extending the Integration

To add more GitHub operations, edit `/lib/github/client.ts` and add new methods to the `githubOperations` object. Refer to the [Octokit documentation](https://octokit.github.io/rest.js/) for available API methods.