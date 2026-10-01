import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import type { ComponentProps, HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Breadcrumb({ className, ...props }: ComponentProps<"nav">) {
	return (
		<nav
			aria-label="Хлебные крошки"
			data-slot="breadcrumb"
			className={cn("w-full", className)}
			{...props}
		/>
	);
}

export function BreadcrumbList({ className, ...props }: ComponentProps<"ol">) {
	return (
		<ol
			data-slot="breadcrumb-list"
			className={cn(
				"flex flex-wrap items-center gap-1.5 text-body text-[var(--breadcrumb-content-primary)]",
				className,
			)}
			{...props}
		/>
	);
}

export function BreadcrumbItem({ className, ...props }: ComponentProps<"li">) {
	return (
		<li
			data-slot="breadcrumb-item"
			className={cn("inline-flex items-center gap-1.5", className)}
			{...props}
		/>
	);
}

export function BreadcrumbLink({
	asChild,
	className,
	...props
}: ComponentProps<"a"> & { asChild?: boolean }) {
	const Comp = asChild ? Slot : "a";
	return (
		<Comp
			data-slot="breadcrumb-link"
			className={cn(
				"transition duration-[var(--motion-duration-fast)] ease-site hover:text-[var(--text-primary)]",
				className,
			)}
			{...props}
		/>
	);
}

export function BreadcrumbPage({
	className,
	...props
}: HTMLAttributes<HTMLSpanElement>) {
	return (
		<span
			data-slot="breadcrumb-page"
			aria-current="page"
			className={cn("font-medium text-[var(--text-primary)]", className)}
			{...props}
		/>
	);
}

export function BreadcrumbSeparator({
	className,
	children,
	...props
}: HTMLAttributes<HTMLLIElement>) {
	return (
		<li
			data-slot="breadcrumb-separator"
			aria-hidden="true"
			className={cn("text-[var(--breadcrumb-content-secondary)]", className)}
			{...props}
		>
			{children ?? <ChevronRight className="size-3.5" />}
		</li>
	);
}

export function BreadcrumbEllipsis({
	className,
	...props
}: HTMLAttributes<HTMLSpanElement>) {
	return (
		<span
			data-slot="breadcrumb-ellipsis"
			aria-hidden="true"
			className={cn(
				"inline-flex size-9 items-center justify-center",
				className,
			)}
			{...props}
		>
			<MoreHorizontal className="size-4" />
			<span className="sr-only">Ещё</span>
		</span>
	);
}
