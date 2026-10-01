import { siteProfile } from "./site-profile.ts";

export type ProjectStaticRoute = (typeof siteProfile.staticRoutes)[number];

export const projectStaticRoutes = siteProfile.staticRoutes;
