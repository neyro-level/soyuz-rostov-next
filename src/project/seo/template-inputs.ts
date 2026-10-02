/** Generated project-owned SEO copy inputs from clone preset v3. */
export const projectSeoCategoryLabelsInput = {
	"kvartiry": {
		"nominativePlural": "Квартиры",
		"nominativePluralLower": "квартиры",
		"accusativeSingular": "квартиру",
		"genitivePlural": "квартир",
		"dealVerb": "Купить"
	},
	"doma": {
		"nominativePlural": "Дома",
		"nominativePluralLower": "дома",
		"accusativeSingular": "дом",
		"genitivePlural": "домов",
		"dealVerb": "Купить"
	},
	"uchastki": {
		"nominativePlural": "Участки",
		"nominativePluralLower": "участки",
		"accusativeSingular": "участок",
		"genitivePlural": "участков",
		"dealVerb": "Купить"
	},
	"kommercheskaya-nedvizhimost": {
		"nominativePlural": "Коммерческая недвижимость",
		"nominativePluralLower": "коммерческая недвижимость",
		"accusativeSingular": "коммерческую недвижимость",
		"genitivePlural": "объектов коммерческой недвижимости",
		"dealVerb": "Купить"
	},
	"komnaty": {
		"nominativePlural": "Комнаты",
		"nominativePluralLower": "комнаты",
		"accusativeSingular": "комнату",
		"genitivePlural": "комнат",
		"dealVerb": "Купить"
	},
	"garazhi": {
		"nominativePlural": "Гаражи",
		"nominativePluralLower": "гаражи",
		"accusativeSingular": "гараж",
		"genitivePlural": "гаражей",
		"dealVerb": "Купить"
	},
	"arenda": {
		"nominativePlural": "Аренда недвижимости",
		"nominativePluralLower": "аренда недвижимости",
		"accusativeSingular": "объект в аренду",
		"genitivePlural": "предложений аренды",
		"dealVerb": "Снять"
	},
	"novostroyki": {
		"nominativePlural": "Новостройки",
		"nominativePluralLower": "новостройки",
		"accusativeSingular": "новостройку",
		"genitivePlural": "новостроек",
		"dealVerb": "Купить"
	},
	"kottedzhnye-poselki": {
		"nominativePlural": "Коттеджные посёлки",
		"nominativePluralLower": "коттеджные посёлки",
		"accusativeSingular": "коттеджный посёлок",
		"genitivePlural": "коттеджных посёлков",
		"dealVerb": "Купить"
	}
} as const;

export const projectSeoFacetLabelsInput = {
	"vtorichka": "Вторичные",
	"dvukhkomnatnye": "Двухкомнатные",
	"odnokomnatnye": "Однокомнатные"
} as const;

export const projectSeoTemplatesInput = {
	"homeSingleGeo": {
		"title": "Недвижимость {geoGenitive} — {brand}",
		"h1": "Недвижимость {geoGenitive}",
		"description": "Подбор недвижимости[ {cityPhrase}][ — {inventory}.]"
	},
	"homeMultiGeo": {
		"title": "Недвижимость — {brand}",
		"h1": "Недвижимость",
		"description": "Подбор недвижимости и сопровождение сделок[ — {inventory}.]"
	},
	"geoHub": {
		"title": "Недвижимость {geoGenitive} — {brand}",
		"h1": "Недвижимость {geoGenitive}",
		"description": "{activeCategoriesList}[ {cityPhrase}][ — {inventory}.]"
	},
	"categoryRoot": {
		"title": "{category} — {brand}",
		"h1": "{category}",
		"description": "{category} — актуальные предложения[. {inventory}.]"
	},
	"categoryGeo": {
		"title": "{category} {cityPhrase} — {brand}",
		"h1": "{category} {cityPhrase}",
		"description": "{category} {cityPhrase} — актуальные предложения[. {inventory}.]"
	},
	"categoryGeoDistrictAdmin": {
		"title": "{dealVerb} {categoryAccusative} в {districtAdjLocative} районе {cityGenitive} — цены",
		"h1": "{categoryNominativePlural} в {districtAdjLocative} районе {cityGenitive}",
		"description": "{categoryNominativePlural} в {districtAdjLocative} районе {cityGenitive} — актуальные предложения[. {inventory}.]"
	},
	"categoryGeoDistrictMicro": {
		"title": "{dealVerb} {categoryAccusative} {districtPhrase} {cityPhrase} — цены",
		"h1": "{categoryNominativePlural} {districtPhrase}",
		"description": "{categoryNominativePlural} {districtPhrase} {cityPhrase} — актуальные предложения[. {inventory}.]"
	},
	"categoryGeoFacet": {
		"title": "{facet} {categoryLower} {cityPhrase} — {brand}",
		"h1": "{facet} {categoryLower} {cityPhrase}",
		"description": "{facet} {categoryLower} {cityPhrase} — актуальные предложения[. {inventory}.]"
	},
	"geoDevelopers": {
		"title": "Застройщики {cityPhrase} — {brand}",
		"h1": "Застройщики {cityPhrase}",
		"description": "Застройщики и жилые комплексы {cityPhrase}[ — {inventory}.]"
	},
	"developerRoot": {
		"title": "Застройщики — {brand}",
		"h1": "Застройщики",
		"description": "Застройщики и жилые комплексы[ — {inventory}.]"
	},
	"developmentNormal": {
		"title": "{entityName} — {brand}",
		"h1": "{entityName}",
		"description": "{entityName}[ {cityPhrase}][ — {freshPrice}.]"
	},
	"developmentCollision": {
		"title": "{entityName} {cityPhrase} — {brand}",
		"h1": "{entityName} {cityPhrase}",
		"description": "{entityName} {cityPhrase}[ — {freshPrice}.]"
	},
	"developer": {
		"title": "{entityName} — {brand}",
		"h1": "{entityName}",
		"description": "Объекты застройщика {entityName}[ {cityPhrase}][ — {inventory}.]"
	},
	"property": {
		"title": "{entityName} — {brand}",
		"h1": "{entityName}",
		"description": "{entityName}[ {cityPhrase}][ — {freshPrice}.]"
	}
} as const;
