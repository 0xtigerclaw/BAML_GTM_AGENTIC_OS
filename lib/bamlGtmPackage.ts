import {
    BAML_AGENT_MANIFEST,
    BAML_GTM_OBJECTIVE,
    BAML_GTM_TASK_MARKER,
    buildBamlOpportunityTaskDescription,
    type BamlOpportunity,
} from "./bamlGtmDemo";

export type BamlDemoStepOutput = {
    stepNumber: number;
    title: string;
    content: string;
    agent: string;
    createdAt: number;
};

function includesAny(text: string, terms: string[]): boolean {
    const lower = text.toLowerCase();
    return terms.some((term) => lower.includes(term));
}

function opportunityKind(opportunity: BamlOpportunity): "testing" | "provider" | "framework" | "drift" | "json" | "extraction" {
    const text = [
        opportunity.discussion,
        opportunity.detectedPain,
        opportunity.bamlRelevance,
        opportunity.suggestedAngle,
    ].join("\n").toLowerCase();

    if (includesAny(text, ["test", "ci", "fixture", "regression"])) return "testing";
    if (includesAny(text, ["provider", "anthropic", "gemini", "vendor", "switch"])) return "provider";
    if (includesAny(text, ["langchain", "framework", "orchestration", "heavy"])) return "framework";
    if (includesAny(text, ["schema", "typescript", "zod", "sync", "drift", "types"])) return "drift";
    if (includesAny(text, ["json", "nested", "optional", "parser"])) return "json";
    return "extraction";
}

function recommendedResource(opportunity: BamlOpportunity): { label: string; url: string; reason: string } {
    const kind = opportunityKind(opportunity);
    if (kind === "testing") {
        return {
            label: "BAML testing functions",
            url: "https://docs.boundaryml.com/guide/baml-basics/testing-functions",
            reason: "The developer is asking how to make prompt and schema behavior testable before shipping.",
        };
    }
    if (kind === "provider") {
        return {
            label: "BAML LLM clients",
            url: "https://docs.boundaryml.com/ref/baml/client-llm",
            reason: "The developer pain is provider-specific structured-output mechanics and switching cost.",
        };
    }
    if (kind === "drift") {
        return {
            label: "BAML language reference",
            url: "https://docs.boundaryml.com/ref/overview",
            reason: "The developer pain is keeping prompt, output contract, and application types aligned.",
        };
    }
    return {
        label: "BAML docs",
        url: "https://docs.boundaryml.com/home",
        reason: "The opportunity maps to typed, testable structured-output workflows.",
    };
}

