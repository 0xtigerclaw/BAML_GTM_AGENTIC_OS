# Framework Comparison: Clawd vs. Google ADK Architecture

This report compares our current **Clawd / Mission Control** architecture against the principles outlined in the Google Developers blog post *"Architecting an Efficient Context-Aware Multi-Agent Framework for Production"*.

## 1. What We Are Doing
We have implemented a robust, **stateful multi-agent system** that naturally aligns with many of the "context-aware" principles, primarily due to our specific choice of persistent storage (Convex) and explicit orchestration (Gateway).

*   **Tiered State Management:**
    *   **Session Layer (Ground Truth):** Handled by **Convex Tables** (`tasks`, `messages`, `activity`, `scouted_links`). This provides a shared, immutable history of "what happened".
    *   **Memory Layer (Long-Term Knowledge):** We use **Vector Search** (`memories` table) and **RAG** in `gateway/index.ts` to inject relevant past experiences. We also have a `graph_nodes` schema, indicating a move toward **GraphRAG**.
    *   **Working Context (Ephemeral View):** Constructed dynamically in `services/llm.ts`. We concatenate `Identity (Soul) + Task Context + RAG Results + Previous Outputs`.

*   **Explicit Orchestration:**
    *   **Tigerclaw (Gateway):** Acts as the central router, assigning tasks based on intent (`Role Keywords`). This enforces **implicit scoping**—agents only see the task they are assigned, not the entire noise of the system.
    *   **Quality Gates:** The `enforceEssayQuality` function serves as a **output validator**, effectively a "Context Post-Processor" that ensures outputs meet specific criteria before being saved to state.

## 2. Missing Gaps & Opportunities
The Google framework emphasizes treating context as a *compiled product* rather than just a string. While we structure our data well, our *context assembly* is relatively raw.

### A. Context Compaction & Lifecycle (The "Pipeline" Gap)
*   **Current:** We concatenate `previousOutput` directly. If a task chain becomes long (e.g., 50 steps), the context will grow indefinitely until it hits the LLM limit.
*   **Gap:** We lack an **automatic compaction** or **summarization** pipeline.
*   **Reference:** Google suggests a "Context Engine" that automatically summarizes or truncates older message turns while preserving "Ground Truth" in the database.

### B. Artifact Handling
*   **Current:** Code files or large datasets are likely pasted directly into the prompt or passed via tool outputs.
*   **Gap:** We don't have a specific mechanism to handle "large artifacts" (e.g., a 2000-line file) efficiently.
*   **Recommendation:** Implement a mechanism to reference large artifacts by ID/Summary in the prompt, and only fully expand them if the agent specifically requests to "read" them.

### C. Formal "Context Engineering" Layer
*   **Current:** Context assembly is hardcoded in `services/llm.ts` (`generateAgentResponse`).
*   **Gap:** We don't have a declarative way to define "Views". For example, a "Researcher" needs a different *view* of the history (deep links, raw data) than a "Writer" (summarized points, tone guidelines). Currently, they mostly get the same string structure.

## 3. Our Strengths
Our system has several advantages that arguably exceed the baseline reference architecture in specific areas:

*   **🚀 Convex-Native State:** By building natively on Convex, our "Ground Truth" layer is reactive and real-time. We don't need complex synchronization logic; the database *is* the state.
*   **🧠 GraphRAG Ready:** The presence of `graph_nodes` and `graph_edges` in our schema puts us ahead of simple vector-only memory systems. We are positioned to implement structured reasoning.
*   **👁️ Multi-Modal & Multi-Model:**
    *   We seamlessly switch between **OpenAI** (Reasoning), **Gemini** (Visuals/Ive), and **Clawdbot CLI** (Tools).
    *   Specific visual pipelines for **Ive** (overlay generation) show a level of specialization that generic text-based frameworks miss.
*   **🛡️ Self-Healing JSON:** The `ensureValidStrictJsonOutput` loop in `llm.ts` is a production-grade reliability feature that ensures downstream tools (like the Dashboard) don't crash on bad LLM output.

## 4. Recommendations / Next Steps

1.  **Implement "Context Views":**
    *   Refactor `generateAgentResponse` to accept a `ContextStrategy`.
    *   *Example:* `WriterContext` summarizes previous research output into bullet points before feeding it to the Writer, saving tokens and reducing noise.

2.  **Add "Auto-Summarization" to Gateway:**
    *   When a `task.output` exceeds $N$ tokens, trigger a background job to generate a `summary` and store it. Use the summary for future context injection instead of the raw output.

3.  **Activate GraphRAG:**
    *   Since the schema exists, populate it! Use `Curie` (Researcher) to extract entities and relationships from successful tasks and store them in `graph_nodes`.

4.  **Formalize Artifacts:**
    *   Instead of putting full file contents in `task.description`, store files in a `resources` table and pass `Resource(ID: 123, Name: "User.ts")` to the agent.
