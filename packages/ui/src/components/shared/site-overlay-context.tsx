"use client";

import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";
import { Button } from "../ui/button";
import { Slot } from "../ui/slot";

export type RequestOverlayDetail = {
	title?: string;
	subtitle?: string;
	source?: string;
	formType?: string;
	submitLabel?: string;
	showSubtitle?: boolean;
	propertyId?: string;
	complexId?: string;
	complexName?: string;
	agentId?: string;
	propertyTitle?: string;
	propertyAddress?: string;
	propertyObjectCode?: string;
	propertyPath?: string;
};

export type PropertyChatOverlayDetail = {
	propertyId?: string;
	agentId?: string | null;
	sourcePage?: string;
	title?: string;
	address?: string;
	objectCode?: string | null;
	propertyPath?: string;
	initialMessage?: string;
	lockMessage?: boolean;
};

type SiteOverlayContextValue = {
	request: RequestOverlayDetail | null;
	propertyChat: PropertyChatOverlayDetail | null;
	propertyChatVersion: number;
	openRequest: (detail?: RequestOverlayDetail) => void;
	closeRequest: () => void;
	openPropertyChat: (detail?: PropertyChatOverlayDetail) => void;
	closePropertyChat: () => void;
};

const SiteOverlayContext = createContext<SiteOverlayContextValue | null>(null);

export function SiteOverlayProvider({
	children,
	onOpen,
}: {
	children: React.ReactNode;
	onOpen?: (kind: "request" | "property-chat") => void;
}) {
	const [request, setRequest] = useState<RequestOverlayDetail | null>(null);
	const requestTriggerRef = useRef<HTMLElement | null>(null);
	const [propertyChat, setPropertyChat] =
		useState<PropertyChatOverlayDetail | null>(null);
	const [propertyChatVersion, setPropertyChatVersion] = useState(0);
	const openRequest = useCallback(
		(detail: RequestOverlayDetail = {}) => {
			requestTriggerRef.current =
				document.activeElement instanceof HTMLElement
					? document.activeElement
					: null;
			setRequest(detail);
			onOpen?.("request");
		},
		[onOpen],
	);
	const closeRequest = useCallback(() => {
		setRequest(null);
		const trigger = requestTriggerRef.current;
		requestTriggerRef.current = null;
		window.requestAnimationFrame(() => trigger?.focus());
	}, []);
	const openPropertyChat = useCallback(
		(detail: PropertyChatOverlayDetail = {}) => {
			setPropertyChat(detail);
			setPropertyChatVersion((value) => value + 1);
			onOpen?.("property-chat");
		},
		[onOpen],
	);
	const closePropertyChat = useCallback(() => setPropertyChat(null), []);
	const value = useMemo(
		() => ({
			request,
			propertyChat,
			propertyChatVersion,
			openRequest,
			closeRequest,
			openPropertyChat,
			closePropertyChat,
		}),
		[
			request,
			propertyChat,
			propertyChatVersion,
			openRequest,
			closeRequest,
			openPropertyChat,
			closePropertyChat,
		],
	);

	return (
		<SiteOverlayContext.Provider value={value}>
			{children}
		</SiteOverlayContext.Provider>
	);
}

export function useSiteOverlay() {
	const context = useContext(SiteOverlayContext);
	if (!context)
		throw new Error("useSiteOverlay must be used within SiteOverlayProvider");
	return context;
}

export function RequestModalTrigger({
	request,
	children,
}: {
	request: RequestOverlayDetail;
	children: React.ReactElement;
}) {
	const { openRequest } = useSiteOverlay();
	return (
		<Slot
			onClick={() => openRequest(request)}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					openRequest(request);
				}
			}}
		>
			{children}
		</Slot>
	);
}

export function RequestModalButton({
	request,
	...props
}: React.ComponentProps<typeof Button> & { request: RequestOverlayDetail }) {
	const { openRequest } = useSiteOverlay();
	return (
		<Button
			{...props}
			onClick={(event) => {
				props.onClick?.(event);
				if (!event.defaultPrevented) openRequest(request);
			}}
		/>
	);
}
