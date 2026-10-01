import type { Access } from "payload";

export const userRoles = ["owner", "admin", "editor"] as const;

export type UserRole = (typeof userRoles)[number];

type RoleUser = {
	roles?: UserRole[] | null;
};

export function hasRole(user: unknown, allowed: readonly UserRole[]) {
	const roles = (user as RoleUser | null | undefined)?.roles;
	return Array.isArray(roles) && roles.some((role) => allowed.includes(role));
}

export const adminsAndOwners: Access = ({ req }) =>
	hasRole(req.user, ["owner", "admin"]);

export const ownersOnly: Access = ({ req }) => hasRole(req.user, ["owner"]);

// Named System Gateway calls bypass collection access explicitly. Returning false
// here keeps generic Local/REST/Admin mutations closed for every authenticated role.
export const systemGatewayOnly: Access = () => false;

export const authenticated: Access = ({ req }) => Boolean(req.user);
