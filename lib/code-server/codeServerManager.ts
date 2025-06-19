import { exec } from "child_process";
import path from "path";

export interface CodeServerInstance {
  url: string;
  password: string;
  containerId: string;
  port: number;
  workspaceId: string;
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

export async function startCodeServer(workspaceId: string): Promise<CodeServerInstance> {
  // Clean up old containers first
  await cleanupOldContainers().catch(err => 
    console.error("Failed to cleanup old containers:", err)
  );

  const port = getRandomPort();
  const password = generatePassword();
  const containerName = `code-server-${workspaceId}-${Date.now()}`;
  const projectRoot = process.cwd();

  console.log("Starting code-server with config:", {
    port,
    containerName,
    workspaceId,
    projectRoot
  });

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
    `-v ${projectRoot}:/home/coder/project`,
    `-w /home/coder/project`,
    `-e WORKSPACE_ID=${workspaceId}`,
    "codercom/code-server:latest",
    "--auth password",
    "--bind-addr 0.0.0.0:8080"
  ].join(" ");

  console.log("Executing docker command:", cmd);

  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
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
      console.log("Container started successfully:", {
        containerId,
        port
      });
      const url = `http://localhost:${port}`;
      resolve({ url, password, containerId, port, workspaceId });
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