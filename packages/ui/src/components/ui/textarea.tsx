import * as React from "react";
import { cn } from "../../lib/utils";

export const Textarea = React.forwardRef<
	HTMLTextAreaElement,
	React.ComponentProps<"textarea"> & { variant?: "default" | "plain" }
>(function Textarea({ className, variant = "default", ...props }, ref) {
	return (
		<textarea
			ref={ref}
			data-slot="textarea"
			className={
				variant === "plain"
					? className
					: cn(
							"min-h-24 w-full rounded-[var(--control-radius)] border border-[var(--input)] bg-transparent px-[var(--control-padding-sm)] py-2 text-body-large text-[var(--foreground)] outline-none transition-colors duration-[var(--motion-duration-fast)] ease-site placeholder:text-[var(--muted-foreground)] focus-visible:border-[var(--ring)] focus-visible:ring-[length:var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-soft)] disabled:cursor-not-allowed disabled:opacity-50 md:text-body",
							className,
						)
			}
			{...props}
		/>
	);
});
