import { type CommentCheckerRunResult, resolveCommentCheckerBinary, runCommentChecker } from "./cli.js";
import {
	type CommentCheckerHookInput,
	extractCommentCheckRequests,
	type ToolResultContent,
	type ToolResultLike,
	toHookInput,
} from "./core.js";
import { createOmpBackend, OMP_WARNING_ENTRY_TYPE } from "./omp.js";
import { SelfHealStore } from "./self-heal.js";
import { type CommentCheckerUiState, formatFooterStatus, syncCommentCheckerWidget, type WidgetSetter } from "./ui.js";

type ExtensionApiLike = {
	on: <E extends string>(
		event: E,
		handler: (event: unknown, ctx: ExtensionContextLike) => Promise<unknown> | unknown,
	) => void;
	registerCommand: (
		name: string,
		spec: { description: string; handler: (args: string[], ctx: ExtensionContextLike) => Promise<void> | void },
	) => void;
};

export type ExtensionContextLike = {
	cwd: string;
	sessionManager?: {
		getSessionId?: () => string;
		getHeader?: () => { id?: string } | null;
	};
	ui: {
		setWidget: WidgetSetter;
		setStatus?: (key: string, text: string | undefined) => void;
		notify?: (message: string, level?: "info" | "warning" | "error") => void;
	};
};

export type ToolResultHandlerResult = {
	content?: ToolResultContent[];
};

export type CommentCheckerHandlerDeps = {
	run?: (input: CommentCheckerHookInput) => Promise<CommentCheckerRunResult>;
	onWarning?: (warning: { filePath: string; message: string; sourceToolName: string }) => void;
};

export default function ompCommentCheckerExtension(pi: unknown): void {
	const api = pi as ExtensionApiLike;
	const backend = createOmpBackend(pi);
	const store = new SelfHealStore();
	let state: CommentCheckerUiState = { status: "idle", checkedFiles: [], warnings: [] };

	const setState = (ctx: ExtensionContextLike, nextState: CommentCheckerUiState): void => {
		state = nextState;
		syncCommentCheckerWidget(ctx.ui.setWidget, state);
		backend.setStatus(ctx, formatFooterStatus(state));
	};

	api.on("session_start", async (_event: unknown, ctx: ExtensionContextLike) => {
		store.clear();
		if (!resolveCommentCheckerBinary()) {
			setState(ctx, { status: "missing", checkedFiles: [], warnings: [] });
			return;
		}
		setState(ctx, { status: "idle", checkedFiles: [], warnings: [] });
	});

	api.on(
		"tool_result",
		createCommentCheckerToolResultHandler({
			run: (input) => runCommentChecker(input),
			onWarning: (warning) => {
				const record = store.record(warning);
				backend.appendEntry(OMP_WARNING_ENTRY_TYPE, {
					filePath: record.filePath,
					message: record.message,
					sourceToolName: record.sourceToolName,
					ts: record.ts,
					id: record.id,
				});
			},
		}) as (event: unknown, ctx: ExtensionContextLike) => Promise<ToolResultHandlerResult | undefined>,
	);

	api.on("session_compact", async () => {
		const unfired = store.unfired();
		if (unfired.length === 0) return;
		const summary = unfired.map((w) => `• ${w.filePath}: ${w.message}`).join("\n");
		backend.sendMessage(
			`omp-comment-checker self-heal: ${unfired.length} warning(s) still need addressing:\n${summary}`,
			{ triggerTurn: false },
		);
		store.markFired(unfired.map((w) => w.id));
	});

	api.registerCommand("omp-comment-checker", {
		description: "Show omp-comment-checker status and pending warnings.",
		handler: async (_args: string[], ctx: ExtensionContextLike) => {
			if (!resolveCommentCheckerBinary()) {
				setState(ctx, { status: "missing", checkedFiles: [], warnings: [] });
				ctx.ui.notify?.("omp-comment-checker binary missing; reinstall @code-yeongyu/comment-checker.", "warning");
				return;
			}
			const unfired = store.unfired();
			if (unfired.length === 0) {
				ctx.ui.notify?.("omp-comment-checker: no pending warnings.", "info");
				return;
			}
			const summary = unfired.map((w) => `${w.filePath}: ${w.message}`).join("\n");
			ctx.ui.notify?.(`${unfired.length} pending warning(s):\n${summary}`, "warning");
		},
	});
}

export function createCommentCheckerToolResultHandler(deps: CommentCheckerHandlerDeps) {
	return async (event: ToolResultLike, ctx: ExtensionContextLike): Promise<ToolResultHandlerResult | undefined> => {
		const requests = extractCommentCheckRequests(event);
		if (requests.length === 0) return undefined;

		const checkedFiles: string[] = [];
		const warnings: Array<{ filePath: string; message: string; sourceToolName: string }> = [];
		const runner = deps.run ?? ((input: CommentCheckerHookInput) => runCommentChecker(input));

		for (const request of requests) {
			const input = toHookInput(request, { sessionId: getSessionId(ctx), cwd: ctx.cwd });
			const result = await runner(input);
			if (result.status === "missing") {
				syncCommentCheckerWidget(ctx.ui.setWidget, {
					status: "missing",
					checkedFiles,
					warnings,
				});
				return undefined;
			}
			if (result.status === "error") {
				syncCommentCheckerWidget(ctx.ui.setWidget, {
					status: "error",
					checkedFiles,
					warnings,
					errorMessage: result.message,
				});
				return undefined;
			}
			checkedFiles.push(request.filePath);
			if (result.status === "warning" && result.message.trim().length > 0) {
				warnings.push({
					filePath: request.filePath,
					message: result.message.trim(),
					sourceToolName: request.sourceToolName,
				});
			}
		}

		for (const warning of warnings) {
			deps.onWarning?.(warning);
		}

		if (warnings.length === 0) {
			syncCommentCheckerWidget(ctx.ui.setWidget, { status: "clean", checkedFiles, warnings });
			return undefined;
		}

		syncCommentCheckerWidget(ctx.ui.setWidget, { status: "warning", checkedFiles, warnings });
		return {
			content: [
				...(event.content ?? []),
				...warnings.map((warning) => ({
					type: "text" as const,
					text: `\n\n${warning.message}`,
				})),
			],
		};
	};
}

function getSessionId(ctx: ExtensionContextLike): string {
	return ctx.sessionManager?.getSessionId?.() ?? ctx.sessionManager?.getHeader?.()?.id ?? "unknown";
}