function finalResponseForOpportunity(opportunity: BamlOpportunity): { text: string; cta: string; proofPoint: string; quotable: string } {
    const kind = opportunityKind(opportunity);

    if (kind === "testing") {
        return {
            text: [
                "Yes. The pattern that holds up is to treat the prompt like an API endpoint with a contract.",
                "",
                "A practical CI setup:",
                "1. Define an explicit output contract and validate it every run.",
                "2. Check in a small fixture set of representative inputs.",
                "3. Assert structure hard, and assert semantics only where the business logic really matters.",
                "4. Avoid full JSON snapshots unless you want noisy diffs.",
                "",
                "Where teams get stuck is the prompt, schema, and parsing code living in three different places, so nobody owns the contract.",
                "",
                "BAML is one way to make that workflow first-class: typed LLM functions where the prompt, output type, and example-driven tests live together.",
            ].join("\n"),
            cta: "Are you trying to catch shape breaks, or semantic drift that still parses?",
            proofPoint: "Prompt changes silently break structured extraction because there is no CI gate around the output contract.",
            quotable: "Treat prompts like API endpoints: contract first, fixtures second, CI third.",
        };
    }

    if (kind === "provider") {
        return {
            text: [
                "This usually breaks because the app treats provider-specific function calling as the business contract.",
                "",
                "I would separate the layers:",
                "1. Your domain contract: the typed shape your app needs.",
                "2. The prompt and examples that produce that shape.",
                "3. The provider-specific transport details.",
                "",
                "If those are tangled together, switching models means rewriting the structured-output layer instead of swapping the client.",
                "",
                "BAML is interesting here because the LLM function contract can stay central while clients/providers sit behind it. It does not remove provider differences, but it makes the boundary explicit and testable.",
            ].join("\n"),
            cta: "Is the hard part provider syntax, or keeping the returned shape stable after switching?",
            proofPoint: "Provider switching is expensive when output mechanics and application contracts are coupled.",
            quotable: "Do not let provider syntax become your application contract.",
        };
    }

    if (kind === "framework") {
        return {
            text: [
                "For one extraction step, a full orchestration framework can be the wrong unit of abstraction.",
                "",
                "The smaller pattern is:",
                "1. Name the LLM call like a function.",
                "2. Give it an explicit input and return type.",
                "3. Keep examples/tests next to that contract.",
                "4. Generate or share the client shape so app code does not become parser glue.",
                "",
                "That is the wedge where BAML is worth evaluating: it is closer to a typed LLM-function layer than a full agent framework.",
            ].join("\n"),
            cta: "Do you need orchestration, or just a reliable typed extraction boundary?",
            proofPoint: "The developer wants reliability without adopting a heavy framework for one extraction workflow.",
            quotable: "Sometimes the right abstraction is one typed LLM function, not a framework.",
        };
    }

    if (kind === "drift") {
        return {
            text: [
                "The painful part is not just schema validation. It is contract drift.",
                "",
                "If the prompt, Zod schema, and TypeScript type all live separately, every change becomes a coordination problem:",
                "- prompt says one thing",
                "- validator expects another",
                "- app code assumes a third",
                "",
                "The durable fix is to make the LLM call a typed interface and generate the client shape from the same contract you test.",
                "",
                "That is the BAML-shaped answer: keep prompt, output type, examples, and generated client around one LLM function contract.",
            ].join("\n"),
            cta: "Where does drift usually enter first for you: prompt edits, schema edits, or app type changes?",
            proofPoint: "Prompt, schema, and application types drift when the LLM contract is split across files.",
            quotable: "Structured-output reliability is mostly contract ownership.",
        };
    }

    if (kind === "json") {
        return {
            text: [
                "You are hitting the gap between valid JSON and valid schema.",
                "",
                "Nested + optional fields are where JSON mode drifts:",
                "- omit vs null vs empty object",
                "- object vs string",
                "- array vs scalar",
                "",
                "To make it reliable without retry spaghetti:",
                "1. Pick one canonical rule for optionals and enforce it.",
                "2. Validate at the boundary, not deep in app code.",
                "3. Add fixtures for edge cases and run them in CI.",
                "",
                "BAML is one way to formalize this: typed LLM functions, output contracts, generated clients, and prompt tests.",
            ].join("\n"),
            cta: "Do you standardize optional fields as omitted, explicit null, or defaults?",
            proofPoint: "Nested optional fields break when JSON validity is treated as the whole reliability story.",
            quotable: "JSON mode is an output feature; reliability is a workflow problem.",
        };
    }

    return {
        text: [
            "For reliable structured extraction, I would optimize for the workflow around the model, not only the model call.",
            "",
            "The useful baseline is:",
            "1. A typed output contract.",
            "2. A prompt that renders the expected shape clearly.",
            "3. A small suite of example inputs.",
            "4. CI checks for shape and key semantic fields.",
            "5. A provider boundary that does not leak into app code.",
            "",
            "BAML is worth evaluating when you want those pieces to live together as typed LLM functions instead of scattered prompt/parser glue.",
        ].join("\n"),
        cta: "Is your bigger failure mode invalid shape, wrong values, or provider-specific behavior?",
        proofPoint: "The developer asks for typed, testable, provider-flexible structured extraction.",
        quotable: "Reliable extraction needs a contract, not just a better prompt.",
    };
}

