import type { ExtensionContextLike } from "./index.js";
import { COMMENT_CHECKER_WIDGET_KEY } from "./ui.js";

export const OMP_WARNING_ENTRY_TYPE = "omp-comment-checker:warning";

export type WarningRecord = {
	id: string;
	filePath: string;
	message: string;
	sourceToolName: string;
	ts: number;
	fired: boolean;
};

type PartialPiHost = {
	appendEntry: ((customType: string, data: unknown) => void) | undefined;
	sendMessage: ((message: string, options?: { triggerTurn?: boolean }) => void) | undefined;
	on: ((event: string, handler: () => void) => (() => void) | undefined) | undefined;
};

export type OmpBackend = {
	/** True if the host supports omp-only UI affordances. */
	readonly available: boolean;
	/** If available, write a sticky footer status line. No-op otherwise. */
	setStatus(ctx: ExtensionContextLike, text: string | undefined): void;
	/** If available, append a non-LLM-visible entry to the session. */
	appendEntry(customType: string, data: unknown): void;
	/** If available, send an LLM-visible custom message. */
	sendMessage(content: string, options?: { triggerTurn?: boolean }): void;
	/** If available, subscribe to post-compaction events. Returns a cleanup fn. */
	onSessionCompact(handler: () => void): () => void;
};

function probePi(pi: unknown): PartialPiHost {
	if (typeof pi !== "object" || pi === null) {
		return {
			appendEntry: undefined,
			sendMessage: undefined,
			on: undefined,
		};
	}
	const record = pi as Record<string, unknown>;
	return {
		appendEntry:
			typeof record["appendEntry"] === "function"
				? (record["appendEntry"] as (customType: string, data: unknown) => void)
				: undefined,
		sendMessage:
			typeof record["sendMessage"] === "function"
				? (record["sendMessage"] as (message: string, options?: { triggerTurn?: boolean }) => void)
				: undefined,
		on:
			typeof record["on"] === "function"
				? (record["on"] as (event: string, handler: () => void) => (() => void) | undefined)
				: undefined,
	};
}

export function createOmpBackend(pi: unknown): OmpBackend {
	const host = probePi(pi);
	const available = host.appendEntry !== undefined || host.sendMessage !== undefined || host.on !== undefined;

	return {
		available,

		setStatus(ctx, text) {
			if (!available) {
				return;
			}

			const setStatus = ctx.ui.setStatus;
			if (typeof setStatus === "function") {
				setStatus(COMMENT_CHECKER_WIDGET_KEY, text);
			}
		},

		appendEntry(customType, data) {
			const fn = host.appendEntry;
			if (typeof fn !== "function") {
				return;
			}
			fn(customType, data);
		},

		sendMessage(content, options) {
			const fn = host.sendMessage;
			if (typeof fn !== "function") {
				return;
			}
			fn(content, options);
		},

		onSessionCompact(handler) {
			const fn = host.on;
			if (typeof fn !== "function") {
				return () => {};
			}

			const off = fn("session_compact", handler);
			if (typeof off === "function") {
				return off;
			}
			return () => {};
		},
	};
}
