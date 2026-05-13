import assert from "node:assert/strict";
import test from "node:test";
import {
    buildManualXAuthChromeLaunchArgs,
    buildXAuthProfileLockPaths,
    buildPreferredExtractionModes,
    buildVisibleTweetCardsScript,
    buildXOAuth1AuthorizationHeader,
    type InternalTweetCard,
    mergeCards,
    parseLooseEnvContent,
    resolveXBrowserSessionMode,
    resolveXApiAuthStrategies,
    resolveXBrowserHeadless,
    selectThreadCards,
} from "./xThreadExtractor";

function createCard(
    statusId: string,
    domOrder: number,
    overrides: Partial<InternalTweetCard> = {},
): InternalTweetCard {
    return {
        statusId,
        domOrder,
        url: `https://x.com/heynavtoor/status/${statusId}`,
        author: {
            username: "heynavtoor",
            displayName: "Nav Toor",
        },
        text: `text-${statusId}`,
        rawText: `raw-${statusId}`,
        publishedAt: null,
        links: [],
        media: [],
        referencedStatusUrls: [],
        ...overrides,
    };
}

test("buildXOAuth1AuthorizationHeader produces a deterministic signature for fixed inputs", () => {
    const header = buildXOAuth1AuthorizationHeader({
        method: "POST",
        url: "https://api.twitter.com/1.1/statuses/update.json",
        query: new URLSearchParams({
            include_entities: "true",
            status: "Hello Ladies + Gentlemen, a signed OAuth request!",
        }),
        credentials: {
            consumerKey: "xvz1evFS4wEEPTGEFPHBog",
            consumerSecret: "kAcSOqF21Fu85lZtJ7H0VbR4nmqYjKe9a2Qx9vK7M",
            accessToken: "370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb",
            accessTokenSecret: "LswwdoUaIvS3Di4X2vO4tA0A7TtbbgY6x3nP6d3A",
        },
        nonce: "kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg",
        timestamp: "1318622958",
    });

    assert.match(header, /^OAuth /);
    assert.match(header, /oauth_signature_method="HMAC-SHA1"/);
    assert.match(header, /oauth_version="1.0"/);
    assert.match(header, /oauth_consumer_key="xvz1evFS4wEEPTGEFPHBog"/);
    assert.match(header, /oauth_token="370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb"/);
    assert.match(header, /oauth_signature="Wr6n%2FikbHvKc8c2eXZf%2BN9MIRQ8%3D"/);
});

test("resolveXApiAuthStrategies prefers bearer auth first and accepts the legacy typo for token secret", () => {
    const strategies = resolveXApiAuthStrategies({
        NODE_ENV: "test",
        X_BEARER_TOKEN: "bearer-token",
        X_ACCESS_TOKEN: "access-token",
        X_ACCESS_SECRECT: "legacy-secret",
        X_CONSUMER_KEY: "consumer-key",
        X_KEY_SECRET: "consumer-secret",
    });

    assert.deepEqual(
        strategies.map((strategy) => strategy.kind),
        ["bearer", "oauth1"],
    );
});

test("resolveXApiAuthStrategies tolerates embedded access-token keys and X_TOKEN_SECRET aliases", () => {
    const strategies = resolveXApiAuthStrategies({
        NODE_ENV: "test",
        X_BEARER_TOKEN: "bearer-token",
        "X_ACCESS_TOKEN:legacy-access-token": "",
        X_CONSUMER_KEY: "consumer-key",
        X_KEY_SECRET: "consumer-secret",
        X_TOKEN_SECRET: "token-secret",
    });

    assert.deepEqual(
        strategies.map((strategy) => strategy.kind),
        ["bearer", "oauth1"],
    );
});

test("parseLooseEnvContent accepts legacy colon-separated entries", () => {
    const parsed = parseLooseEnvContent(`
X_ACCESS_TOKEN: legacy-access-token
X_TOKEN_SECRET=legacy-token-secret
# comment
    `);

    assert.equal(parsed.X_ACCESS_TOKEN, "legacy-access-token");
    assert.equal(parsed.X_TOKEN_SECRET, "legacy-token-secret");
});

