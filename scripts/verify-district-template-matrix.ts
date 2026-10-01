import assert from "node:assert/strict";
import {
	projectSeoCategoryForms,
	renderProjectSeoTemplate,
} from "../src/project/seo/templates.ts";

const categories = [
	"kvartiry",
	"doma",
	"uchastki",
	"kommercheskaya-nedvizhimost",
	"komnaty",
	"garazhi",
	"arenda",
	"novostroyki",
	"kottedzhnye-poselki",
] as const;

const cities = [
	{
		approved: true as const,
		nominative: "Ростов-на-Дону",
		genitive: "Ростова-на-Дону",
		prepositional: "Ростове-на-Дону",
		preposition: "в",
	},
	{
		approved: true as const,
		nominative: "Краснодар",
		genitive: "Краснодара",
		prepositional: "Краснодаре",
		preposition: "в",
	},
] as const;

const adminDistrict = {
	approved: true as const,
	nominative: "Ленинский",
	genitive: "Ленинского",
	prepositional: "Ленинском районе",
	preposition: "в",
} as const;
const microDistrict = {
	approved: true as const,
	nominative: "Северный",
	genitive: "Северного",
	prepositional: "Северном",
	preposition: "на",
} as const;

let snapshots = 0;
for (const slug of categories) {
	const forms = projectSeoCategoryForms(slug);
	assert.ok(forms.nominativePluralLower.trim());
	assert.ok(forms.dealVerb.trim());
	for (const city of cities) {
		const admin = renderProjectSeoTemplate("categoryGeoDistrictAdmin", {
			brand: "Matrix",
			category: forms,
			city,
			district: adminDistrict,
			districtType: "admin_district",
			districtAdjLocative: "Ленинском",
			districtAdjGenitive: "Ленинского",
		});
		assert.equal(
			admin.title,
			`${forms.dealVerb} ${forms.accusativeSingular} в Ленинском районе ${city.genitive} — цены`,
		);
		assert.equal(
			admin.h1,
			`${forms.nominativePlural} в Ленинском районе ${city.genitive}`,
		);
		snapshots += 1;

		const micro = renderProjectSeoTemplate("categoryGeoDistrictMicro", {
			brand: "Matrix",
			category: forms,
			city,
			district: microDistrict,
			districtType: "microdistrict",
		});
		assert.equal(
			micro.title,
			`${forms.dealVerb} ${forms.accusativeSingular} на Северном в ${city.prepositional} — цены`,
		);
		assert.equal(
			micro.h1,
			`${forms.nominativePlural} на Северном`,
		);
		if (slug === "arenda") {
			assert.doesNotMatch(`${admin.title} ${micro.title}`, /Купить/u);
		}
		snapshots += 1;
	}
}

assert.deepEqual(projectSeoCategoryForms("kvartiry"), {
	nominativePlural: "Квартиры",
	nominativePluralLower: "квартиры",
	accusativeSingular: "квартиру",
	genitivePlural: "квартир",
	dealVerb: "Купить",
});
assert.deepEqual(projectSeoCategoryForms("arenda"), {
	nominativePlural: "Аренда недвижимости",
	nominativePluralLower: "аренда недвижимости",
	accusativeSingular: "объект в аренду",
	genitivePlural: "предложений аренды",
	dealVerb: "Снять",
});

assert.equal(snapshots, 9 * 2 * 2);
assert.equal(
	renderProjectSeoTemplate("categoryGeoDistrictMicro", {
		brand: "Matrix",
		category: projectSeoCategoryForms("kvartiry"),
		city: cities[0],
		district: microDistrict,
		districtType: "microdistrict",
	}).title,
	"Купить квартиру на Северном в Ростове-на-Дону — цены",
);
assert.equal(
	renderProjectSeoTemplate("categoryGeoDistrictAdmin", {
		brand: "Matrix",
		category: projectSeoCategoryForms("doma"),
		city: cities[0],
		district: adminDistrict,
		districtType: "admin_district",
		districtAdjLocative: "Ленинском",
		districtAdjGenitive: "Ленинского",
	}).title,
	"Купить дом в Ленинском районе Ростова-на-Дону — цены",
);
assert.throws(
	() =>
		renderProjectSeoTemplate("categoryGeoDistrictMicro", {
			brand: "Matrix",
			city: cities[0],
			district: microDistrict,
			districtType: "microdistrict",
		}),
	/SEO template requires dealVerb/,
);

console.log(`district template matrix passed: ${snapshots} snapshots`);
