import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    console.log("Adding RSS feeds...");
    const feeds = [
        { name: "OpenAI", url: "https://openai.com/blog/rss.xml", category: "AI" },
        { name: "Vercel", url: "https://vercel.com/atom", category: "Tech" },
        { name: "Hugging Face", url: "https://huggingface.co/blog/feed.xml", category: "AI" }
    ];

    for (const feed of feeds) {
        try {
            await client.mutation(api.rss.add, feed);
            console.log(`✅ Added ${feed.name}`);
        } catch (e) {
            console.error(`❌ Failed to add ${feed.name}:`, e);
        }
    }
}
main().catch(console.error);
