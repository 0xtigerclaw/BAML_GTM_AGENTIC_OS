# Codex Interaction Patterns: BAML GTM Agentic OS Thread

Date captured: 2026-05-13

This document captures the collaboration pattern between the user and Codex during the BAML GTM Agentic OS build. It is not a product spec. It is a record of how the work moved from vague strategic intent to an implemented, pushed, deployable prototype.

## 1. Collaboration Arc

The thread followed a useful pattern:

```text
strategic intent -> problem narrowing -> workflow design -> UI implementation -> browser review -> deployment hardening -> documentation -> handoff capture
```

The user started with a broad Track 2 GTM assignment and a preferred company, BAML / BoundaryML. Codex helped narrow the work into one concrete demo module: a Developer Opportunity Radar that identifies high-intent developer discussions and generates technical response packages for human review.

The strongest interaction pattern was iterative compression:

- Start broad.
- Define the one problem worth solving.
- Turn the problem into an agent workflow.
- Turn the workflow into UX.
- Review the UX visually.
- Remove weak or over-explanatory copy.
- Push a deployable version.
- Add documentation and deployment instructions.

## 2. User Prompting Style

The user gave direction in short, high-signal fragments rather than fully polished specs. This worked well because the constraints were clear and Codex could fill in implementation details.

Examples of effective prompt patterns:

```text
we need to adapt mission control for a specific use-case
we dont have to change existing: i want to take its scaffolding and extend
```

This established the project boundary: adapt the scaffold, preserve the original.

```text
hiring/applications module: dont need this
make sure the original project is untouched
```

This defined negative scope and safety constraints.

```text
goal is to adapt for mission control for 1 GTM task for BAML
```

This pushed the work toward one end-to-end demo instead of a broad platform rebuild.

```text
Does it make sense that we have the first agent which rolls the scraper...
```

This introduced the central product idea: opportunity radar for developer conversations.

```text
For the implementation purpose I think we just need to run a demo...
But in the UI it should be very clear that there is a way to input X, link, Reddit, or GitHub...
But we would not be scraping. Just create test cases.
```

This converted the architecture into an implementable v1: demo mode with curated test cases.

## 3. Product Clarification Pattern

The user repeatedly challenged vague strategy and asked for a concrete problem:

```text
I think it would be much better if we can just define a problem and then solve it because I think the GTM opportunity sounds too subjective.
```

This was a key turning point. It moved the work away from "GTM opportunity" as a generic category and toward one defensible problem:

> BAML needs to find moments where developers are already complaining about structured outputs, brittle JSON parsing, prompt testing, provider switching, or AI workflow reliability, then respond with useful technical proof instead of generic marketing.

Reusable pattern:

```text
When the spec feels subjective, ask Codex to convert it into a single operational problem statement with observable inputs and outputs.
```

## 4. Agent Design Pattern

The user wanted agents to have:

- proper tools and access
- predefined roles
- orchestrator responsibilities
- individual skill files
- evaluation criteria
- scoring and feedback

This produced a strong agent-harness pattern:

```text
agent name -> role -> allowed access -> input contract -> output schema -> evaluation criteria -> forbidden actions -> handoff rules
```

This became the model for:

- Curie
- Porter
- Torvalds
- Ogilvy
- Carnegie
- Tigerclaw

Reusable pattern:

```text
Do not just ask Codex to create agents. Ask it to create agent contracts: role, tools, inputs, outputs, eval rubric, forbidden actions, and handoff rules.
```

## 5. Orchestrator Pattern

The user consistently emphasized OpenClaw Gateway:

```text
ensure that we are mentioning the openclaw gateway, which is basically the engine managing the entire mission control and different agents.
```

This forced a clean separation:

- Agents do specialized work.
- OpenClaw Gateway runs the system.
- Tigerclaw synthesizes and evaluates.
- Humans approve at two gates.

The resulting model:

```text
Human Gate 1 -> OpenClaw Gateway -> specialist agents -> Tigerclaw synthesis -> Human Gate 2 -> manual publish -> feedback -> evaluation
```

Reusable pattern:

```text
For agentic systems, define the runtime separately from the agents. The orchestrator should own state, routing, handoffs, logging, and review boundaries.
```

## 6. Human-In-The-Loop Pattern

The user introduced two human gates:

1. Approve the opportunity before running agents.
2. Approve the final response before publishing.

The user also added post-outcome feedback:

