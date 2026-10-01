import assert from "node:assert/strict";
import { findUnapprovedCyrillic } from "./cyrillic-ownership-rules.mjs";

assert.deepEqual(
	findUnapprovedCyrillic([
		{ path: "src/app/page.tsx", source: 'const title = "Клиентский текст";' },
	]),
	["src/app/page.tsx"],
);
assert.deepEqual(
	findUnapprovedCyrillic([
		{ path: "src/project/copy.ts", source: 'const title = "Проектный текст";' },
	]),
	[],
);
assert.deepEqual(
	findUnapprovedCyrillic(
		[{ path: "src/core/protocol.ts", source: 'const unit = "кв.м";' }],
		new Set(["src/core/protocol.ts"]),
	),
	[],
);
console.log("Cyrillic ownership guard self-tests: PASS");
