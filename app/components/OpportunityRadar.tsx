"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    Github,
    Hash,
    MessageSquare,
    Newspaper,
    Radio,
    Sparkles,
    TextCursorInput,
    XCircle,
    type LucideIcon,
} from "lucide-react";
import {
    BAML_ACTIVE_WORKFLOW,
    BAML_DEMO_OPPORTUNITIES,
    BAML_SOURCE_TYPES,
    buildBamlOpportunityTaskDescription,
    buildManualOpportunity,
    type BamlOpportunity,
    type BamlSourceType,
} from "../../lib/bamlGtmDemo";

type OpportunityStatus = "new" | "approved" | "rejected" | "snoozed";

const sourceIcons: Record<BamlSourceType, LucideIcon> = {
    X: Hash,
    Reddit: MessageSquare,
    GitHub: Github,
    HN: Newspaper,
    Paste: TextCursorInput,
};

const sourceStyles: Record<BamlSourceType, string> = {
    X: "border-zinc-300 bg-zinc-50 text-zinc-900",
    Reddit: "border-orange-200 bg-orange-50 text-orange-900",
    GitHub: "border-slate-300 bg-slate-50 text-slate-900",
    HN: "border-amber-200 bg-amber-50 text-amber-900",
    Paste: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

function StatusPill({ status }: { status: OpportunityStatus }) {
    const config = {
        new: { label: "Candidate", className: "bg-slate-100 text-slate-600 border-slate-200", icon: Radio },
        approved: { label: "Approved", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
        rejected: { label: "Rejected", className: "bg-rose-50 text-rose-700 border-rose-200", icon: XCircle },
        snoozed: { label: "Snoozed", className: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock3 },
    }[status];
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.className}`}>
            <Icon size={12} />
            {config.label}
        </span>
    );
}

export default function OpportunityRadar() {
    const createTask = useMutation(api.tasks.create);
    const createHostedBamlDemoMission = useMutation(api.tasks.createHostedBamlDemoMission);
    const logActivity = useMutation(api.agents.logActivity);
    const hostedDemo = process.env.NEXT_PUBLIC_HOSTED_DEMO === "true";
    const [selectedSource, setSelectedSource] = useState<BamlSourceType>("X");
    const [sourceUrl, setSourceUrl] = useState("");
    const [discussion, setDiscussion] = useState("");
    const [manualOpportunities, setManualOpportunities] = useState<BamlOpportunity[]>([]);
    const [statuses, setStatuses] = useState<Record<string, OpportunityStatus>>({});
    const [createdTasks, setCreatedTasks] = useState<Record<string, string>>({});
    const [isCreating, setIsCreating] = useState<string | null>(null);

    const opportunities = useMemo(
        () => [...manualOpportunities, ...BAML_DEMO_OPPORTUNITIES],
        [manualOpportunities],
    );

    const addManualOpportunity = async () => {
        if (!discussion.trim()) return;
        const opportunity = buildManualOpportunity(selectedSource, sourceUrl, discussion);
        setManualOpportunities((items) => [opportunity, ...items]);
        setDiscussion("");
        setSourceUrl("");
        await logActivity({
            agentName: "Curie",
            type: "log",
            content: `Manual ${selectedSource} discussion converted into a demo opportunity candidate.`,
        });
    };

    const setDecision = async (id: string, status: OpportunityStatus) => {
        setStatuses((current) => ({ ...current, [id]: status }));
        await logActivity({
            agentName: "Human",
            type: status === "approved" ? "action" : "log",
            content: `Opportunity ${status}: ${id}`,
        });
    };

    const approveOpportunity = async (opportunity: BamlOpportunity) => {
        setIsCreating(opportunity.id);
        try {
            const taskId = hostedDemo
                ? await createHostedBamlDemoMission({ opportunity })
                : await createTask({
                    title: `BAML Opportunity Radar: ${opportunity.detectedPain}`,
                    description: buildBamlOpportunityTaskDescription(opportunity),
                    priority: "high",
                    workflow: BAML_ACTIVE_WORKFLOW,
                });

            setStatuses((current) => ({ ...current, [opportunity.id]: "approved" }));
            setCreatedTasks((current) => ({ ...current, [opportunity.id]: String(taskId) }));
            await logActivity({
                agentName: "OpenClaw Gateway",
                type: "action",
                content: hostedDemo
                    ? "Hosted demo package generated immediately for reviewer walkthrough."
                    : "Approved opportunity queued for Porter -> Torvalds -> Ogilvy -> Carnegie -> Tigerclaw review.",
            });
        } finally {
            setIsCreating(null);
        }
    };

    return (
        <section className="rounded-[1.25rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="grid gap-6 p-5 lg:grid-cols-[0.9fr_1.1fr] lg:p-6">
                <div className="space-y-5">
                    <div>
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold text-slate-900">Discussion input</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                            {BAML_SOURCE_TYPES.map((source) => {
                                const Icon = sourceIcons[source.id];
                                const active = selectedSource === source.id;
                                return (
                                    <button
                                        key={source.id}
                                        type="button"
                                        onClick={() => setSelectedSource(source.id)}
                                        className={`rounded-xl border p-3 text-left transition ${active
                                            ? `${sourceStyles[source.id]} shadow-sm`
                                            : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white"
                                            }`}
                                        title={source.futureAccess}
                                    >
                                        <Icon size={17} />
                                        <div className="mt-2 text-xs font-semibold">{source.label}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <input
                            value={sourceUrl}
                            onChange={(event) => setSourceUrl(event.target.value)}
                            placeholder="Paste source URL or label"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                        />
                        <textarea
                            value={discussion}
                            onChange={(event) => setDiscussion(event.target.value)}
                            rows={5}
                            placeholder="Paste the developer discussion here..."
                            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                        />
                        <button
                            onClick={addManualOpportunity}
                            disabled={!discussion.trim()}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Sparkles size={16} />
                            Add manual candidate
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900">Opportunity Inbox</h3>
                        <span className="text-xs font-medium text-slate-500">{opportunities.length} candidates</span>
                    </div>

                    <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                        {opportunities.map((opportunity) => {
                            const status = statuses[opportunity.id] || "new";
                            const Icon = sourceIcons[opportunity.sourceType];
                            const createdTaskId = createdTasks[opportunity.id];
                            return (
                                <article
                                    key={opportunity.id}
                                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
                                >
                                    <div className="mb-3 flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <div className={`rounded-xl border p-2 ${sourceStyles[opportunity.sourceType]}`}>
                                                <Icon size={17} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="text-sm font-semibold text-slate-950">{opportunity.sourceLabel}</h4>
                                                    <StatusPill status={status} />
                                                </div>
                                                <p className="mt-1 text-xs text-slate-500">{opportunity.sourceUrl}</p>
                                            </div>
                                        </div>
                                        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                            {opportunity.confidence}%
                                        </div>
                                    </div>

                                    <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                                        {opportunity.discussion}
                                    </p>

                                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                                        <div>
                                            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Pain</div>
                                            <p className="mt-1 text-sm leading-5 text-slate-800">{opportunity.detectedPain}</p>
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">BAML fit</div>
                                            <p className="mt-1 text-sm leading-5 text-slate-800">{opportunity.bamlRelevance}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center gap-2">
                                        <button
                                            onClick={() => approveOpportunity(opportunity)}
                                            disabled={isCreating === opportunity.id || status === "approved"}
                                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <CheckCircle2 size={14} />
                                            {isCreating === opportunity.id ? (hostedDemo ? "Generating..." : "Queueing...") : "Approve"}
                                        </button>
                                        <button
                                            onClick={() => setDecision(opportunity.id, "rejected")}
                                            disabled={status === "approved"}
                                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                                        >
                                            <XCircle size={14} />
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => setDecision(opportunity.id, "snoozed")}
                                            disabled={status === "approved"}
                                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                                        >
                                            <Clock3 size={14} />
                                            Snooze
                                        </button>
                                        {createdTaskId && (
                                            <Link
                                                href={`/mission/${createdTaskId}`}
                                                className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-900 bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                                            >
                                                Open mission
                                            </Link>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                        Demo candidates are intentionally static. The source cards show where real API-backed radar inputs would connect later.
                    </div>
                </div>
            </div>
        </section>
    );
}
