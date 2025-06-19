import { FileBlock } from './types';

/**
 * Parses a prompt string and returns an array of objects with filePath and content.
 * Supports prompts in the format:
 * <boltAction type="file" filePath="...">...file content...</boltAction>
 */
export function parsePromptToFiles(prompt: string, defaultFileName: string = 'generated_file.txt'): FileBlock[] {
  const fileBlocks = Array.from(
    prompt.matchAll(/<boltAction type="file" filePath="([^\"]+)">([\s\S]*?)<\/boltAction>/g)
  );

  if (fileBlocks.length > 0) {
    return fileBlocks.map(match => ({
      filePath: match[1].trim(),
      content: match[2].trim(),
    }));
  }

  // Fallback: treat the whole prompt as a single txt file
  return [{
    filePath: defaultFileName,
    content: prompt.trim(),
  }];
}

/**
 * Sanitizes a file path to ensure it's safe to use
 */
export function sanitizeFilePath(filePath: string): string {
  // Remove any parent directory traversal
  return filePath.replace(/\.\./g, '').replace(/^\/+/, '');
} 