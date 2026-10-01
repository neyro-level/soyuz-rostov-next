import type { ComponentProps, ElementType, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

type PolymorphicProps<T extends ElementType> = {
	as?: T;
	children?: ReactNode;
	className?: string;
} & Omit<ComponentProps<T>, "as" | "children" | "className">;

const containerVariants = cva(
	"mx-auto w-full px-[var(--container-gutter-mobile)] md:px-[var(--container-gutter-tablet)] lg:px-[var(--container-gutter-desktop)]",
	{
		variants: {
			size: {
				narrow: "max-w-[var(--container-narrow-max)]",
				site: "max-w-[var(--container-site-max)]",
				wide: "max-w-[var(--container-wide-max)]",
			},
		},
		defaultVariants: { size: "site" },
	},
);

const sectionVariants = cva("", {
	variants: {
		space: {
			sm: "py-[var(--section-space-sm)]",
			md: "py-[var(--section-space-sm)] md:py-[var(--section-space-md)]",
			lg: "py-[var(--section-space-sm)] md:py-[var(--section-space-md)] lg:py-[var(--section-space-lg)]",
			hero: "py-[var(--section-space-md)] lg:py-[var(--section-space-hero)]",
		},
	},
	defaultVariants: { space: "lg" },
});

export function Container<T extends ElementType = "div">({
	as,
	className,
	size,
	...props
}: PolymorphicProps<T> & VariantProps<typeof containerVariants>) {
	const Component = as ?? "div";
	return (
		<Component
			data-slot="container"
			className={cn(containerVariants({ size }), className)}
			{...props}
		/>
	);
}

export function Section<T extends ElementType = "section">({
	as,
	className,
	space,
	...props
}: PolymorphicProps<T> & VariantProps<typeof sectionVariants>) {
	const Component = as ?? "section";
	return (
		<Component
			data-slot="section"
			className={cn(sectionVariants({ space }), className)}
			{...props}
		/>
	);
}

export function Stack<T extends ElementType = "div">({
	as,
	className,
	...props
}: PolymorphicProps<T>) {
	const Component = as ?? "div";
	return (
		<Component
			data-slot="stack"
			className={cn("flex flex-col gap-4", className)}
			{...props}
		/>
	);
}

export function Cluster<T extends ElementType = "div">({
	as,
	className,
	...props
}: PolymorphicProps<T>) {
	const Component = as ?? "div";
	return (
		<Component
			data-slot="cluster"
			className={cn("flex flex-wrap items-center gap-3", className)}
			{...props}
		/>
	);
}

export function SectionHeader({
	eyebrow,
	title,
	description,
	action,
	className,
	titleId,
}: {
	eyebrow?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	action?: ReactNode;
	className?: string;
	titleId?: string;
}) {
	return (
		<header
			data-slot="section-header"
			className={cn(
				"flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
				className,
			)}
		>
			<div className="max-w-3xl">
				{eyebrow ? (
					<p className="text-label font-semibold uppercase tracking-wide-role text-action-primary">
						{eyebrow}
					</p>
				) : null}
				<h2
					id={titleId}
					className="text-[length:var(--site-type-section)] font-semibold leading-[var(--site-type-section-leading)] text-content-strong"
				>
					{title}
				</h2>
				{description ? (
					<p className="mt-3 text-body leading-step-copy text-content-default md:text-body-large">
						{description}
					</p>
				) : null}
			</div>
			{action ? <div className="shrink-0">{action}</div> : null}
		</header>
	);
}
