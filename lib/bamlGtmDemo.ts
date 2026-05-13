export const BAML_GTM_TASK_MARKER = "BAML_GTM_RADAR_DEMO";

export const BAML_GTM_OBJECTIVE =
    "BAML needs to find moments where developers are already complaining about structured outputs, brittle JSON parsing, prompt testing, provider switching, or AI workflow reliability, then respond with useful technical proof instead of generic marketing.";

export type BamlSourceType = "X" | "Reddit" | "GitHub" | "HN" | "Paste";

export type BamlOpportunity = {
    id: string;
    sourceType: BamlSourceType;
    sourceLabel: string;
    sourceUrl: string;
    discussion: string;
    detectedPain: string;
    bamlRelevance: string;
    confidence: number;
    channelFit: string;
    suggestedAngle: string;
};

export type BamlAgentManifestEntry = {
    name: string;
    stage: string;
    role: string;
    allowedTools: string[];
    readAccess: string[];
    writeAccess: string[];
    outputContract: string;
    evaluationCriteria: string[];
    forbiddenActions: string[];
    handoffTo: string;
};

export const BAML_SOURCE_TYPES: Array<{
    id: BamlSourceType;
    label: string;
    description: string;
    futureAccess: string;
}> = [
    {
        id: "X",
        label: "X",
        description: "Developer posts and replies",
        futureAccess: "Official API only",
    },
    {
        id: "Reddit",
        label: "Reddit",
        description: "Subreddit discussions",
        futureAccess: "Approved API or pasted threads",
    },
    {
        id: "GitHub",
        label: "GitHub",
        description: "Issues and discussions",
        futureAccess: "Public repos and issues",
    },
    {
        id: "HN",
        label: "HN",
        description: "Hacker News threads",
        futureAccess: "HN API or pasted threads",
    },
    {
        id: "Paste",
        label: "Paste",
        description: "Manual discussion text",
        futureAccess: "Human-supplied context",
    },
];

