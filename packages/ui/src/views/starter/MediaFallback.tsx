import { Images } from "lucide-react";

export function MediaFallback({ className }: { className?: string }) {
	return (
		<div
			className={
				className ??
				"relative grid h-full min-h-40 place-items-center overflow-hidden bg-surface-subtle"
			}
			aria-hidden
		>
			<div className="absolute inset-0 bg-[linear-gradient(135deg,var(--surface-subtle),var(--muted))]" />
			<Images className="relative size-10 text-content-default opacity-40" />
		</div>
	);
}
