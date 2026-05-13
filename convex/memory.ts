import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Internal mutation to store the vector
export const insertMemory = internalMutation({
    args: {
        agentName: v.string(),
        taskId: v.id("tasks"),
        content: v.string(),
        embedding: v.array(v.number()),
        tags: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("memories", {
            agentName: args.agentName,
            taskId: args.taskId,
            content: args.content,
            embedding: args.embedding,
            tags: args.tags,
            timestamp: Date.now(),
        });
    },
});

// Internal Query to batch fetch memories
export const getMemoriesByIds = internalQuery({
    args: { ids: v.array(v.id("memories")) },
    handler: async (ctx, args) => {
        const docs = [];
        for (const id of args.ids) {
            const doc = await ctx.db.get(id);
            if (doc) docs.push(doc);
        }
        return docs;
    },
});
