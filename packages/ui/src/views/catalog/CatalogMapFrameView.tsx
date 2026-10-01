import type { HTMLAttributes, ReactNode } from "react";

export function CatalogMapFrameView({
	sidebar,
	canvas,
	statusMessage,
	action,
	testId = "catalog-map",
	rootProps,
}: {
	sidebar: ReactNode;
	canvas: ReactNode;
	statusMessage?: ReactNode;
	action?: ReactNode;
	testId?: string;
	rootProps?: HTMLAttributes<HTMLDivElement>;
}) {
	return (
		<div
			{...rootProps}
			data-testid={testId}
			className={`mt-5 flex flex-col overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] lg:grid lg:h-[640px] lg:grid-cols-[340px_minmax(0,1fr)] ${rootProps?.className ?? ""}`}
		>
			<aside className="order-2 border-t border-[var(--border-default)] bg-[var(--surface-raised)] p-3 lg:order-1 lg:overflow-y-auto lg:border-r lg:border-t-0 lg:p-4">
				{sidebar}
			</aside>
			<div className="order-1 relative min-h-[420px] bg-[var(--surface-subtle)] lg:order-2 lg:min-h-0">
				{canvas}
				{statusMessage ? (
					<div className="absolute inset-0 grid place-items-center p-6 text-center text-body font-semibold text-[var(--new-building-map-content-strong)]">
						{statusMessage}
					</div>
				) : null}
				{action}
			</div>
		</div>
	);
}
