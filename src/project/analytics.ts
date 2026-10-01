import { createNoopAnalyticsAdapter } from "../core/analytics/events.ts";

// Project composition stays feature-off until a client explicitly selects a provider.
export const projectAnalytics = createNoopAnalyticsAdapter();
