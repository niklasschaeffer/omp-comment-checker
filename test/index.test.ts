import { describe, expect, it } from "vitest";
import type { CommentCheckerHookInput, ToolCallLike, ToolResultLike } from "../src/core.ts";
import {
	createCommentCheckerToolCallHandler,
	createCommentCheckerToolResultHandler,
	type ExtensionContextLike,
} from "../src/index.ts";

function makeContext(): ExtensionContextLike & { widgetCalls: unknown[] } {
	const widgetCalls: unknown[] = [];
	return {
		cwd: "/workspace",
		sessionManager: {
			getSessionId: () => "session-1",
		},
		ui: {
			setWidget: (key, lines, options) => {
				widgetCalls.push([key, lines, options]);
			},
		},
		widgetCalls,
	};
}

describe("createCommentCheckerToolResultHandler", () => {
	it("#given apply_patch metadata warning #when handling tool result #then appends checker warning and keeps widget hidden", async () => {
		// given
		const event: ToolResultLike = {
			toolName: "apply_patch",
			input: {},
			details: {
				files: [
					{
						filePath: "src/example.ts",
						before: "const value = 1;\n",
						after: "// explain value\nconst value = 2;\n",
						type: "update",
					},
				],
			},
			content: [{ type: "text", text: "update: src/example.ts" }],
			isError: false,
		};
		const calls: CommentCheckerHookInput[] = [];
		const handler = createCommentCheckerToolResultHandler({
			run: async (input) => {
				calls.push(input);
				return {
					status: "warning",
					message: "COMMENT DETECTED",
					binaryPath: "/bin/comment-checker",
					exitCode: 2,
				};
			},
		});
		const ctx = makeContext();

		// when
		const result = await handler(event, ctx);

		// then
		expect(calls).toEqual([
			{
				session_id: "session-1",
				tool_name: "Edit",
				transcript_path: "",
				cwd: "/workspace",
				hook_event_name: "PostToolUse",
				tool_input: {
					file_path: "src/example.ts",
					old_string: "const value = 1;\n",
					new_string: "// explain value\nconst value = 2;\n",
				},
			},
		]);
		expect(result?.content).toEqual([
			{ type: "text", text: "update: src/example.ts" },
			{ type: "text", text: "\n\nCOMMENT DETECTED" },
		]);
		expect(result?.isError).toBe(true);
		expect(ctx.widgetCalls).toEqual([
			[
				"pi-comment-checker",
				["⚠ omp-comment-checker", "  1 warning(s) in:", "  • src/example.ts — COMMENT DETECTED"],
				{ placement: "aboveEditor" },
			],
		]);
	});

	it("#given missing binary #when handling write result #then hides setup guidance without changing tool output", async () => {
		// given
		const handler = createCommentCheckerToolResultHandler({
			run: async () => ({
				status: "missing",
				message: "missing",
			}),
		});
		const ctx = makeContext();

		// when
		const result = await handler(
			{
				toolName: "write",
				input: {
					filePath: "src/example.ts",
					content: "const value = 1;\n",
				},
				content: [{ type: "text", text: "wrote src/example.ts" }],
				isError: false,
			},
			ctx,
		);

		// then
		expect(result).toBeUndefined();
		expect(ctx.widgetCalls).toEqual([["pi-comment-checker", undefined, { placement: "aboveEditor" }]]);
	});

	it("#given write warning #when handling tool result #then appends checker warning and keeps widget hidden", async () => {
		// given
		const event: ToolResultLike = {
			toolName: "write",
			input: {
				filePath: "src/example.ts",
				content: "// explain value\nconst value = 1;\n",
			},
			content: [{ type: "text", text: "wrote src/example.ts" }],
			isError: false,
		};
		const handler = createCommentCheckerToolResultHandler({
			run: async () => ({
				status: "warning",
				message: "COMMENT DETECTED",
				binaryPath: "/bin/comment-checker",
				exitCode: 2,
			}),
		});
		const ctx = makeContext();

		// when
		const result = await handler(event, ctx);
		expect(ctx.widgetCalls).toEqual([
			[
				"pi-comment-checker",
				["⚠ omp-comment-checker", "  1 warning(s) in:", "  • src/example.ts — COMMENT DETECTED"],
				{ placement: "aboveEditor" },
			],
		]);
		// then
		expect(result?.content).toEqual([
			{ type: "text", text: "wrote src/example.ts" },
			{ type: "text", text: "\n\nCOMMENT DETECTED" },
		]);
	});

	it("#given write clean #when handling tool result #then leaves tool output unchanged and keeps TUI hidden", async () => {
		// given
		const event: ToolResultLike = {
			toolName: "write",
			input: {
				filePath: "src/example.ts",
				content: "const value = 1;\n",
			},
			content: [{ type: "text", text: "wrote src/example.ts" }],
			isError: false,
		};
		const handler = createCommentCheckerToolResultHandler({
			run: async () => ({
				status: "pass",
				message: "",
				binaryPath: "/bin/comment-checker",
				exitCode: 0,
			}),
		});
		const ctx = makeContext();

		// when
		const result = await handler(event, ctx);

		// then
		expect(result).toBeUndefined();
		expect(ctx.widgetCalls).toEqual([["pi-comment-checker", undefined, { placement: "aboveEditor" }]]);
	});

	it("#given edit warning #when handling tool result #then appends checker warning and keeps widget hidden", async () => {
		// given
		const event: ToolResultLike = {
			toolName: "edit",
			input: {
				filePath: "src/example.ts",
				oldString: "const value = 1;\n",
				newString: "// explain value\nconst value = 2;\n",
			},
			content: [{ type: "text", text: "edited src/example.ts" }],
			isError: false,
		};
		const handler = createCommentCheckerToolResultHandler({
			run: async () => ({
				status: "warning",
				message: "COMMENT DETECTED",
				binaryPath: "/bin/comment-checker",
				exitCode: 2,
			}),
		});
		const ctx = makeContext();

		// when
		const result = await handler(event, ctx);

		// then
		expect(result?.content).toEqual([
			{ type: "text", text: "edited src/example.ts" },
			{ type: "text", text: "\n\nCOMMENT DETECTED" },
		]);
		expect(ctx.widgetCalls).toEqual([
			[
				"pi-comment-checker",
				["⚠ omp-comment-checker", "  1 warning(s) in:", "  • src/example.ts — COMMENT DETECTED"],
				{ placement: "aboveEditor" },
			],
		]);
	});

	it("#given checker error #when handling tool result #then leaves tool output unchanged and keeps TUI hidden", async () => {
		// given
		const event: ToolResultLike = {
			toolName: "write",
			input: {
				filePath: "src/example.ts",
				content: "const value = 1;\n",
			},
			content: [{ type: "text", text: "wrote src/example.ts" }],
			isError: false,
		};
		const handler = createCommentCheckerToolResultHandler({
			run: async () => ({
				status: "error",
				message: "checker crashed",
			}),
		});
		const ctx = makeContext();

		// when
		const result = await handler(event, ctx);

		// then
		expect(result).toBeUndefined();
		expect(ctx.widgetCalls).toEqual([["pi-comment-checker", undefined, { placement: "aboveEditor" }]]);
	});
});

