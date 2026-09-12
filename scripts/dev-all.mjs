// Runs the Next dev server and the PDF worker together; Ctrl+C stops both.
import { spawn } from "node:child_process";

const processes = [
  ["web", "npm", ["run", "dev"]],
  ["worker", "npm", ["run", "worker"]],
].map(([name, command, args]) => {
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], env: process.env });
  const prefix = (line) => `[${name}] ${line}`;
  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding("utf8");
    stream.on("data", (chunk) =>
      chunk
        .split("\n")
        .filter(Boolean)
        .forEach((line) => console.log(prefix(line))),
    );
  }
  child.on("exit", (code) => {
    console.log(prefix(`exited with code ${code}`));
    shutdown();
  });
  return child;
});

let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  for (const child of processes) child.kill("SIGTERM");
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
