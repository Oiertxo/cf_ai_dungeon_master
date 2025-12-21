import { Env } from "../types";

export async function logToR2(env: Env, level: "INFO" | "ERROR" | "DEBUG", message: string, details?: any) {
    const now = new Date();
    const timestamp = now.toISOString();
    
    // Structure the log entry as a clean JSON object
    const logEntry = JSON.stringify({
        timestamp,
        level,
        message,
        details: details || {}
    }, null, 2);

    // Create a tidy folder structure: logs/YYYY-MM-DD/HH-MM-SS-uuid.json
    const dateKey = timestamp.split('T')[0]; // "2025-12-21"
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const filename = `logs/${dateKey}/${timestamp}-${uniqueId}.json`;

    try {
        // Write to R2 (The "Cloud Hard Drive")
        // We use waitUntil so this doesn't slow down the user's response
        await env.LOG_BUCKET.put(filename, logEntry);
        console.log(`[R2 Logger] Saved log to ${filename}`);
    } catch (err) {
        // Fallback to console if R2 fails (shouldn't happen often)
        console.error("[R2 Logger] Failed to write log:", err);
    }
}