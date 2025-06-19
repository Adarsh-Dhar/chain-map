import { NextRequest, NextResponse } from "next/server";
import { startCodeServer, stopCodeServer, cleanupTempFiles } from "@/lib/code-server/codeServerManager";
import { createCCIPWorkspace } from "@/lib/code-server/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Get the LLM response from the request body
    const body = await req.json();
    const { llmResponse } = body;

    if (!llmResponse) {
      return NextResponse.json(
        { error: "LLM response is required" },
        { status: 400 }
      );
    }

    // Create workspace and files in the database
    console.log("Creating workspace with LLM response:", llmResponse);
    const { workspace } = await createCCIPWorkspace(llmResponse);
    console.log("Created workspace:", workspace.id);

    // Start code server in Docker
    console.log("Starting code server in Docker for workspace:", workspace.id);
    const instance = await startCodeServer(workspace.id);
    console.log("Code server instance created:", instance);

    // Return only url and password
    return NextResponse.json({
      url: instance.url,
      password: instance.password,
      containerId: instance.containerId,
      tempDir: instance.tempDir
    });
  } catch (error: any) {
    console.error("Error in code server route:", {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    return NextResponse.json(
      { 
        error: String(error),
        message: "Failed to start code server. Check server logs for details."
      },
      { status: 500 }
    );
  }
}

// Add DELETE endpoint to handle cleanup
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const containerId = searchParams.get('containerId');
    const tempDir = searchParams.get('tempDir');

    if (!containerId || !tempDir) {
      return NextResponse.json(
        { error: "Container ID and temp directory are required" },
        { status: 400 }
      );
    }

    // Stop the container
    await stopCodeServer(containerId);
    
    // Cleanup temporary files
    await cleanupTempFiles(tempDir);

    return NextResponse.json({ message: "Cleanup successful" });
  } catch (error: any) {
    console.error("Error during cleanup:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
} 