describe("createCommentCheckerToolCallHandler", () => {
	it("#given a write with bad comments #when handling tool_call #then blocks and surfaces warning to the LLM", async () => {
		// given
		const event: ToolCallLike = {
			toolName: "write",
			input: {
				filePath: "src/example.ts",
				content: "// explain value\nconst value = 1;\n",
			},
		};
		const calls: CommentCheckerHookInput[] = [];
		const onWarnings: Array<{ filePath: string; message: string; sourceToolName: string }> = [];
		const handler = createCommentCheckerToolCallHandler({
			run: async (input) => {
				calls.push(input);
				return {
					status: "warning",
					message: "COMMENT DETECTED",
					binaryPath: "/bin/comment-checker",
					exitCode: 2,
				};
			},
			onWarning: (warning) => {
				onWarnings.push(warning);
			},
		});
		const ctx = makeContext();

		// when
		const result = await handler(event, ctx);

		// then
		expect(calls).toEqual([
			{
				session_id: "session-1",
				tool_name: "Write",
				transcript_path: "",
				cwd: "/workspace",
				hook_event_name: "PostToolUse",
				tool_input: {
					file_path: "src/example.ts",
					content: "// explain value\nconst value = 1;\n",
				},
			},
		]);
		expect(result).toEqual({
			block: true,
			reason: "COMMENT DETECTED",
		});
		expect(onWarnings).toEqual([
			{ filePath: "src/example.ts", message: "COMMENT DETECTED", sourceToolName: "write" },
		]);
		expect(ctx.widgetCalls).toEqual([
			[
				"pi-comment-checker",
				["⚠ omp-comment-checker", "  1 warning(s) in:", "  • src/example.ts — COMMENT DETECTED"],
				{ placement: "aboveEditor" },
			],
		]);
	});

	it("#given an edit with bad comments #when handling tool_call #then blocks with the checker message as reason", async () => {
		// given
		const event: ToolCallLike = {
			toolName: "edit",
			input: {
				filePath: "src/example.ts",
				oldString: "const value = 1;\n",
				newString: "// explain value\nconst value = 2;\n",
			},
		};
		const handler = createCommentCheckerToolCallHandler({
			run: async () => ({
				status: "warning",
				message: "AI comment detected",
				binaryPath: "/bin/comment-checker",
				exitCode: 2,
			}),
		});
		const ctx = makeContext();

		// when
		const result = await handler(event, ctx);

		// then
		expect(result).toEqual({ block: true, reason: "AI comment detected" });
	});

	it("#given a clean write #when handling tool_call #then passes through and hides the widget", async () => {
		// given
		const event: ToolCallLike = {
			toolName: "write",
			input: {
				filePath: "src/example.ts",
				content: "const value = 1;\n",
			},
		};
		const handler = createCommentCheckerToolCallHandler({
			run: async () => ({
				status: "pass",
				message: "",
				binaryPath: "/bin/comment-checker",
				exitCode: 0,
			}),
		});
		const ctx = makeContext();

		// when
		const result = await handler(event, ctx);

		// then
		expect(result).toBeUndefined();
		expect(ctx.widgetCalls).toEqual([["pi-comment-checker", undefined, { placement: "aboveEditor" }]]);
	});

	it("#given skipCommentCheck #when handling tool_call #then passes through without invoking the checker", async () => {
		// given
		const event: ToolCallLike = {
			toolName: "write",
			input: {
				filePath: "src/example.ts",
				content: "// comment\nconst value = 1;\n",
				skipCommentCheck: true,
			},
		};
		let invocations = 0;
		const handler = createCommentCheckerToolCallHandler({
			run: async () => {
				invocations++;
				return { status: "warning", message: "x", binaryPath: "/bin/cc", exitCode: 2 };
			},
		});
		const ctx = makeContext();

		// when
		const result = await handler(event, ctx);

		// then
		expect(result).toBeUndefined();
		expect(invocations).toBe(0);
	});

	it("#given an apply_patch tool_call #when handling #then passes through (post-hook covers it)", async () => {
		// given
		const event: ToolCallLike = {
			toolName: "apply_patch",
			input: { input: "*** Begin Patch\n*** Add File: src/new.ts\n+// comment\n*** End Patch\n" },
		};
		let invocations = 0;
		const handler = createCommentCheckerToolCallHandler({
			run: async () => {
				invocations++;
				return { status: "warning", message: "x", binaryPath: "/bin/cc", exitCode: 2 };
			},
		});
		const ctx = makeContext();

		// when
		const result = await handler(event, ctx);

		// then
		expect(result).toBeUndefined();
		expect(invocations).toBe(0);
	});

	it("#given a missing binary #when handling tool_call #then passes through and surfaces the missing widget", async () => {
		// given
		const event: ToolCallLike = {
			toolName: "write",
			input: { filePath: "src/example.ts", content: "const value = 1;\n" },
		};
		const handler = createCommentCheckerToolCallHandler({
			run: async () => ({ status: "missing", message: "binary not found" }),
		});
		const ctx = makeContext();

		// when
		const result = await handler(event, ctx);

		// then
		expect(result).toBeUndefined();
		expect(ctx.widgetCalls).toEqual([["pi-comment-checker", undefined, { placement: "aboveEditor" }]]);
	});
});
