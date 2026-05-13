import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { generateAgentResponse } from "./services/llm";

async function test() {
    try {
        console.log("Testing generateAgentResponse...");
        const res = await generateAgentResponse("Ogilvy", "Writer", "Say hello world and do not output JSON", "", "", (type, content) => console.log(`[ACTIVITY] ${type}: ${content}`));
        console.log("Success:\n", res);
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
