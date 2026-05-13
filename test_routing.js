
const roleKeywords = {
    "Ogilvy": ["blog", "post", "content", "article", "write", "copy"],
    "Torvalds": ["code", "bug", "feature", "implement", "fix", "develop", "api"],
    "Ive": ["design", "ui", "ux", "mockup", "visual", "brand", "image", "logo", "banner", "graphic", "art"],
    "Porter": ["seo", "keyword", "search", "ranking", "optimize"],
    "Carnegie": ["email", "newsletter", "campaign", "outreach"],
    "Kotler": ["social", "twitter", "linkedin", "thread", "tweet"],
    "Dewey": ["docs", "documentation", "readme", "guide", "manual"],
    "Curie": ["research", "analyze", "competitor", "market", "user"],
    "Tesla": ["product", "roadmap", "feature", "spec", "prd"],
};

function determineWorkflow(taskTitle) {
    const title = taskTitle.toLowerCase();

    // 1. Explicit Agent Mention in Title (Highest Priority)
    for (const agent of Object.keys(roleKeywords)) {
        if (title.includes(agent.toLowerCase())) {
            console.log(`[ROUTING] Detected agent mention: ${agent}`);
            return [agent, "Tigerclaw"];
        }
    }

    // 2. Keyword Matching (Specialists First)
    for (const [agent, keywords] of Object.entries(roleKeywords)) {
        if (keywords.some(kw => title.includes(kw))) {
            return [agent, "Tigerclaw"];
        }
    }

    // Default: Tigerclaw handles directly
    return ["Tigerclaw"];
}

console.log("Testing routing for: 'generate an image for lion in masai mara'");
const workflow = determineWorkflow("generate an image for lion in masai mara");
console.log("Result:", workflow);
