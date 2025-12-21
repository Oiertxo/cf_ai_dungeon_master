import { Hono } from "hono";
import { Env } from "./types";
import { GameSession } from "./objects/GameSession";
import gameRoutes from "./routes/game";

const app = new Hono<{ Bindings: Env }>();

// Export the Durable Object class so Cloudflare sees it
export { GameSession };

// Mount the routes
app.route("/api", gameRoutes); // This makes /api/chat and /api/reset
app.route("/", gameRoutes);    // This makes / (Home)

export default app;