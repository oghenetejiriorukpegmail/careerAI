"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader, Search, Star, GitFork, ExternalLink } from "lucide-react";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  updated_at: string;
}

export function GitHubReposExample() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUserRepos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/github/repos");
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch repositories");
      }
      
      setRepos(data.repos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const searchRepos = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/github/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to search repositories");
      }
      
      setRepos(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserRepos();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>GitHub Integration Example</CardTitle>
          <CardDescription>
            Browse your GitHub repositories or search for any repository
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search GitHub repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && searchRepos()}
            />
            <Button onClick={searchRepos} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" onClick={fetchUserRepos} disabled={loading}>
              My Repos
            </Button>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-destructive/15 text-destructive text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-6 w-6 animate-spin" />
            </div>
          )}

          {!loading && repos.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {repos.map((repo) => (
                <Card key={repo.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          {repo.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {repo.full_name}
                        </CardDescription>
                      </div>
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {repo.description || "No description available"}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-primary" />
                          {repo.language}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {repo.stargazers_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="h-3 w-3" />
                        {repo.forks_count}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && repos.length === 0 && !error && (
            <p className="text-center text-muted-foreground py-8">
              No repositories found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}