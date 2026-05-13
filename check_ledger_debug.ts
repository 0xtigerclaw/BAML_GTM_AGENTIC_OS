import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

type ActivityLike = {
    agentName: string;
    type: string;
    content: string;
    timestamp: number;
};

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function clip(text: string, maxChars = 1200): string {
    if (text.length <= maxChars) return text;
    return `${text.slice(0, maxChars)}…`;
}

async function main() {
    const events = (await client.query(api.agents.recentActivity, { limit: 300 })) as ActivityLike[];
    const ledgerDebugEvents = events.filter((event) =>
        event.type === "debug" &&
        (event.content.includes("[DEWEY_LEDGER_INPUT]") ||
            event.content.includes("[DEWEY_LEDGER_OUTPUT]") ||
            event.content.includes("[LEDGER_TASK_INPUT]") ||
            event.content.includes("[LEDGER_TASK_INPUT_MANUAL]")),
    );

    if (ledgerDebugEvents.length === 0) {
        console.log("No ledger debug events found.");
        process.exit(1);
    }

    console.log(`Found ${ledgerDebugEvents.length} ledger debug events (latest first):`);
    for (const event of ledgerDebugEvents.slice(0, 10)) {
        console.log("----");
        console.log(`${new Date(event.timestamp).toISOString()} | ${event.agentName} | ${event.type}`);
        console.log(clip(event.content));
    }
}

main().catch((error) => {
    console.error("Failed to read ledger debug events:", error);
    process.exit(1);
});
