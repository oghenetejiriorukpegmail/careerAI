import { GitHubReposExample } from "@/components/github-repos-example";

export default function TestGitHubPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">GitHub Integration Test</h1>
      <GitHubReposExample />
    </div>
  );
}