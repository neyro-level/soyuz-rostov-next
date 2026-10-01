import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
	"inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-label font-semibold whitespace-nowrap transition-colors duration-[var(--motion-duration-fast)] ease-site",
	{
		variants: {
			variant: {
				default:
					"border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]",
				secondary:
					"border-transparent bg-[var(--secondary)] text-[var(--secondary-foreground)]",
				outline:
					"border-[var(--border)] bg-transparent text-[var(--foreground)]",
				soft: "border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary)]",
			},
		},
		defaultVariants: { variant: "default" },
	},
);

export function Badge({
	className,
	variant,
	asChild = false,
	...props
}: React.ComponentProps<"span"> &
	VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot : "span";
	return (
		<Comp
			data-slot="badge"
			className={cn(badgeVariants({ variant }), className)}
			{...props}
		/>
	);
}

export { badgeVariants };
