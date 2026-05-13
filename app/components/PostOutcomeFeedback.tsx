"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { CheckCircle2, ClipboardCheck, ShieldAlert, ThumbsUp } from "lucide-react";

type OutcomeFeedback = {
    relevance: number;
    timing: number;
    technicalUsefulness: number;
    credibility: number;
    engagement: number;
    opportunityQuality: number;
    risk: number;
    notes?: string;
    recordedAt: number;
};

type Props = {
    taskId: Id<"tasks">;
    finalApprovalStatus?: string;
    finalApprovalNote?: string;
    outcomeFeedback?: OutcomeFeedback;
};

const approvalOptions = [
    {
        value: "approved_for_manual_publish",
        label: "Approve final response",
        icon: CheckCircle2,
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    {
        value: "needs_revision",
        label: "Needs revision",
        icon: ClipboardCheck,
        className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    {
        value: "do_not_engage",
        label: "Do not engage",
        icon: ShieldAlert,
        className: "border-rose-200 bg-rose-50 text-rose-700",
    },
];

const rubricFields: Array<{ key: keyof Omit<OutcomeFeedback, "notes" | "recordedAt">; label: string; help: string }> = [
    { key: "relevance", label: "Relevance", help: "Was the original discussion actually a BAML fit?" },
    { key: "timing", label: "Timing", help: "Was the response timely enough to matter?" },
    { key: "technicalUsefulness", label: "Technical usefulness", help: "Did the response help solve the developer problem?" },
    { key: "credibility", label: "Credibility", help: "Did it feel native, not promotional?" },
    { key: "engagement", label: "Engagement", help: "Replies, clicks, saves, DMs, or meaningful discussion." },
    { key: "opportunityQuality", label: "Opportunity quality", help: "Did it create a follow-up worth pursuing?" },
    { key: "risk", label: "Risk control", help: "Higher means lower moderation/spam/reputation risk." },
];

export default function PostOutcomeFeedback({
    taskId,
    finalApprovalStatus,
    finalApprovalNote,
    outcomeFeedback,
}: Props) {
    const recordFinalApproval = useMutation(api.tasks.recordFinalApproval);
    const recordOutcomeFeedback = useMutation(api.tasks.recordOutcomeFeedback);
    const [note, setNote] = useState(finalApprovalNote || "");
    const [isSavingApproval, setIsSavingApproval] = useState<string | null>(null);
    const [isSavingFeedback, setIsSavingFeedback] = useState(false);
    const [ratings, setRatings] = useState({
        relevance: outcomeFeedback?.relevance || 4,
        timing: outcomeFeedback?.timing || 4,
        technicalUsefulness: outcomeFeedback?.technicalUsefulness || 4,
        credibility: outcomeFeedback?.credibility || 4,
        engagement: outcomeFeedback?.engagement || 3,
        opportunityQuality: outcomeFeedback?.opportunityQuality || 3,
        risk: outcomeFeedback?.risk || 4,
    });
    const [feedbackNotes, setFeedbackNotes] = useState(outcomeFeedback?.notes || "");

    const averageScore = useMemo(() => {
        const values = Object.values(ratings);
        return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 20);
    }, [ratings]);

    const saveApproval = async (status: string) => {
        setIsSavingApproval(status);
        try {
            await recordFinalApproval({ id: taskId, status, note });
        } finally {
            setIsSavingApproval(null);
        }
    };

    const saveFeedback = async () => {
        setIsSavingFeedback(true);
        try {
            await recordOutcomeFeedback({
                id: taskId,
                ...ratings,
                notes: feedbackNotes,
            });
        } finally {
            setIsSavingFeedback(false);
        }
    };

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                        <ThumbsUp size={14} />
                        Human Gate 2 + outcome loop
                    </div>
                    <h2 className="text-lg font-semibold text-slate-950">Review, publish manually, then evaluate</h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                        Mission Control does not auto-post. Mark the final package, publish outside the app if approved, then record what happened so Tigerclaw has a rubric for future scoring.
                    </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Rubric score</div>
                    <div className="text-2xl font-semibold text-slate-950">{averageScore}/100</div>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="space-y-3">
                    <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={3}
                        placeholder="Optional approval note for the human reviewer..."
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    />
                    <div className="grid gap-2">
                        {approvalOptions.map((option) => {
                            const Icon = option.icon;
                            const active = finalApprovalStatus === option.value;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => saveApproval(option.value)}
                                    disabled={isSavingApproval !== null}
                                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${active ? option.className : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Icon size={16} />
                                        {option.label}
                                    </span>
                                    {isSavingApproval === option.value ? "Saving..." : active ? "Selected" : ""}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">Post-outcome rubric</h3>
                            {outcomeFeedback && (
                                <p className="mt-1 text-xs text-slate-500">
                                    Last recorded {new Date(outcomeFeedback.recordedAt).toLocaleString()}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={saveFeedback}
                            disabled={isSavingFeedback}
                            className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                        >
                            {isSavingFeedback ? "Saving..." : "Save feedback"}
                        </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        {rubricFields.map((field) => (
                            <label key={field.key} className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm font-semibold text-slate-900">{field.label}</span>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                        {ratings[field.key]}/5
                                    </span>
                                </div>
                                <p className="mt-1 min-h-[32px] text-xs leading-4 text-slate-500">{field.help}</p>
                                <input
                                    type="range"
                                    min={1}
                                    max={5}
                                    value={ratings[field.key]}
                                    onChange={(event) =>
                                        setRatings((current) => ({
                                            ...current,
                                            [field.key]: Number(event.target.value),
                                        }))
                                    }
                                    className="mt-3 w-full accent-slate-950"
                                />
                            </label>
                        ))}
                    </div>

                    <textarea
                        value={feedbackNotes}
                        onChange={(event) => setFeedbackNotes(event.target.value)}
                        rows={3}
                        placeholder="What happened after publishing? Engagement, replies, sentiment, DMs, follow-up opportunity..."
                        className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    />
                </div>
            </div>
        </section>
    );
}
