import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const cardVariants = cva(
	"rounded-[var(--radius-lg)] border border-[var(--card-border,var(--border))] bg-[var(--card-bg,var(--surface))] text-[var(--text-primary)]",
	{
		variants: {
			elevation: {
				flat: "",
				raised: "shadow-[var(--shadow-card)]",
			},
		},
		defaultVariants: { elevation: "flat" },
	},
);

export function Card({
	className,
	elevation,
	...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>) {
	return (
		<div
			data-slot="card"
			className={cn(cardVariants({ elevation }), className)}
			{...props}
		/>
	);
}

export function CardHeader({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			data-slot="card-header"
			className={cn("grid gap-1.5 p-6", className)}
			{...props}
		/>
	);
}

export function CardTitle({
	className,
	...props
}: HTMLAttributes<HTMLHeadingElement>) {
	return (
		<h3
			data-slot="card-title"
			className={cn("text-lead font-semibold leading-tight-copy", className)}
			{...props}
		/>
	);
}

export function CardDescription({
	className,
	...props
}: HTMLAttributes<HTMLParagraphElement>) {
	return (
		<p
			data-slot="card-description"
			className={cn(
				"text-body leading-step-copy text-[var(--text-secondary,var(--card-visual-primary))]",
				className,
			)}
			{...props}
		/>
	);
}

export function CardAction({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			data-slot="card-action"
			className={cn("justify-self-end", className)}
			{...props}
		/>
	);
}

export function CardContent({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			data-slot="card-content"
			className={cn("p-6 pt-0", className)}
			{...props}
		/>
	);
}

export function CardFooter({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			data-slot="card-footer"
			className={cn("flex items-center gap-3 p-6 pt-0", className)}
			{...props}
		/>
	);
}

export { cardVariants };
