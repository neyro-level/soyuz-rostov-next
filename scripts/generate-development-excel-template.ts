import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { generateDevelopmentExcelTemplate } from "../src/core/ingest/development-excel.ts";

const outputArg = process.argv.find((argument) => argument.startsWith("--output="));
const output = resolve(outputArg?.slice("--output=".length) || "artifacts/development-import-template.xlsx");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, await generateDevelopmentExcelTemplate());
console.log(`Development Excel template written: ${output}`);
