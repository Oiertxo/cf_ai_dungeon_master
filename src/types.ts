// The environment bindings (matches wrangler.toml)
export interface Env {
	AI: Ai;
	GAME_SESSION: DurableObjectNamespace;
    LOG_BUCKET: R2Bucket;
}

// The structure of a single chat message
export interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

// The shape of the JSON response from the backend
export interface GameResponse {
	response: string;
	history: ChatMessage[];
}