"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
    BrainCircuit,
    CheckCircle2,
    Code2,
    PenLine,
    Radar,
    ShieldCheck,
    User,
    Zap,
    type LucideIcon,
} from "lucide-react";
import { BAML_AGENT_MANIFEST } from "../../lib/bamlGtmDemo";

const icons: Record<string, LucideIcon> = {
    Curie: Radar,
    Porter: BrainCircuit,
    Torvalds: Code2,
    Ogilvy: PenLine,
    Carnegie: ShieldCheck,
    Tigerclaw: Zap,
};

type Agent = {
    _id: string;
    name: string;
    role?: string;
    status: string;
};

export default function AgentSquad() {
    const agents = useQuery(api.agents.list) as Agent[] | undefined;

    const agentByName = useMemo(() => {
        const map = new Map<string, Agent>();
        for (const agent of agents || []) map.set(agent.name, agent);
        return map;
    }, [agents]);

    if (!agents) return <div className="text-gray-400">Loading squad...</div>;

    const manifestNames = new Set(BAML_AGENT_MANIFEST.map((agent) => agent.name));
    const standbyAgents = agents.filter((agent) => !manifestNames.has(agent.name));

    return (
        <div className="space-y-4">
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-950">BAML GTM Agent Runtime</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            Each agent has a dedicated skill file, access contract, output schema, and evaluation rubric.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 size={14} />
                        OpenClaw Gateway handoffs enabled
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                    {BAML_AGENT_MANIFEST.map((entry, index) => {
                        const dbAgent = agentByName.get(entry.name);
                        const status = dbAgent?.status || (entry.name === "Curie" ? "demo" : "sleeping");
                        const isActive = status === "active" || status === "in_progress";
                        const Icon = icons[entry.name] || User;

                        return (
                            <div
                                key={entry.name}
                                className={`relative rounded-2xl border p-3 transition ${isActive
                                    ? "border-emerald-300 bg-emerald-50 shadow-sm"
                                    : "border-slate-200 bg-slate-50"
                                    }`}
                            >
                                {index < BAML_AGENT_MANIFEST.length - 1 && (
                                    <div className="pointer-events-none absolute -right-2 top-1/2 z-10 hidden h-px w-4 bg-slate-300 xl:block" />
                                )}
                                <div className="mb-3 flex items-center justify-between gap-2">
                                    <div className={`rounded-xl p-2 ${isActive ? "bg-emerald-600 text-white" : "bg-white text-slate-700 border border-slate-200"}`}>
                                        <Icon size={18} />
                                    </div>
                                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                        {entry.stage}
                                    </span>
                                </div>
                                <h4 className="text-sm font-semibold text-slate-950">{entry.name}</h4>
                                <p className="mt-1 min-h-[42px] text-xs leading-5 text-slate-600">{entry.role}</p>
                                <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3">
                                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : entry.name === "Curie" ? "bg-amber-400" : "bg-slate-300"}`} />
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        {entry.name === "Curie" ? "demo radar" : status}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {standbyAgents.length > 0 && (
                <details className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Standby agents
                    </summary>
                    <div className="mt-3 grid gap-2 md:grid-cols-4">
                        {standbyAgents.map((agent) => (
                            <div key={agent._id} className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="text-sm font-semibold text-slate-900">{agent.name}</div>
                                <div className="mt-1 text-xs text-slate-500">{agent.role || "Generalist"}</div>
                            </div>
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
}
