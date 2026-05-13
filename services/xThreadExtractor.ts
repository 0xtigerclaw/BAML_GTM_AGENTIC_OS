import { spawn, type ChildProcess } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";

export type XAuthState = "ok" | "reauth_required" | "blocked";

export type XPostAuthor = {
    username: string;
    displayName?: string | null;
};

export type XPostMedia = {
    type: "image" | "video" | "gif" | "unknown";
    url?: string;
    alt?: string | null;
};

export type XThreadPost = {
    statusId: string;
    url: string;
    author: XPostAuthor;
    text: string;
    publishedAt?: string | null;
    links: string[];
    media: XPostMedia[];
};

export type XThreadExtraction = {
    sourceUrl: string;
    canonicalUrl: string;
    statusId: string;
    author?: XPostAuthor;
    rootPost: XThreadPost | null;
    threadPosts: XThreadPost[];
    contextPosts: XThreadPost[];
    combinedText: string;
    combinedMarkdown: string;
    warnings: string[];
    authState: XAuthState;
    error?: string;
};

export type XThreadExtractorInput = {
    url: string;
    headed?: boolean;
};

type ParsedXStatusUrl = {
    sourceUrl: string;
    canonicalUrl: string;
    statusId: string;
    username?: string;
};

export type InternalTweetCard = XThreadPost & {
    domOrder: number;
    referencedStatusUrls: string[];
    rawText: string;
};

type ExtractionCacheEntry = {
    expiresAt: number;
    result: XThreadExtraction;
};

type XBrowserLaunchConfig = {
    profileDir: string;
    executablePath?: string;
    channel?: string;
    headless: boolean;
    remoteDebuggingPort: number;
    cdpEndpoint: string;
    maxScrolls: number;
    navTimeoutMs: number;
};

type XBrowserSession = {
    context: BrowserContext;
    page: Page;
    config: XBrowserLaunchConfig;
    close: () => Promise<void>;
};

type XOAuth1Credentials = {
    consumerKey: string;
    consumerSecret: string;
    accessToken: string;
    accessTokenSecret: string;
};

type XApiAuthStrategy = {
    kind: "bearer" | "oauth1";
    label: string;
    buildHeaders: (requestUrl: URL, method: string) => HeadersInit;
};

export type XBrowserSessionMode =
    | "attach_existing"
    | "launch_managed"
    | "launch_persistent_context"
    | "blocked_by_profile_lock";

type XOAuth1AuthorizationInput = {
    method: string;
    url: string;
    query?: URLSearchParams;
    credentials: XOAuth1Credentials;
    nonce?: string;
    timestamp?: string;
};

type XApiTweet = {
    id: string;
    text: string;
    author_id?: string;
    conversation_id?: string;
    created_at?: string;
    entities?: {
        urls?: Array<{
            expanded_url?: string;
            url?: string;
        }>;
    };
    attachments?: {
        media_keys?: string[];
    };
    referenced_tweets?: Array<{
        type: string;
        id: string;
    }>;
};

type XApiUser = {
    id: string;
    username: string;
    name?: string;
};

type XApiMedia = {
    media_key: string;
    type: string;
    url?: string;
    preview_image_url?: string;
    alt_text?: string;
};

type XApiResponse = {
    data?: XApiTweet | XApiTweet[];
    includes?: {
        users?: XApiUser[];
        media?: XApiMedia[];
    };
    meta?: {
        result_count?: number;
    };
    errors?: Array<{
        detail?: string;
        title?: string;
    }>;
    detail?: string;
    title?: string;
};

const X_STATUS_URL_PATTERN =
    /\bhttps?:\/\/(?:www\.)?(?:mobile\.)?(?:x\.com|twitter\.com)\/[A-Za-z0-9_]+\/status\/\d+\S*/gi;
const DEFAULT_PROFILE_DIR = path.join(process.cwd(), ".browser-profiles", "x");
const DEFAULT_CHANNEL = process.env.X_BROWSER_CHANNEL || "chrome";
const DEFAULT_HEADLESS = resolveXBrowserHeadless();
const DEFAULT_REMOTE_DEBUGGING_PORT = parsePositiveIntEnv("X_BROWSER_REMOTE_DEBUGGING_PORT", 9333);
const DEFAULT_MAX_SCROLLS = parsePositiveIntEnv("X_BROWSER_MAX_SCROLLS", 4);
const DEFAULT_NAV_TIMEOUT_MS = parsePositiveIntEnv("X_BROWSER_NAV_TIMEOUT_MS", 30_000);
const EXTRACTION_CACHE_TTL_MS = 10 * 60 * 1000;
const X_API_BASE_URL = process.env.X_API_BASE_URL || "https://api.x.com/2";
const extractionCache = new Map<string, ExtractionCacheEntry>();
let looseEnvFileCache: Record<string, string> | null = null;

function parseBooleanValue(raw: string | undefined, fallback: boolean): boolean {
    if (raw === undefined) return fallback;
    return !["0", "false", "no", "off"].includes(raw.toLowerCase());
}

export function resolveXBrowserHeadless(env: NodeJS.ProcessEnv = process.env): boolean {
    return parseBooleanValue(env.X_BROWSER_HEADLESS, false);
}

function parsePositiveIntEnv(name: string, fallback: number): number {
    const raw = process.env[name];
    if (!raw) return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
}

function cloneExtraction(result: XThreadExtraction): XThreadExtraction {
    return JSON.parse(JSON.stringify(result)) as XThreadExtraction;
}

export function parseLooseEnvContent(content: string): Record<string, string> {
    const parsed: Record<string, string> = {};

    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;

        const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*[:=]\s*(.*)$/);
        if (!match) continue;

        const [, key, rawValue] = match;
        let value = rawValue.trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        parsed[key] = value;
    }

    return parsed;
}

function isXStatusHost(hostname: string): boolean {
    return hostname === "x.com" || hostname === "twitter.com" || hostname === "www.x.com" || hostname === "www.twitter.com" || hostname === "mobile.twitter.com";
}

export function parseXStatusUrl(raw: string): ParsedXStatusUrl | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    let candidate = trimmed.replace(/^<(.+)>$/, "$1").replace(/^["'](.+)["']$/, "$1").trim();
    if (!candidate) return null;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
        candidate = `https://${candidate}`;
    }

    try {
        const parsed = new URL(candidate);
        if (!isXStatusHost(parsed.hostname.toLowerCase())) return null;

        const segments = parsed.pathname.split("/").filter(Boolean);
        if (segments.length < 3 || segments[1] !== "status") return null;

        const username = segments[0];
        const statusId = segments[2];
        if (!/^\d+$/.test(statusId)) return null;

        return {
            sourceUrl: raw.trim(),
            canonicalUrl: `https://x.com/${username}/status/${statusId}`,
            statusId,
            username,
        };
    } catch {
        return null;
    }
}