export const BAML_DEMO_OPPORTUNITIES: BamlOpportunity[] = [
    {
        id: "json-nested-invalid",
        sourceType: "X",
        sourceLabel: "Demo X thread: JSON mode failure",
        sourceUrl: "demo://x/json-mode-nested-objects",
        discussion:
            "JSON mode mostly works until the object gets nested. Then one optional field goes sideways and the parser throws in production. How are people making this reliable without writing a mountain of retry code?",
        detectedPain: "Native JSON mode still fails on nested, optional, or edge-case structured outputs.",
        bamlRelevance:
            "BAML can frame the reply around typed LLM functions, generated clients, output contracts, and testable prompt behavior instead of ad hoc parsing.",
        confidence: 92,
        channelFit: "High-intent X reply or quote post",
        suggestedAngle: "Structured output is not the finish line; the workflow around it needs engineering discipline.",
    },
    {
        id: "prompt-ci-tests",
        sourceType: "GitHub",
        sourceLabel: "Demo GitHub discussion: prompt CI",
        sourceUrl: "demo://github/prompt-tests-ci",
        discussion:
            "We have prompts checked into the app, but nobody knows if a change breaks extraction until a customer report comes in. Is anyone running prompt tests in CI?",
        detectedPain: "Teams lack a repeatable way to test prompt and schema behavior before shipping.",
        bamlRelevance:
            "BAML can be positioned as an engineering layer for LLM functions: prompts, types, clients, and tests live together.",
        confidence: 89,
        channelFit: "GitHub discussion response or DevRel DM",
        suggestedAngle: "Treat prompts like production code: typed contracts plus testable examples.",
    },
    {
        id: "provider-switching-breaks",
        sourceType: "HN",
        sourceLabel: "Demo HN thread: provider switching",
        sourceUrl: "demo://hn/provider-switching-structured-output",
        discussion:
            "OpenAI function calling worked for our prototype, but switching to Anthropic/Gemini meant rewriting half the structured output layer. The API abstraction did not survive contact with reality.",
        detectedPain: "Provider-specific structured output approaches make model switching expensive.",
        bamlRelevance:
            "BAML supports a provider-agnostic developer workflow where the LLM function contract is the source of truth.",
        confidence: 86,
        channelFit: "HN comment with technical example",
        suggestedAngle: "Separate the business contract from provider-specific output mechanics.",
    },
    {
        id: "langchain-too-heavy",
        sourceType: "Reddit",
        sourceLabel: "Demo Reddit thread: lightweight extraction",
        sourceUrl: "demo://reddit/langchain-too-heavy-extraction",
        discussion:
            "I need reliable extraction from support tickets. LangChain feels like too much framework for one typed extraction step. Is there a smaller way to keep prompts and schemas sane?",
        detectedPain: "Developers want reliable AI workflow structure without adopting a heavy orchestration framework.",
        bamlRelevance:
            "BAML can be advocated as a focused layer for LLM functions and structured outputs, not a full agent framework.",
        confidence: 84,
        channelFit: "Reddit comment with caveats and resource link",
        suggestedAngle: "Use a small typed LLM-function layer when you do not need a full orchestration stack.",
    },
    {
        id: "types-schema-prompts-sync",
        sourceType: "GitHub",
        sourceLabel: "Demo GitHub issue: prompt/schema drift",
        sourceUrl: "demo://github/types-schema-prompt-drift",
        discussion:
            "Our prompt says one thing, the Zod schema says another, and TypeScript has a third shape. Every change requires updating three places and hoping reviewers catch drift.",
        detectedPain: "Prompt, schema, and application types drift across files and reviews.",
        bamlRelevance:
            "BAML can show how the LLM function contract becomes a single source of truth for prompts, return types, and generated clients.",
        confidence: 94,
        channelFit: "GitHub issue response or technical blog seed",
        suggestedAngle: "The best structured-output workflow is the one where contract drift becomes hard.",
    },
    {
        id: "reliable-structured-extraction",
        sourceType: "HN",
        sourceLabel: "Demo HN Ask: reliable extraction",
        sourceUrl: "demo://hn/reliable-structured-extraction",
        discussion:
            "What is the least painful way to build reliable structured extraction in 2026? I want something testable, typed, and not tied to one model vendor.",
        detectedPain: "Developers need a credible default for typed, testable, provider-flexible extraction.",
        bamlRelevance:
            "This is a clean education moment for BAML because the user is explicitly asking for typed, testable, model-flexible structured extraction.",
        confidence: 97,
        channelFit: "HN comment or founder/DevRel reply",
        suggestedAngle: "When the requirement is typed + testable + vendor-flexible, BAML is worth evaluating.",
    },
];

