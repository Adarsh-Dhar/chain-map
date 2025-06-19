import { NextRequest, NextResponse } from "next/server";
import { writeCodeFromPrompts } from "@/lib/code-server";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompts, config } = body;

    if (!Array.isArray(prompts)) {
      return NextResponse.json({ error: "Prompts must be an array" }, { status: 400 });
    }

    if (!config || typeof config !== "object") {
      return NextResponse.json({ error: "Invalid config" }, { status: 400 });
    }

    // Ensure baseDir is relative to the project root
    const projectRoot = process.cwd();
    const baseDir = path.join(projectRoot, config.baseDir);
    
    // Write the files
    await writeCodeFromPrompts(prompts, {
      ...config,
      baseDir,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in code-server route:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
} 