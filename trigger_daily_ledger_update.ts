import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
import {
    buildDeterministicTodaySummary,
    buildLedgerUpdateTaskDescription,
    ledgerDateKey,
} from "./lib/ledgerDailySummary";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const LEDGER_TIMEZONE = process.env.PROJECT_LEDGER_TIMEZONE || "Europe/Amsterdam";

async function main() {
    const dateKey = ledgerDateKey(LEDGER_TIMEZONE);
    const title = `Daily Project Ledger Update - ${dateKey}`;
    const tasks = await client.query(api.tasks.list);
    const alreadyExists = (tasks as Array<{ title: string }>).some((task) => task.title === title);
    if (alreadyExists) {
        console.log(`⚠️ Task already exists: ${title}`);
        return;
    }

    const summary = await buildDeterministicTodaySummary(client, LEDGER_TIMEZONE);
    const description = buildLedgerUpdateTaskDescription(dateKey, summary);

    await client.mutation(api.tasks.create, {
        title,
        description,
        priority: "high",
        workflow: ["Dewey"],
    });
    await client.mutation(api.agents.logActivity, {
        agentName: "Tigerclaw",
        type: "debug",
        content: `[LEDGER_TASK_INPUT_MANUAL]\n${description.slice(0, 3500)}`,
    });

    console.log(`✅ Created task: ${title}`);
}

main().catch((error) => {
    console.error("❌ Failed:", error);
    process.exit(1);
});
