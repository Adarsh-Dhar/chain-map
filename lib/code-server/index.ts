import fs from 'fs/promises';
import path from 'path';
import { parsePromptToFiles, sanitizeFilePath } from './utils';
import { CodeServerConfig } from './types';

/**
 * Writes code files based on the prompts received.
 * @param prompts Array of code or file content prompts
 * @param config Configuration options for the code server
 * @returns Promise<void>
 */
export async function writeCodeFromPrompts(
  prompts: string[],
  config: CodeServerConfig
): Promise<void> {
  const { baseDir, defaultFileName = 'generated_file.txt' } = config;

  try {
    // Ensure base directory exists
    await fs.mkdir(baseDir, { recursive: true });

    for (const prompt of prompts) {
      const files = parsePromptToFiles(prompt, defaultFileName);

      for (const { filePath, content } of files) {
        // Sanitize and construct the full file path
        const sanitizedPath = sanitizeFilePath(filePath);
        const fullPath = path.join(baseDir, sanitizedPath);
        
        // Ensure the directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        
        // Write the file
        await fs.writeFile(fullPath, content, 'utf8');
      }
    }
  } catch (error) {
    throw new Error(`Failed to write code files: ${error instanceof Error ? error.message : String(error)}`);
  }
} 