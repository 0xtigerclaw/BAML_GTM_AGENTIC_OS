"use client";
import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

let convex: ConvexReactClient | null = null;

function getConvexClient() {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) return null;

    convex ??= new ConvexReactClient(convexUrl);
    return convex;
}

export default function ConvexClientProvider({
    children,
}: {
    children: ReactNode;
}) {
    const client = getConvexClient();

    if (!client) {
        return (
            <main className="min-h-screen bg-[#f6f7f4] p-6 text-slate-950">
                <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6">
                    <p className="text-sm font-semibold uppercase tracking-widest text-amber-700">
                        Missing Convex configuration
                    </p>
                    <h1 className="mt-3 text-2xl font-semibold">Set NEXT_PUBLIC_CONVEX_URL</h1>
                    <p className="mt-2 text-sm leading-6 text-amber-950">
                        This deployment needs a Convex backend URL. On Vercel, add a Convex deploy
                        key and use the Convex build command documented in the README so the URL is
                        injected during the build.
                    </p>
                </div>
            </main>
        );
    }

    return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