test("buildManualXAuthChromeLaunchArgs uses the dedicated profile and opens X home in a new window", () => {
    const args = buildManualXAuthChromeLaunchArgs("/tmp/mission-control-x-profile");

    assert.deepEqual(args, [
        "--user-data-dir=/tmp/mission-control-x-profile",
        "--remote-debugging-address=127.0.0.1",
        "--remote-debugging-port=9333",
        "--no-first-run",
        "--no-default-browser-check",
        "--new-window",
        "https://x.com/home",
    ]);
});

test("buildVisibleTweetCardsScript is plain browser javascript without ts helper references", () => {
    const script = buildVisibleTweetCardsScript();

    assert.doesNotMatch(script, /__name/);
    assert.match(script, /article\[data-testid="tweet"\]/);
    assert.match(script, /tweetText/);
});

test("buildPreferredExtractionModes makes browser the default path for automatic extraction", () => {
    assert.deepEqual(buildPreferredExtractionModes(false), ["browser", "api"]);
    assert.deepEqual(buildPreferredExtractionModes(true), ["browser"]);
});

test("resolveXBrowserHeadless defaults to headed mode unless explicitly enabled", () => {
    assert.equal(resolveXBrowserHeadless({ NODE_ENV: "test" }), false);
    assert.equal(resolveXBrowserHeadless({ NODE_ENV: "test", X_BROWSER_HEADLESS: "true" }), true);
    assert.equal(resolveXBrowserHeadless({ NODE_ENV: "test", X_BROWSER_HEADLESS: "false" }), false);
});

test("buildXAuthProfileLockPaths returns the Chrome singleton lock files for a profile dir", () => {
    assert.deepEqual(buildXAuthProfileLockPaths("/tmp/mission-control-x-profile"), [
        "/tmp/mission-control-x-profile/SingletonLock",
        "/tmp/mission-control-x-profile/SingletonCookie",
        "/tmp/mission-control-x-profile/SingletonSocket",
    ]);
});

test("resolveXBrowserSessionMode prefers attaching to an existing CDP session before launching another headed browser", () => {
    assert.equal(
        resolveXBrowserSessionMode({
            headless: false,
            executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            cdpEndpointReady: true,
            profileLocked: true,
        }),
        "attach_existing",
    );
});

test("resolveXBrowserSessionMode blocks headed launches when the profile is locked without a reusable CDP session", () => {
    assert.equal(
        resolveXBrowserSessionMode({
            headless: false,
            executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            cdpEndpointReady: false,
            profileLocked: true,
        }),
        "blocked_by_profile_lock",
    );
});

test("mergeCards preserves discovery order when later viewport snapshots restart domOrder from zero", () => {
    const merged = mergeCards(
        [
            createCard("root", 0),
            createCard("one", 1),
            createCard("two", 2, { text: "short", rawText: "short" }),
        ],
        [
            createCard("eight", 0),
            createCard("nine", 1),
            createCard("two", 2, { text: "this is the longer expanded text", rawText: "this is the longer expanded text" }),
        ],
    );

    assert.deepEqual(
        merged.map((card) => card.statusId),
        ["root", "one", "two", "eight", "nine"],
    );
    assert.equal(merged.find((card) => card.statusId === "two")?.text, "this is the longer expanded text");
    assert.deepEqual(
        merged.map((card) => card.domOrder),
        [0, 1, 2, 3, 4],
    );
});

test("selectThreadCards follows the direct self-reply chain and skips unrelated later same-author replies", () => {
    const rootCard = createCard("2035318024623014019", 0);
    const firstReply = createCard("2035318036983640108", 1, {
        referencedStatusUrls: ["https://x.com/heynavtoor/status/2035318024623014019"],
    });
    const unrelatedReply = createCard("9999999999999999999", 2, {
        referencedStatusUrls: ["https://x.com/heynavtoor/status/1234567890123456789"],
    });
    const secondReply = createCard("2035318048966730234", 3, {
        referencedStatusUrls: ["https://x.com/heynavtoor/status/2035318036983640108"],
    });
    const thirdReply = createCard("2035318060853445000", 4, {
        referencedStatusUrls: ["https://x.com/heynavtoor/status/2035318048966730234"],
    });

    const selected = selectThreadCards(
        [rootCard, firstReply, unrelatedReply, secondReply, thirdReply],
        rootCard,
    );

    assert.deepEqual(
        selected.map((card) => card.statusId),
        ["2035318036983640108", "2035318048966730234", "2035318060853445000"],
    );
});