export function extractXStatusUrls(text: string): string[] {
    const matches = text.match(X_STATUS_URL_PATTERN) || [];
    const seen = new Set<string>();
    const urls: string[] = [];
    for (const match of matches) {
        const parsed = parseXStatusUrl(match);
        if (!parsed || seen.has(parsed.canonicalUrl)) continue;
        seen.add(parsed.canonicalUrl);
        urls.push(parsed.canonicalUrl);
    }
    return urls;
}

export function extractFirstXStatusUrl(text: string): string | null {
    return extractXStatusUrls(text)[0] || null;
}

function resolveProfileDir(): string {
    const configured = process.env.X_BROWSER_PROFILE_DIR?.trim();
    return configured ? path.resolve(configured) : DEFAULT_PROFILE_DIR;
}

function resolveChromeExecutablePath(): string | undefined {
    const configured = process.env.X_BROWSER_EXECUTABLE_PATH?.trim();
    if (configured) return configured;

    const candidates = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ];

    return candidates.find((candidate) => fs.existsSync(candidate));
}

export function buildManualXAuthChromeLaunchArgs(profileDir: string, startUrl = "https://x.com/home"): string[] {
    return [
        `--user-data-dir=${profileDir}`,
        "--remote-debugging-address=127.0.0.1",
        `--remote-debugging-port=${DEFAULT_REMOTE_DEBUGGING_PORT}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--new-window",
        startUrl,
    ];
}

export function getXAuthBootstrapBrowserConfig(): {
    profileDir: string;
    executablePath?: string;
    remoteDebuggingPort: number;
    launchArgs: string[];
} {
    const profileDir = resolveProfileDir();

    return {
        profileDir,
        executablePath: resolveChromeExecutablePath(),
        remoteDebuggingPort: DEFAULT_REMOTE_DEBUGGING_PORT,
        launchArgs: buildManualXAuthChromeLaunchArgs(profileDir),
    };
}

export function buildXAuthProfileLockPaths(profileDir: string): string[] {
    return [
        path.join(profileDir, "SingletonLock"),
        path.join(profileDir, "SingletonCookie"),
        path.join(profileDir, "SingletonSocket"),
    ];
}

export function isXAuthProfileLocked(profileDir: string): boolean {
    return buildXAuthProfileLockPaths(profileDir).some((lockPath) => fs.existsSync(lockPath));
}

export function resolveXBrowserSessionMode(input: {
    headless: boolean;
    executablePath?: string;
    cdpEndpointReady: boolean;
    profileLocked: boolean;
}): XBrowserSessionMode {
    if (!input.headless && input.cdpEndpointReady) {
        return "attach_existing";
    }

    if (input.headless || !input.executablePath) {
        return "launch_persistent_context";
    }

    if (input.profileLocked) {
        return "blocked_by_profile_lock";
    }

    return "launch_managed";
}

function resolveXBearerToken(env: NodeJS.ProcessEnv = process.env): string | null {
    const token = resolveEnvValue(env, ["X_BEARER_TOKEN"]);
    return token ? token : null;
}

function loadLooseLocalEnvFallback(): Record<string, string> {
    if (looseEnvFileCache) {
        return looseEnvFileCache;
    }

    const fallbackPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(fallbackPath)) {
        looseEnvFileCache = {};
        return looseEnvFileCache;
    }

    const fileContents = fs.readFileSync(fallbackPath, "utf8");
    looseEnvFileCache = parseLooseEnvContent(fileContents);
    return looseEnvFileCache;
}

function resolveEnvValue(env: NodeJS.ProcessEnv, names: string[]): string | null {
    for (const name of names) {
        const directValue = env[name]?.trim();
        if (directValue) {
            return directValue;
        }

        const embeddedKey = Object.keys(env).find((key) => key.startsWith(`${name}:`) && key.length > name.length + 1);
        if (embeddedKey) {
            return embeddedKey.slice(name.length + 1).trim() || null;
        }
    }

    const looseEnvValues = loadLooseLocalEnvFallback();
    for (const name of names) {
        const fallbackValue = looseEnvValues[name]?.trim();
        if (fallbackValue) {
            return fallbackValue;
        }
    }

    return null;
}

function resolveXOAuth1Credentials(env: NodeJS.ProcessEnv = process.env): XOAuth1Credentials | null {
    const consumerKey = resolveEnvValue(env, ["X_CONSUMER_KEY", "X_API_KEY"]);
    const consumerSecret = resolveEnvValue(env, ["X_KEY_SECRET", "X_API_SECRET"]);
    const accessToken = resolveEnvValue(env, ["X_ACCESS_TOKEN"]);
    const accessTokenSecret = resolveEnvValue(env, ["X_ACCESS_TOKEN_SECRET", "X_ACCESS_SECRECT", "X_TOKEN_SECRET"]);

    if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
        return null;
    }

    return {
        consumerKey,
        consumerSecret,
        accessToken,
        accessTokenSecret,
    };
}

function encodeOAuthValue(value: string): string {
    return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
        `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
}

export function buildXOAuth1AuthorizationHeader(input: XOAuth1AuthorizationInput): string {
    const requestUrl = new URL(input.url);
    const requestParams = Array.from(input.query || requestUrl.searchParams).map(([key, value]) => [key, value] as const);
    const oauthParams = {
        oauth_consumer_key: input.credentials.consumerKey,
        oauth_nonce: input.nonce || crypto.randomBytes(16).toString("hex"),
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: input.timestamp || Math.floor(Date.now() / 1000).toString(),
        oauth_token: input.credentials.accessToken,
        oauth_version: "1.0",
    };

    const normalizedParams = [...requestParams, ...Object.entries(oauthParams)]
        .map(([key, value]) => [encodeOAuthValue(key), encodeOAuthValue(value)] as const)
        .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
            if (leftKey === rightKey) return leftValue.localeCompare(rightValue);
            return leftKey.localeCompare(rightKey);
        })
        .map(([key, value]) => `${key}=${value}`)
        .join("&");

    const baseUrl = `${requestUrl.origin}${requestUrl.pathname}`;
    const signatureBaseString = [
        input.method.toUpperCase(),
        encodeOAuthValue(baseUrl),
        encodeOAuthValue(normalizedParams),
    ].join("&");

    const signingKey = [
        encodeOAuthValue(input.credentials.consumerSecret),
        encodeOAuthValue(input.credentials.accessTokenSecret),
    ].join("&");

    const signature = crypto.createHmac("sha1", signingKey).update(signatureBaseString).digest("base64");
    const headerParams = {
        ...oauthParams,
        oauth_signature: signature,
    };

    return `OAuth ${Object.entries(headerParams)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, value]) => `${encodeOAuthValue(key)}="${encodeOAuthValue(value)}"`)
        .join(", ")}`;
}

