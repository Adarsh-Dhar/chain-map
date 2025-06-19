import path from 'path';
import { writeCodeFromPrompts } from './index';

async function example() {
  const prompts = [
    // Example 1: Using boltAction tags
    `<boltAction type="file" filePath="src/hello.ts">
console.log('Hello, World!');
</boltAction>`,
    
    // Example 2: Multiple files in one prompt
    `<boltAction type="file" filePath="src/math/add.ts">
export function add(a: number, b: number): number {
  return a + b;
}
</boltAction>
<boltAction type="file" filePath="src/math/multiply.ts">
export function multiply(a: number, b: number): number {
  return a * b;
}
</boltAction>`,

    // Example 3: Plain text that will become a single file
    `This is a plain text prompt that will be saved as generated_file.txt`
  ];

  try {
    await writeCodeFromPrompts(prompts, {
      baseDir: path.join(process.cwd(), 'generated'),
    });
    console.log('Files written successfully!');
  } catch (error) {
    console.error('Error writing files:', error);
  }
}

// Run the example
example(); 