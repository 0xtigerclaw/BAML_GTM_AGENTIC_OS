# System Architecture: Mission Control with Memory

This diagram illustrates the data flow between the User, Gateway, Agents, and our dual-memory system (Convex Vector Store + File-based Logs).

```mermaid
graph TD
    %% Actors and Entry Points
    User((User)) -->|Creates Task| Inbox[Convex: Task Inbox]
    
    subgraph "Orchestration Layer (Gateway)"
        Gateway{Tigerclaw / Gateway}
        Scheduler[Cron Scheduler]
        QualityGate[Quality Gate / Validator]
    end

    subgraph "State & Memory Layer"
        ConvexDB[(Convex Database)]
        usage_mem[Table: Memories<br/>(Vector Embeddings)]
        usage_tasks[Table: Tasks<br/>(History & State)]
        usage_links[Table: Scouted Links]
        
        FileSystem[Local File System]
        daily_log[File: memory/daily/*.md]
        working_mem[File: memory/WORKING.md]
    end

    subgraph "Context Engine (LLM Service)"
        ContextBuilder[Context Builder]
        SoulLoader[Soul Loader]
        RAG[RAGRetriever]
    end

    subgraph "Execution Layer"
        AgentWorker[Agent Worker<br/>(Curie, Ogilvy, etc.)]
        Clawdbot[Clawdbot CLI]
        LLM[LLM Provider<br/>(OpenAI / Gemini)]
    end

    %% Flows
    Scheduler --> Gateway
    Inbox --> Gateway
    
    %% Assignment
    Gateway -->|1. Assigns Task| AgentWorker
    
    %% Context Assembly
    AgentWorker -->|2. Request Context| ContextBuilder
    ContextBuilder -->|2a. Load Identity| SoulLoader
    ContextBuilder -->|2b. Query Past Work| usage_tasks
    ContextBuilder -->|2c. Vector Search| RAG
    RAG <-->|Semantic Query| usage_mem
    
    %% Execution
    ContextBuilder -->|3. Compiled Prompt| LLM
    LLM -->|4. Raw Output| QualityGate
    QualityGate -->|5. Validated Output| Gateway
    
    %% Persistence
    Gateway -->|6a. Store Step Output| usage_tasks
    Gateway -->|6b. Append Log| daily_log
    Gateway -->|6c. Update Context| working_mem
    
    %% Semantic Extraction (Side Effect)
    Gateway -.->|7. Extract Entities/Links| usage_links
    Gateway -.->|8. Generate Embedding| usage_mem

    %% Styling
    classDef storage fill:#f9f,stroke:#333,stroke-width:2px;
    classDef process fill:#bbf,stroke:#333,stroke-width:2px;
    classDef external fill:#ddd,stroke:#333,stroke-width:2px;
    
    class ConvexDB,usage_mem,usage_tasks,usage_links,daily_log,working_mem storage;
    class Gateway,Scheduler,AgentWorker,ContextBuilder,RAG,QualityGate process;
    class User,LLM,Clawdbot external;
```
