#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Octokit } from "@octokit/rest";
import { z } from "zod";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

if (!GITHUB_TOKEN) {
  console.error("Error: GITHUB_TOKEN environment variable is required");
  process.exit(1);
}

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

const server = new Server(
  {
    name: "github-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool schemas
const GetRepositorySchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
});

const GetPullRequestSchema = z.object({
  owner: z.string().describe("Repository owner"),
  repo: z.string().describe("Repository name"),
  pull_number: z.number().describe("Pull request number"),
});

const ListPullRequestsSchema = z.object({
  owner: z.string().describe("Repository owner"),
  repo: z.string().describe("Repository name"),
  state: z.enum(["open", "closed", "all"]).optional().default("open"),
  limit: z.number().optional().default(10).describe("Maximum number of PRs to return"),
});

const SearchRepositoriesSchema = z.object({
  query: z.string().describe("Search query"),
  limit: z.number().optional().default(10),
});

const GetFileContentSchema = z.object({
  owner: z.string().describe("Repository owner"),
  repo: z.string().describe("Repository name"),
  path: z.string().describe("File path in the repository"),
  ref: z.string().optional().describe("Branch, tag, or commit SHA"),
});

const ListUserReposSchema = z.object({
  username: z.string().optional().describe("Username (defaults to authenticated user)"),
  type: z.enum(["all", "owner", "member"]).optional().default("all"),
  sort: z.enum(["created", "updated", "pushed", "full_name"]).optional().default("updated"),
  limit: z.number().optional().default(30),
});