function buildPorterOutput(opportunity: BamlOpportunity): string {
    const risk = opportunity.sourceType === "X" ? 36 : opportunity.sourceType === "Reddit" ? 42 : 30;
    return [
        "## Conversation Summary",
        opportunity.discussion,
        "",
        "## Developer Pain",
        opportunity.detectedPain,
        "",
        "## Why BAML Is Relevant",
        opportunity.bamlRelevance,
        "",
        "## ICP Fit",
        "Strong fit: the speaker is likely an engineer building or maintaining LLM application infrastructure.",
        "",
        "## Channel Fit",
        opportunity.channelFit,
        "",
        "## Scorecard",
        "| Dimension | Score | Rationale |",
        "| --- | ---: | --- |",
        `| BAML relevance | ${Math.min(98, opportunity.confidence)}/100 | The pain maps to typed, testable LLM workflow reliability. |`,
        "| Urgency | 86/100 | The complaint is about broken production or maintenance workflow, not abstract curiosity. |",
        "| ICP fit | 88/100 | Developer is discussing implementation details and reliability tradeoffs. |",
        `| Policy risk | ${risk}/100 | Safe when human-reviewed and useful-first; avoid drive-by product pitching. |`,
        "",
        `## Recommended Angle\n${opportunity.suggestedAngle}`,
        "",
        "## Recommendation",
        "`publish` after Carnegie confirms tone and the human verifies the thread context.",
    ].join("\n");
}

function buildTorvaldsOutput(opportunity: BamlOpportunity): string {
    const kind = opportunityKind(opportunity);
    const resource = recommendedResource(opportunity);
    const example =
        kind === "testing"
            ? [
                "```baml",
                "test SummarizeTicketRegression {",
                "  functions [SummarizeTicket]",
                "  args { ticket \"refund request with missing account id\" }",
                "}",
                "```",
            ].join("\n")
            : [
                "```baml",
                "class TicketSummary {",
                "  category string",
                "  priority \"low\" | \"medium\" | \"high\"",
                "  next_action string",
                "}",
                "",
                "function SummarizeTicket(ticket: string) -> TicketSummary {",
                "  prompt #\"",
                "    Extract the support ticket fields.",
                "    {{ ticket }}",
                "    {{ ctx.output_format }}",
                "  \"#",
                "}",
                "```",
            ].join("\n");

    return [
        "## Current Workflow Pain",
        opportunity.detectedPain,
        "",
        "The fragile version usually has prompt instructions, parser code, runtime validation, and application types drifting across separate files.",
        "",
        "## Why The Current Approach Breaks",
        "- JSON validity is not the same as schema or semantic validity.",
        "- Provider-specific APIs can leak into the app contract.",
        "- Prompt changes are behavior changes, but many teams do not test them in CI.",
        "- Retry code treats symptoms instead of making the output boundary explicit.",
        "",
        "## BAML-Style Before/After Proof",
        "Instead of treating the LLM call as free-form text plus parser glue, make it a typed function with examples/tests around the contract.",
        "",
        example,
        "",
        "## Practical Caveats",
        "- This does not guarantee perfect model behavior.",
        "- You still need boundary validation and representative fixtures.",
        "- A human should verify the thread context before publishing any response.",
        "",
        "## Recommended Resource",
        `[${resource.label}](${resource.url})`,
    ].join("\n");
}

function buildOgilvyOutput(opportunity: BamlOpportunity): string {
    const final = finalResponseForOpportunity(opportunity);
    return `\`\`\`json\n${JSON.stringify({
        drafts: [
            { title: `${opportunity.sourceType} Reply`, content: `${final.text}\n\n${final.cta}`, agent: "Ogilvy" },
            {
                title: "HN / Reddit Comment",
                content: `${final.text}\n\nThe important part is to keep the response useful even if the reader never clicks a link.\n\n${final.cta}`,
                agent: "Ogilvy",
            },
            {
                title: "DevRel DM",
                content: `Saw your thread on ${opportunity.detectedPain.toLowerCase()}. The useful pattern is contract-first: typed output, examples, validation, and tests around the LLM boundary.\n\nBAML may be worth evaluating if you want that workflow without rolling custom prompt/parser glue.\n\n${final.cta}`,
                agent: "Ogilvy",
            },
            {
                title: "Resource CTA",
                content: `Soft CTA: If useful, point them to ${recommendedResource(opportunity).label}. Keep the first reply useful-first and avoid dropping links unless the thread asks for tools/resources.`,
                agent: "Ogilvy",
            },
        ],
    }, null, 2)}\n\`\`\``;
}

