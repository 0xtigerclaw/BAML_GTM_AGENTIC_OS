import { NextRequest, NextResponse } from "next/server";
import { extractXPostThread } from "../../../../services/xThreadExtractor";

export const runtime = "nodejs";

function isLoopbackAddress(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    return (
        normalized === "localhost" ||
        normalized === "127.0.0.1" ||
        normalized === "::1" ||
        normalized === "[::1]"
    );
}

function isLocalDebugRequest(request: NextRequest): boolean {
    const hostname = new URL(request.url).hostname;
    if (!isLoopbackAddress(hostname)) {
        return false;
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    if (!forwardedFor) {
        return true;
    }

    return forwardedFor
        .split(",")
        .map((address) => address.trim())
        .filter(Boolean)
        .every(isLoopbackAddress);
}

export async function POST(request: NextRequest) {
    // This endpoint drives a logged-in local browser profile and should never be exposed remotely.
    if (!isLocalDebugRequest(request)) {
        return NextResponse.json(
            {
                error: "X extraction is only available from localhost.",
            },
            { status: 403 },
        );
    }

    try {
        const body = await request.json().catch(() => ({}));
        const url = typeof body?.url === "string" ? body.url : "";
        const headed = Boolean(body?.headed);

        if (!url.trim()) {
            return NextResponse.json(
                {
                    error: "Missing `url` in request body.",
                },
                { status: 400 },
            );
        }

        const extraction = await extractXPostThread({ url, headed });
        return NextResponse.json(extraction);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const status = message.includes("status URL") ? 400 : 500;
        return NextResponse.json(
            {
                error: message,
            },
            { status },
        );
    }
}
