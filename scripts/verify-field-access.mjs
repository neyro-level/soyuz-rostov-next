import { readFileSync } from "node:fs";

const properties = readFileSync("src/project/collections/Properties.ts", "utf8");
const leads = readFileSync("src/project/collections/Leads.ts", "utf8");

function assertFieldAccess(source, field) {
	const pattern = new RegExp(`name:\\s*"${field}"[\\s\\S]{0,180}access:\\s*(privateFieldAccess|piiFieldAccess)`);
	if (!pattern.test(source)) {
		throw new Error(`field ${field} is missing documented field-level access`);
	}
}

for (const field of ["unitNumber", "cadastralNumber", "internalComment", "ownerContact"]) {
	assertFieldAccess(properties, field);
}
for (const field of ["name", "phoneRaw", "phoneE164", "email", "message"]) {
	assertFieldAccess(leads, field);
}

if (!properties.includes("read: fieldAdminsAndOwners")) {
	throw new Error("properties private fields must be admin/owner read");
}

console.log("verify-field-access: ok");
