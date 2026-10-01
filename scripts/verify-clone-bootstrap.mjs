import { resolve } from "node:path";
import { validateCloneBootstrap } from "./clone-preset.mjs";

const rootArg = process.argv.find((arg) => arg.startsWith("--root="));
const root = resolve(rootArg ? rootArg.slice("--root=".length) : process.cwd());
const bootstrap = validateCloneBootstrap(root);
console.log(
	`verify:clone-bootstrap: ${bootstrap.preset} PASS (${bootstrap.geos.length} geos, ${bootstrap.seoRegistry.rows.length} registry rows)`,
);
