/** Generated from the canonical project preset. Do not edit directly. */
import type { ProjectSiteProfileConfig } from "./site-profile.config.types.ts";

export const projectSiteProfileConfig = {
	"preset": "MIXED",
	"geoMode": "SINGLE_GEO",
	"primaryGeo": "primorsk",
	"geos": {
		"primorsk": {
			"published": true,
			"hubStatus": "ACTIVE"
		}
	},
	"categoryStatus": {
		"kvartiry": "ACTIVE",
		"doma": "ACTIVE",
		"uchastki": "ACTIVE",
		"kommercheskaya-nedvizhimost": "ACTIVE",
		"komnaty": "ACTIVE",
		"garazhi": "ACTIVE",
		"arenda": "ACTIVE",
		"novostroyki": "ACTIVE",
		"kottedzhnye-poselki": "ACTIVE"
	},
	"marketCapability": {
		"newbuild": "ACTIVE",
		"secondary": "ACTIVE"
	},
	"geoCategoryStatus": {
		"primorsk": {
			"kvartiry": "ACTIVE",
			"doma": "ACTIVE",
			"uchastki": "ACTIVE",
			"kommercheskaya-nedvizhimost": "ACTIVE",
			"komnaty": "ACTIVE",
			"garazhi": "ACTIVE",
			"arenda": "ACTIVE",
			"novostroyki": "ACTIVE",
			"kottedzhnye-poselki": "ACTIVE"
		}
	},
	"marketStatus": {
		"primorsk": {
			"newbuild": "ACTIVE",
			"secondary": "ACTIVE"
		}
	},
	"developersSurface": {
		"root": "ACTIVE",
		"byGeo": {
			"primorsk": "ACTIVE"
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
			"geo": "primorsk",
			"category": "kvartiry",
			"filter": {
				"key": "market",
				"value": "secondary"
			}
		},
		"dvukhkomnatnye": {
			"geo": "primorsk",
			"category": "kvartiry",
			"filter": {
				"key": "rooms",
				"value": [
					2
				]
			}
		}
	},
	"seoTiers": {
		"metric": "searchDemand",
		"snapshotDate": "2026-09-24",
		"bands": {
			"P1": 100,
			"P2": 50,
			"TEST": 0
		},
		"minInventory": {
			"P1": 5,
			"P2": 5,
			"TEST": 10
		},
		"unmeasuredPolicy": "TEST"
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
			"path": "/prodat",
			"changeFrequency": "weekly",
			"priority": 0.7,
			"indexable": true
		},
		{
			"path": "/sdat",
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
			"from": "/nedvizhimost",
			"to": "/kvartiry/",
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
