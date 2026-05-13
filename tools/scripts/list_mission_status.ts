
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const AGENTS: Record<string, string> = {
    "Tigerclaw": "Manager & Reviewer",
    "Ogilvy": "Content Curator",
    "Torvalds": "Engineer (Code/Fixes)",
    "Ive": "Designer (UI/Visuals)",
    "Porter": "SEO Expert",
    "Carnegie": "Communications",
    "Kotler": "Marketing Guru",
    "Dewey": "Knowledge Manager",
    "Curie": "Deep Research",
    "Tesla": "Analyst"
};

async function listStatus() {
    console.log("Fetching mission status...\n");
    const tasks = await client.query(api.tasks.list);

    const activeTasks = tasks.filter(t => ["assigned", "in_progress", "review"].includes(t.status));
    const completedTasks = tasks.filter(t => t.status === "done");

    // Group by Agent
    const agentWorkload = {};
    for (const name of Object.keys(AGENTS)) {
        agentWorkload[name] = [];
    }

    // Assign tasks to agents
    activeTasks.forEach(t => {
        const agent = t.assignedTo || "Unassigned";
        if (!agentWorkload[agent]) agentWorkload[agent] = [];
        agentWorkload[agent].push(t);
    });

    // Sort agents by activity (active first)
    const sortedAgents = Object.keys(AGENTS).sort((a, b) => {
        const aCount = agentWorkload[a]?.length || 0;
        const bCount = agentWorkload[b]?.length || 0;
        return bCount - aCount;
    });

    console.log("## 🛡️ SQUAD STATUS REPORT\n");

    for (const agent of sortedAgents) {
        const role = AGENTS[agent];
        const tasks = agentWorkload[agent] || [];

        const statusIcon = tasks.length > 0 ? "🟢 BUSY" : "⚪ IDLE";
        console.log(`### **${agent}** - *${role}*`);
        console.log(`Status: ${statusIcon}`);

        if (tasks.length > 0) {
            console.log("Current Missions:");
            tasks.forEach(t => {
                let icon = "📝"; // assigned
                if (t.status === "in_progress") icon = "🔨";
                if (t.status === "review") icon = "👀";
                console.log(`- ${icon} **${t.title}** (${t.status})`);
            });
        }
        console.log("");
    }

    console.log("---");
    console.log(`**Summary**: ${activeTasks.length} Active Missions | ${completedTasks.length} Completed Missions`);
}

listStatus();
