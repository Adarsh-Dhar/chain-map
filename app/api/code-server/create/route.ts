import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { existsSync } from "fs";

export const dynamic = "force-dynamic";

const VSCODE_PORT = 8080;
const CODE_SERVER_DIR = "/tmp/code-server-workspace";

export async function POST(req: NextRequest) {
  try {
    // Get the LLM response from the request body
    const body = await req.json();
    const { llmResponse } = body;

    // Create code-server workspace directory
    await mkdir(CODE_SERVER_DIR, { recursive: true });
    
    // Create a timestamp for the file name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `ccip-contracts-${timestamp}.sol`;
    const filePath = path.join(CODE_SERVER_DIR, fileName);

    // Write the LLM response to the file
    if (llmResponse) {
      // Extract content between <boltArtifact> tags if present
      const artifactMatch = llmResponse.match(/<boltArtifact>([\s\S]*?)<\/boltArtifact>/);
      const content = artifactMatch ? artifactMatch[1].trim() : llmResponse;
      
      await writeFile(filePath, content, 'utf8');
      console.log("Created Solidity file:", filePath);

      // Create a README.md file with instructions
      const readmePath = path.join(CODE_SERVER_DIR, 'README.md');
      const readmeContent = `# CCIP Contracts Workspace

This workspace contains automatically generated CCIP (Cross-Chain Interoperability Protocol) smart contracts.

## Files
- \`${fileName}\`: Generated CCIP contracts
  - Contains sender and receiver contracts for cross-chain communication
  - Generated on: ${new Date().toLocaleString()}

## Usage
1. Review the generated contracts in \`${fileName}\`
2. Make any necessary modifications
3. Deploy using your preferred method (Hardhat, Foundry, Remix, etc.)

## Important Notes
- Always review and test the generated code before deployment
- Ensure you have the correct CCIP router addresses for your target chains
- Test with small amounts first on testnet before mainnet deployment
`;
      await writeFile(readmePath, readmeContent, 'utf8');
    }
    
    console.log("Starting VS Code server...");
    
    // Start code server using the VS Code CLI, pointing to our workspace
    const codeServer = spawn("code", [
      "serve-web",
      "--host", "localhost",
      "--port", VSCODE_PORT.toString(),
      "--without-connection-token",
      CODE_SERVER_DIR // Use our dedicated workspace
    ], {
      detached: true,
      stdio: "ignore",
      env: {
        ...process.env,
        SHELL: process.env.SHELL || "/bin/bash",
      },
    });

    // Unref the process so it can run independently
    codeServer.unref();

    // Wait a moment for the server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    return NextResponse.json({
      success: true,
      url: `http://localhost:${VSCODE_PORT}`,
      message: "VS Code server started successfully.",
      generatedFile: fileName
    });
  } catch (error: any) {
    console.error("Error in VS Code server route:", error);
    return NextResponse.json(
      { 
        error: String(error),
        stack: error.stack,
        message: "Failed to start VS Code server. Check server logs for details."
      },
      { status: 500 }
    );
  }
} 