function buildCarnegieOutput(opportunity: BamlOpportunity): string {
    const final = finalResponseForOpportunity(opportunity);
    return `\`\`\`json\n${JSON.stringify({
        integrity_checks: [
            {
                rule: "Relevance",
                status: "pass",
                notes: "Directly addresses the stated developer pain before mentioning BAML.",
            },
            {
                rule: "Developer-native tone",
                status: "pass",
                notes: "Uses contract, validation, testing, provider boundary, and workflow language instead of generic marketing.",
            },
            {
                rule: "Policy / spam risk",
                status: "warning",
                notes: "Safe as a single human-approved reply. Do not automate posting or mass-reply across platforms.",
            },
            {
                rule: "Factual discipline",
                status: "pass",
                notes: "No scraping claims, benchmarks, production guarantees, or unsupported claims are included.",
            },
        ],
        edit_notes: "Publish manually only if the thread is genuinely asking about this pain. Keep the BAML mention short and disclose affiliation when relevant.",
        final_polish: "Recommendation: publish after human context check. Lead with the technical proof, then mention BAML as one implementation path.",
        finalized_drafts: [
            {
                draft_id: "recommended_response",
                final_post_text: final.text,
                cta_question: final.cta,
                proof_point_used: final.proofPoint,
                quotable_line: final.quotable,
            },
        ],
    }, null, 2)}\n\`\`\``;
}

function parseJsonRecord(text: string): Record<string, unknown> | null {
    const fenced = text.match(/```json\s*\n([\s\S]*?)\n```/i)?.[1]?.trim() || text.trim();
    try {
        const parsed: unknown = JSON.parse(fenced);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed as Record<string, unknown>
            : null;
    } catch {
        return null;
    }
}

function nestedString(value: unknown, path: Array<string | number>): string {
    let current: unknown = value;
    for (const key of path) {
        if (typeof key === "number") {
            if (!Array.isArray(current)) return "";
            current = current[key];
        } else {
            if (!current || typeof current !== "object") return "";
            current = (current as Record<string, unknown>)[key];
        }
    }
    return typeof current === "string" ? current.trim() : "";
}

function buildAgentHarnessTab(): string {
    return [
        "## Objective",
        BAML_GTM_OBJECTIVE,
        "",
        "## OpenClaw Gateway Runtime",
        "Hosted demo mode simulates the OpenClaw Gateway handoff so reviewers can try the workflow without local ChatGPT auth.",
        "",
        "## Human-In-The-Loop Gates",
        "- Gate 1: human approves, rejects, or snoozes a candidate opportunity before agents run.",
        "- Gate 2: human approves, revises, or blocks the final response package before any external publishing.",
        "- Post-outcome feedback records whether the response created the expected engagement or opportunity.",
        "",
        "## Agent Harness",
        ...BAML_AGENT_MANIFEST.map((agent) => [
            `### ${agent.name} - ${agent.stage}`,
            `Role: ${agent.role}`,
            `Output contract: ${agent.outputContract}`,
            `Evaluation: ${agent.evaluationCriteria.join("; ")}`,
            `Forbidden: ${agent.forbiddenActions.join("; ")}`,
        ].join("\n")),
    ].join("\n\n");
}

