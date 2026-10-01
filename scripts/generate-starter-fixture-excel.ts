import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { generateStarterDevelopmentExcelSample } from "../src/project/fixture-data/development-excel-sample.ts";

const output = resolve(
	process.argv.find((argument) => argument.startsWith("--output="))?.slice(9) ??
		"fixtures/starter/developments.xlsx",
);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, await generateStarterDevelopmentExcelSample());
console.log(`starter fixture Excel generated: ${output}`);
