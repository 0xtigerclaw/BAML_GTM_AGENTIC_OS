import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    console.log("🔍 Debugging Porter assignment...");

    // 1. List Agents (to see who is [0])
    const agents = await client.query(api.agents.list);
    console.log(`First Agent (Fallback): ${agents[0]?.name}`);
    console.log("All Agents:", agents.map(a => a.name).join(", "));

    // 2. Find the Specific Task
    const tasks = await client.query(api.tasks.list);
    const targetTask = tasks.find(t => t.title.includes("vLLM"));

    if (targetTask) {
        console.log(`\nFound Task: "${targetTask.title}"`);
        console.log(`ID: ${targetTask._id}`);
        console.log(`Status: ${targetTask.status}`);
        console.log(`Assigned To: ${JSON.stringify(targetTask.assignedTo)}`);
        console.log(`Workflow: ${JSON.stringify(targetTask.workflow)}`);

        // Debug Keyword Matching logic locally
        const roleKeywords: Record<string, string> = {
            "video": "Nolan", "movie": "Nolan", "render": "Nolan", "clip": "Nolan",
            "blog": "Ogilvy", "post": "Ogilvy", "content": "Ogilvy", "article": "Ogilvy", "write": "Ogilvy", "copy": "Ogilvy",
            "code": "Torvalds", "bug": "Torvalds", "feature": "Torvalds", "implement": "Torvalds", "fix": "Torvalds", "develop": "Torvalds", "api": "Torvalds",
            "design": "Ive", "ui": "Ive", "ux": "Ive", "mockup": "Ive", "visual": "Ive", "brand": "Ive", "image": "Ive", "logo": "Ive",
            "email": "Carnegie", "newsletter": "Carnegie", "campaign": "Carnegie",
            "social": "Kotler", "twitter": "Kotler", "linkedin": "Kotler",
            "docs": "Dewey", "documentation": "Dewey", "readme": "Dewey",
            "seo": "Porter", "keyword": "Porter", "ranking": "Porter", "serp": "Porter",
            "research": "Curie", "analyze": "Curie", "market": "Curie", "scan": "Curie", "intel": "Curie",
            "product": "Tesla", "roadmap": "Tesla", "spec": "Tesla", "prd": "Tesla",
        };

        const content = (targetTask.title + " " + (targetTask.description || "")).toLowerCase();
        console.log(`\nMatching against content: "${content.substring(0, 100)}..."`);

        let selectedRole = "Generalist";
        for (const [keyword, role] of Object.entries(roleKeywords)) {
            if (content.includes(keyword)) {
                console.log(`MATCH match: "${keyword}" -> ${role}`);
                selectedRole = role;
                break;
            }
        }
        console.log(`Calculated Role: ${selectedRole}`);
    } else {
        console.log("\n❌ Target task not found.");
    }
}

main();
