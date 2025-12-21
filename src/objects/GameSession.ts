import { DurableObject } from "cloudflare:workers";
import { Env, ChatMessage, GameResponse } from "../types";

export class GameSession extends DurableObject<Env> {
	// We keep history in memory for speed, but save to disk for safety
	private history: ChatMessage[] = [];

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		// We will load the history inside the blockConcurrencyWhile to ensure data safety
		this.ctx.blockConcurrencyWhile(async () => {
			const stored = await this.ctx.storage.get<ChatMessage[]>("history");
			this.history = stored || [];
		});
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		// 1. Handle "CLEAR" action (Restart game)
		if (url.pathname === "/clear") {
			this.history = [];
			await this.ctx.storage.deleteAll();
			return new Response("Game cleared");
		}

		// 2. Handle Game Input
		if (request.method === "POST") {
			const body = await request.json() as { input: string };
			const userInput = body.input;

			// Add User Input to History
			this.addMessage("user", userInput);

			// 3. Prepare Prompt for AI
			// We inject a System Prompt if history is empty
			if (this.history.length === 1) { // Only user message exists
				const SYSTEM_PROMPT = `
You are a Dungeon Master for a text-based RPG. 
Your tone is mysterious, descriptive, but concise. 
Do not break character. 
Describe the environment, check for traps, and manage the player's health.
Start the adventure now.
				`;
				// Insert system prompt at the very beginning
				this.history.unshift({ role: "system", content: SYSTEM_PROMPT.trim() });
			}

			// 4. Call Cloudflare Workers AI (Llama 3.3)
			try {
				const response = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
					messages: this.history,
					max_tokens: 512, // Keep responses snappy
				});

				// "response" might be a stream or an object depending on binding version.
				// Usually for 'run', it returns an object with 'response' property.
				// We cast it safely.
				const aiText = (response as any).response || "The dungeon falls silent... (AI Error)";

				this.addMessage("assistant", aiText);

				// 5. Save State (Critical!)
				await this.ctx.storage.put("history", this.history);

				// Return the result to the frontend
				const payload: GameResponse = {
					response: aiText,
					history: this.history
				};

				return new Response(JSON.stringify(payload), {
					headers: { "Content-Type": "application/json" }
				});

			} catch (err) {
				return new Response(`AI Error: ${err}`, { status: 500 });
			}
		}

		return new Response("Method not allowed", { status: 405 });
	}

	// Helper to keep history clean
	private addMessage(role: 'user' | 'assistant', content: string) {
		this.history.push({ role, content });
	}
}