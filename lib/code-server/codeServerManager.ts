import { exec } from "child_process";
import path from "path";
import { writeFileSync, mkdtempSync, mkdirSync, existsSync } from 'fs';
import os from 'os';
import { getWorkspaceWithFiles } from './db';
import fs from 'fs';

export interface CodeServerInstance {
  url: string;
  password: string;
  containerId: string;
  port: number;
  workspaceId: string;
  tempDir?: string;
}

const MAX_CONTAINERS = 5;

function getRandomPort(min = 10000, max = 20000) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function generatePassword(length = 16) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

async function cleanupOldContainers() {
  return new Promise<void>((resolve, reject) => {
    // List all code-server containers
    exec("docker ps -a --filter 'name=code-server-' --format '{{.ID}} {{.Status}}'", async (err, stdout, stderr) => {
      if (err) {
        console.error("Failed to list containers:", err);
        reject(err);
        return;
      }

      const containers = stdout.trim().split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [id, ...statusParts] = line.split(' ');
          const status = statusParts.join(' ');
          return { id, status };
        });

      // Sort by age (assuming older containers are listed first)
      const containersToRemove = containers.slice(0, Math.max(0, containers.length - MAX_CONTAINERS));

      if (containersToRemove.length > 0) {
        console.log(`Cleaning up ${containersToRemove.length} old containers`);
        const removePromises = containersToRemove.map(container => 
          stopCodeServer(container.id).catch(err => 
            console.error(`Failed to remove container ${container.id}:`, err)
          )
        );
        await Promise.all(removePromises);
      }

      resolve();
    });
  });
}

export function runCommandInContainerAsRoot(containerId: string, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const dockerCmd = `docker exec -u root ${containerId} sh -c "${command}"`;
    exec(dockerCmd, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
      } else {
        resolve(stdout);
      }
    });
  });
}

