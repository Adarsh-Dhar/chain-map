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
  receiverDeployResult: string;
  senderDeployResult: string;
  receiverAddress: string;
  senderAddress: string;
  receiverAbi: any | null;
  senderAbi: any | null;
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
      let receiverDeployResult = '';
      let senderDeployResult = '';
      let receiverAddress = '';
      let senderAddress = '';
      let receiverAbi: any = null;
      let senderAbi: any = null;
      try {
        await runCommandInContainerAsRoot(containerId, [
          "apt-get update",
          "curl -fsSL https://deb.nodesource.com/setup_22.x | bash -",
          "apt-get install -y nodejs",
          "ln -sf /usr/bin/node /usr/local/bin/node",
          "ln -sf /usr/bin/npm /usr/local/bin/npm"
        ].join(' && '));

        // PROJECT SETUP (only run commands, do not write any files)
        try {
          await runCommandInContainer(containerId, [
            'mkdir -p Receiver',
            'cd Receiver && npm init -y',
            'npm install --save-dev hardhat',
            'npm install @chainlink/contracts-ccip @openzeppelin/contracts @nomicfoundation/hardhat-ignition',
            'printf \'require(\\"@nomicfoundation/hardhat-ignition\\");\\n\\n/** @type import(\\"hardhat/config\\").HardhatUserConfig */\\nmodule.exports = {\\n  solidity: \\\"0.8.28\\\",\\n  networks: {\\n    sepolia: {\\n      url: \\\"https://sepolia.infura.io/v3/dc10a4b3a75349aab5abdf2314cbad35\\\", // or Alchemy etc.\\n      accounts: [\\"0x4bf9a4897c0d417d1bfe9351519322f7d56d4f0ce53c8b6e67289fe26267e0bc\\"] // use environment variables in production!\\n    },\\n  },\\n};\\n\' > hardhat.config.js',
            'mkdir -p contracts',
            'mkdir -p ignition/modules',
            'cd ..',
            'mkdir -p Sender',
            'cd Sender && npm init -y',
            'npm install --save-dev hardhat',
            'npm install @chainlink/contracts-ccip @openzeppelin/contracts @nomicfoundation/hardhat-ignition',
            'printf \'require(\\"@nomicfoundation/hardhat-ignition\\");\\n\\n/** @type import(\\"hardhat/config\\").HardhatUserConfig */\\nmodule.exports = {\\n  solidity: \\\"0.8.28\\\",\\n  networks: {\\n    sepolia: {\\n      url: \\\"https://sepolia.infura.io/v3/dc10a4b3a75349aab5abdf2314cbad35\\\", // or Alchemy etc.\\n      accounts: [\\"0x4bf9a4897c0d417d1bfe9351519322f7d56d4f0ce53c8b6e67289fe26267e0bc\\"] // use environment variables in production!\\n    },\\n  },\\n};\\n\' > hardhat.config.js',
            'mkdir -p contracts',
            'mkdir -p ignition/modules',
            'cd ..',
            'mkdir -p React',
            'cd React && npm init -y',
            'npm install react react-dom lucide-react',
            'npm install --save-dev vite @vitejs/plugin-react tailwindcss postcss autoprefixer',
            // 'npx tailwindcss init -p',
            // 'mkdir -p src',
            // 'echo "import React from \"react\";\n\nfunction App() {\n  return (<div className=\\"min-h-screen bg-gray-100 flex items-center justify-center\\">Hello React!</div>);\n}\n\nexport default App;\n" > src/App.jsx',
            // 'echo "import { StrictMode } from \"react\";\nimport { createRoot } from \"react-dom/client\";\nimport App from \"./App.jsx\";\nimport \"./index.css\";\n\ncreateRoot(document.getElementById(\"root\")).render(<StrictMode><App /></StrictMode>);\n" > src/main.jsx',
            // 'echo "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n" > src/index.css',
            // 'echo "<!doctype html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <title>React + Vite</title>\n  </head>\n  <body>\n    <div id=\"root\"></div>\n    <script type=\"module\" src=\"/src/main.jsx\"></script>\n  </body>\n</html>\n" > index.html',
            // 'echo "/** @type {import(\'tailwindcss\').Config} */\nexport default {\n  content: [\'./index.html\', \'./src/**/*.{js,jsx,ts,tsx}\'],\n  theme: {\n    extend: {},\n  },\n  plugins: [],\n};\n" > tailwind.config.js',
            // 'echo "export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n};\n" > postcss.config.js',
            // 'echo "{\n  \"name\": \"react-app\",\n  \"private\": true,\n  \"version\": \"0.0.0\",\n  \"type\": \"module\",\n  \"scripts\": {\n    \"dev\": \"vite\",\n    \"build\": \"vite build\",\n    \"preview\": \"vite preview\"\n  },\n  \"dependencies\": {\n    \"react\": \"^18.2.0\",\n    \"react-dom\": \"^18.2.0\",\n    \"lucide-react\": \"^0.344.0\"\n  },\n  \"devDependencies\": {\n    \"@vitejs/plugin-react\": \"^4.3.1\",\n    \"tailwindcss\": \"^3.4.1\",\n    \"postcss\": \"^8.4.35\",\n    \"autoprefixer\": \"^10.4.18\",\n    \"vite\": \"^5.4.2\"\n  }\n}\n" > package.json',
            'cd ..'
          ].join(' && '));
        } catch (setupStepError: any) {
          console.error('Project setup failed!');
          if (setupStepError.stdout) {
            console.error('Setup stdout:', setupStepError.stdout);
          }
          if (setupStepError.stderr) {
            console.error('Setup stderr:', setupStepError.stderr);
          }
          console.error('Setup error (string):', setupStepError?.toString?.() || setupStepError);
          throw setupStepError;
        }
        // Write Receiver.sol contract after contracts folder is created
        const receiverContractsPath = path.join(projectDir, 'Receiver', 'contracts');
        if (!fs.existsSync(receiverContractsPath)) {
          fs.mkdirSync(receiverContractsPath, { recursive: true });
        }
        const receiverSolPath = path.join(receiverContractsPath, 'Receiver.sol');
        const receiverSolContent = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.19;\n\nimport {CCIPReceiver} from \"@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol\";\nimport {Client} from \"@chainlink/contracts-ccip/contracts/libraries/Client.sol\";\n\ncontract Receiver is CCIPReceiver {\n    string public lastMessage;\n    \n    event MessageReceived(bytes32 messageId, string message);\n    \n    constructor(address router) CCIPReceiver(router) {}\n    \n    function _ccipReceive(Client.Any2EVMMessage memory message) internal override {\n        (string memory receivedMessage) = abi.decode(message.data, (string));\n        lastMessage = receivedMessage;\n        emit MessageReceived(message.messageId, receivedMessage);\n    }\n}\n`;
        fs.writeFileSync(receiverSolPath, receiverSolContent, 'utf8');
        // Write Sender.sol contract after contracts folder is created
        const senderContractsPath = path.join(projectDir, 'Sender', 'contracts');
        if (!fs.existsSync(senderContractsPath)) {
          fs.mkdirSync(senderContractsPath, { recursive: true });
        }
        const senderSolPath = path.join(senderContractsPath, 'Sender.sol');
        const senderSolContent = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.19;\n\nimport {IRouterClient} from \"@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol\";\nimport {Client} from \"@chainlink/contracts-ccip/contracts/libraries/Client.sol\";\nimport {IERC20} from \"@openzeppelin/contracts/token/ERC20/IERC20.sol\";\n\ncontract Sender {\n    IRouterClient private immutable i_router;\n    \n    event MessageSent(bytes32 messageId, string message);\n    \n    error NotEnoughBalance(uint256 currentBalance, uint256 calculatedFees);\n    error NothingToWithdraw();\n    error FailedToWithdrawEth(address owner, address target, uint256 value);\n    \n    constructor(address router) {\n        i_router = IRouterClient(router);\n    }\n    \n    function sendMessage(\n        uint64 destinationChainSelector, \n        address receiver\n    ) external payable {\n        string memory message = \"Hello from Sender!\";\n        bytes memory data = abi.encode(message);\n        \n        Client.EVM2AnyMessage memory evm2AnyMessage = Client.EVM2AnyMessage({\n            receiver: abi.encode(receiver),\n            data: data,\n            tokenAmounts: new Client.EVMTokenAmount[](0),\n            extraArgs: Client._argsToBytes(\n                Client.EVMExtraArgsV1({gasLimit: 200_000})\n            ),\n            feeToken: address(0) // Native token for fees\n        });\n        \n        // Get the fee required to send the message\n        uint256 fees = i_router.getFee(destinationChainSelector, evm2AnyMessage);\n        \n        if (fees > msg.value) {\n            revert NotEnoughBalance(msg.value, fees);\n        }\n        \n        // Send the message through the router and store the returned message ID\n        bytes32 messageId = i_router.ccipSend{value: fees}(\n            destinationChainSelector,\n            evm2AnyMessage\n        );\n        \n        emit MessageSent(messageId, message);\n        \n        // Refund excess ETH\n        if (msg.value > fees) {\n            payable(msg.sender).transfer(msg.value - fees);\n        }\n    }\n    \n    function sendMessageWithToken(\n        uint64 destinationChainSelector,\n        address receiver,\n        address token,\n        uint256 amount\n    ) external payable {\n        string memory message = \"Hello with tokens!\";\n        bytes memory data = abi.encode(message);\n        \n        // Transfer tokens from sender to this contract\n        IERC20(token).transferFrom(msg.sender, address(this), amount);\n        \n        // Approve the router to spend tokens\n        IERC20(token).approve(address(i_router), amount);\n        \n        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);\n        tokenAmounts[0] = Client.EVMTokenAmount({\n            token: token,\n            amount: amount\n        });\n        \n        Client.EVM2AnyMessage memory evm2AnyMessage = Client.EVM2AnyMessage({\n            receiver: abi.encode(receiver),\n            data: data,\n            tokenAmounts: tokenAmounts,\n            extraArgs: Client._argsToBytes(\n                Client.EVMExtraArgsV1({gasLimit: 200_000})\n            ),\n            feeToken: address(0) // Native token for fees\n        });\n        \n        uint256 fees = i_router.getFee(destinationChainSelector, evm2AnyMessage);\n        \n        if (fees > msg.value) {\n            revert NotEnoughBalance(msg.value, fees);\n        }\n        \n        bytes32 messageId = i_router.ccipSend{value: fees}(\n            destinationChainSelector,\n            evm2AnyMessage\n        );\n        \n        emit MessageSent(messageId, message);\n        \n        // Refund excess ETH\n        if (msg.value > fees) {\n            payable(msg.sender).transfer(msg.value - fees);\n        }\n    }\n    \n    // Allow contract to receive Ether\n    receive() external payable {}\n    \n    // Withdraw function for contract owner (you might want to add access control)\n    function withdraw(address beneficiary) public {\n        uint256 amount = address(this).balance;\n        if (amount == 0) revert NothingToWithdraw();\n        \n        (bool sent, ) = beneficiary.call{value: amount}(\"\");\n        if (!sent) revert FailedToWithdrawEth(msg.sender, beneficiary, amount);\n    }\n    \n    // View function to get fee estimate\n    function getFee(\n        uint64 destinationChainSelector,\n        address receiver,\n        string memory message\n    ) external view returns (uint256 fees) {\n        bytes memory data = abi.encode(message);\n        \n        Client.EVM2AnyMessage memory evm2AnyMessage = Client.EVM2AnyMessage({\n            receiver: abi.encode(receiver),\n            data: data,\n            tokenAmounts: new Client.EVMTokenAmount[](0),\n            extraArgs: Client._argsToBytes(\n                Client.EVMExtraArgsV1({gasLimit: 200_000})\n            ),\n            feeToken: address(0)\n        });\n        \n        return i_router.getFee(destinationChainSelector, evm2AnyMessage);\n    }\n}\n`;
        fs.writeFileSync(senderSolPath, senderSolContent, 'utf8');
        // Write Deploy.ts for Receiver
        const receiverIgnitionModulesPath = path.join(projectDir, 'Receiver', 'ignition', 'modules');
        if (!fs.existsSync(receiverIgnitionModulesPath)) {
          fs.mkdirSync(receiverIgnitionModulesPath, { recursive: true });
        }
        const receiverDeployPath = path.join(receiverIgnitionModulesPath, 'Deploy.ts');
        const receiverDeployContent = `// This setup uses Hardhat Ignition to manage smart contract deployments.\n// Learn more about it at https://hardhat.org/ignition\n\nimport { buildModule } from \"@nomicfoundation/hardhat-ignition/modules\";\n\nconst ReceiverModule = buildModule(\"ReceiverModule\", (m) => {\n  // Replace with your actual router address or set as parameter with default\n  const router = m.getParameter(\"router\", \"0x1234567890123456789012345678901234567890\");\n  const receiver = m.contract(\"Receiver\", [router]);\n  return { receiver };\n});\n\nexport default ReceiverModule;\n`;
        fs.writeFileSync(receiverDeployPath, receiverDeployContent, 'utf8');
        // Write Deploy.ts for Sender
        const senderIgnitionModulesPath = path.join(projectDir, 'Sender', 'ignition', 'modules');
        if (!fs.existsSync(senderIgnitionModulesPath)) {
          fs.mkdirSync(senderIgnitionModulesPath, { recursive: true });
        }
        const senderDeployPath = path.join(senderIgnitionModulesPath, 'Deploy.ts');
        const senderDeployContent = `// This setup uses Hardhat Ignition to manage smart contract deployments.\n// Learn more about it at https://hardhat.org/ignition\n\nimport { buildModule } from \"@nomicfoundation/hardhat-ignition/modules\";\n\nconst SenderModule = buildModule(\"SenderModule\", (m) => {\n  // Replace with your actual router address or set as parameter with default\n  const router = m.getParameter(\"router\", \"0x1234567890123456789012345678901234567890\");\n  const sender = m.contract(\"Sender\", [router]);\n  return { sender };\n});\n\nexport default SenderModule;\n`;
        fs.writeFileSync(senderDeployPath, senderDeployContent, 'utf8');

        // Run deployment in Receiver
        let receiverDeployResult = '';
        try {
          console.log('Starting Receiver deployment...');
          receiverDeployResult = await runCommandInContainer(
            containerId,
            'cd Receiver && yes | npx hardhat ignition deploy ignition/modules/Deploy.ts --network sepolia'
          );
          console.log('Receiver deploy result (raw output):', receiverDeployResult);
          // Extract receiver address
          const receiverMatch = receiverDeployResult.match(/ReceiverModule#Receiver\s+-\s+(0x[a-fA-F0-9]{40})/);
          if (receiverMatch) {
            receiverAddress = receiverMatch[1];
            console.log('Extracted receiver address:', receiverAddress);
          } else {
            console.warn('No receiver address found in deploy output.');
          }
        } catch (e: any) {
          receiverDeployResult = e?.toString() || 'Receiver deploy failed';
          console.error('Receiver deploy failed:', receiverDeployResult);
        }

        // Run deployment in Sender
        let senderDeployResult = '';
        try {
          senderDeployResult = await runCommandInContainer(
            containerId,
            'cd Sender && yes | npx hardhat ignition deploy ignition/modules/Deploy.ts --network sepolia'
          );
          console.log('Sender deploy result:', senderDeployResult);
          // Extract sender address
          const senderMatch = senderDeployResult.match(/SenderModule#Sender\s+-\s+(0x[a-fA-F0-9]{40})/);
          if (senderMatch) {
            senderAddress = senderMatch[1];
          }
        } catch (e: any) {
          senderDeployResult = e?.toString() || 'Sender deploy failed';
          console.error('Sender deploy failed:', senderDeployResult);
        }

        // After deployments, try to read the ABI from artifacts
        try {
          const receiverArtifactPath = path.join(projectDir, 'Receiver', 'artifacts', 'contracts', 'Receiver.sol', 'Receiver.json');
          if (fs.existsSync(receiverArtifactPath)) {
            const receiverArtifact = JSON.parse(fs.readFileSync(receiverArtifactPath, 'utf8'));
            receiverAbi = receiverArtifact.abi || null;
          }
        } catch (e) {
          console.warn('Could not read Receiver ABI:', e);
        }
        try {
          const senderArtifactPath = path.join(projectDir, 'Sender', 'artifacts', 'contracts', 'Sender.sol', 'Sender.json');
          if (fs.existsSync(senderArtifactPath)) {
            const senderArtifact = JSON.parse(fs.readFileSync(senderArtifactPath, 'utf8'));
            senderAbi = senderArtifact.abi || null;
          }
        } catch (e) {
          console.warn('Could not read Sender ABI:', e);
        }
      } catch (setupError) {
        console.error('Setup failed:', setupError);
      }

      resolve({ url, password, containerId, port, workspaceId, tempDir: projectDir, receiverDeployResult, senderDeployResult, receiverAddress, senderAddress, receiverAbi, senderAbi });
    });
  });
}

export async function stopCodeServer(containerId: string): Promise<void> {
  console.log("Stopping container:", containerId);
  return new Promise((resolve, reject) => {
    exec(`docker rm -f ${containerId}`, (err, stdout, stderr) => {
      if (err) {
        const isZombieError = stderr && stderr.includes("could not kill: tried to kill container, but did not receive an exit event");
        console.error("Failed to stop container:", {
          containerId,
          error: err.message,
          stderr
        });
        if (isZombieError) {
          // Log and continue
          console.warn("Container was already dead/zombie, continuing...");
          resolve();
        } else {
          reject(new Error(`Failed to stop container: ${stderr || err.message}`));
        }
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