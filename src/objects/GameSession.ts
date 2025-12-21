// src/objects/GameSession.ts
import { DurableObject } from "cloudflare:workers";
import { Env, ChatMessage } from "../types";
import { logToR2 } from "../utils/logger";
import { DUNGEON_MASTER_SYSTEM_PROMPT } from "../ai/prompts";

export class GameSession extends DurableObject<Env> {
	private history: ChatMessage[] = [];
    // We track stats in state now too
    private stats = { hp: 20, max_hp: 20 };

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.ctx.blockConcurrencyWhile(async () => {
			try {
				const stored = await this.ctx.storage.get<ChatMessage[]>("history");
                const storedStats = await this.ctx.storage.get<{hp: number, max_hp: number}>("stats");
				this.history = stored || [];
                if (storedStats) this.stats = storedStats;
			} catch (err) {
				this.history = [];
				this.ctx.waitUntil(logToR2(this.env, "ERROR", "Storage Load Failed", { error: err }));
			}
		});
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		// Handle Clear
		if (url.pathname === "/clear") {
			await this.ctx.storage.deleteAll();
			this.history = [];
            this.stats = { hp: 20, max_hp: 20 }; // Reset stats
			this.ctx.waitUntil(logToR2(this.env, "INFO", "Game Reset", { sessionId: this.ctx.id.toString() }));
			return new Response("Game cleared");
		}

		if (request.method === "POST") {
			try {
                // ... (Input parsing logic remains the same) ...
				let userInput = "";
                const clone = request.clone();
                try {
                    const body = await request.json() as { input: string };
                    userInput = body.input;
                } catch (_e) {
                    try {
                        const formData = await clone.formData();
                        userInput = formData.get("input") as string;
                    } catch (_e2) {
                        userInput = await clone.text();
                    }
                }
				userInput = (userInput || "").trim();
				if (!userInput) throw new Error("Input cannot be empty");

                this.ctx.waitUntil(logToR2(this.env, "INFO", "User Message", { input: userInput }));
				this.addMessage("user", userInput);

                // --- 1. SYSTEM PROMPT UPDATE ---
                // We force the AI to act as a JSON API
				if (this.history.length === 1) {
                    this.history.unshift({ role: "system", content: DUNGEON_MASTER_SYSTEM_PROMPT });
				}

				// Using Llama 3 8B for speed.
                const response = await this.env.AI.run("@cf/meta/llama-3-8b-instruct", {
                    messages: this.history,
                    max_tokens: 512,
                });

				const rawAiOutput = (response as any).response; 
				
                // --- 2. PARSE AI JSON ---
                let parsedOutput;
                try {
                    // Sometimes AI adds markdown code blocks like ```json ... ```, we clean that
                    const cleanJson = rawAiOutput.replace(/```json/g, "").replace(/```/g, "").trim();
                    parsedOutput = JSON.parse(cleanJson);
                    
                    // Update internal state
                    this.stats.hp = parsedOutput.hp;
                    this.stats.max_hp = parsedOutput.max_hp;
                } catch (_e) {
                    // Fallback if AI hallucinates and sends plain text
                    parsedOutput = { 
                        story: rawAiOutput, 
                        hp: this.stats.hp, 
                        max_hp: this.stats.max_hp 
                    };
                }

                // We save the RAW JSON string to history so the AI remembers its own format context
				this.addMessage("assistant", JSON.stringify(parsedOutput));
				
                await this.ctx.storage.put("history", this.history);
                await this.ctx.storage.put("stats", this.stats);

                // Return structured data to Frontend
				return new Response(JSON.stringify({
					response: parsedOutput.story, // Just the text for the chat
                    hp: parsedOutput.hp,          // Number for the bar
                    max_hp: parsedOutput.max_hp   // Number for the bar
				}), { headers: { "Content-Type": "application/json" } });

			} catch (err: any) {
                await logToR2(this.env, "ERROR", "Game Crash", { error: err.message });
				return new Response(JSON.stringify({ 
					response: `(System Error: ${err.message})`, 
                    hp: 0, max_hp: 20
				}), { headers: { "Content-Type": "application/json" } });
			}
		}

		return new Response("Method not allowed", { status: 405 });
	}

	private addMessage(role: 'user' | 'assistant' | 'system', content: string) {
		this.history.push({ role, content });
	}
}