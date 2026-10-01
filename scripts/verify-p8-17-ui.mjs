import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) =>
	readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const views = read("packages/ui/src/views.ts");
const expectedExports = [
	"GeoHubView",
	"ListingView",
	"NearbyView",
	"DevelopmentCardView",
	"DevelopmentDetailsView",
	"PriceRequestFormView",
	"DevelopersListView",
	"DeveloperView",
	"GeoSwitcherView",
];
for (const name of expectedExports)
	assert.match(views, new RegExp(name), `${name} must be exported`);

const lead = read("packages/ui/src/views/starter/LeadFormView.tsx");
assert.match(lead, /toIntakeFormKind/);
assert.match(lead, /context: entityContext/);
assert.match(
	read("packages/ui/src/views/starter/lead-form-kind.ts"),
	/development_price/,
);
assert.doesNotMatch(
	read("packages/ui/src/views/development/PriceRequestFormView.tsx"),
	/intakeKind=/,
	"development form kind must be mapped centrally",
);

const development = read(
	"packages/ui/src/views/development/DevelopmentDetailsView.tsx",
);
const developmentPresentation = read(
	"packages/ui/src/views/development/development-presentation.ts",
);
assert.match(
	developmentPresentation,
	/45 \* 86_400_000/,
	"stale prices must be hidden after 45 days",
);
for (const section of ["Планировки", "Ход строительства", "Вопросы и ответы"])
	assert.match(development, new RegExp(section));

const switcher = read("packages/ui/src/views/site-shell/GeoSwitcherView.tsx");
assert.match(switcher, /mode === "SINGLE_GEO"/);
assert.match(switcher, /return null/);

const property = read(
	"packages/ui/src/views/property/StarterPropertyPageView.tsx",
);
assert.match(property, /property\.category/);
assert.match(property, /Уточнить юридическую проверку/);

const routes = read("docs/02_PRODUCT_STRUCTURE.md");
assert.match(routes, /CANONICAL GEO-CATALOG RUNTIME/);
assert.match(routes, /live via resolver/);
assert.doesNotMatch(
	read("src/fixture/p8-17-ui.tsx"),
	/from ["']@\/app/,
	"fixture must remain outside App Router",
);

console.log(
	"verify:p8-17-ui passed (views, lead reuse, stale prices, SINGLE_GEO, neutral legal CTA, no route wiring)",
);