export function resolveXApiAuthStrategies(env: NodeJS.ProcessEnv = process.env): XApiAuthStrategy[] {
    const strategies: XApiAuthStrategy[] = [];
    const bearerToken = resolveXBearerToken(env);
    if (bearerToken) {
        strategies.push({
            kind: "bearer",
            label: "bearer token",
            buildHeaders: () => ({
                Authorization: `Bearer ${bearerToken}`,
                "Content-Type": "application/json",
            }),
        });
    }

    const oauth1Credentials = resolveXOAuth1Credentials(env);
    if (oauth1Credentials) {
        strategies.push({
            kind: "oauth1",
            label: "OAuth 1.0a user context",
            buildHeaders: (requestUrl, method) => ({
                Authorization: buildXOAuth1AuthorizationHeader({
                    method,
                    url: requestUrl.toString(),
                    query: requestUrl.searchParams,
                    credentials: oauth1Credentials,
                }),
                "Content-Type": "application/json",
            }),
        });
    }

    return strategies;
}

function buildXApiRequestUrl(pathname: string, params: URLSearchParams): URL {
    const url = new URL(`${X_API_BASE_URL}${pathname}`);
    for (const [key, value] of params) {
        url.searchParams.append(key, value);
    }
    return url;
}

async function fetchXApiJson(pathname: string, params: URLSearchParams, authStrategy: XApiAuthStrategy): Promise<XApiResponse> {
    const url = buildXApiRequestUrl(pathname, params);
    const response = await fetch(url, {
        headers: authStrategy.buildHeaders(url, "GET"),
        cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as XApiResponse;
    if (!response.ok) {
        const errorMessage =
            payload.errors?.map((error) => error.detail || error.title).filter(Boolean).join("; ") ||
            payload.detail ||
            payload.title ||
            `X API request failed with status ${response.status}`;
        throw new Error(errorMessage);
    }

    return payload;
}

function getBrowserLaunchConfig(headed = false): XBrowserLaunchConfig {
    return {
        profileDir: resolveProfileDir(),
        executablePath: resolveChromeExecutablePath(),
        channel: DEFAULT_CHANNEL,
        headless: headed ? false : DEFAULT_HEADLESS,
        remoteDebuggingPort: DEFAULT_REMOTE_DEBUGGING_PORT,
        cdpEndpoint: `http://127.0.0.1:${DEFAULT_REMOTE_DEBUGGING_PORT}`,
        maxScrolls: DEFAULT_MAX_SCROLLS,
        navTimeoutMs: DEFAULT_NAV_TIMEOUT_MS,
    };
}

async function launchPersistentXContext(headed = false): Promise<{ context: BrowserContext; config: XBrowserLaunchConfig }> {
    const config = getBrowserLaunchConfig(headed);
    await fs.promises.mkdir(config.profileDir, { recursive: true });

    const launchOptions: Parameters<typeof chromium.launchPersistentContext>[1] = {
        headless: config.headless,
        viewport: { width: 1440, height: 1200 },
        userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    };

    if (config.executablePath) {
        launchOptions.executablePath = config.executablePath;
    } else if (config.channel) {
        launchOptions.channel = config.channel;
    }

    const context = await chromium.launchPersistentContext(config.profileDir, launchOptions);
    context.setDefaultNavigationTimeout(config.navTimeoutMs);
    context.setDefaultTimeout(config.navTimeoutMs);
    return { context, config };
}

async function isCdpEndpointReady(endpoint: string): Promise<boolean> {
    try {
        const response = await fetch(`${endpoint}/json/version`, { method: "GET" });
        return response.ok;
    } catch {
        return false;
    }
}

async function waitForCdpEndpoint(endpoint: string, timeoutMs: number): Promise<void> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        if (await isCdpEndpointReady(endpoint)) {
            return;
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(`Chrome DevTools endpoint did not become ready at ${endpoint}.`);
}

async function closeManagedChrome(browser: Browser | null, chromeProcess: ChildProcess | null): Promise<void> {
    await browser?.close().catch(() => {});

    if (chromeProcess && chromeProcess.exitCode === null && chromeProcess.signalCode === null) {
        chromeProcess.kill("SIGTERM");
    }
}

async function attachToExistingManagedXChromeSession(config: XBrowserLaunchConfig): Promise<XBrowserSession> {
    const browser = await chromium.connectOverCDP(config.cdpEndpoint);
    const context = browser.contexts()[0];
    if (!context) {
        throw new Error("Existing Chrome DevTools session did not expose a browser context.");
    }

    context.setDefaultNavigationTimeout(config.navTimeoutMs);
    context.setDefaultTimeout(config.navTimeoutMs);

    const page = await context.newPage();
    return {
        context,
        page,
        config,
        close: async () => {
            await page.close().catch(() => {});
        },
    };
}

async function launchManagedXChromeSession(startUrl: string, config: XBrowserLaunchConfig): Promise<XBrowserSession> {
    if (!config.executablePath) {
        throw new Error("Chrome executable not found for managed X browser launch.");
    }

    await fs.promises.mkdir(config.profileDir, { recursive: true });

    let browser: Browser | null = null;
    let chromeProcess: ChildProcess | null = null;

    try {
        chromeProcess = spawn(config.executablePath, buildManualXAuthChromeLaunchArgs(config.profileDir, startUrl), {
            stdio: "ignore",
        });

        await waitForCdpEndpoint(config.cdpEndpoint, config.navTimeoutMs);
        browser = await chromium.connectOverCDP(config.cdpEndpoint);

        const context = browser.contexts()[0];
        if (!context) {
            throw new Error("Managed Chrome did not expose a default browser context.");
        }

        context.setDefaultNavigationTimeout(config.navTimeoutMs);
        context.setDefaultTimeout(config.navTimeoutMs);

        const page = context.pages()[0] || await context.newPage();
        return {
            context,
            page,
            config,
            close: async () => {
                await closeManagedChrome(browser, chromeProcess);
            },
        };
    } catch (error) {
        await closeManagedChrome(browser, chromeProcess);
        throw error;
    }
}

async function openXBrowserSession(startUrl: string, headed = false): Promise<XBrowserSession> {
    const config = getBrowserLaunchConfig(headed);
    const cdpEndpointReady = !config.headless && (await isCdpEndpointReady(config.cdpEndpoint));
    const profileLocked = !config.headless && isXAuthProfileLocked(config.profileDir);
    const sessionMode = resolveXBrowserSessionMode({
        headless: config.headless,
        executablePath: config.executablePath,
        cdpEndpointReady,
        profileLocked,
    });

    if (sessionMode === "attach_existing") {
        return attachToExistingManagedXChromeSession(config);
    }

    if (sessionMode === "blocked_by_profile_lock") {
        throw new Error(
            "Dedicated X browser profile is already in use, but no reusable CDP session was reachable. Close the existing dedicated X Chrome window or free the profile before retrying.",
        );
    }

    if (sessionMode === "launch_managed") {
        return launchManagedXChromeSession(startUrl, config);
    }

    const { context } = await launchPersistentXContext(headed);
    const page = await getOrCreatePage(context);

    return {
        context,
        page,
        config,
        close: async () => {
            await context.close().catch(() => {});
        },
    };
}

async function getOrCreatePage(context: BrowserContext): Promise<Page> {
    const existing = context.pages()[0];
    return existing || context.newPage();
}

async function detectAuthState(page: Page): Promise<XAuthState> {
    const currentUrl = page.url().toLowerCase();
    if (currentUrl.includes("/i/flow/login") || currentUrl.endsWith("/login")) {
        return "reauth_required";
    }

    const bodyText = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
    if (
        bodyText.includes("sign in to x") ||
        bodyText.includes("join x today") ||
        bodyText.includes("log in to x") ||
        bodyText.includes("create your account")
    ) {
        return "reauth_required";
    }

    if (
        bodyText.includes("something went wrong") ||
        bodyText.includes("try reloading") ||
        bodyText.includes("rate limit exceeded") ||
        bodyText.includes("temporarily unavailable")
    ) {
        return "blocked";
    }

    return "ok";
}

async function waitForTweetSurface(page: Page, navTimeoutMs: number): Promise<{ ready: boolean; authState: XAuthState; bodyText: string }> {
    const startedAt = Date.now();
    let lastBodyText = "";

    while (Date.now() - startedAt < navTimeoutMs) {
        const authState = await detectAuthState(page);
        lastBodyText = await page.locator("body").innerText().catch(() => "");
        if (authState !== "ok") {
            return { ready: false, authState, bodyText: lastBodyText };
        }

        const tweetCount = await page.locator('article[data-testid="tweet"]').count().catch(() => 0);
        if (tweetCount > 0) {
            return { ready: true, authState, bodyText: lastBodyText };
        }

        const lowered = lastBodyText.toLowerCase();
        if (
            lowered.includes("this post is unavailable") ||
            lowered.includes("this account doesn’t exist") ||
            lowered.includes("this account doesn't exist") ||
            lowered.includes("hmm...this page doesn’t exist") ||
            lowered.includes("hmm...this page doesn't exist")
        ) {
            break;
        }

        await page.waitForTimeout(500);
    }

    return { ready: false, authState: await detectAuthState(page), bodyText: lastBodyText };
}

export function buildVisibleTweetCardsScript(): string {
    return String.raw`
(() => {
    const toAbsoluteUrl = (href) => {
        if (!href) return null;
        try {
            return new URL(href, window.location.origin).toString();
        } catch {
            return null;
        }
    };

    const parseStatusUrl = (href) => {
        const absolute = toAbsoluteUrl(href);
        if (!absolute) return null;
        try {
            const parsed = new URL(absolute);
            const hostname = parsed.hostname.toLowerCase();
            if (!["x.com", "twitter.com", "www.x.com", "www.twitter.com", "mobile.twitter.com"].includes(hostname)) {
                return null;
            }
            const parts = parsed.pathname.split("/").filter(Boolean);
            if (parts.length < 3 || parts[1] !== "status" || !/^\d+$/.test(parts[2])) {
                return null;
            }
            return {
                url: "https://x.com/" + parts[0] + "/status/" + parts[2],
                statusId: parts[2],
                username: parts[0],
            };
        } catch {
            return null;
        }
    };

    const getDisplayName = (article) => {
        const userNameBlock = article.querySelector('div[data-testid="User-Name"]');
        if (!userNameBlock) return null;
        const text = (userNameBlock.textContent || "").trim();
        if (!text) return null;
        const firstLine = text.split("\n").map((part) => part.trim()).find(Boolean) || "";
        return firstLine || null;
    };

    const getText = (article) => {
        const tweetText = article.querySelector('div[data-testid="tweetText"]');
        return (tweetText?.textContent || "").replace(/\s+/g, " ").trim();
    };

    const getLinks = (article, selfUrl) => {
        const links = new Set();
        for (const anchor of Array.from(article.querySelectorAll("a[href]"))) {
            const absolute = toAbsoluteUrl(anchor.getAttribute("href"));
            if (!absolute || absolute === selfUrl) continue;
            links.add(absolute);
        }
        return Array.from(links);
    };

    const getMedia = (article) => {
        const media = [];

        for (const img of Array.from(article.querySelectorAll('[data-testid="tweetPhoto"] img'))) {
            media.push({
                type: "image",
                url: img.getAttribute("src") || undefined,
                alt: img.getAttribute("alt"),
            });
        }

        for (const video of Array.from(article.querySelectorAll("video"))) {
            media.push({
                type: "video",
                url: video.getAttribute("poster") || undefined,
                alt: null,
            });
        }

        if (article.querySelector('[aria-label*="GIF" i]')) {
            media.push({ type: "gif" });
        }

        return media;
    };

    return Array.from(document.querySelectorAll('article[data-testid="tweet"]'))
        .map((article, domOrder) => {
            const timeAnchor = article.querySelector("time")?.closest("a[href]");
            const primaryStatus = parseStatusUrl(timeAnchor?.getAttribute("href"));
            if (!primaryStatus) return null;

            const allStatusUrls = Array.from(article.querySelectorAll("a[href]"))
                .map((anchor) => parseStatusUrl(anchor.getAttribute("href")))
                .filter(Boolean);

            const referencedStatusUrls = Array.from(
                new Set(
                    allStatusUrls
                        .filter((entry) => entry.statusId !== primaryStatus.statusId)
                        .map((entry) => entry.url),
                ),
            );

            const text = getText(article);

            return {
                domOrder,
                statusId: primaryStatus.statusId,
                url: primaryStatus.url,
                author: {
                    username: primaryStatus.username,
                    displayName: getDisplayName(article),
                },
                text,
                rawText: (article.textContent || "").replace(/\s+/g, " ").trim() || text,
                publishedAt: article.querySelector("time")?.getAttribute("datetime") || null,
                links: getLinks(article, primaryStatus.url),
                media: getMedia(article),
                referencedStatusUrls,
            };
        })
        .filter(Boolean);
})()
`.trim();
}

async function extractVisibleTweetCards(page: Page): Promise<InternalTweetCard[]> {
    return page.evaluate((script) => globalThis.eval(script) as InternalTweetCard[], buildVisibleTweetCardsScript());
}

export function mergeCards(existing: InternalTweetCard[], next: InternalTweetCard[]): InternalTweetCard[] {
    const merged = new Map<string, InternalTweetCard>();
    let nextDomOrder = 0;

    for (const card of [...existing].sort((left, right) => left.domOrder - right.domOrder)) {
        merged.set(card.statusId, {
            ...card,
            domOrder: nextDomOrder,
        });
        nextDomOrder += 1;
    }

    for (const card of [...next].sort((left, right) => left.domOrder - right.domOrder)) {
        const current = merged.get(card.statusId);
        if (!current) {
            merged.set(card.statusId, {
                ...card,
                domOrder: nextDomOrder,
            });
            nextDomOrder += 1;
            continue;
        }

        merged.set(card.statusId, {
            ...current,
            ...card,
            domOrder: current.domOrder,
            text: current.text.length >= card.text.length ? current.text : card.text,
            rawText: current.rawText.length >= card.rawText.length ? current.rawText : card.rawText,
            links: Array.from(new Set([...current.links, ...card.links])),
            media: [...current.media, ...card.media],
            referencedStatusUrls: Array.from(new Set([...current.referencedStatusUrls, ...card.referencedStatusUrls])),
        });
    }

    return Array.from(merged.values()).sort((left, right) => left.domOrder - right.domOrder);
}

function toThreadPost(card: InternalTweetCard): XThreadPost {
    return {
        statusId: card.statusId,
        url: card.url,
        author: card.author,
        text: card.text || card.rawText,
        publishedAt: card.publishedAt,
        links: card.links,
        media: card.media,
    };
}

function selectContextPosts(cards: InternalTweetCard[], rootCard: InternalTweetCard): XThreadPost[] {
    return cards
        .filter((card) => card.domOrder < rootCard.domOrder && card.author.username !== rootCard.author.username)
        .slice(-3)
        .map(toThreadPost);
}

export function selectThreadCards(cards: InternalTweetCard[], rootCard: InternalTweetCard): InternalTweetCard[] {
    const sameAuthorCards = cards.filter(
        (card) => card.statusId !== rootCard.statusId && card.author.username === rootCard.author.username,
    );

    const cardsByReferencedStatusId = new Map<string, InternalTweetCard[]>();
    for (const card of sameAuthorCards) {
        for (const referencedUrl of card.referencedStatusUrls) {
            const referencedStatusId = parseXStatusUrl(referencedUrl)?.statusId;
            if (!referencedStatusId) continue;

            const existing = cardsByReferencedStatusId.get(referencedStatusId) || [];
            existing.push(card);
            cardsByReferencedStatusId.set(referencedStatusId, existing);
        }
    }

    const chainedCards: InternalTweetCard[] = [];
    const seenStatusIds = new Set<string>();
    let previousStatusId = rootCard.statusId;

    while (true) {
        const nextCard = (cardsByReferencedStatusId.get(previousStatusId) || [])
            .filter((card) => !seenStatusIds.has(card.statusId))
            .sort((left, right) => left.domOrder - right.domOrder)[0];

        if (!nextCard) break;

        chainedCards.push(nextCard);
        seenStatusIds.add(nextCard.statusId);
        previousStatusId = nextCard.statusId;
    }

    if (chainedCards.length > 0) {
        return chainedCards;
    }

    const continuationCards: InternalTweetCard[] = [];
    for (const card of cards) {
        if (card.domOrder <= rootCard.domOrder) continue;
        if (card.author.username !== rootCard.author.username) break;
        continuationCards.push(card);
    }

    return continuationCards;
}

function selectThreadPosts(cards: InternalTweetCard[], rootCard: InternalTweetCard): XThreadPost[] {
    return selectThreadCards(cards, rootCard).map(toThreadPost);
}

async function expandThreadTextForStatusIds(
    page: Page,
    cards: InternalTweetCard[],
    statusIds: string[],
): Promise<InternalTweetCard[]> {
    let updatedCards = cards;

    for (const statusId of statusIds) {
        const article = page
            .locator('article[data-testid="tweet"]')
            .filter({ has: page.locator(`a[href*="/status/${statusId}"]`) })
            .first();

        const articleCount = await article.count().catch(() => 0);
        if (articleCount === 0) continue;

        await article.scrollIntoViewIfNeeded().catch(() => {});

        let expandedForStatus = false;
        for (let pass = 0; pass < 2; pass += 1) {
            const button = article.locator('[data-testid="tweet-text-show-more-link"]').first();
            const visible = await button.isVisible().catch(() => false);
            if (!visible) break;

            await button.click({ timeout: 1_000 }).catch(() => {});
            await page.waitForTimeout(100);
            expandedForStatus = true;
        }

        if (expandedForStatus) {
            updatedCards = mergeCards(updatedCards, await extractVisibleTweetCards(page));
        }
    }

    return updatedCards;
}

async function collectConversationCards(page: Page, rootStatusId: string, maxScrolls: number): Promise<InternalTweetCard[]> {
    let cards = await extractVisibleTweetCards(page);
    let previousCount = cards.length;
    let stalledIterations = 0;

    for (let attempt = 0; attempt < maxScrolls; attempt += 1) {
        const rootCard = cards.find((card) => card.statusId === rootStatusId);
        if (rootCard) {
            const anchor = page.locator(`a[href*="/status/${rootStatusId}"]`).first();
            await anchor.scrollIntoViewIfNeeded().catch(() => {});
        }

        await page.mouse.wheel(0, 1_400);
        await page.waitForTimeout(850);

        const nextCards = await extractVisibleTweetCards(page);
        cards = mergeCards(cards, nextCards);

        if (cards.length === previousCount) {
            stalledIterations += 1;
        } else {
            stalledIterations = 0;
            previousCount = cards.length;
        }

        if (stalledIterations >= 2) break;
    }

    const rootCard = cards.find((card) => card.statusId === rootStatusId);
    if (!rootCard) {
        return cards;
    }

    const threadCards = selectThreadCards(cards, rootCard);
    return expandThreadTextForStatusIds(page, cards, [rootCard.statusId, ...threadCards.map((card) => card.statusId)]);
}

async function extractSingleReferencedPost(context: BrowserContext, url: string, navTimeoutMs: number): Promise<XThreadPost | null> {
    const parsed = parseXStatusUrl(url);
    if (!parsed) return null;

    const page = await context.newPage();
    page.setDefaultNavigationTimeout(navTimeoutMs);
    page.setDefaultTimeout(navTimeoutMs);

    try {
        await page.goto(parsed.canonicalUrl, { waitUntil: "domcontentloaded", timeout: navTimeoutMs });
        const state = await waitForTweetSurface(page, navTimeoutMs);
        if (!state.ready) return null;
        const cards = await extractVisibleTweetCards(page);
        const match = cards.find((card) => card.statusId === parsed.statusId) || cards[0];
        return match ? toThreadPost(match) : null;
    } catch {
        return null;
    } finally {
        await page.close().catch(() => {});
    }
}

function dedupePosts(posts: XThreadPost[]): XThreadPost[] {
    const seen = new Set<string>();
    return posts.filter((post) => {
        if (seen.has(post.statusId)) return false;
        seen.add(post.statusId);
        return true;
    });
}

function buildUserMap(includes: XApiResponse["includes"]): Map<string, XApiUser> {
    return new Map((includes?.users || []).map((user) => [user.id, user]));
}

function buildMediaMap(includes: XApiResponse["includes"]): Map<string, XApiMedia> {
    return new Map((includes?.media || []).map((media) => [media.media_key, media]));
}

function mapApiMediaType(type: string | undefined): XPostMedia["type"] {
    if (type === "photo") return "image";
    if (type === "video") return "video";
    if (type === "animated_gif") return "gif";
    return "unknown";
}

function buildApiPost(
    tweet: XApiTweet,
    userMap: Map<string, XApiUser>,
    mediaMap: Map<string, XApiMedia>,
    fallbackUsername?: string,
): XThreadPost {
    const user = tweet.author_id ? userMap.get(tweet.author_id) : undefined;
    const username = user?.username || fallbackUsername || "unknown";

    const links = (tweet.entities?.urls || [])
        .map((item) => item.expanded_url || item.url)
        .filter((value): value is string => Boolean(value));

    const media = (tweet.attachments?.media_keys || [])
        .map((key) => mediaMap.get(key))
        .filter((value): value is XApiMedia => Boolean(value))
        .map((item) => ({
            type: mapApiMediaType(item.type),
            url: item.url || item.preview_image_url,
            alt: item.alt_text || null,
        }));

    return {
        statusId: tweet.id,
        url: `https://x.com/${username}/status/${tweet.id}`,
        author: {
            username,
            displayName: user?.name || null,
        },
        text: tweet.text,
        publishedAt: tweet.created_at || null,
        links,
        media,
    };
}

function sortPostsByCreatedAt(posts: XThreadPost[]): XThreadPost[] {
    return [...posts].sort((left, right) => {
        const leftTime = left.publishedAt ? Date.parse(left.publishedAt) : 0;
        const rightTime = right.publishedAt ? Date.parse(right.publishedAt) : 0;
        return leftTime - rightTime;
    });
}

function isOlderThanDays(value: string | null | undefined, days: number): boolean {
    if (!value) return false;
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) return false;
    return Date.now() - timestamp > days * 24 * 60 * 60 * 1000;
}

async function extractXPostThreadViaApi(parsed: ParsedXStatusUrl): Promise<XThreadExtraction | null> {
    const authStrategies = resolveXApiAuthStrategies();
    if (authStrategies.length === 0) return null;

    const failures: string[] = [];
    for (const authStrategy of authStrategies) {
        try {
            const result = await extractXPostThreadViaApiWithAuth(parsed, authStrategy);
            if (failures.length > 0) {
                result.warnings.unshift(`Recovered via X API ${authStrategy.label} after earlier auth attempts failed.`);
                result.warnings.push(...failures);
            }
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            failures.push(`X API ${authStrategy.label} failed: ${message}`);
        }
    }

    throw new Error(failures.join(" "));
}

async function extractXPostThreadViaApiWithAuth(
    parsed: ParsedXStatusUrl,
    authStrategy: XApiAuthStrategy,
): Promise<XThreadExtraction> {
    const warnings: string[] = [];

    const rootParams = new URLSearchParams({
        expansions: "author_id,attachments.media_keys",
        "tweet.fields": "attachments,author_id,conversation_id,created_at,entities,referenced_tweets",
        "user.fields": "name,username",
        "media.fields": "preview_image_url,type,url,alt_text",
    });

    const rootResponse = await fetchXApiJson(`/tweets/${parsed.statusId}`, rootParams, authStrategy);
    const rootTweet = Array.isArray(rootResponse.data) ? rootResponse.data[0] : rootResponse.data;
    if (!rootTweet) {
        throw new Error("X API did not return the requested post.");
    }

    const rootUserMap = buildUserMap(rootResponse.includes);
    const rootMediaMap = buildMediaMap(rootResponse.includes);
    const rootPost = buildApiPost(rootTweet, rootUserMap, rootMediaMap, parsed.username);
    const author = rootPost.author;

    let threadPosts: XThreadPost[] = [];
    const conversationId = rootTweet.conversation_id || rootTweet.id;
    if (conversationId && author.username) {
        try {
            const searchParams = new URLSearchParams({
                query: `conversation_id:${conversationId} from:${author.username} -is:retweet`,
                expansions: "author_id,attachments.media_keys",
                "tweet.fields": "attachments,author_id,conversation_id,created_at,entities,referenced_tweets",
                "user.fields": "name,username",
                "media.fields": "preview_image_url,type,url,alt_text",
                max_results: "100",
            });

            const searchResponse = await fetchXApiJson("/tweets/search/recent", searchParams, authStrategy);
            const conversationTweets = Array.isArray(searchResponse.data) ? searchResponse.data : [];
            const searchUserMap = buildUserMap(searchResponse.includes);
            const searchMediaMap = buildMediaMap(searchResponse.includes);

            threadPosts = sortPostsByCreatedAt(
                dedupePosts(
                    conversationTweets
                        .filter((tweet) => tweet.id !== rootTweet.id)
                        .map((tweet) => buildApiPost(tweet, searchUserMap, searchMediaMap, author.username)),
                ),
            );

            if ((searchResponse.meta?.result_count || 0) === 0) {
                warnings.push("X API recent search returned no same-author thread posts for this conversation.");
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            warnings.push(`X API thread expansion failed: ${message}`);
        }
    }

    if (isOlderThanDays(rootPost.publishedAt, 7)) {
        warnings.push("This post is older than 7 days, so X API recent-search thread reconstruction may be incomplete.");
    }

    let contextPosts: XThreadPost[] = [];
    const referencedIds = (rootTweet.referenced_tweets || [])
        .filter((item) => item.type === "replied_to" || item.type === "quoted")
        .map((item) => item.id);

    if (referencedIds.length > 0) {
        try {
            const lookupParams = new URLSearchParams({
                ids: referencedIds.join(","),
                expansions: "author_id,attachments.media_keys",
                "tweet.fields": "attachments,author_id,conversation_id,created_at,entities,referenced_tweets",
                "user.fields": "name,username",
                "media.fields": "preview_image_url,type,url,alt_text",
            });
            const lookupResponse = await fetchXApiJson("/tweets", lookupParams, authStrategy);
            const lookupTweets = Array.isArray(lookupResponse.data) ? lookupResponse.data : [];
            const lookupUserMap = buildUserMap(lookupResponse.includes);
            const lookupMediaMap = buildMediaMap(lookupResponse.includes);
            const postById = new Map(
                lookupTweets.map((tweet) => [tweet.id, buildApiPost(tweet, lookupUserMap, lookupMediaMap)]),
            );
            contextPosts = referencedIds
                .map((id) => postById.get(id))
                .filter((value): value is XThreadPost => Boolean(value));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            warnings.push(`X API context lookup failed: ${message}`);
        }
    }

    const result: XThreadExtraction = {
        sourceUrl: parsed.sourceUrl,
        canonicalUrl: parsed.canonicalUrl,
        statusId: parsed.statusId,
        author,
        rootPost,
        threadPosts,
        contextPosts,
        combinedText: "",
        combinedMarkdown: "",
        warnings,
        authState: "ok",
    };

    result.combinedText = buildCombinedText(result);
    result.combinedMarkdown = buildCombinedMarkdown(result);
    return result;
}

function buildCombinedText(result: {
    canonicalUrl: string;
    author?: XPostAuthor;
    rootPost: XThreadPost | null;
    threadPosts: XThreadPost[];
    contextPosts: XThreadPost[];
    warnings: string[];
    authState: XAuthState;
}): string {
    const lines: string[] = [
        "X THREAD CONTEXT",
        `Source: ${result.canonicalUrl}`,
        `Auth State: ${result.authState}`,
    ];

    if (result.author?.username) {
        lines.push(`Author: @${result.author.username}${result.author.displayName ? ` (${result.author.displayName})` : ""}`);
    }

    lines.push("");
    lines.push("Root Post:");
    if (result.rootPost) {
        lines.push(renderPlainPost(result.rootPost));
    } else {
        lines.push("(Unavailable)");
    }

    if (result.threadPosts.length > 0) {
        lines.push("");
        lines.push("Same-Author Thread Posts:");
        for (const post of result.threadPosts) {
            lines.push(renderPlainPost(post));
        }
    }

    if (result.contextPosts.length > 0) {
        lines.push("");
        lines.push("Context Posts:");
        for (const post of result.contextPosts) {
            lines.push(renderPlainPost(post));
        }
    }

    if (result.warnings.length > 0) {
        lines.push("");
        lines.push("Warnings:");
        for (const warning of result.warnings) {
            lines.push(`- ${warning}`);
        }
    }

    return lines.join("\n").trim();
}

function renderPlainPost(post: XThreadPost): string {
    const metadata = [`@${post.author.username}`, post.url];
    if (post.publishedAt) metadata.push(post.publishedAt);
    return `- ${metadata.join(" | ")}\n  ${post.text || "(No text captured)"}`;
}

function renderMarkdownPost(post: XThreadPost): string {
    const parts = [`[@${post.author.username}](${post.url})`];
    if (post.author.displayName) {
        parts.push(post.author.displayName);
    }
    if (post.publishedAt) {
        parts.push(post.publishedAt);
    }

    const links = post.links.length > 0 ? `\n  - Links: ${post.links.join(", ")}` : "";
    const media = post.media.length > 0
        ? `\n  - Media: ${post.media.map((item) => item.type + (item.url ? ` (${item.url})` : "")).join(", ")}`
        : "";

    return `- ${parts.join(" | ")}\n  - Text: ${post.text || "(No text captured)"}${links}${media}`;
}

function buildCombinedMarkdown(result: {
    canonicalUrl: string;
    author?: XPostAuthor;
    rootPost: XThreadPost | null;
    threadPosts: XThreadPost[];
    contextPosts: XThreadPost[];
    warnings: string[];
    authState: XAuthState;
}): string {
    const lines: string[] = [
        "## X THREAD CONTEXT",
        `- Source: ${result.canonicalUrl}`,
        `- Auth State: ${result.authState}`,
    ];

    if (result.author?.username) {
        lines.push(`- Author: @${result.author.username}${result.author.displayName ? ` (${result.author.displayName})` : ""}`);
    }

    lines.push("");
    lines.push("### Root Post");
    lines.push(result.rootPost ? renderMarkdownPost(result.rootPost) : "- (Unavailable)");

    if (result.threadPosts.length > 0) {
        lines.push("");
        lines.push("### Same-Author Thread Posts");
        lines.push(...result.threadPosts.map(renderMarkdownPost));
    }

    if (result.contextPosts.length > 0) {
        lines.push("");
        lines.push("### Context Posts");
        lines.push(...result.contextPosts.map(renderMarkdownPost));
    }

    if (result.warnings.length > 0) {
        lines.push("");
        lines.push("### Warnings");
        lines.push(...result.warnings.map((warning) => `- ${warning}`));
    }

    return lines.join("\n").trim();
}

function buildFailedExtraction(parsed: ParsedXStatusUrl, authState: XAuthState, warnings: string[], error?: string): XThreadExtraction {
    const result: XThreadExtraction = {
        sourceUrl: parsed.sourceUrl,
        canonicalUrl: parsed.canonicalUrl,
        statusId: parsed.statusId,
        author: parsed.username ? { username: parsed.username } : undefined,
        rootPost: null,
        threadPosts: [],
        contextPosts: [],
        combinedText: "",
        combinedMarkdown: "",
        warnings,
        authState,
        error,
    };

    result.combinedText = buildCombinedText(result);
    result.combinedMarkdown = buildCombinedMarkdown(result);
    return result;
}

export function formatXThreadContextBlock(extraction: XThreadExtraction): string {
    return `${extraction.combinedMarkdown}\n`;
}

export async function openXAuthSession(): Promise<{ context: BrowserContext; page: Page; profileDir: string }> {
    const session = await openXBrowserSession("https://x.com/home", true);
    const { context, page, config } = session;
    await page.goto("https://x.com/home", { waitUntil: "domcontentloaded", timeout: config.navTimeoutMs }).catch(async () => {
        await page.goto("https://x.com/i/flow/login", { waitUntil: "domcontentloaded", timeout: config.navTimeoutMs });
    });
    return { context, page, profileDir: config.profileDir };
}

export function buildPreferredExtractionModes(headed: boolean): Array<"browser" | "api"> {
    return headed ? ["browser"] : ["browser", "api"];
}

function isSuccessfulExtraction(result: XThreadExtraction): boolean {
    return result.authState === "ok" && Boolean(result.rootPost);
}

function mergeWarnings(...groups: string[][]): string[] {
    const merged: string[] = [];
    const seen = new Set<string>();

    for (const group of groups) {
        for (const warning of group) {
            if (!warning || seen.has(warning)) continue;
            seen.add(warning);
            merged.push(warning);
        }
    }

    return merged;
}

async function extractXPostThreadViaBrowser(parsed: ParsedXStatusUrl, headed: boolean): Promise<XThreadExtraction> {
    const warnings: string[] = [];
    const session = await openXBrowserSession(parsed.canonicalUrl, headed);
    const { context, config } = session;

    try {
        const page = session.page;
        await page.goto(parsed.canonicalUrl, {
            waitUntil: "domcontentloaded",
            timeout: config.navTimeoutMs,
        });

        const surface = await waitForTweetSurface(page, config.navTimeoutMs);
        if (!surface.ready) {
            const lowered = surface.bodyText.toLowerCase();
            if (surface.authState === "reauth_required") {
                warnings.push("X requires a logged-in browser session. Run `npm run x:auth` to refresh the dedicated profile.");
            } else if (surface.authState === "blocked") {
                warnings.push("X blocked or rate-limited the automated session before the post could be read.");
            } else if (lowered.includes("this post is unavailable")) {
                warnings.push("The target post appears to be unavailable.");
            } else {
                warnings.push("The target post did not render before the navigation timeout.");
            }

            return buildFailedExtraction(parsed, surface.authState, warnings);
        }

        const cards = await collectConversationCards(page, parsed.statusId, config.maxScrolls);
        if (cards.length === 0) {
            warnings.push("The conversation rendered, but no tweet cards could be extracted from the DOM.");
            return buildFailedExtraction(parsed, "ok", warnings, "No tweet cards were extracted.");
        }

        const rootCard = cards.find((card) => card.statusId === parsed.statusId);
        if (!rootCard) {
            warnings.push("The root post did not appear in the visible conversation cards.");
            return buildFailedExtraction(parsed, "ok", warnings, "Root post was not present in extracted cards.");
        }

        const threadPosts = selectThreadPosts(cards, rootCard);

        let contextPosts = selectContextPosts(cards, rootCard);

        if (contextPosts.length === 0 && rootCard.referencedStatusUrls.length > 0) {
            const quotedContext = await extractSingleReferencedPost(context, rootCard.referencedStatusUrls[0], config.navTimeoutMs);
            if (quotedContext) {
                contextPosts = [quotedContext];
            } else {
                warnings.push("A referenced quote post was detected, but its context could not be resolved.");
            }
        }

        const result: XThreadExtraction = {
            sourceUrl: parsed.sourceUrl,
            canonicalUrl: parsed.canonicalUrl,
            statusId: parsed.statusId,
            author: rootCard.author,
            rootPost: toThreadPost(rootCard),
            threadPosts: dedupePosts(threadPosts),
            contextPosts: dedupePosts(contextPosts),
            combinedText: "",
            combinedMarkdown: "",
            warnings,
            authState: "ok",
        };

        if (result.threadPosts.length === 0) {
            warnings.push("No additional same-author thread continuation posts were visible on the page.");
        }

        if (
            result.contextPosts.length === 0 &&
            rootCard.rawText.toLowerCase().includes("replying to")
        ) {
            warnings.push("The root post looks like a reply, but direct parent context was not visible.");
        }

        result.combinedText = buildCombinedText(result);
        result.combinedMarkdown = buildCombinedMarkdown(result);

        extractionCache.set(parsed.canonicalUrl, {
            expiresAt: Date.now() + EXTRACTION_CACHE_TTL_MS,
            result: cloneExtraction(result),
        });

        return result;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warnings.push("Extraction failed before the thread could be normalized.");
        return buildFailedExtraction(parsed, "blocked", warnings, message);
    } finally {
        await session.close().catch(() => {});
    }
}

export async function extractXPostThread(input: XThreadExtractorInput): Promise<XThreadExtraction> {
    const parsed = parseXStatusUrl(input.url);
    if (!parsed) {
        throw new Error("Expected an x.com or twitter.com status URL.");
    }

    const cached = extractionCache.get(parsed.canonicalUrl);
    if (!input.headed && cached && cached.expiresAt > Date.now()) {
        return cloneExtraction(cached.result);
    }

    const extractionModes = buildPreferredExtractionModes(Boolean(input.headed));
    const fallbackWarnings: string[] = [];
    let browserFailure: XThreadExtraction | null = null;

    for (const mode of extractionModes) {
        if (mode === "browser") {
            const browserResult = await extractXPostThreadViaBrowser(parsed, Boolean(input.headed));
            if (isSuccessfulExtraction(browserResult)) {
                return browserResult;
            }

            browserFailure = browserResult;
            fallbackWarnings.push(...browserResult.warnings);
            if (extractionModes.includes("api")) {
                fallbackWarnings.push("Falling back to X API extraction after browser extraction failed.");
            }
            continue;
        }

        try {
            const apiResult = await extractXPostThreadViaApi(parsed);
            if (!apiResult) continue;

            apiResult.warnings = mergeWarnings(fallbackWarnings, apiResult.warnings);
            apiResult.combinedText = buildCombinedText(apiResult);
            apiResult.combinedMarkdown = buildCombinedMarkdown(apiResult);

            extractionCache.set(parsed.canonicalUrl, {
                expiresAt: Date.now() + EXTRACTION_CACHE_TTL_MS,
                result: cloneExtraction(apiResult),
            });
            return apiResult;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            fallbackWarnings.push(`X API extraction failed: ${message}`);
        }
    }

    if (browserFailure) {
        browserFailure.warnings = mergeWarnings(browserFailure.warnings, fallbackWarnings);
        browserFailure.combinedText = buildCombinedText(browserFailure);
        browserFailure.combinedMarkdown = buildCombinedMarkdown(browserFailure);
        return browserFailure;
    }

    return buildFailedExtraction(parsed, "blocked", fallbackWarnings, "No extraction mode succeeded.");
}
