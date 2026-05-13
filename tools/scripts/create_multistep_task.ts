
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function createMultiStepTask() {
    console.log("Creating multi-step test task...");

    // Title includes keywords for multiple agents to trigger a chain manually or via complex Prompt
    // But our simple router picks ONE specialist. 
    // To test append, we need a task that inherently requires multiple steps or we manually assign a workflow.

    // Let's manually assign a workflow via a custom mutation call or just let the router pick one 
    // and rely on the fact that the router returns [Agent]. 
    // To test APPEND, we need >1 agent.

    // Wait! The current router only returns [Agent]. The workflow is just 1 step + Jarvis.
    // So the "append" will happen when Jarvis reviews (if we update Jarvis logic too) 
    // OR if we manually create a task with a multi-agent workflow.

    // Let's create a task and effectively "force" a workflow by calling assignWithWorkflow directly
    // This duplicates what Jarvis does but lets us define a longer chain.

    const taskId = await client.mutation(api.tasks.create, {
        title: "Research AI Agents and then Write a Blog Post",
        priority: "high"
    });

    console.log("Task created:", taskId);

    // Overwrite the workflow to be multi-step: Curie (Research) -> Ogilvy (Write) -> Tigerclaw (Review)
    // Note: assignWithWorkflow also resets status/assignedTo
    await client.mutation(api.tasks.assignWithWorkflow, {
        id: taskId,
        workflow: ["Curie", "Ogilvy", "Tigerclaw"]
    });

    console.log("Forced workflow: Curie -> Ogilvy");
}

createMultiStepTask();
