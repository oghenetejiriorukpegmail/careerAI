import { Octokit } from "@octokit/rest";

// Initialize GitHub client with personal access token
export function createGitHubClient(token?: string) {
  // Try to get token from multiple sources
  const authToken = token || 
    process.env.GITHUB_TOKEN || 
    process.env.NEXT_PUBLIC_GITHUB_TOKEN;
  
  if (!authToken) {
    throw new Error("GitHub token not found. Please set GITHUB_TOKEN environment variable.");
  }

  return new Octokit({
    auth: authToken,
  });
}

// Export a default client instance
export const githubClient = () => createGitHubClient();

// Common GitHub operations
export const githubOperations = {
  // Get authenticated user
  async getAuthenticatedUser() {
    const octokit = githubClient();
    return await octokit.users.getAuthenticated();
  },

  // Search repositories
  async searchRepositories(query: string) {
    const octokit = githubClient();
    return await octokit.search.repos({
      q: query,
      sort: "stars",
      order: "desc",
    });
  },

  // Get repository information
  async getRepository(owner: string, repo: string) {
    const octokit = githubClient();
    return await octokit.repos.get({
      owner,
      repo,
    });
  },

  // List user repositories
  async listUserRepos(username?: string) {
    const octokit = githubClient();
    if (username) {
      return await octokit.repos.listForUser({
        username,
        sort: "updated",
        type: "all",
      });
    } else {
      return await octokit.repos.listForAuthenticatedUser({
        sort: "updated",
        type: "all",
      });
    }
  },

  // Create an issue
  async createIssue(owner: string, repo: string, title: string, body?: string) {
    const octokit = githubClient();
    return await octokit.issues.create({
      owner,
      repo,
      title,
      body,
    });
  },

  // Create a pull request
  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    head: string,
    base: string,
    body?: string
  ) {
    const octokit = githubClient();
    return await octokit.pulls.create({
      owner,
      repo,
      title,
      head,
      base,
      body,
    });
  },

  // Get file content
  async getFileContent(owner: string, repo: string, path: string) {
    const octokit = githubClient();
    return await octokit.repos.getContent({
      owner,
      repo,
      path,
    });
  },

  // Search code
  async searchCode(query: string) {
    const octokit = githubClient();
    return await octokit.search.code({
      q: query,
    });
  },
};