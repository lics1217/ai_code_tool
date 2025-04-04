import { execSync } from "node:child_process";
import chalk from "chalk";

const method = process.argv[2] || "start";

// source ~/.nvm/nvm.sh：加载 nvm 脚本，使 nvm 命令在当前 shell 会话中可用。
// nvm use 20：在成功加载 nvm 后，执行 nvm use 20 命令，切换到 Node.js 版本 20。
// { stdio: 'inherit', shell: '/bin/bash' }：指定使用 /bin/bash 作为 shell，并将子进程的标准输入输出继承到父进程中，以便在控制台中显示命令的输出。
try {
  const nodeVersion = execSync("node -v").toString("utf-8");
  const isUpperNode = nodeVersion.startsWith("v20");
  let command = "npm run docusaurus:start";
  if (!isUpperNode) {
    command = `source ~/.nvm/nvm.sh && nvm use 20 && docusaurus ${method}`;
  }
  execSync(command, {
    stdio: "inherit",
    // shell: "/bin/bash",
  });

  console.log(
    chalk.green("Switched to Node.js version 20 and started the docusaurus"),
  );
} catch (error) {
  console.log(chalk.red("Error:", error.message));
}