export const BAML_AGENT_MANIFEST: BamlAgentManifestEntry[] = [
    {
        name: "Curie",
        stage: "Radar",
        role: "Demo opportunity radar that finds developer complaints matching the BAML wedge",
        allowedTools: ["Curated test cases", "Manual URL/text input", "BAML source pack"],
        readAccess: ["Demo discussions", "Manual user-provided context", "Approved BAML context"],
        writeAccess: ["Opportunity candidates only"],
        outputContract: "Candidate cards with source, pain point, relevance, and confidence.",
        evaluationCriteria: ["Developer pain is specific", "Pain matches the objective", "BAML relevance is plausible", "No live scraping claim"],
        forbiddenActions: ["Scrape X/Reddit", "Auto-post", "Infer private user data"],
        handoffTo: "Human Gate 1",
    },
    {
        name: "Porter",
        stage: "Score",
        role: "GTM opportunity scorer",
        allowedTools: ["Approved opportunity", "BAML context", "Agent manifest"],
        readAccess: ["Opportunity candidate", "Discussion text", "BAML relevance notes"],
        writeAccess: ["Opportunity score", "ICP fit", "recommended GTM angle"],
        outputContract: "Markdown scorecard with relevance, urgency, channel fit, and recommendation.",
        evaluationCriteria: ["Specificity", "Strategic sharpness", "Non-spam fit", "Actionability"],
        forbiddenActions: ["Invent platform data", "Recommend engagement when relevance is weak"],
        handoffTo: "Torvalds",
    },
    {
        name: "Torvalds",
        stage: "Proof",
        role: "Technical proof builder",
        allowedTools: ["Approved opportunity", "Porter scorecard", "BAML context"],
        readAccess: ["Discussion pain", "GTM angle", "BAML technical claims"],
        writeAccess: ["Before/after technical proof", "resource recommendation"],
        outputContract: "Markdown proof with current-state pain, BAML-style example, and caveats.",
        evaluationCriteria: ["Technical credibility", "Developer usefulness", "No benchmark overclaiming"],
        forbiddenActions: ["Claim live integration", "Use fake benchmarks", "Overstate BAML capabilities"],
        handoffTo: "Ogilvy",
    },
    {
        name: "Ogilvy",
        stage: "Draft",
        role: "Channel-native response drafter",
        allowedTools: ["Technical proof", "Porter scorecard", "Discussion source type"],
        readAccess: ["Prior agent outputs", "Channel constraints", "Policy cautions"],
        writeAccess: ["X reply", "HN/Reddit comment", "DevRel DM", "resource CTA"],
        outputContract: "Fenced JSON with a drafts array for channel-specific response assets.",
        evaluationCriteria: ["Taste", "Clarity", "Developer-native tone", "Low promotional smell"],
        forbiddenActions: ["Astroturfing", "Unsolicited mass outreach", "Unsupported claims"],
        handoffTo: "Carnegie",
    },
    {
        name: "Carnegie",
        stage: "QA",
        role: "Credibility and policy QA",
        allowedTools: ["Drafts", "Technical proof", "Platform risk rules"],
        readAccess: ["All prior outputs", "Discussion context", "BAML context"],
        writeAccess: ["Final polish", "risk score", "publish/revise/do-not-engage recommendation"],
        outputContract: "Fenced JSON with integrity checks, final polish, and final drafts.",
        evaluationCriteria: ["Credibility", "Policy safety", "Tone", "Factual discipline"],
        forbiddenActions: ["Auto-post approval", "Hide commercial intent", "Remove necessary caveats"],
        handoffTo: "Tigerclaw",
    },
    {
        name: "Tigerclaw",
        stage: "Synthesis",
        role: "Mission orchestrator and evaluator",
        allowedTools: ["Task state", "Agent outputs", "Outcome feedback", "Agent manifest"],
        readAccess: ["All agent outputs", "Approval status", "Post-outcome rubric"],
        writeAccess: ["Final opportunity package", "score", "evaluation notes"],
        outputContract: "Final tabbed package led by a clean posting payload, then opportunity, proof, drafts, QA, harness, and evaluation.",
        evaluationCriteria: ["Posting payload readiness", "End-to-end usefulness", "Risk discipline", "Workflow traceability", "Learning value"],
        forbiddenActions: ["Publish externally", "Bypass human approval", "Pretend demo inputs are live scraping"],
        handoffTo: "Human Gate 2",
    },
];

export const BAML_ACTIVE_WORKFLOW = ["Porter", "Torvalds", "Ogilvy", "Carnegie"];

export function getBamlGtmAgentHarness(agentName: string): string {
    const entry = BAML_AGENT_MANIFEST.find((agent) => agent.name.toLowerCase() === agentName.toLowerCase());
    if (!entry) return "";

    return [
        `## BAML GTM Agent Harness: ${entry.name}`,
        `Stage: ${entry.stage}`,
        `Role: ${entry.role}`,
        "",
        "Allowed tools/access:",
        ...entry.allowedTools.map((tool) => `- ${tool}`),
        "",
        "Read access:",
        ...entry.readAccess.map((item) => `- ${item}`),
        "",
        "Write access:",
        ...entry.writeAccess.map((item) => `- ${item}`),
        "",
        `Output contract: ${entry.outputContract}`,
        "",
        "Evaluation criteria:",
        ...entry.evaluationCriteria.map((criterion) => `- ${criterion}`),
        "",
        "Forbidden actions:",
        ...entry.forbiddenActions.map((action) => `- ${action}`),
        "",
        `Handoff target: ${entry.handoffTo}`,
    ].join("\n");
}

