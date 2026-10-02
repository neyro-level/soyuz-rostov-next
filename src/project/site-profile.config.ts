/** Generated from the canonical project preset. Do not edit directly. */
import type { ProjectSiteProfileConfig } from "./site-profile.config.types.ts";

export const projectSiteProfileConfig = {
	"preset": "MIXED",
	"geoMode": "SINGLE_GEO",
	"primaryGeo": "rostov-na-donu",
	"geos": {
		"rostov-na-donu": {
			"published": true,
			"hubStatus": "ACTIVE"
		},
		"bataysk": {
			"published": true,
			"hubStatus": "PREPARED_OFF",
			"agglomerationOf": "rostov-na-donu"
		},
		"aksay": {
			"published": true,
			"hubStatus": "PREPARED_OFF",
			"agglomerationOf": "rostov-na-donu"
		}
	},
	"categoryStatus": {
		"kvartiry": "ACTIVE",
		"doma": "PREPARED_OFF",
		"uchastki": "PREPARED_OFF",
		"kommercheskaya-nedvizhimost": "PREPARED_OFF",
		"komnaty": "OUT",
		"garazhi": "OUT",
		"arenda": "OUT",
		"novostroyki": "ACTIVE",
		"kottedzhnye-poselki": "PREPARED_OFF"
	},
	"marketCapability": {
		"newbuild": "ACTIVE",
		"secondary": "ACTIVE"
	},
	"geoCategoryStatus": {
		"rostov-na-donu": {
			"kvartiry": "ACTIVE",
			"doma": "PREPARED_OFF",
			"uchastki": "PREPARED_OFF",
			"kommercheskaya-nedvizhimost": "PREPARED_OFF",
			"komnaty": "OUT",
			"garazhi": "OUT",
			"arenda": "OUT",
			"novostroyki": "ACTIVE",
			"kottedzhnye-poselki": "PREPARED_OFF"
		},
		"bataysk": {
			"kvartiry": "PREPARED_OFF",
			"doma": "PREPARED_OFF",
			"uchastki": "PREPARED_OFF",
			"kommercheskaya-nedvizhimost": "PREPARED_OFF",
			"komnaty": "OUT",
			"garazhi": "OUT",
			"arenda": "OUT",
			"novostroyki": "PREPARED_OFF",
			"kottedzhnye-poselki": "PREPARED_OFF"
		},
		"aksay": {
			"kvartiry": "PREPARED_OFF",
			"doma": "PREPARED_OFF",
			"uchastki": "PREPARED_OFF",
			"kommercheskaya-nedvizhimost": "PREPARED_OFF",
			"komnaty": "OUT",
			"garazhi": "OUT",
			"arenda": "OUT",
			"novostroyki": "PREPARED_OFF",
			"kottedzhnye-poselki": "PREPARED_OFF"
		}
	},
	"marketStatus": {
		"rostov-na-donu": {
			"newbuild": "ACTIVE",
			"secondary": "ACTIVE"
		},
		"bataysk": {
			"newbuild": "PREPARED_OFF",
			"secondary": "PREPARED_OFF"
		},
		"aksay": {
			"newbuild": "PREPARED_OFF",
			"secondary": "PREPARED_OFF"
		}
	},
	"developersSurface": {
		"root": "ACTIVE",
		"byGeo": {
			"rostov-na-donu": "ACTIVE",
			"bataysk": "PREPARED_OFF",
			"aksay": "PREPARED_OFF"
		}
	},
	"searchConsole": {
		"yandex": null,
		"google": null
	},
	"filterKeys": {
		"kvartiry": [
			"rooms",
			"district",
			"price",
			"area",
			"market"
		],
		"doma": [
			"district",
			"price",
			"area"
		],
		"uchastki": [
			"district",
			"price",
			"area"
		],
		"kommercheskaya-nedvizhimost": [
			"district",
			"price",
			"area"
		],
		"komnaty": [
			"rooms",
			"district",
			"price"
		],
		"garazhi": [
			"district",
			"price"
		],
		"arenda": [
			"rooms",
			"district",
			"price"
		],
		"novostroyki": [
			"district",
			"developer",
			"completionYear"
		],
		"kottedzhnye-poselki": [
			"district",
			"developer"
		]
	},
	"seoFacets": {
		"vtorichka": {
			"geo": "rostov-na-donu",
			"category": "kvartiry",
			"filter": {
				"key": "market",
				"value": "secondary"
			}
		}
	},
	"seoTiers": {
		"metric": "broad39",
		"snapshotDate": "2026-10-01",
		"bands": {
			"P1": 500,
			"P2": 100,
			"TEST": 50
		},
		"minInventory": {
			"P1": 5,
			"P2": 5,
			"TEST": 10
		},
		"unmeasuredPolicy": "NONE"
	},
	"gate": {
		"listingIntroMinChars": 600,
		"propertyPhotosMin": 3,
		"developmentA": {
			"priceRowsMin": 2,
			"mediaMin": 8,
			"layoutsMin": 1,
			"descriptionMinChars": 1500,
			"progressRequired": true
		},
		"developmentB": {
			"priceRowsMin": 1,
			"mediaMin": 3,
			"layoutsMin": 0,
			"descriptionMinChars": 600,
			"progressRequired": false
		},
		"priceStaleDays": 45,
		"priceFailDays": 120,
		"developerGeoMin": 5,
		"developerDescMinChars": 600
	},
	"staticRoutes": [
		{
			"path": "/",
			"changeFrequency": "daily",
			"priority": 1,
			"indexable": true
		},
		{
			"path": "/uslugi",
			"changeFrequency": "weekly",
			"priority": 0.7,
			"indexable": true
		},
		{
			"path": "/o-kompanii",
			"changeFrequency": "monthly",
			"priority": 0.6,
			"indexable": true
		},
		{
			"path": "/ipoteka",
			"changeFrequency": "weekly",
			"priority": 0.7,
			"indexable": true
		},
		{
			"path": "/ipoteka/semeynaya",
			"changeFrequency": "weekly",
			"priority": 0.6,
			"indexable": false
		},
		{
			"path": "/prodat",
			"changeFrequency": "weekly",
			"priority": 0.7,
			"indexable": true
		},
		{
			"path": "/kontakty",
			"changeFrequency": "monthly",
			"priority": 0.6,
			"indexable": true
		},
		{
			"path": "/politika-konfidencialnosti",
			"changeFrequency": "yearly",
			"priority": 0.2,
			"indexable": false
		},
		{
			"path": "/soglasie-na-obrabotku-personalnyh-dannyh",
			"changeFrequency": "yearly",
			"priority": 0.2,
			"indexable": false
		}
	],
	"legacyRoutes": [
		{
			"from": "/kvartiry-rostova",
			"to": "/rostov-na-donu/kvartiry/",
			"statusCode": 301
		}
	],
	"legacyPatterns": [
		{
			"kind": "property",
			"from": "/obekty/{slug}",
			"statusCode": 301
		}
	],
	"modules": {
		"novostroyki": {
			"state": "prepared",
			"reservedRoots": [
				"komplex"
			]
		},
		"journal": {
			"state": "disabled",
			"reservedRoots": [
				"journal"
			]
		},
		"agents": {
			"state": "disabled",
			"reservedRoots": [
				"sotrudniki"
			]
		}
	},
	"entityPrefixes": {
		"residentialComplex": "zhk-",
		"cottageVillage": "kp-"
	}
} as const satisfies ProjectSiteProfileConfig;
