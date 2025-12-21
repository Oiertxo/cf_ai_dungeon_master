import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("Dungeon Master Worker", () => {
  
  // Test 1: Does the home page load?
  it("GET / returns the Retro UI HTML", async () => {
    // Send a fake request to the worker
    const response = await SELF.fetch("http://example.com/");
    
    expect(response.status).toBe(200);
    
    const text = await response.text();
    // Check if key HTML elements exist
    expect(text).toContain("Dungeon Master AI"); 
    expect(text).toContain("hp-bar");
  });

  // Test 2: Does the Reset API work?
  // We test this because it interacts with the Durable Object storage 
  // BUT avoids the AI call (which is hard to mock in simple tests).
  it("POST /api/reset clears the session", async () => {
    const response = await SELF.fetch("http://example.com/api/reset", {
      method: "POST",
      headers: {
        "X-Session-ID": "test-session-123"
      }
    });

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe("Game cleared");
  });

  // Test 3: 404 Handling
  it("Returns 404 for unknown routes", async () => {
    const response = await SELF.fetch("http://example.com/secret-tunnel");
    // Hono usually returns 404 for unmatched routes
    expect(response.status).toBe(404);
  });
});