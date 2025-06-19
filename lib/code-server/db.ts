import { PrismaClient } from '@/lib/generated/prisma';
import { FileType } from '@/lib/generated/prisma';

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
  path: string,
  content: string,
  type: FileType = 'file'
) {
  return prisma.fileNode.create({
    data: {
      name,
      path,
      type,
      content,
      workspaceId,
    },
  });
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

  // Extract content between <boltArtifact> tags if present
  const artifactMatch = llmResponse.match(/<boltArtifact>([\s\S]*?)<\/boltArtifact>/);
  const contractContent = artifactMatch ? artifactMatch[1].trim() : llmResponse;

  // Create the contract file
  const contractFileName = `ccip-contracts-${timestamp}.sol`;
  await createFile(
    workspace.id,
    contractFileName,
    contractFileName,
    contractContent,
    'file'
  );

  // Create README.md
  const readmeContent = `# CCIP Contracts Workspace

This workspace contains automatically generated CCIP (Cross-Chain Interoperability Protocol) smart contracts.

## Files
- \`${contractFileName}\`: Generated CCIP contracts
  - Contains sender and receiver contracts for cross-chain communication
  - Generated on: ${new Date().toLocaleString()}

## Usage
1. Review the generated contracts in \`${contractFileName}\`
2. Make any necessary modifications
3. Deploy using your preferred method (Hardhat, Foundry, Remix, etc.)

## Important Notes
- Always review and test the generated code before deployment
- Ensure you have the correct CCIP router addresses for your target chains
- Test with small amounts first on testnet before mainnet deployment
`;

  await createFile(
    workspace.id,
    'README.md',
    'README.md',
    readmeContent,
    'file'
  );

  return {
    workspace,
    contractFileName,
  };
} 