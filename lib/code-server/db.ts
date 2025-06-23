import { PrismaClient } from '@/lib/generated/prisma';
import { FileType } from '@/lib/generated/prisma';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';

const prisma = new PrismaClient();

export async function createWorkspace(name: string, description?: string) {
  return prisma.workspace.create({
    data: {
      name,
      description,
    },
  });
}

export async function createFile(
  workspaceId: string,
  name: string,
  filePath: string,
  content: string,
  type: FileType = 'file'
) {
  // Save to database
  const fileRecord = await prisma.fileNode.create({
    data: {
      name,
      path: filePath,
      type,
      content,
      workspaceId,
    },
  });

  // Save to disk
  await saveFileToDisk(workspaceId, filePath, content);

  return fileRecord;
}

export async function saveFileToDisk(workspaceId: string, filePath: string, content: string) {
  // Use the same workspace dir pattern as codeServerManager
  const baseDir = path.join('/tmp', `code-server-${workspaceId}`);
  const fullPath = path.join(baseDir, filePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, 'utf8');
}

export async function getWorkspaceWithFiles(workspaceId: string) {
  return prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      files: true,
    },
  });
}

export async function createCCIPWorkspace(llmResponse: string) {
  // Create a timestamp for naming
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const workspaceName = `ccip-workspace-${timestamp}`;

  // Create the workspace
  const workspace = await createWorkspace(
    workspaceName,
    'CCIP Contracts Workspace'
  );

  // Regular expression to extract file path and content from <boltAction> tags
  const fileRegex = /<boltAction type="file" filePath="([^"]+)">([\s\S]*?)<\/boltAction>/g;
  let match;
  let firstContractContent = '';
  let firstContractName = 'contract.sol';

  while ((match = fileRegex.exec(llmResponse)) !== null) {
    const filePath = match[1];
    const fileContent = match[2].trim();
    const fileName = filePath.split('/').pop() || 'file';

    await createFile(
      workspace.id,
      fileName,
      filePath, // Use the full path for storage
      fileContent,
      'file'
    );
    
    // Save the first contract's content and name to return
    if (filePath.endsWith('.sol') && !filePath.includes('/test/') && !firstContractContent) {
      firstContractContent = fileContent;
      firstContractName = fileName;
    }
  }

  // If no files were created, handle the raw response
  if (!fileRegex.test(llmResponse)) {
    // This part handles cases where the LLM might not return the expected format.
    const artifactMatch = llmResponse.match(/<boltArtifact>([\s\S]*?)<\/boltArtifact>/);
    const contractContent = artifactMatch ? artifactMatch[1].trim() : llmResponse;
    const contractFileName = `ccip-contracts-${timestamp}.sol`;
    await createFile(
      workspace.id,
      contractFileName,
      contractFileName,
      contractContent,
      'file'
    );
    firstContractContent = contractContent;
    firstContractName = contractFileName;
  }

  // Always generate Foundry Chainlink Toolkit-style scripts for Sender and Receiver
  // SenderActions.s.sol
  const senderScriptPath = 'Sender/script/SenderActions.s.sol';
  const senderScriptContent = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.19;\n\nimport {Script} from \"forge-std/Script.sol\";\nimport {Sender} from \"../src/Sender.sol\";\n\ncontract SenderActions is Script {\n    function sendMessage(address senderAddress, uint64 destinationChainSelector, address receiver) external {\n        vm.startBroadcast();\n        Sender(senderAddress).sendMessage(destinationChainSelector, receiver);\n        vm.stopBroadcast();\n    }\n}\n`;
  await createFile(
    workspace.id,
    'SenderActions.s.sol',
    senderScriptPath,
    senderScriptContent,
    'file'
  );

  // ReceiverActions.s.sol
  const receiverScriptPath = 'Receiver/script/ReceiverActions.s.sol';
  const receiverScriptContent = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.19;\n\nimport {Script} from \"forge-std/Script.sol\";\nimport {Receiver} from \"../src/Receiver.sol\";\n\ncontract ReceiverActions is Script {\n    function getLastMessage(address receiverAddress) external view returns (string memory) {\n        return Receiver(receiverAddress).lastMessage();\n    }\n}\n`;
  await createFile(
    workspace.id,
    'ReceiverActions.s.sol',
    receiverScriptPath,
    receiverScriptContent,
    'file'
  );
  
  return {
    workspace
  };
}

export function runCommand(command: string, workspaceId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const cwd = path.join('/tmp', `code-server-${workspaceId}`);
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
      } else {
        resolve(stdout);
      }
    });
  });
} 