const CreateIssueSchema = z.object({
  owner: z.string().describe("Repository owner"),
  repo: z.string().describe("Repository name"),
  title: z.string().describe("Issue title"),
  body: z.string().optional().describe("Issue body"),
  labels: z.array(z.string()).optional().describe("Labels to apply"),
});

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "github_get_repository",
        description: "Get information about a GitHub repository",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string", description: "Repository owner" },
            repo: { type: "string", description: "Repository name" },
          },
          required: ["owner", "repo"],
        },
      },
      {
        name: "github_get_pull_request",
        description: "Get information about a specific pull request",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string", description: "Repository owner" },
            repo: { type: "string", description: "Repository name" },
            pull_number: { type: "number", description: "Pull request number" },
          },
          required: ["owner", "repo", "pull_number"],
        },
      },
      {
        name: "github_list_pull_requests",
        description: "List pull requests for a repository",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string", description: "Repository owner" },
            repo: { type: "string", description: "Repository name" },
            state: { 
              type: "string", 
              enum: ["open", "closed", "all"],
              description: "Filter by state",
              default: "open"
            },
            limit: { 
              type: "number", 
              description: "Maximum number of PRs to return",
              default: 10
            },
          },
          required: ["owner", "repo"],
        },
      },
      {
        name: "github_search_repositories",
        description: "Search for GitHub repositories",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            limit: { type: "number", description: "Maximum results", default: 10 },
          },
          required: ["query"],
        },
      },
      {
        name: "github_get_file_content",
        description: "Get the content of a file from a repository",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string", description: "Repository owner" },
            repo: { type: "string", description: "Repository name" },
            path: { type: "string", description: "File path" },
            ref: { type: "string", description: "Branch/tag/SHA", default: "main" },
          },
          required: ["owner", "repo", "path"],
        },
      },
      {
        name: "github_list_user_repos",
        description: "List repositories for a user",
        inputSchema: {
          type: "object",
          properties: {
            username: { type: "string", description: "Username (optional, defaults to authenticated user)" },
            type: { 
              type: "string", 
              enum: ["all", "owner", "member"],
              description: "Type of repositories",
              default: "all"
            },
            sort: {
              type: "string",
              enum: ["created", "updated", "pushed", "full_name"],
              description: "Sort field",
              default: "updated"
            },
            limit: { type: "number", description: "Maximum results", default: 30 },
          },
        },
      },
      {
        name: "github_create_issue",
        description: "Create a new issue in a repository",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string", description: "Repository owner" },
            repo: { type: "string", description: "Repository name" },
            title: { type: "string", description: "Issue title" },
            body: { type: "string", description: "Issue body" },
            labels: {
              type: "array",
              items: { type: "string" },
              description: "Labels to apply"
            },
          },
          required: ["owner", "repo", "title"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "github_get_repository": {
        const { owner, repo } = GetRepositorySchema.parse(args);
        const { data } = await octokit.repos.get({ owner, repo });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                name: data.name,
                full_name: data.full_name,
                description: data.description,
                private: data.private,
                html_url: data.html_url,
                created_at: data.created_at,
                updated_at: data.updated_at,
                pushed_at: data.pushed_at,
                language: data.language,
                stargazers_count: data.stargazers_count,
                watchers_count: data.watchers_count,
                forks_count: data.forks_count,
                open_issues_count: data.open_issues_count,
                default_branch: data.default_branch,
                topics: data.topics,
              }, null, 2),
            },
          ],
        };
      }

      case "github_get_pull_request": {
        const { owner, repo, pull_number } = GetPullRequestSchema.parse(args);
        const { data } = await octokit.pulls.get({ owner, repo, pull_number });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                number: data.number,
                state: data.state,
                title: data.title,
                body: data.body,
                html_url: data.html_url,
                created_at: data.created_at,
                updated_at: data.updated_at,
                closed_at: data.closed_at,
                merged_at: data.merged_at,
                merge_commit_sha: data.merge_commit_sha,
                user: data.user?.login || "unknown",
                head: {
                  ref: data.head.ref,
                  sha: data.head.sha,
                },
                base: {
                  ref: data.base.ref,
                  sha: data.base.sha,
                },
                merged: data.merged,
                mergeable: data.mergeable,
                additions: data.additions,
                deletions: data.deletions,
                changed_files: data.changed_files,
              }, null, 2),
            },
          ],
        };
      }

      case "github_list_pull_requests": {
        const { owner, repo, state, limit } = ListPullRequestsSchema.parse(args);
        const { data } = await octokit.pulls.list({
          owner,
          repo,
          state: state as "open" | "closed" | "all",
          per_page: limit,
        });
        
        const prs = data.map(pr => ({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          user: pr.user?.login,
          html_url: pr.html_url,
          merged_at: pr.merged_at,
        }));
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(prs, null, 2),
            },
          ],
        };
      }

      case "github_search_repositories": {
        const { query, limit } = SearchRepositoriesSchema.parse(args);
        const { data } = await octokit.search.repos({
          q: query,
          per_page: limit,
        });
        
        const repos = data.items.map(repo => ({
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          html_url: repo.html_url,
          stargazers_count: repo.stargazers_count,
          language: repo.language,
          updated_at: repo.updated_at,
        }));
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                total_count: data.total_count,
                items: repos,
              }, null, 2),
            },
          ],
        };
      }

      case "github_get_file_content": {
        const { owner, repo, path, ref } = GetFileContentSchema.parse(args);
        const { data } = await octokit.repos.getContent({
          owner,
          repo,
          path,
          ref,
        });
        
        if ("content" in data && data.type === "file") {
          const content = Buffer.from(data.content, "base64").toString("utf-8");
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  name: data.name,
                  path: data.path,
                  sha: data.sha,
                  size: data.size,
                  content: content,
                }, null, 2),
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: "Not a file or content not available" }),
              },
            ],
          };
        }
      }

      case "github_list_user_repos": {
        const { username, type, sort, limit } = ListUserReposSchema.parse(args);
        
        const { data } = username
          ? await octokit.repos.listForUser({
              username,
              type: type as "all" | "owner" | "member",
              sort: sort as "created" | "updated" | "pushed" | "full_name",
              per_page: limit,
            })
          : await octokit.repos.listForAuthenticatedUser({
              type: type as "all" | "owner" | "member",
              sort: sort as "created" | "updated" | "pushed" | "full_name",
              per_page: limit,
            });
        
        const repos = data.map(repo => ({
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          private: repo.private,
          html_url: repo.html_url,
          language: repo.language,
          stargazers_count: repo.stargazers_count,
          updated_at: repo.updated_at,
        }));
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(repos, null, 2),
            },
          ],
        };
      }

      case "github_create_issue": {
        const { owner, repo, title, body, labels } = CreateIssueSchema.parse(args);
        const { data } = await octokit.issues.create({
          owner,
          repo,
          title,
          body,
          labels,
        });
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                number: data.number,
                state: data.state,
                title: data.title,
                body: data.body,
                html_url: data.html_url,
                created_at: data.created_at,
                user: data.user?.login || "unknown",
                labels: data.labels,
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
          }),
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});