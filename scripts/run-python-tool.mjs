import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const candidates =
  process.platform === "win32"
    ? ["backend/.venv/Scripts/python.exe", "python"]
    : ["backend/.venv/bin/python", "python3", "python"];

const python = candidates.find(
  (candidate) =>
    candidate === "python" || candidate === "python3" || existsSync(candidate),
);
if (!python) {
  console.error(
    "Python was not found. Create backend/.venv before committing.",
  );
  process.exit(1);
}

const [moduleName, ...args] = process.argv.slice(2);
if (!moduleName) {
  console.error("Usage: node scripts/run-python-tool.mjs <module> [...args]");
  process.exit(1);
}

const result = spawnSync(python, ["-m", moduleName, ...args], {
  stdio: "inherit",
  shell: false,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
