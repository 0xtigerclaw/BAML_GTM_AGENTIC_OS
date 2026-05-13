"use node";

import path from "node:path";
import * as dotenv from "dotenv";
import OpenAI from "openai";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const EMBEDDING_MODEL = "text-embedding-3-small";
let missingCredentialsLogged = false;

function getOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        if (!missingCredentialsLogged) {
            console.error("[MEMORY] OPENAI_API_KEY is not configured for Convex node actions.");
            missingCredentialsLogged = true;
        }
        throw new Error("OPENAI_API_KEY is not configured.");
    }
    return new OpenAI({ apiKey });
}

function truncateForEmbedding(input: string, maxChars = 12000): string {
    const trimmed = input.trim();
    if (trimmed.length <= maxChars) return trimmed;
    return `${trimmed.slice(0, maxChars)}…`;
}

export const storeMemory = action({
    args: {
        agentName: v.string(),
        taskId: v.id("tasks"),
        content: v.string(),
        tags: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        console.log(`[MEMORY] Embedding content for ${args.agentName}...`);

        try {
            const content = truncateForEmbedding(args.content);
            const embeddingResponse = await getOpenAI().embeddings.create({
                model: EMBEDDING_MODEL,
                input: content,
            });

            const embedding = embeddingResponse.data[0].embedding;

            await ctx.runMutation(internal.memory.insertMemory, {
                agentName: args.agentName,
                taskId: args.taskId,
                content,
                embedding,
                tags: args.tags,
            });
            console.log(`[MEMORY] Successfully stored memory for task ${args.taskId}`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[MEMORY] Failed to generate embedding: ${message}`);
        }
    },
});

export const searchMemories = action({
    args: {
        query: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        console.log(`[MEMORY] Searching for: "${args.query}"...`);

        try {
            const query = truncateForEmbedding(args.query, 2000);
            const embeddingResponse = await getOpenAI().embeddings.create({
                model: EMBEDDING_MODEL,
                input: query,
            });
            const targetEmbedding = embeddingResponse.data[0].embedding;

            const results = await ctx.vectorSearch("memories", "by_embedding", {
                vector: targetEmbedding,
                limit: args.limit || 3,
            });

            if (results.length === 0) return [];

            const memories = await ctx.runQuery(internal.memory.getMemoriesByIds, {
                ids: results.map((result) => result._id),
            }) as Array<Record<string, unknown>>;

            return memories.map((memory, index) => ({
                ...memory,
                score: results[index]?._score ?? 0,
            }));
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[MEMORY] Search failed: ${message}`);
            return [];
        }
    },
});
