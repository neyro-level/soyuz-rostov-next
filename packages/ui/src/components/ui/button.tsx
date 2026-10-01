import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
	"inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--control-radius)] text-body font-semibold transition-colors duration-[var(--motion-duration-fast)] ease-site outline-none focus-visible:ring-[length:var(--focus-ring-width)] focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default:
					"bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]",
				destructive:
					"bg-[var(--destructive)] text-[var(--content-inverse)] hover:opacity-90",
				outline:
					"border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)]",
				secondary:
					"bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--muted)]",
				ghost:
					"text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
				link: "text-[var(--primary)] underline-offset-4 hover:underline",
				plain: "bg-transparent text-inherit",
				cardMedia:
					"absolute top-1/2 z-20 -translate-y-1/2 rounded-lg bg-[var(--surface-dark)]/28 text-[var(--content-inverse)] opacity-60 backdrop-blur-sm active:opacity-90 lg:bg-[var(--surface-dark)]/62 lg:opacity-0 lg:group-hover:opacity-100",
				hero:
					"min-h-12 border-0 bg-[var(--accent)] px-6 py-3.5 text-[var(--surface)] shadow-[var(--home-shadow-action)] hover:-translate-y-px hover:bg-[var(--accent-hover)] hover:shadow-[var(--home-shadow-action-hover)]",
			},
			size: {
				sm: "h-[var(--control-height-sm)] px-[var(--control-padding-sm)]",
				default: "h-[var(--control-height-md)] px-[var(--control-padding-md)]",
				lg: "h-[var(--control-height-lg)] px-[var(--control-padding-lg)]",
				icon: "size-[var(--control-height-md)]",
				content: "",
			},
		},
		defaultVariants: { variant: "default", size: "default" },
	},
);

export const Button = React.forwardRef<
	HTMLButtonElement,
	React.ComponentProps<"button"> &
		VariantProps<typeof buttonVariants> & { asChild?: boolean }
>(function Button(
	{ className, variant, size, asChild = false, ...props },
	ref,
) {
	const Comp = asChild ? Slot : "button";
	return (
		<Comp
			ref={ref}
			data-slot="button"
			className={
				variant === "plain"
					? className
					: cn(buttonVariants({ variant, size, className }))
			}
			{...props}
		/>
	);
});

export { buttonVariants };
