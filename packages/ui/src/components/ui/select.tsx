import * as React from "react";
import { cn } from "../../lib/utils";

export const Select = React.forwardRef<
	HTMLSelectElement,
	React.ComponentProps<"select"> & { variant?: "native" | "styled" }
>(function Select({ className, variant = "styled", ...props }, ref) {
	return (
		<select
			ref={ref}
			data-slot="select"
			className={
				variant === "native"
					? className
					: cn(
							"h-[var(--control-height-md)] w-full rounded-[var(--control-radius)] border border-[var(--input)] bg-[var(--surface)] px-[var(--control-padding-sm)] text-body text-[var(--foreground)] outline-none transition-colors duration-[var(--motion-duration-fast)] ease-site focus-visible:border-[var(--ring)] focus-visible:ring-[length:var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-soft)] disabled:cursor-not-allowed disabled:opacity-50",
							className,
						)
			}
			{...props}
		/>
	);
});
