import { NextRequest, NextResponse } from "next/server";
import { githubOperations } from "@/lib/github/client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get("username");
    
    // List repositories for the authenticated user or specified username
    const response = await githubOperations.listUserRepos(username || undefined);
    
    return NextResponse.json({
      success: true,
      repos: response.data,
      count: response.data.length,
    });
  } catch (error) {
    console.error("Error fetching GitHub repositories:", error);
    
    if (error instanceof Error && error.message.includes("GitHub token not found")) {
      return NextResponse.json(
        {
          error: "GitHub token not configured",
          message: "Please set GITHUB_TOKEN environment variable",
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        error: "Failed to fetch repositories",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}