const cyrillicPattern = /[А-Яа-яЁё]/u;

export function findUnapprovedCyrillic(files, exceptions = new Set()) {
	return files
		.filter(({ path, source }) => {
			const normalized = path.replaceAll("\\", "/");
			return (
				(normalized.startsWith("src/app/") ||
					normalized.startsWith("src/core/")) &&
				cyrillicPattern.test(source) &&
				!exceptions.has(normalized)
			);
		})
		.map(({ path }) => path.replaceAll("\\", "/"));
}
