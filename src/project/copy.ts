/** Generated from the canonical project preset. Do not edit directly. */
import type { ProjectCopy } from "./copy.types.ts";

export const projectCopy = {
	"notFound": {
		"code": "Ошибка 404",
		"title": "Страница не найдена",
		"body": "Адрес мог измениться. Вернитесь на главную или откройте каталог недвижимости.",
		"homeLabel": "На главную",
		"catalogLabel": "В каталог",
		"catalogHref": "/kvartiry/"
	},
	"catalog": {
		"filteredSummary": "Каталог отфильтрован по выбранным параметрам."
	},
	"entityGone": {
		"title": "Объект снят с публикации",
		"bodyPrefix": "Страница объекта",
		"bodySuffix": "больше не содержит публичные данные после окончания retention-периода. Автоматический редирект на главную не выполняется.",
		"catalogLabel": "Смотреть актуальные объекты",
		"catalogHref": "/kvartiry/"
	}
} as const satisfies ProjectCopy;
