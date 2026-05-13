"use client";
import AgentSquad from "./components/AgentSquad";
import ActivityFeed from "./components/ActivityFeed";
import TaskBoard from "./components/TaskBoard";
import NewMissionModal from "./components/NewMissionModal";
import OpportunityRadar from "./components/OpportunityRadar";
import { Plus, Radar } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { BAML_GTM_OBJECTIVE } from "../lib/bamlGtmDemo";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const systemStatus = useQuery(api.system.getStatus);
  const toggleSystemStatus = useMutation(api.system.toggleStatus);
  const isOnline = systemStatus?.status === "online";

  return (
    <div className="min-h-screen bg-[#f6f7f4] p-4 font-sans text-slate-950 md:p-6">
      <div className="mx-auto max-w-[1680px] space-y-6">

      {/* Header */}
      <header className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-4xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            <Radar size={14} />
            powered by OpenClaw Gateway
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">BAML GTM Agentic OS</h1>
          <div className="mt-4 max-w-4xl rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950">
            <span className="font-semibold">Objective:</span> {BAML_GTM_OBJECTIVE}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => toggleSystemStatus()}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 transition-all ${isOnline
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-100 text-slate-400"
              }`}
          >
            <div className={`h-2 w-2 rounded-full ${isOnline ? "animate-pulse bg-emerald-500" : "bg-slate-400"}`}></div>
            <span className="text-sm font-medium">{isOnline ? "Core Online" : "Core Offline"}</span>
          </button>
        </div>
        </div>
      </header>

      <OpportunityRadar />

      {/* Agents Row */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">GTM Agent Runtime</h2>
        <AgentSquad />
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">

        {/* Task Board (Left - 3 cols) */}
        <section className="lg:col-span-3 h-[calc(100vh-240px)] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-slate-400 uppercase tracking-widest text-xs">Mission Queue</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-slate-950 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              <Plus size={16} />
              New Task
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <TaskBoard />
          </div>
        </section>

        {/* Live Feed (Right - 1 col) */}
        <section className="h-[calc(100vh-240px)] flex flex-col">
          <h2 className="font-semibold mb-4 text-slate-400 uppercase tracking-widest text-xs">Activity Feed</h2>
          <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-200 overflow-hidden">
            <ActivityFeed />
          </div>
        </section>

      </div>

      {/* Create Modal */}
      <NewMissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Task Details Modal REMOVED - Managed by separate page now */}

      </div>
    </div>
  );
}
