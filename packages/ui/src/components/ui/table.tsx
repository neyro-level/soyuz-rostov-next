import type * as React from "react";

import { cn } from "../../lib/utils";

export function Table({ className, ...props }: React.ComponentProps<"table">) {
	return (
		<table
			data-slot="table"
			className={cn(
				"w-full caption-bottom border-collapse text-body",
				className,
			)}
			{...props}
		/>
	);
}

export function TableHeader({
	className,
	...props
}: React.ComponentProps<"thead">) {
	return (
		<thead
			data-slot="table-header"
			className={cn("[&_tr]:border-b", className)}
			{...props}
		/>
	);
}

export function TableBody({
	className,
	...props
}: React.ComponentProps<"tbody">) {
	return (
		<tbody
			data-slot="table-body"
			className={cn("[&_tr:last-child]:border-0", className)}
			{...props}
		/>
	);
}

export function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
	return (
		<tr
			data-slot="table-row"
			className={cn("border-b border-[var(--surface-muted)]", className)}
			{...props}
		/>
	);
}

export function TableHead({ className, ...props }: React.ComponentProps<"th">) {
	return (
		<th
			data-slot="table-head"
			className={cn("text-left align-top font-medium", className)}
			{...props}
		/>
	);
}

export function TableCell({ className, ...props }: React.ComponentProps<"td">) {
	return (
		<td
			data-slot="table-cell"
			className={cn("align-top", className)}
			{...props}
		/>
	);
}

export function TableCaption({
	className,
	...props
}: React.ComponentProps<"caption">) {
	return (
		<caption
			data-slot="table-caption"
			className={cn("sr-only", className)}
			{...props}
		/>
	);
}
