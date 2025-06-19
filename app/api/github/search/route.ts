import { NextRequest, NextResponse } from "next/server";
import { githubOperations } from "@/lib/github/client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    
    if (!query) {
      return NextResponse.json(
        {
          error: "Missing search query",
          message: "Please provide a search query using the 'q' parameter",
        },
        { status: 400 }
      );
    }
    
    // Search repositories
    const response = await githubOperations.searchRepositories(query);
    
    return NextResponse.json({
      success: true,
      results: response.data.items,
      total_count: response.data.total_count,
    });
  } catch (error) {
    console.error("Error searching GitHub repositories:", error);
    
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
        error: "Failed to search repositories",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}