```text
after posting something there should be one more layer in which a human could add feedback on what happened to that particular task.
```

This created a more credible GTM system:

```text
candidate -> approve -> generate -> approve final -> publish manually -> record outcome -> evaluate
```

Reusable pattern:

```text
For GTM agents, never stop at generation. Add human approval before generation, human approval before publishing, and feedback after outcome.
```

## 7. Demo-Mode Pattern

The user made an important v1 scope call:

```text
I'm not gonna really do scraping right now...
in the UI it should be very clear that there is a way to input X, link, Reddit, or GitHub...
But we would not be scraping. Just create test cases.
```

This avoided overbuilding and made the assignment demo reliable.

Implementation pattern:

- Show future integration surfaces in the UI.
- Use curated test cases now.
- Do not pretend APIs are connected.
- Make the full workflow work after approval.

Reusable pattern:

```text
When a production integration is too costly for a demo, preserve the UX affordance but make the backend deterministic and honest.
```

## 8. Browser Review Pattern

The user used in-app browser screenshots and diff comments to refine the UI. This was the most effective design-review loop in the thread.

The comments were direct:

```text
remove
improve the writing here
powered by OpenClaw Gateway
BAML GTM Agentic OS
```

This helped Codex remove weak explanatory copy and make the UI more focused.

Examples of user review choices:

- Remove repeated "demo mode" copy.
- Remove "no live scraping in demo mode" from the hero.
- Remove "detect / approve / generate".
- Remove "human review before publishing".
- Remove "Skills" and "Scout Archive" pills.
- Rename heading to `BAML GTM Agentic OS`.
- Rename badge to `powered by OpenClaw Gateway`.
- Remove `APIs later, curated inputs now`.

Reusable pattern:

```text
Use browser comments for UI review. Select exact text/elements and give one action: remove, rename, tighten, move, or improve.
```

## 9. Copy Reduction Pattern

The UI started with too much explanatory text. The user repeatedly pushed to remove or tighten copy.

Resulting principle:

```text
The UI should demonstrate the system through workflow, not explain the system through paragraphs.
```

Codex originally added clarifying labels for demo mode. The user removed many of them because they made the product feel less polished.

Reusable pattern:

```text
After Codex builds a UI, do a pass where you remove defensive explanation and keep only labels that help the user act.
```

## 10. Build And Verification Pattern

Codex used a disciplined verification loop:

- inspect files
- implement scoped changes
- run `npm run lint`
- run `npm run build`
- start local Next/Convex
- use the in-app browser to verify
- approve a test case
- open the generated mission
- check mission tabs and artifacts

Verified artifacts included:

- Posting Payload
- Final Recommended Response
- Score Breakdown
- Publish Guardrails
- Post-outcome rubric

Reusable pattern:

```text
For a demo app, do not only run tests. Exercise the actual reviewer path in the browser: approve candidate -> open output -> inspect final artifact.
```

## 11. Deployment Debugging Pattern

The user moved from local demo to Vercel/Convex deployment.

The first concern:

```text
what is realistic to push to git?
if i can also host somewhere?
i want to do it for free
```

Codex recommended:

- GitHub repo
- Vercel Hobby
- Convex Free
- hosted demo mode
- no local gateway dependency

The deployment issue:

```text
Error: No address provided to ConvexReactClient.
Error occurred prerendering page "/_not-found".
```

Root cause:

- Vercel ran `npm run build`.
- `NEXT_PUBLIC_CONVEX_URL` was missing.
- `ConvexReactClient` was constructed at module load time.

Fix:

- Make the Convex provider tolerant of missing config during prerender.
- Add `vercel.json` with Convex deploy command:

```bash
npx convex deploy --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL --cmd 'npm run build'
```

Reusable pattern:

```text
When a local app works but Vercel fails during prerender, check module-level client initialization and missing environment variables first.
```

## 12. Git Publishing Pattern

The project was inside a larger dirty repo. Codex avoided staging unrelated work by making the scaffold its own git repo.

Pattern used:

```text
large dirty parent repo -> initialize nested repo in scoped project -> add GitHub remote -> ignore local/build artifacts -> commit -> push main
```

Important safety behavior:

- Did not stage the sibling original `mission-control`.
- Ignored `.env.local`, `node_modules`, `.next`, `.run`, generated videos, and runtime artifacts.
- Pushed only the scaffold as its own repo.

Reusable pattern:

