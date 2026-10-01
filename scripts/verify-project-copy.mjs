import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readClonePreset, renderProjectCopy } from "./clone-preset.mjs";

const generated = readFileSync("src/project/copy.ts", "utf8");
const souz = readClonePreset("docs/CLONE_PRESET.souz.example.json");
assert.equal(renderProjectCopy(souz), renderProjectCopy(structuredClone(souz)));
assert.match(renderProjectCopy(souz), /"catalogHref": "\/kvartiry\/"/);
for (const literal of [
	"Ошибка 404",
	"Страница не найдена",
	"Каталог отфильтрован по выбранным параметрам.",
	"Объект снят с публикации",
]) {
	assert.match(generated, new RegExp(literal));
}
assert.match(
	readFileSync("src/app/not-found.tsx", "utf8"),
	/projectCopy\.notFound/,
);
assert.match(
	readFileSync("src/app/(site)/[...segments]/page.tsx", "utf8"),
	/projectCopy\.catalog\.filteredSummary/,
);
assert.doesNotMatch(
	readFileSync("src/core/http/property-gone-response.ts", "utf8"),
	/[А-Яа-яЁё]/u,
);
assert.match(readFileSync("src/proxy.ts", "utf8"), /projectCopy\.entityGone/);
console.log("Project copy generation and representative route ownership: PASS");