function buildOpportunityTab(opportunity: BamlOpportunity, porter: string): string {
    return [
        "## Approved Developer Opportunity",
        `Source type: ${opportunity.sourceType}`,
        `Source label: ${opportunity.sourceLabel}`,
        `Source URL/label: ${opportunity.sourceUrl}`,
        `Initial confidence: ${opportunity.confidence}/100`,
        `Channel fit: ${opportunity.channelFit}`,
        "",
        "## Conversation Summary",
        opportunity.discussion,
        "",
        "## Detected Developer Pain",
        opportunity.detectedPain,
        "",
        "## Why BAML Is Relevant",
        opportunity.bamlRelevance,
        "",
        "## Suggested Angle",
        opportunity.suggestedAngle,
        "",
        "## Porter Scorecard",
        porter,
    ].join("\n");
}

function buildScoreTable(opportunity: BamlOpportunity, finalResponse: string): string {
    const policyRisk = opportunity.sourceType === "X" || opportunity.sourceType === "Reddit" ? 38 : 30;
    const bamlFit = Math.min(10, Math.max(7, Math.round(opportunity.confidence / 10)));
    const painSeverity = opportunity.confidence >= 90 ? 9 : opportunity.confidence >= 84 ? 8 : 7;
    const icpFit = opportunity.confidence >= 86 ? 9 : 8;
    const proof = finalResponse ? 8 : 6;
    const readiness = finalResponse ? 9 : 5;
    const score = Math.round(((bamlFit + painSeverity + icpFit + proof + readiness) / 5 - (policyRisk > 34 ? 0.3 : 0)) * 10) / 10;

    return [
        `Overall opportunity score: **${score.toFixed(1)} / 10**`,
        `Risk / policy score: **${policyRisk} / 100** (lower is safer)`,
        "",
        "| Dimension | Score | Why it matters |",
        "| --- | ---: | --- |",
        `| BAML fit | ${bamlFit}/10 | The pain maps to structured outputs, typed contracts, prompt tests, or provider flexibility. |`,
        `| Pain severity | ${painSeverity}/10 | The discussion describes production reliability or workflow maintenance pain. |`,
        `| ICP fit | ${icpFit}/10 | The speaker sounds like a developer building LLM application infrastructure. |`,
        `| Technical proof strength | ${proof}/10 | The package includes a concrete engineering explanation before product mention. |`,
        `| Draft readiness | ${readiness}/10 | A human has a final response they can approve, revise, or block. |`,
        `| Channel safety | ${100 - policyRisk}/100 | The reply is useful-first and avoids automated posting. |`,
    ].join("\n");
}

function buildPostingPayload(opportunity: BamlOpportunity, carnegie: string): string {
    const carnegieJson = parseJsonRecord(carnegie);
    const finalText = nestedString(carnegieJson, ["finalized_drafts", 0, "final_post_text"]);
    const cta = nestedString(carnegieJson, ["finalized_drafts", 0, "cta_question"]);
    const proof = nestedString(carnegieJson, ["finalized_drafts", 0, "proof_point_used"]);
    const resource = recommendedResource(opportunity);

    return [
        "## Objective",
        BAML_GTM_OBJECTIVE,
        "",
        "## Human Gate 2 Recommendation",
        "Approval recommendation: `publish`",
        "Publish manually only after the human reviewer confirms the thread is genuinely asking for help. Do not auto-post from Mission Control.",
        "",
        "## Final Recommended Response",
        "Source: Carnegie finalized draft",
        "",
        "```text",
        finalText,
        "```",
        cta ? `CTA question: ${cta}` : "",
        proof ? `Proof point used: ${proof}` : "",
        "",
        "## Recommended Resource",
        `[${resource.label}](${resource.url})`,
        "",
        resource.reason,
        "",
        "## Score Breakdown",
        buildScoreTable(opportunity, finalText),
        "",
        "## Publish Guardrails",
        "- Lead with the technical answer; keep BAML as one concrete implementation path.",
        "- Do not claim scraping, private monitoring, benchmarks, or guaranteed correctness.",
        "- Prefer no link on first touch unless the human reviewer decides the thread is explicitly asking for resources.",
        "- Be transparent about affiliation when posting from a BAML team or DevRel account.",
    ].filter(Boolean).join("\n");
}