```text
When the parent repo is dirty and unrelated, initialize a clean nested repo for the deliverable rather than trying to stage from the parent.
```

## 13. Documentation Pattern

The README was improved in layers:

1. Basic project and deployment notes.
2. Comprehensive OpenClaw Gateway diagram.
3. Detailed agent harness explanations.
4. High-level architecture diagram first.
5. Collapsible comprehensive control-plane diagram.
6. Dedicated agent swimlane diagram.

The user explicitly asked for documentation order:

```text
Make high-level architecture the first diagram on readme,
then an option for the comprehensive,
and then we can have a dedicated agent swimlane thing.
```

Reusable pattern:

```text
For assignment reviewers, order documentation by cognitive load:
simple architecture -> detailed internals -> sequence/swimlane -> implementation details.
```

## 14. Useful Codex Behaviors In This Thread

Codex was most useful when it:

- challenged broad GTM framing into a concrete problem
- translated product intent into data models and UI
- preserved original project boundaries
- implemented instead of only planning
- used browser verification for UI
- ran lint/build checks repeatedly
- pushed to GitHub when asked
- hardened deployment after seeing real Vercel errors
- wrote README diagrams and harness documentation

Less useful default tendency:

- Codex initially over-explained demo constraints in the UI.
- The user corrected this through browser comments.

## 15. Reusable Prompt Templates

### Narrow Strategy Into One Demo

```text
I have a broad assignment, but I need one end-to-end demo.
Help me define one concrete problem, one agent workflow, and one final artifact that proves the concept.
```

### Define Agent Harnesses

```text
For each agent, define:
- role
- allowed tools/access
- input contract
- output schema
- evaluation criteria
- forbidden actions
- handoff rules

Also define what the orchestrator owns.
```

### Build Demo Mode Honestly

```text
Do not implement live APIs yet.
Show the future input surfaces in the UI, but use deterministic test cases.
Make it clear in architecture that this is demo mode without pretending anything is live.
```

### Browser UI Review

```text
I will mark exact UI elements in the browser.
Apply each comment literally: remove, rename, tighten, or improve.
Keep the UI polished and avoid explanatory clutter.
```

### Deployment Hardening

```text
Make this deployable on free hosting.
Assume local daemons and private auth will not exist in production.
Create a hosted demo path that still proves the workflow.
```

### Thread Capture

```text
Capture not only what we built, but how we collaborated:
my prompts, your decisions, the correction loops, verification steps, and reusable patterns for future Codex work.
```

## 16. Interaction Timeline

Approximate sequence:

1. User chose BAML / BoundaryML as the company.
2. User requested a Mission Control adaptation rather than modifying the original project.
3. User removed hiring/applications from scope.
4. User asked what GTM opportunity would be high leverage for BAML.
5. The idea became developer opportunity detection around structured-output pain.
6. User asked for an intuitive flow diagram with OpenClaw Gateway.
7. User introduced human approval before agent execution and feedback after publishing.
8. User clarified demo mode: no scraping, use test cases, show input surfaces.
9. Codex implemented BAML GTM Agentic OS.
10. User reviewed UI with browser comments.
11. Codex removed weak copy and tightened UI.
12. User asked about free hosting.
13. Codex added hosted demo mode.
14. User asked to push to GitHub.
15. Codex initialized a scoped repo and pushed to `0xtigerclaw/BAML_GTM_AGENTIC_OS`.
16. User asked for README diagrams and harness details.
17. Codex added high-level architecture, detailed gateway diagram, swimlane diagram, and agent docs.
18. User hit Vercel build failure.
19. Codex patched Convex provider and Vercel build config.
20. User asked to capture the thread.
21. Codex created project-focused thread capture.
22. User clarified that they wanted interaction and Codex collaboration patterns.
23. This document was created.

## 17. Main Meta-Learning

The thread worked because the user did not try to fully specify everything upfront. Instead, the user repeatedly redirected Codex at decision points:

- "This is too subjective."
- "Update the plan."
- "Clean the diagram."
- "We do not need live scraping."
- "Remove this."
- "Improve this writing."
- "Push."
- "What do you need?"
- "Capture my interaction patterns."

That created a high-bandwidth loop where Codex could execute, while the user retained product taste and scope control.

The best working model was:

```text
User owns taste, constraints, and direction.
Codex owns implementation, verification, and mechanical follow-through.
Both iterate through concrete artifacts.
```

