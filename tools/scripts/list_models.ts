import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { GoogleGenerativeAI } from "@google/generative-ai";

async function list() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("Checking API Key starts with:", apiKey?.substring(0, 5));
    // The google-generative-ai SDK doesn't natively expose listModels easily in some versions,
    // so let's hit the REST API directly.
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2).substring(0, 1000));
}
list();