function buildEvaluation(opportunity: BamlOpportunity, finalResponse: string): string {
    return [
        "## Tigerclaw Evaluation",
        buildScoreTable(opportunity, finalResponse),
        "",
        "## Recommendation",
        "`publish`",
        "The package is demo-ready: it starts from a real developer pain, includes technical proof, offers a restrained BAML mention, and keeps human review before manual publishing.",
        "",
        "## What Works",
        "- The opportunity is anchored in a developer complaint instead of a generic GTM theme.",
        "- Porter scores fit before copy is written.",
        "- Torvalds creates technical proof before Ogilvy drafts copy.",
        "- Carnegie checks tone, unsupported claims, and spam risk before the final payload.",
        "",
        "## What Needs Care",
        "- Hosted demo mode simulates the OpenClaw Gateway; local mode runs the actual gateway.",
        "- Demo inputs are curated/manual, not live scraping.",
        "- Engagement outcome still needs manual feedback after publishing outside the app.",
        "",
        "## Post-Outcome Feedback Rubric",
        "| Signal | Good outcome | Record after posting |",
        "| --- | --- | --- |",
        "| Relevance | Developer replies with a technical follow-up or asks for resources | Thread reaction and qualitative note |",
        "| Helpfulness | Other developers save, upvote, reply, or reuse the explanation | Engagement score 1-5 |",
        "| BAML pull | Conversation moves toward docs, examples, trial, GitHub, or demo request | Opportunity score 1-5 |",
        "| Risk | No complaints about spam, drive-by marketing, or unsupported claims | Risk score 1-5 |",
    ].join("\n");
}

export function createHostedBamlDemoMissionArtifacts(opportunity: BamlOpportunity, now: number): {
    title: string;
    description: string;
    outputs: BamlDemoStepOutput[];
    output: string;
    feedback: string;
} {
    const porter = buildPorterOutput(opportunity);
    const torvalds = buildTorvaldsOutput(opportunity);
    const ogilvy = buildOgilvyOutput(opportunity);
    const carnegie = buildCarnegieOutput(opportunity);
    const finalResponse = finalResponseForOpportunity(opportunity).text;
    const tabs = [
        { id: "posting_payload", label: "📦 Posting Payload", content: buildPostingPayload(opportunity, carnegie) },
        { id: "opportunity", label: "🎯 Opportunity", content: buildOpportunityTab(opportunity, porter) },
        { id: "technical_proof", label: "🧪 Technical Proof", content: torvalds },
        { id: "response_drafts", label: "✍️ Response Drafts", content: ogilvy },
        { id: "qa", label: "🛡️ Credibility QA", content: carnegie },
        { id: "agent_harness", label: "⚙️ Agent Harness", content: buildAgentHarnessTab() },
        { id: "evaluation", label: "✅ Evaluation", content: buildEvaluation(opportunity, finalResponse) },
    ];

    return {
        title: `BAML Opportunity Radar: ${opportunity.detectedPain}`,
        description: buildBamlOpportunityTaskDescription(opportunity),
        feedback: "Hosted demo package generated without requiring the local OpenClaw Gateway.",
        output: JSON.stringify({ tabs }),
        outputs: [
            { stepNumber: 1, title: "GTM Opportunity Scoring", content: porter, agent: "Porter", createdAt: now },
            { stepNumber: 2, title: "Technical Proof", content: torvalds, agent: "Torvalds", createdAt: now },
            { stepNumber: 3, title: "Response Drafts", content: ogilvy, agent: "Ogilvy", createdAt: now },
            { stepNumber: 4, title: "Credibility QA", content: carnegie, agent: "Carnegie", createdAt: now },
            { stepNumber: 5, title: "BAML Opportunity Package", content: JSON.stringify({ tabs }), agent: "Tigerclaw", createdAt: now },
        ],
    };
}

export function isHostedBamlDemoDescription(description: string | undefined): boolean {
    return Boolean(description?.includes(BAML_GTM_TASK_MARKER));
}
