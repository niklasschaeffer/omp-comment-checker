export const COMMENT_CHECKER_WIDGET_KEY = "pi-comment-checker";

export type CommentCheckerUiStatus = "idle" | "loading" | "missing" | "clean" | "warning" | "error";

export type CommentCheckerWarning = {
	filePath: string;
	message: string;
};

export type CommentCheckerUiState = {
	status: CommentCheckerUiStatus;
	checkedFiles: string[];
	warnings: CommentCheckerWarning[];
	errorMessage?: string;
};

export type WidgetSetter = (
	key: string,
	lines: string[] | undefined,
	options?: { placement?: "aboveEditor" | "belowEditor" },
) => void;

function formatPreview(message: string): string {
	const trimmed = message.trim();
	if (trimmed.length <= 80) return trimmed;
	return `${trimmed.slice(0, 77).trimEnd()}…`;
}

export function getCommentCheckerWidgetLines(state: CommentCheckerUiState): string[] | undefined {
	if (state.status !== "warning") return undefined;
	if (state.warnings.length === 0) return undefined;
	const header = `⚠ omp-comment-checker`;
	const summary = `  ${state.warnings.length} warning(s) in:`;
	const maxLines = 10;
	const lines: string[] = [header, summary];
	for (const warning of state.warnings.slice(0, maxLines)) {
		const preview = formatPreview(warning.message);
		lines.push(`  • ${warning.filePath} — ${preview}`);
	}
	if (state.warnings.length > maxLines) {
		lines.push(`  … (${state.warnings.length - maxLines} more)`);
	}
	return lines;
}

export function formatFooterStatus(state: CommentCheckerUiState): string | undefined {
	if (state.status === "clean") return "comment-checker: clean";
	if (state.status !== "warning") return undefined;
	if (state.warnings.length === 0) return undefined;
	const maxFiles = 3;
	const fileList = state.warnings.slice(0, maxFiles).map((warning) => warning.filePath);
	const suffix = state.warnings.length > maxFiles ? " …" : "";
	return `⚠ comment-checker: ${state.warnings.length} warning(s) in ${fileList.join(", ")}${suffix}`;
}

export function syncCommentCheckerWidget(setWidget: WidgetSetter, state: CommentCheckerUiState): void {
	setWidget(COMMENT_CHECKER_WIDGET_KEY, getCommentCheckerWidgetLines(state), { placement: "aboveEditor" });
}
