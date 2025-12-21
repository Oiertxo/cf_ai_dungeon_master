// src/index.ts
import { Hono } from "hono";
import { Env } from "./types";
import { GameSession } from "./objects/GameSession";

// 1. Initialize Hono app
const app = new Hono<{ Bindings: Env }>();

// 2. IMPORTANT: Re-export the Durable Object class
// Cloudflare looks for the class definition here because "main" points to this file.
export { GameSession };

// 3. Serve the Frontend (we will build the HTML string in the next step)
// For now, we return a simple placeholder to test connectivity.
app.get("/", (c) => {
	return c.html(`
		<html>
		  <body>
			<h1>Dungeon Master AI</h1>
			<p>Status: Systems Online</p>
			<script>console.log("Ready to quest");</script>
		  </body>
		</html>
	`);
});

// 4. The API Route: Connects the Chat UI to the Durable Object
app.post("/api/chat", async (c) => {
	try {
		// A. Get the User's ID
		// In a real app, you might use a cookie. 
		// For simplicity, we'll use a hardcoded "default-player" for now,
		// or generate one from the request header if we want multi-user support immediately.
		const userId = c.req.header("X-Session-ID") || "default-adventurer";
		
		// B. Locate the Durable Object
		// "idFromName" ensures that every time "default-adventurer" connects, 
		// they get the SAME instance (same memory).
		const id = c.env.GAME_SESSION.idFromName(userId);
		const stub = c.env.GAME_SESSION.get(id);

		// C. Forward the request to the Durable Object
		// We pass the original request so the DO can read the JSON body.
		return await stub.fetch(c.req.raw);

	} catch (err) {
		return c.json({ error: "Failed to reach the Dungeon" }, 500);
	}
});

// 5. Route to clear memory (Restart Game)
app.post("/api/reset", async (c) => {
	const userId = c.req.header("X-Session-ID") || "default-adventurer";
	const id = c.env.GAME_SESSION.idFromName(userId);
	const stub = c.env.GAME_SESSION.get(id);
	
	// Create a fake request to trigger the "/clear" logic in the DO
	return await stub.fetch("http://fake-host/clear");
});

export default app;