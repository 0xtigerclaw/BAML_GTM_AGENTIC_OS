
import { generateAgentResponse } from "./services/llm";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// No mocking needed for this integration test
// We want to test the full flow through LLM service


async function testLLMFix() {
    console.log("🧪 Testing LLM Shell Injection Fix...");

    // Test Case 1: Prompt with Newlines and Shell Metacharacters
    const dangerousPrompt = `
    This is a multi-line prompt.
    It has "double quotes" and 'single quotes'.
    It also has shell characters: $PATH | grep secrets ; rm -rf /
    
    If the fix works, this should be treated as text, not code.
    `;

    try {
        console.log("Running generateAgentResponse with dangerous prompt...");
        // Use a tool-enabled agent to force Clawdbot usage
        const response = await generateAgentResponse("Torvalds", "Architect", dangerousPrompt);

        console.log("\n✅ Success! Response received:");
        console.log(response.slice(0, 200) + "...");
    } catch (error: any) {
        console.error("\n❌ Failed! Error:", error.message);
    }
}

// Simple runner since we can't easily use Jest here
testLLMFix();