export async function startCodeServer(workspaceId: string): Promise<CodeServerInstance> {
  // Clean up old containers first
  await cleanupOldContainers().catch(err => 
    console.error("Failed to cleanup old containers:", err)
  );

  const port = getRandomPort();
  const password = generatePassword();
  const containerName = `code-server-${workspaceId}-${Date.now()}`;

  // Use a real, existing directory on the Mac host for Docker mount
  const projectDir = path.join(os.tmpdir(), `code-server-${workspaceId}`);
  if (!existsSync(projectDir)) {
    mkdirSync(projectDir, { recursive: true });
  }

  console.log("Starting code-server for project in:", projectDir);

  // Check if Docker is available
  try {
    await new Promise((resolve, reject) => {
      exec("docker --version", (err, stdout, stderr) => {
        if (err) {
          console.error("Docker not available:", err);
          reject(new Error("Docker is not available on the system"));
          return;
        }
        console.log("Docker version:", stdout.trim());
        resolve(stdout);
      });
    });
  } catch (error: any) {
    throw new Error(`Docker check failed: ${error.message}`);
  }

  const cmd = [
    "docker run -d",
    `--name ${containerName}`,
    `-e PASSWORD=${password}`,
    `-p ${port}:8080`,
    `-v ${projectDir}:/home/coder/project`,
    `-w /home/coder/project`,
    `-e WORKSPACE_ID=${workspaceId}`,
    "codercom/code-server:latest",
    "--auth password",
    "--bind-addr 0.0.0.0:8080"
  ].join(" ");

  console.log("Executing docker command:", cmd);

  return new Promise((resolve, reject) => {
    exec(cmd, async (err, stdout, stderr) => {
      if (err) {
        console.error("Docker run error:", {
          error: err.message,
          stderr,
          stdout,
          cmd
        });
        reject(new Error(`Failed to start code-server: ${stderr || err.message}`));
        return;
      }
      const containerId = stdout.trim();
      const url = `http://localhost:${port}`;

      // SYSTEM-WIDE NODE INSTALLATION
      try {
        await runCommandInContainerAsRoot(containerId, [
          "apt-get update",
          "curl -fsSL https://deb.nodesource.com/setup_22.x | bash -",
          "apt-get install -y nodejs",
          "ln -sf /usr/bin/node /usr/local/bin/node",
          "ln -sf /usr/bin/npm /usr/local/bin/npm"
        ].join(' && '));

        // PROJECT SETUP (only run commands, do not write any files)
        await runCommandInContainer(containerId, [
          'mkdir -p Receiver',
          'cd Receiver && npm init -y',
          'npm install --save-dev hardhat',
          'printf \'require("@nomicfoundation/hardhat-toolbox");\\n\\n/** @type import(\\"hardhat/config\\").HardhatUserConfig */\\nmodule.exports = {\\n  solidity: \\\"0.8.28\\\",\\n  networks: {\\n    sepolia: {\\n      url: \\\"http://0.0.0.0:8545/\\\", // or Alchemy etc.\\n      accounts: [\\"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80\\"], // use environment variables in production!\\n    },\\n  },\\n};\\n\' > hardhat.config.js',
          'mkdir -p contracts',
          'mkdir -p ignition/modules',
          'cd ..',
          'mkdir -p Sender',
          'cd Sender && npm init -y',
          'npm install --save-dev hardhat',
          'printf \'require("@nomicfoundation/hardhat-toolbox");\\n\\n/** @type import(\\"hardhat/config\\").HardhatUserConfig */\\nmodule.exports = {\\n  solidity: \\\"0.8.28\\\",\\n  networks: {\\n    sepolia: {\\n      url: \\\"http://0.0.0.0:8545/\\\", // or Alchemy etc.\\n      accounts: [\\"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80\\"], // use environment variables in production!\\n    },\\n  },\\n};\\n\' > hardhat.config.js',
          'mkdir -p contracts',
          'mkdir -p ignition/modules',
          'cd ..'
        ].join(' && '));
        // Write Receiver.sol contract after contracts folder is created
        const receiverContractsPath = path.join(projectDir, 'Receiver', 'contracts');
        if (!fs.existsSync(receiverContractsPath)) {
          fs.mkdirSync(receiverContractsPath, { recursive: true });
        }
        const receiverSolPath = path.join(receiverContractsPath, 'Receiver.sol');
        const receiverSolContent = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.19;\n\nimport {CCIPReceiver} from \"@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol\";\nimport {Client} from \"@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol\";\n\ncontract Receiver is CCIPReceiver {\n    string public lastMessage;\n    \n    event MessageReceived(bytes32 messageId, string message);\n    \n    constructor(address router) CCIPReceiver(router) {}\n    \n    function _ccipReceive(Client.Any2EVMMessage memory message) internal override {\n        (string memory receivedMessage) = abi.decode(message.data, (string));\n        lastMessage = receivedMessage;\n        emit MessageReceived(message.messageId, receivedMessage);\n    }\n}\n`;
        fs.writeFileSync(receiverSolPath, receiverSolContent, 'utf8');
        // Write Sender.sol contract after contracts folder is created
        const senderContractsPath = path.join(projectDir, 'Sender', 'contracts');
        if (!fs.existsSync(senderContractsPath)) {
          fs.mkdirSync(senderContractsPath, { recursive: true });
        }
        const senderSolPath = path.join(senderContractsPath, 'Sender.sol');
        const senderSolContent = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.19;\n\nimport {CCIPSender} from \"@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPSender.sol\";\nimport {Client} from \"@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol\";\n\ncontract Sender is CCIPSender {\n    event MessageSent(bytes32 messageId, string message);\n    constructor(address router) CCIPSender(router) {}\n    function sendMessage(uint64 destinationChainSelector, address receiver) external {\n        string memory message = \"Hello from Sender!\";\n        bytes memory data = abi.encode(message);\n        Client.EVM2AnyMessage memory evm2AnyMessage = Client.EVM2AnyMessage({\n            receiver: abi.encode(receiver),\n            data: data,\n            tokenAmounts: new Client.EVMTokenAmount[](0),\n            extraArgs: \"\",\n            feeToken: address(0)\n        });\n        bytes32 messageId = _ccipSend(destinationChainSelector, evm2AnyMessage);\n        emit MessageSent(messageId, message);\n    }\n}\n`;
        fs.writeFileSync(senderSolPath, senderSolContent, 'utf8');
        // Write Deploy.ts for Receiver
        const receiverIgnitionModulesPath = path.join(projectDir, 'Receiver', 'ignition', 'modules');
        if (!fs.existsSync(receiverIgnitionModulesPath)) {
          fs.mkdirSync(receiverIgnitionModulesPath, { recursive: true });
        }
        const receiverDeployPath = path.join(receiverIgnitionModulesPath, 'Deploy.ts');
        const receiverDeployContent = `// This setup uses Hardhat Ignition to manage smart contract deployments.\n// Learn more about it at https://hardhat.org/ignition\n\nimport { buildModule } from \"@nomicfoundation/hardhat-ignition/modules\";\n\nconst ReceiverModule = buildModule(\"ReceiverModule\", (m) => {\n  const router = m.getParameter(\"router\");\n  const receiver = m.contract(\"Receiver\", [router]);\n  return { receiver };\n});\n\nexport default ReceiverModule;\n`;
        fs.writeFileSync(receiverDeployPath, receiverDeployContent, 'utf8');
        // Write Deploy.ts for Sender
        const senderIgnitionModulesPath = path.join(projectDir, 'Sender', 'ignition', 'modules');
        if (!fs.existsSync(senderIgnitionModulesPath)) {
          fs.mkdirSync(senderIgnitionModulesPath, { recursive: true });
        }
        const senderDeployPath = path.join(senderIgnitionModulesPath, 'Deploy.ts');
        const senderDeployContent = `// This setup uses Hardhat Ignition to manage smart contract deployments.\n// Learn more about it at https://hardhat.org/ignition\n\nimport { buildModule } from \"@nomicfoundation/hardhat-ignition/modules\";\n\nconst SenderModule = buildModule(\"SenderModule\", (m) => {\n  const router = m.getParameter(\"router\");\n  const sender = m.contract(\"Sender\", [router]);\n  return { sender };\n});\n\nexport default SenderModule;\n`;
        fs.writeFileSync(senderDeployPath, senderDeployContent, 'utf8');
      } catch (setupError) {
        console.error('Setup failed:', setupError);
      }

      resolve({ url, password, containerId, port, workspaceId, tempDir: projectDir });
    });
  });
}

export async function stopCodeServer(containerId: string): Promise<void> {
  console.log("Stopping container:", containerId);
  return new Promise((resolve, reject) => {
    exec(`docker rm -f ${containerId}`, (err, stdout, stderr) => {
      if (err) {
        console.error("Failed to stop container:", {
          containerId,
          error: err.message,
          stderr
        });
        reject(new Error(`Failed to stop container: ${stderr || err.message}`));
      } else {
        console.log("Container stopped successfully:", containerId);
        resolve();
      }
    });
  });
}

export async function cleanupTempFiles(tempDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`rm -rf ${tempDir}`, (err) => {
      if (err) {
        console.error("Failed to cleanup temp directory:", err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function runCommandInContainer(containerId: string, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Run the command in the container using bash -lc for login shell
    const dockerCmd = `docker exec ${containerId} bash -lc "${command}"`;
    exec(dockerCmd, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
      } else {
        resolve(stdout);
      }
    });
  });
} 