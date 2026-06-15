import { describe, expect, it } from "vitest";
import {
	COMMENT_CHECKER_WIDGET_KEY,
	type CommentCheckerUiState,
	formatFooterStatus,
	getCommentCheckerWidgetLines,
} from "../src/ui.ts";

describe("getCommentCheckerWidgetLines", () => {
	it("#given loading state #when formatting widget #then hides setup progress", () => {
		// given
		const state: CommentCheckerUiState = {
			status: "loading",
			checkedFiles: [],
			warnings: [],
		};

		// when
		const lines = getCommentCheckerWidgetLines(state);

		// then
		expect(COMMENT_CHECKER_WIDGET_KEY).toBe("pi-comment-checker");
		expect(lines).toBeUndefined();
	});

	it("#given missing binary state #when formatting widget #then hides install guidance", () => {
		// given
		const state: CommentCheckerUiState = {
			status: "missing",
			checkedFiles: [],
			warnings: [],
		};

		// when
		const lines = getCommentCheckerWidgetLines(state);

		// then
		expect(lines).toBeUndefined();
	});

	it("#given warning state with 1 file #when formatting widget #then renders single-line warning", () => {
		// given
		const state: CommentCheckerUiState = {
			status: "warning",
			checkedFiles: ["src/a.ts"],
			warnings: [{ filePath: "src/a.ts", message: "COMMENT DETECTED" }],
		};

		// when
		const lines = getCommentCheckerWidgetLines(state);

		// then
		expect(lines).toEqual(["⚠ omp-comment-checker", "  1 warning(s) in:", "  • src/a.ts — COMMENT DETECTED"]);
	});

	it("#given warning state with 11 files #when formatting widget #then truncates with ellipsis", () => {
		// given
		const state: CommentCheckerUiState = {
			status: "warning",
			checkedFiles: [],
			warnings: Array.from({ length: 11 }, (_, i) => ({
				filePath: `src/${i + 1}.ts`,
				message: `warning ${i + 1}`,
			})),
		};

		// when
		const lines = getCommentCheckerWidgetLines(state);

		// then
		expect(lines?.[0]).toEqual("⚠ omp-comment-checker");
		expect(lines?.[1]).toEqual("  11 warning(s) in:");
		expect(lines?.length).toEqual(13);
		expect(lines?.[12]).toEqual("  … (1 more)");
	});

	it("#given warning state #when formatting footer status #then returns warning summary", () => {
		// given
		const state: CommentCheckerUiState = {
			status: "warning",
			checkedFiles: ["src/a.ts", "src/b.ts", "src/c.ts"],
			warnings: [
				{ filePath: "src/a.ts", message: "COMMENT DETECTED" },
				{ filePath: "src/b.ts", message: "TODO: explain this" },
			],
		};

		// when
		const status = formatFooterStatus(state);

		// then
		expect(status).toEqual("⚠ comment-checker: 2 warning(s) in src/a.ts, src/b.ts");
	});

	it("#given clean state #when formatting footer status #then returns clean marker", () => {
		// given
		const state: CommentCheckerUiState = {
			status: "clean",
			checkedFiles: ["src/a.ts"],
			warnings: [],
		};

		// when
		const status = formatFooterStatus(state);

		// then
		expect(status).toEqual("comment-checker: clean");
	});

	it("#given missing state #when formatting footer status #then returns undefined", () => {
		// given
		const state: CommentCheckerUiState = {
			status: "missing",
			checkedFiles: [],
			warnings: [],
		};

		// when
		const status = formatFooterStatus(state);

		// then
		expect(status).toBeUndefined();
	});

	it("#given warning state #when formatting widget with empty warnings #then returns undefined", () => {
		// given
		const state: CommentCheckerUiState = {
			status: "warning",
			checkedFiles: ["src/a.ts"],
			warnings: [],
		};

		// when
		const lines = getCommentCheckerWidgetLines(state);

		// then
		expect(lines).toBeUndefined();
	});

	it("#given clean state #when formatting widget #then hides stale widget", () => {
		// given
		const state: CommentCheckerUiState = {
			status: "clean",
			checkedFiles: ["src/a.ts"],
			warnings: [],
		};

		// when
		const lines = getCommentCheckerWidgetLines(state);

		// then
		expect(lines).toBeUndefined();
	});

	it("#given checker error state #when formatting widget #then hides error details", () => {
		// given
		const state: CommentCheckerUiState = {
			status: "error",
			checkedFiles: ["src/a.ts"],
			warnings: [],
			errorMessage: "failed",
		};

		// when
		const lines = getCommentCheckerWidgetLines(state);

		// then
		expect(lines).toBeUndefined();
	});
});
