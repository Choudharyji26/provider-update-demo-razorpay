import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

async function matchingFiles(directory, extension) {
  const result = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const item = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await matchingFiles(item, extension)));
    } else if (entry.isFile() && item.endsWith(extension)) {
      result.push(item);
    }
  }
  return result;
}

const typeScriptFiles = [
  ...(await matchingFiles("src", ".ts")),
  ...(await matchingFiles("tests", ".ts")),
];
for (const file of typeScriptFiles) {
  const source = await readFile(file, "utf8");
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.deepEqual(
    parsed.parseDiagnostics,
    [],
    `TypeScript syntax error in ${file}: ${parsed.parseDiagnostics
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
      .join("; ")}`,
  );
}

const scripts = await matchingFiles("scripts", ".mjs");
for (const file of scripts) {
  execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
}

for (const file of ["biome.json", "package.json", "seed-manifest.json", "tsconfig.json"]) {
  JSON.parse(await readFile(file, "utf8"));
}

process.stdout.write(
  `Parsed ${typeScriptFiles.length} TypeScript files, ${scripts.length} scripts, and 4 JSON files.\n`,
);
