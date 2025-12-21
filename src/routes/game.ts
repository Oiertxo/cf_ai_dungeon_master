import { Hono } from "hono";
import { Env } from "../types";
import htmlString from "../components/template.html"; 

const game = new Hono<{ Bindings: Env }>();

// 1. Serve the UI
game.get("/", (c) => {
	return c.html(htmlString);
});

// 2. Chat API
game.post("/chat", async (c) => {
	try {
		const userId = c.req.header("X-Session-ID") || "default-adventurer";
		const id = c.env.GAME_SESSION.idFromName(userId);
		const stub = c.env.GAME_SESSION.get(id);
		return await stub.fetch(c.req.raw);
	} catch (err) {
		return c.json({ error: "Failed to reach the Dungeon" }, 500);
	}
});

// 3. Reset API
game.post("/reset", async (c) => {
	const userId = c.req.header("X-Session-ID") || "default-adventurer";
	const id = c.env.GAME_SESSION.idFromName(userId);
	const stub = c.env.GAME_SESSION.get(id);
	// We need to construct a new request to send to the Durable Object
    // because we are forwarding the logic
    const resetReq = new Request("http://internal/clear", { method: "POST" });
	return await stub.fetch(resetReq);
});

export default game;