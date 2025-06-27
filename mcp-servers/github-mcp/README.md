# GitHub MCP Server

A Model Context Protocol (MCP) server that provides GitHub API functionality to Claude.

## Features

- Get repository information
- List and get pull requests
- Search repositories
- Get file content from repositories
- List user repositories
- Create issues

## Setup

1. Install dependencies:
```bash
cd mcp-servers/github-mcp
npm install
```

2. Build the server:
```bash
npm run build
```

3. Set your GitHub token:
```bash
export GITHUB_TOKEN="your-github-personal-access-token"
```

## Configuration

Add to your Claude MCP settings (usually in `~/.config/claude/mcp.json`):

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": ["/path/to/careerAI/mcp-servers/github-mcp/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "your-github-token"
      }
    }
  }
}
```

## Available Tools

- `github_get_repository`: Get repository information
- `github_get_pull_request`: Get specific pull request details
- `github_list_pull_requests`: List pull requests for a repository
- `github_search_repositories`: Search GitHub repositories
- `github_get_file_content`: Get file content from a repository
- `github_list_user_repos`: List repositories for a user
- `github_create_issue`: Create a new issue

## Development

Run in development mode:
```bash
npm run dev
```

## Security

Never commit your GitHub token. Always use environment variables.