export function buildBamlOpportunityTaskDescription(opportunity: BamlOpportunity): string {
    return [
        BAML_GTM_TASK_MARKER,
        "",
        "## Mission",
        "Generate a human-reviewed BAML Developer Opportunity response package for this approved developer discussion.",
        "",
        "## Objective",
        BAML_GTM_OBJECTIVE,
        "",
        "## Demo Mode Constraints",
        "- This is a curated/manual demo input, not live scraping.",
        "- Do not claim that Mission Control scraped X, Reddit, GitHub, HN, or any other live platform.",
        "- Do not auto-post or imply automatic posting.",
        "- Produce response assets for human GTM/DevRel review.",
        "",
        "## Approved Opportunity",
        `Source type: ${opportunity.sourceType}`,
        `Source label: ${opportunity.sourceLabel}`,
        `Source URL/label: ${opportunity.sourceUrl}`,
        `Initial confidence: ${opportunity.confidence}/100`,
        `Channel fit: ${opportunity.channelFit}`,
        "",
        "## Developer Discussion",
        opportunity.discussion,
        "",
        "## Detected Pain",
        opportunity.detectedPain,
        "",
        "## Why BAML Might Be Relevant",
        opportunity.bamlRelevance,
        "",
        "## Suggested GTM Angle",
        opportunity.suggestedAngle,
        "",
        "## BAML Context Pack",
        "- BAML is a developer framework for building reliable AI workflows around typed LLM functions.",
        "- BAML is relevant when teams need structured outputs, type-safe interfaces, generated clients, prompt testing, and provider flexibility.",
        "- The response should be useful first and promotional second.",
        "- Recommended resources can point to BAML docs, examples, or GitHub, but avoid pretending a specific link was inspected unless it appears in the prompt.",
        "- Official BAML docs: https://docs.boundaryml.com/home",
        "- BAML testing functions: https://docs.boundaryml.com/guide/baml-basics/testing-functions",
        "- BAML test reference: https://docs.boundaryml.com/ref/baml/test",
    ].join("\n");
}

export function buildManualOpportunity(sourceType: BamlSourceType, sourceUrl: string, discussion: string): BamlOpportunity {
    const trimmedDiscussion = discussion.trim();
    const lower = trimmedDiscussion.toLowerCase();
    const detectedPain =
        lower.includes("test") || lower.includes("ci")
            ? "Developer is looking for testable prompt or structured-output workflows."
            : lower.includes("provider") || lower.includes("anthropic") || lower.includes("gemini")
                ? "Developer is struggling with provider-specific structured-output mechanics."
                : lower.includes("json") || lower.includes("schema") || lower.includes("type")
                    ? "Developer is dealing with structured-output reliability or schema drift."
                    : "Developer is discussing reliability, maintainability, or workflow design around AI applications.";

    return {
        id: `manual-${Date.now()}`,
        sourceType,
        sourceLabel: `Manual ${sourceType} input`,
        sourceUrl: sourceUrl.trim() || "manual://pasted-discussion",
        discussion: trimmedDiscussion,
        detectedPain,
        bamlRelevance:
            "BAML may be relevant if the discussion needs typed LLM functions, testable prompts, structured outputs, generated clients, or provider flexibility.",
        confidence: 76,
        channelFit: `${sourceType} response draft for human review`,
        suggestedAngle: "Lead with a helpful technical distinction, then offer BAML as one concrete way to implement it.",
    };
}
