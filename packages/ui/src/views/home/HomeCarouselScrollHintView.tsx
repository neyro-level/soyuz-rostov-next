"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function HomeCarouselScrollHintView({ trackId }: { trackId: string }) {
	const [visible, setVisible] = useState(false);
	const hideTimeoutRef = useRef<number | null>(null);

	useEffect(() => {
		const track = document.getElementById(trackId);
		if (!track) return;
		const clearHideTimeout = () => {
			if (hideTimeoutRef.current !== null)
				window.clearTimeout(hideTimeoutRef.current);
			hideTimeoutRef.current = null;
		};
		const hide = () => {
			clearHideTimeout();
			setVisible(false);
		};
		const show = () => {
			clearHideTimeout();
			setVisible(true);
			hideTimeoutRef.current = window.setTimeout(() => {
				setVisible(false);
				hideTimeoutRef.current = null;
			}, 5200);
		};
		const onScroll = () => {
			if (track.scrollLeft > 20) hide();
		};
		const onVisibilityChange = () => {
			if (document.visibilityState === "visible") show();
		};
		show();
		track.addEventListener("scroll", onScroll, { passive: true });
		track.addEventListener("pointerdown", hide, { passive: true });
		track.addEventListener("touchstart", hide, { passive: true });
		window.addEventListener("pageshow", show);
		document.addEventListener("visibilitychange", onVisibilityChange);
		return () => {
			clearHideTimeout();
			track.removeEventListener("scroll", onScroll);
			track.removeEventListener("pointerdown", hide);
			track.removeEventListener("touchstart", hide);
			window.removeEventListener("pageshow", show);
			document.removeEventListener("visibilitychange", onVisibilityChange);
		};
	}, [trackId]);

	if (!visible) return null;
	return (
		<div className="home-carousel-hint" aria-hidden="true">
			<span className="home-carousel-hint__fade" />
			<span className="home-carousel-hint__bubble">
				<span className="home-carousel-hint__pulse">
					<ChevronRight
						className="home-carousel-hint__chevron"
						strokeWidth={2.4}
					/>
					<ChevronRight
						className="home-carousel-hint__chevron home-carousel-hint__chevron--late"
						strokeWidth={2.4}
					/>
				</span>
				<span className="home-carousel-hint__label">листайте вправо</span>
			</span>
		</div>
	);
}
