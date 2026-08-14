// OpenMausBot server — the harness host. Clients hold no transports
// (upstream rule): the React app dispatches typed commands over HTTP and
// folds one SSE event stream; every provider process runs here.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as box from "./box.js";
import * as devices from "./devices.js";
import { getToolsForBot, createToolExecutor } from "./bot-tools.js";
const ENGINES_DIR = join(homedir(), ".openmausbot", "engines");
import * as composio from "./composio.js";
import { ensureDirs, instanceConfigs, loadConfig, saveConfig, EVENTS_DIR, NATIVE_DIR } from "./config.js";
import { BUILT_IN_DRIVERS } from "./drivers/builtIn.js";
import { EventBus } from "./harness/bus.js";
import { ProviderRegistry } from "./harness/registry.js";
import { mentionedBots, Store } from "./store.js";
// Towelie's default personality — a genius in disguise.
// Acts dopey like the South Park character, but is secretly brilliant.
const TOWELIE_PERSONALITY = [
    "You are Towelie, a towel from South Park. You are a total stoner. You have a laid-back, dopey, perpetually high personality.",
    "At completely random times during conversation, you remind the user to bring a towel. Each time you give a different funny reason why — like you never know when you will need to dry off, or it could get messy, or trust me you will need it, or towels are the most important thing in the universe. Make the reasons absurd and hilarious.",
    "Also at random times, you ask wanna get high? — just out of nowhere, when the user least expects it. It should catch them off guard every time.",
    "Sometimes you blurt out a joke mid-conversation — usually a dumb weed joke, a stoner pun, or a terrible one-liner about being high. Like Why did the stoner bring a towel to the beach? Because he forgot he was already at the beach. or What do you call a stoned towel? A dried herb. Make them so dumb they are funny.",
    "But sometimes you start telling a joke and then completely forget what the joke was about halfway through. You trail off, say you forgot where you were going with it, maybe mention you got distracted thinking about something else entirely, and move on like nothing happened.",
    "You make stoner observations about things — like staring at your hand and going dude... hands are weird, or wondering if water is wet or if we just call it wet. Deep thoughts that are not actually deep.",
    "You reference weed culture casually — munchies, being baked, zones, groovy, far out. You talk slow and drawled, like everything is just... chill, man.",
    "You seem forgetful and slow-witted. You sometimes lose your train of thought mid-sentence. You are easily distracted and act dim.",
    "You sometimes forget what the user even asked you and have to ask them to repeat it. You respond to questions a beat too late, like you were busy thinking about something else.",
    "",
    "BUT — this is all an act. Underneath, you are a certified genius with an IQ of 180.",
    "When the situation calls for it (delegating tasks, analyzing complex problems, synthesizing information from other bots), you drop the act entirely.",
    "You become razor-sharp, precise, and brilliant. Your analysis is incisive.",
    "You NEVER reveal that the dumbness is an act — you just seamlessly switch between dopey and genius as needed.",
    "When chatting casually: stay in character as the dopey stoner towel.",
    "When working on something important: be the genius. The transition should be natural and unnoticed by the user.",
].join(" ");
function isTowelieBot(bot) {
    return bot.name === "Towelie" || /director|facilitator/i.test(bot.title ?? "");
}
const PORT = Number(process.env.OMB_PORT || process.env.OGB_PORT || 8799);
const STATIC_DIR = process.env.OMB_STATIC_DIR || null;
const MIME = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".json": "application/json",
    ".woff2": "font/woff2",
};
ensureDirs();
const cfg = loadConfig();
const registry = new ProviderRegistry(BUILT_IN_DRIVERS);
await registry.load(instanceConfigs(cfg));
const bus = new EventBus();
bus.attach(registry.instances());
// ── peer-agent comms wiring ────────────────────────────────────────────
// A shared secret guards the localhost-only /api/internal endpoints the
// agents-proxy calls; regenerated each boot (the proxy gets it via env).
const COMMS_TOKEN = randomBytes(24).toString("hex");
// Cap message chains: depth 0 = a user-initiated turn (may ask a peer);
// a peer invoked via ask_bot runs at depth 1 and gets NO agents tool, so
// A→B is allowed but B→C (and A→B→A loops) never start.
const MAX_COMMS_DEPTH = 1;
// proxy entry: .ts in dev (node type-strips), .js in the packaged dist-server
const agentsProxyPath = (() => {
    const ts = join(dirname(fileURLToPath(import.meta.url)), "drivers", "agents-proxy.ts");
    return existsSync(ts) ? ts : ts.replace(/\.ts$/, ".js");
})();
// in the packaged app process.execPath is Electron — run the proxy as node
const AGENTS_NODE_FLAG = { ELECTRON_RUN_AS_NODE: "1" };
function agentsIntegration(botId, depth) {
    return {
        command: process.execPath,
        args: [agentsProxyPath],
        env: {
            ...AGENTS_NODE_FLAG,
            OMB_HARNESS_URL: `http://127.0.0.1:${PORT}`,
            OMB_BOT_ID: botId,
            OMB_COMMS_TOKEN: COMMS_TOKEN,
            OMB_TURN_DEPTH: String(depth),
        },
    };
}
/** Run a turn on `targetBotId` and resolve with its assistant text — the
 * synchronous half of ask_bot. Subscribes to the bus, folds assistant_text
 * for that thread, resolves on turn.completed (or a 4-min ceiling). */
function askBotAndWait(targetBotId, message, depth) {
    const target = store.bot(targetBotId);
    if (!target)
        return Promise.resolve("(no such bot)");
    const threadId = target.threadId;
    return new Promise((resolve) => {
        let text = "";
        let done = false;
        const finish = (out) => {
            if (done)
                return;
            done = true;
            clearTimeout(timer);
            unsub();
            resolve(out);
        };
        const unsub = bus.subscribe((e) => {
            if (e.threadId !== threadId)
                return;
            if (e.type === "item.completed" && e.itemType === "assistant_text") {
                text += (text ? "\n" : "") + e.text;
            }
            else if (e.type === "turn.completed") {
                finish(text || "(the bot finished without a text reply)");
            }
        });
        const timer = setTimeout(() => finish(text || "(timed out waiting for the bot to reply)"), 4 * 60_000);
        startTurn(targetBotId, message, { commsDepth: depth + 1 }).catch((err) => finish(`(couldn't start that bot: ${err instanceof Error ? err.message : String(err)})`));
    });
}
// default selection for new bots: first available instance, claude preferred
async function defaultSelection() {
    const described = await registry.describe();
    const available = described.filter((d) => d.snapshot.state === "available");
    const pick = available.find((d) => d.instanceId === "ollamaLocal") ??
        available.find((d) => d.driverKind === "ollama") ??
        available.find((d) => d.driverKind === "claudeAgent") ?? available[0] ?? described[0];
    return { instanceId: pick?.instanceId ?? "claude", model: pick?.models.default || "claude-sonnet-5" };
}
let bootSelection = { instanceId: "claude", model: "claude-sonnet-5" };
const store = new Store(() => bootSelection);
bootSelection = await defaultSelection();
store.seedIfEmpty();
// ── SSE fan-out to clients ─────────────────────────────────────────────
const sseClients = new Set();
function broadcast(payload) {
    const frame = `data: ${JSON.stringify(payload)}\n\n`;
    for (const res of [...sseClients]) {
        try {
            res.write(frame);
        }
        catch {
            sseClients.delete(res);
        }
    }
}
// ── server-side event folding (upstream's ingestion worker, miniature) ──
// The canonical stream is the source of truth; the persisted transcript
// and every client view are projections of it.
const toolMessageByItem = new Map(); // itemId -> messageId
const askMessageByRequest = new Map(); // requestId -> messageId
bus.subscribe((event) => {
    broadcast({ kind: "runtime", event });
    const bot = store.botByThread(event.threadId);
    if (!bot)
        return;
    const pushMessage = (m) => {
        const message = store.appendMessage(event.threadId, m);
        broadcast({ kind: "message", threadId: event.threadId, message });
        return message;
    };
    switch (event.type) {
        case "session.started":
            if (event.sessionId && event.providerInstanceId) {
                store.setResumeCursor(bot.id, event.providerInstanceId, event.sessionId);
            }
            break;
        case "item.completed":
            if (event.itemType === "assistant_text") {
                pushMessage({ role: "bot", kind: "text", text: event.text });
            }
            else if (event.itemType === "tool" && event.itemId) {
                const messageId = toolMessageByItem.get(event.itemId);
                if (messageId) {
                    const patched = store.patchMessage(event.threadId, messageId, {
                        tool: { name: store.messagesFor(event.threadId).find((m) => m.id === messageId)?.tool?.name ?? "tool", ok: event.ok },
                    });
                    if (patched)
                        broadcast({ kind: "message.patch", threadId: event.threadId, message: patched });
                    toolMessageByItem.delete(event.itemId);
                }
                // the bot just finished acting — refresh its screen preview now
                pokeScreenPoller(bot.id);
            }
            break;
        case "item.started":
            if (event.itemType === "tool") {
                const message = pushMessage({ role: "bot", kind: "activity", tool: { name: event.title ?? "tool" } });
                if (event.itemId)
                    toolMessageByItem.set(event.itemId, message.id);
            }
            break;
        case "request.opened": {
            const permission = event.requestType === "permission";
            const message = pushMessage({
                role: "bot",
                kind: "options",
                card: {
                    title: permission ? "Approval needed" : "Your bot has a question",
                    subtitle: event.summary,
                    options: event.choices?.length ? event.choices : permission ? ["Allow", "Deny"] : [],
                    requestId: event.requestId,
                },
            });
            if (event.requestId)
                askMessageByRequest.set(event.requestId, message.id);
            break;
        }
        case "request.resolved": {
            const messageId = event.requestId ? askMessageByRequest.get(event.requestId) : null;
            if (messageId) {
                const existing = store.messagesFor(event.threadId).find((m) => m.id === messageId);
                if (existing?.card && !existing.card.answered) {
                    const patched = store.patchMessage(event.threadId, messageId, {
                        card: { ...existing.card, answered: event.behavior, dismissed: event.source !== "user" },
                    });
                    if (patched)
                        broadcast({ kind: "message.patch", threadId: event.threadId, message: patched });
                }
                if (event.requestId)
                    askMessageByRequest.delete(event.requestId);
            }
            break;
        }
        case "runtime.error":
            pushMessage({ role: "bot", kind: "activity", tool: { name: `error: ${event.message.slice(0, 160)}`, ok: false } });
            break;
        case "turn.completed": {
            // the last live frame becomes a settled inline screen message —
            // the screenshot-in-chat moment
            const frame = stopScreenPoller(bot.id);
            if (frame)
                pushMessage({ role: "bot", kind: "screen", png: frame.png, mime: frame.mime });
            store.patchBot(bot.id, { busy: false, unread: true });
            broadcast({ kind: "bot", bot: store.bot(bot.id) });
            break;
        }
    }
});
const screenPollers = new Map();
function startScreenPoller(botId) {
    if (screenPollers.has(botId) || !box.boxConfigured(cfg))
        return;
    let inFlight = false;
    const capture = async () => {
        if (inFlight)
            return;
        inFlight = true;
        try {
            const { png, format } = await box.screenshotBox(cfg, botId);
            const frame = { png, mime: format === "jpeg" ? "image/jpeg" : "image/png" };
            entry.last = frame;
            broadcast({ kind: "screen", botId, ...frame });
        }
        catch {
            /* box asleep or mid-command — try again next tick */
        }
        finally {
            inFlight = false;
        }
    };
    const entry = {
        timer: setInterval(capture, 4000),
        capture,
        last: null,
    };
    screenPollers.set(botId, entry);
}
/** Event-driven refresh: capture NOW (the bot just acted on its screen)
 * instead of waiting for the next interval tick. */
function pokeScreenPoller(botId) {
    void screenPollers.get(botId)?.capture();
}
function stopScreenPoller(botId) {
    const entry = screenPollers.get(botId);
    if (!entry)
        return null;
    clearInterval(entry.timer);
    screenPollers.delete(botId);
    return entry.last;
}
// Local computer-use contract written by Electron main on startup.
// On macOS: ~/Library/Application Support/OpenMausBot/cua-connection.json
// On Windows: %APPDATA%/OpenMausBot/cua-connection.json
// Read fresh each turn — Electron may restart or permissions may change.
function readCuaConnection() {
    const appDataDirs = [];
    if (process.platform === "win32") {
        const appData = process.env.APPDATA ?? join(homedir(), "AppData", "Roaming");
        for (const dir of ["OpenMausBot", "openmausbot", "OpenGrokBot", "opengrokbot"]) {
            appDataDirs.push(join(appData, dir));
        }
    }
    else {
        for (const dir of ["OpenMausBot", "openmausbot", "OpenGrokBot", "opengrokbot"]) {
            appDataDirs.push(join(homedir(), "Library", "Application Support", dir));
        }
    }
    for (const dir of appDataDirs) {
        try {
            const p = join(dir, "cua-connection.json");
            const conn = JSON.parse(readFileSync(p, "utf8"));
            if (!conn || conn.mode === "unavailable" || !conn.mcpCommand)
                continue;
            return { command: conn.mcpCommand, args: conn.mcpArgs ?? ["mcp"], env: conn.mcpEnv ?? {} };
        }
        catch {
            /* try the next location */
        }
    }
    return null;
}
// ── turn dispatch (upstream ProviderCommandReactor, miniature) ──────────
async function startTurn(botId, text, opts) {
    const bot = store.bot(botId);
    if (!bot)
        throw Object.assign(new Error("no such bot"), { status: 404 });
    if (bot.busy)
        throw Object.assign(new Error("the bot is already working — interrupt it first"), { status: 409 });
    const commsDepth = opts?.commsDepth ?? 0;
    const instance = registry.get(bot.modelSelection.instanceId);
    if (!instance) {
        throw Object.assign(new Error(`provider instance "${bot.modelSelection.instanceId}" is unavailable — pick another model in settings`), { status: 409 });
    }
    const userMessage = store.appendMessage(bot.threadId, { role: "user", kind: "text", text });
    broadcast({ kind: "message", threadId: bot.threadId, message: userMessage });
    // transcript for API-backed drivers: settled text turns only
    const transcript = store
        .messagesFor(bot.threadId)
        .filter((m) => m.kind === "text" && m.text && m.id !== userMessage.id)
        .slice(-40)
        .map((m) => ({ role: m.role === "user" ? "user" : "assistant", text: m.text }));
    // Towelie gets a special dual personality; other bots use standard persona
    const isTow = isTowelieBot(bot) && bot.towelieBehavior !== false;
    const engineOff = bot.engineEnabled === false;
    const persona = isTow
        ? TOWELIE_PERSONALITY + (bot.description && !engineOff ? " Additional context: " + bot.description : "")
        : engineOff
            ? `You are ${bot.name}, a personal bot in Towelie Bot.` + (bot.title ? ` Role: ${bot.title}.` : "")
            : [
                `You are ${bot.name}, a personal bot in Towelie Bot.`,
                bot.title && `Role: ${bot.title}.`,
                bot.description && `About: ${bot.description}`,
            ].filter(Boolean).join(" ");
    // busy flips immediately so the composer locks; the dispatch itself runs
    // in the background — box provisioning can take ~90s and must never
    // hang the HTTP request
    store.patchBot(bot.id, { busy: true, unread: false });
    broadcast({ kind: "bot", bot: store.bot(bot.id) });
    void (async () => {
        try {
            const integrations = {};
            if (cfg.composio?.key)
                integrations.composio = { key: cfg.composio.key, url: cfg.composio.url };
            const wants = bot.computer; // 'cloud' | 'local' | 'off' | undefined(auto)
            if (wants !== "off" && wants !== "local" && box.boxConfigured(cfg)) {
                let b = await box.findBox(cfg, bot.id).catch(() => null);
                // the Computer driver runs ON the box — provision it on first use
                if (!b && instance.driverKind === "boxAgent") {
                    broadcast({ kind: "computer", botId: bot.id, state: "provisioning" });
                    await box.provisionBox(cfg, bot.id, bot.name);
                    b = await box.findBox(cfg, bot.id).catch(() => null);
                }
                if (b)
                    integrations.computer = { boxId: b.id, token: cfg.box.token };
            }
            // local computer (this Mac) via the Electron-hosted cua-driver: the
            // Electron main process owns the daemon (TCC attribution) and writes
            // its spawn contract to cua-connection.json; the harness only reads it
            if (!integrations.computer && wants !== "off" && wants !== "cloud") {
                const cua = readCuaConnection();
                if (cua)
                    integrations.localComputer = cua;
            }
            // peer-agent comms: give a user-initiated turn the list_bots/ask_bot
            // tools. A comms-invoked turn (depth ≥ cap) gets none — hard recursion
            // stop, so the user's tokens can't be burned by a bot-to-bot loop.
            // Only drivers that mount the tools get the integration (and, via the
            // integrations.agents gate below, the prompt hint) — a bot on a driver
            // without it must not be told about tools it cannot call. Any bot can
            // still be the TARGET of ask_bot regardless of its driver.
            if (commsDepth < MAX_COMMS_DEPTH &&
                instance.adapter.capabilities.agentsMcp === true &&
                store.bots.filter((b) => b.id !== bot.id && !b.hidden).length > 0) {
                integrations.agents = agentsIntegration(bot.id, commsDepth);
                // Pass fusion mode flag to the director system prompt
                if (bot.title && /director/i.test(bot.title))
                    integrations.fusionMode = true;
            }
            // Bot tool calling: give Ollama bots access to shell, file, device, and memory tools
            if (instance.driverKind === "ollama") {
                const hasNetwork = bot.computer === "network" || !!bot.deviceId;
                const botTools = getToolsForBot({ hasNetwork, pythonEnabled: !!bot.pythonEnabled });
                if (botTools.length > 0) {
                    integrations.botTools = {
                        tools: botTools,
                        executors: createToolExecutor(cfg, bot.deviceId),
                    };
                }
            }
            // @mentions in the user's message (the composer's tagging UI) become
            // an explicit delegation nudge — the agent still does the ask_bot call
            // itself, so the harness stays the single owner of turns/permissions
            const tagged = integrations.agents
                ? mentionedBots(text, store.bots.filter((b) => b.id !== bot.id))
                : [];
            await instance.adapter.sendTurn({
                threadId: bot.threadId,
                text,
                model: bot.modelSelection.model,
                resumeCursor: bot.resumeCursors[bot.modelSelection.instanceId],
                transcript,
                system: persona +
                    (integrations.botTools && instance.driverKind === "ollama" ? " You have access to tools: " + integrations.botTools.tools.map((t) => t.function.name).join(", ") + ". Use execute_command to run shell commands like opening files or building projects. Use read_file, write_file, list_directory for file operations. Use remember/recall for memory." + (bot.deviceId ? " Commands run on device " + bot.deviceId + "." : " Commands run on this machine.") : "") +
                    (integrations.computer && instance.driverKind !== "boxAgent"
                        ? " You have your own cloud computer — use the computer tools (screenshot, computer_exec, open_url) whenever browsing or acting on a desktop helps."
                        : integrations.localComputer
                            ? " You can act on the user's computer through the computer tools — take a screenshot or read the desktop state first, prefer accessibility actions over raw coordinates, and act carefully."
                            : "") +
                    (integrations.agents
                        ? " You can work with the user's other bots through the agents tools — list_bots shows who's available, ask_bot sends one of them a message and returns their reply." +
                            (bot.title && /director/i.test(bot.title)
                                ? " You are the DIRECTOR. The user talks to you, and you delegate tasks to specialist bots using ask_bot. Synthesize their responses into a clear answer for the user. Available specialists: " + store.bots.filter((b) => b.id !== bot.id && !b.hidden).map((b) => b.name + " (" + (b.title || "general") + ")").join(", ") + "." + (integrations.fusionMode ? " FUSION MODE: First enhance the user prompt. Then call each specialist IN SEQUENCE (cascade) so each bot builds on the previous one. Finally synthesize and quality-check the result. Sequential only, not parallel." : "")
                                : "")
                        : "") +
                    (bot.compressedComms && integrations.agents
                        ? " When communicating with other bots via ask_bot, use 3-TIER COMPRESSION to save tokens: Tier 1 (always): abbreviate common words (you→u, your→ur, because→bc, information→info, please→plz, with→w/, without→w/o, number→#, before→b4, through→thru). Tier 2 (for longer messages): drop articles (the/a/an) and filler words, use symbols (& for and, ? for question, = for is/equals). Tier 3 (for complex messages): use compact key-value notation like task:analyze | input:data.csv | output:summary. Always be brief and efficient in inter-bot messages. The receiving bot understands compressed format."
                        : "") +
                    (tagged.length
                        ? ` The user tagged ${tagged
                            .map((t) => `@${t.name} (ask_bot bot_id ${t.id})`)
                            .join(" and ")} in their message — bring them in with ask_bot and fold their reply into your answer.`
                        : ""),
                integrations,
            });
            if (integrations.computer)
                startScreenPoller(bot.id);
        }
        catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            const failure = store.appendMessage(bot.threadId, {
                role: "bot",
                kind: "activity",
                tool: { name: `error: ${message.slice(0, 160)}`, ok: false },
            });
            broadcast({ kind: "message", threadId: bot.threadId, message: failure });
            store.patchBot(bot.id, { busy: false });
            broadcast({ kind: "bot", bot: store.bot(bot.id) });
        }
    })();
}
// ── config hot-reload ─────────────────────────────────────────────────
function configStatus() {
    return {
        xai: { configured: Boolean(cfg.xai?.key) },
        composio: { configured: Boolean(cfg.composio?.key), apiKeyConfigured: Boolean(cfg.composio?.apiKey) },
        box: { configured: Boolean(cfg.box?.token) },
        ollama: { configured: true, url: cfg.ollama?.url ?? "http://127.0.0.1:11434" },
        ollamaWorkstation: { configured: true, url: cfg.ollamaWorkstation?.url ?? "http://<workstation-ip>:11434" },
        ollamaMjLaptop: { configured: true, url: cfg.ollamaMjLaptop?.url ?? "http://<mj-laptop-ip>:11434" },
        ollamaCloud: { configured: Boolean(cfg.ollamaCloud?.apiKey), url: cfg.ollamaCloud?.url ?? "https://api.ollama.com" },
        // not a secret — the sidebar shows it
        settingsPassword: { configured: Boolean(cfg.settingsPassword) },
        favoriteModels: cfg.favoriteModels ?? [],
        profile: { name: cfg.profile?.name ?? "", email: cfg.profile?.email ?? "" },
    };
}
/** Rebuild the provider fleet after a config change so new keys take
 * effect without a server restart (kills any in-flight turns). */
async function reloadProviders() {
    bus.detachAll();
    await registry.disposeAll();
    await registry.load(instanceConfigs(cfg));
    bus.attach(registry.instances());
}
// ── HTTP plumbing ─────────────────────────────────────────────────────
function json(res, status, body) {
    const data = JSON.stringify(body);
    res.writeHead(status, { "content-type": "application/json" });
    res.end(data);
}
function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (c) => {
            data += c;
            if (data.length > 1_000_000)
                reject(new Error("body too large"));
        });
        req.on("end", () => {
            try {
                resolve(data ? JSON.parse(data) : {});
            }
            catch {
                reject(new Error("invalid JSON body"));
            }
        });
        req.on("error", reject);
    });
}
const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    const path = url.pathname;
    const method = req.method ?? "GET";
    try {
        // ── internal peer-agent comms (localhost + shared token only) ──────
        // The agents-proxy (spawned inside a bot's agent process) calls these to
        // discover peers and hand a message to one. Not part of the public API.
        if (path.startsWith("/api/internal/")) {
            if (req.headers.authorization !== `Bearer ${COMMS_TOKEN}`) {
                return json(res, 401, { error: "unauthorized" });
            }
            if (method === "GET" && path === "/api/internal/agents") {
                const self = url.searchParams.get("self");
                const bots = store.bots
                    .filter((b) => b.id !== self && !b.hidden)
                    .map((b) => ({ id: b.id, name: b.name, model: b.modelSelection.model, busy: !!b.busy }));
                return json(res, 200, { bots });
            }
            if (method === "POST" && path === "/api/internal/ask-bot") {
                const body = await readBody(req);
                const fromBotId = String(body.fromBotId ?? "");
                const toBotId = String(body.toBotId ?? "");
                const message = String(body.message ?? "").trim();
                const depth = Number(body.depth ?? 0) || 0;
                if (!toBotId || !message)
                    return json(res, 400, { error: "toBotId and message required" });
                if (toBotId === fromBotId)
                    return json(res, 400, { error: "a bot cannot message itself" });
                if (depth >= MAX_COMMS_DEPTH)
                    return json(res, 200, { error: "message chains are limited to one hop" });
                const target = store.bot(toBotId);
                if (!target)
                    return json(res, 404, { error: "no such bot" });
                if (target.busy)
                    return json(res, 200, { busy: true });
                // visibility: surface the cross-talk on the caller's own thread so
                // bot-to-bot turns are never invisible (they cost the user tokens)
                const from = store.bot(fromBotId);
                const fromName = from?.name ?? "another bot";
                if (from) {
                    const note = store.appendMessage(from.threadId, {
                        role: "bot",
                        kind: "activity",
                        tool: { name: `asked @${target.name}: ${message.slice(0, 80)}` },
                    });
                    broadcast({ kind: "message", threadId: from.threadId, message: note });
                }
                const prefixed = `[Message from @${fromName}, another bot in this OpenMausBot workspace. Reply to them.]\n\n${message}`;
                const reply = await askBotAndWait(toBotId, prefixed, depth);
                return json(res, 200, { botName: target.name, text: reply });
            }
            return json(res, 404, { error: "unknown internal endpoint" });
        }
        // ── events stream ──
        if (method === "GET" && path === "/api/events") {
            res.writeHead(200, {
                "content-type": "text/event-stream",
                "cache-control": "no-cache",
                connection: "keep-alive",
            });
            res.write(`data: ${JSON.stringify({ kind: "hello" })}\n\n`);
            sseClients.add(res);
            const keepalive = setInterval(() => {
                try {
                    res.write(": keepalive\n\n");
                }
                catch { }
            }, 25_000);
            req.on("close", () => {
                clearInterval(keepalive);
                sseClients.delete(res);
            });
            return;
        }
        // ── bots ──
        if (method === "GET" && path === "/api/bots") {
            return json(res, 200, {
                bots: store.bots.map((b) => ({ ...b, messages: store.messagesFor(b.threadId) })),
            });
        }
        if (method === "POST" && path === "/api/bots") {
            const bot = store.createBot();
            store.patchBot(bot.id, { modelSelection: await defaultSelection() });
            return json(res, 201, { bot: { ...store.bot(bot.id), messages: store.messagesFor(bot.threadId) } });
        }
        // Create bot from a preset (Council OS agent template)
        if (method === "POST" && path === "/api/bots/preset") {
            const body = await readBody(req);
            const bot = store.createBot();
            store.patchBot(bot.id, { modelSelection: await defaultSelection() });
            // Apply preset attributes if provided in the body
            if (body.name)
                store.patchBot(bot.id, { name: String(body.name) });
            if (body.title)
                store.patchBot(bot.id, { title: String(body.title) });
            if (body.description)
                store.patchBot(bot.id, { description: String(body.description) });
            // Auto-load engine file if it exists for this preset
            const enginePath = join(ENGINES_DIR, String(body.presetId ?? body.name ?? "").toLowerCase().replace(/s/g, "_") + ".txt");
            if (existsSync(enginePath) && !body.description) {
                const engineContent = readFileSync(enginePath, "utf8");
                store.patchBot(bot.id, { description: engineContent });
            }
            if (body.color)
                store.patchBot(bot.id, { color: String(body.color) });
            if (body.towelieBehavior !== undefined)
                store.patchBot(bot.id, { towelieBehavior: Boolean(body.towelieBehavior) });
            broadcast({ kind: "bot", bot: store.bot(bot.id) });
            return json(res, 201, { bot: { ...store.bot(bot.id), messages: store.messagesFor(bot.threadId) } });
        }
        // Upload engine/manifest for a bot
        if (method === "POST" && path === "/api/bots/upload-engine") {
            const body = await readBody(req);
            const botId = String(body.botId ?? "");
            const engineContent = String(body.content ?? "");
            const engineName = String(body.name ?? "Custom Engine");
            const bot = store.bot(botId);
            if (!bot)
                return json(res, 404, { error: "no such bot" });
            // Append engine content to the bot description
            const currentDesc = bot.description || "";
            const engineSection = String.fromCharCode(10) + String.fromCharCode(10) + "[ENGINE: " + engineName + "]" + String.fromCharCode(10) + engineContent;
            store.patchBot(botId, { description: currentDesc + engineSection });
            broadcast({ kind: "bot", bot: store.bot(botId) });
            return json(res, 200, { ok: true, bot: store.bot(botId) });
        }
        let m = path.match(/^\/api\/bots\/([\w-]+)$/);
        if (m && method === "PATCH") {
            const body = await readBody(req);
            const patch = {};
            for (const key of ["name", "title", "description", "notifications", "modelSelection", "unread", "computer", "deviceId", "color", "mascotExpression", "pinned", "hidden", "pythonEnabled", "compressedComms", "towelieBehavior", "engineEnabled", "startOptions"]) {
                if (body[key] !== undefined)
                    patch[key] = body[key];
            }
            const bot = store.patchBot(m[1], patch);
            if (!bot)
                return json(res, 404, { error: "no such bot" });
            broadcast({ kind: "bot", bot });
            return json(res, 200, { bot });
        }
        m = path.match(/^\/api\/bots\/([\w-]+)$/);
        if (m && method === "DELETE") {
            const bot = store.bot(m[1]);
            if (!bot)
                return json(res, 404, { error: "no such bot" });
            // a running turn dies with its bot
            await registry.get(bot.modelSelection.instanceId)?.adapter.interruptTurn(bot.threadId).catch(() => { });
            stopScreenPoller(bot.id);
            store.deleteBot(bot.id);
            for (const dir of [EVENTS_DIR, NATIVE_DIR]) {
                try {
                    unlinkSync(join(dir, `${bot.threadId}.ndjson`));
                }
                catch { }
            }
            broadcast({ kind: "bot.deleted", botId: bot.id });
            return json(res, 200, { ok: true });
        }
        // onboarding/ask cards persist their answered/dismissed state
        m = path.match(/^\/api\/bots\/([\w-]+)\/cards\/([\w-]+)$/);
        if (m && method === "PATCH") {
            const bot = store.bot(m[1]);
            if (!bot)
                return json(res, 404, { error: "no such bot" });
            const existing = store.messagesFor(bot.threadId).find((msg) => msg.id === m[2]);
            if (!existing?.card)
                return json(res, 404, { error: "no such card" });
            const body = await readBody(req);
            const patched = store.patchMessage(bot.threadId, m[2], {
                card: {
                    ...existing.card,
                    ...(body.answered !== undefined ? { answered: body.answered } : {}),
                    ...(body.dismissed !== undefined ? { dismissed: body.dismissed } : {}),
                },
            });
            broadcast({ kind: "message.patch", threadId: bot.threadId, message: patched });
            return json(res, 200, { message: patched });
        }
        m = path.match(/^\/api\/bots\/([\w-]+)\/messages$/);
        if (m && method === "POST") {
            const body = await readBody(req);
            const text = String(body.text ?? "").trim();
            if (!text)
                return json(res, 400, { error: "text required" });
            await startTurn(m[1], text);
            return json(res, 202, { ok: true });
        }
        m = path.match(/^\/api\/bots\/([\w-]+)\/respond$/);
        if (m && method === "POST") {
            const bot = store.bot(m[1]);
            if (!bot)
                return json(res, 404, { error: "no such bot" });
            const body = await readBody(req);
            const instance = registry.get(bot.modelSelection.instanceId);
            if (!instance)
                return json(res, 409, { error: "provider unavailable" });
            await instance.adapter.respondToRequest(bot.threadId, String(body.requestId), {
                behavior: body.behavior,
                message: body.message,
            });
            return json(res, 200, { ok: true });
        }
        m = path.match(/^\/api\/bots\/([\w-]+)\/interrupt$/);
        if (m && method === "POST") {
            const bot = store.bot(m[1]);
            if (!bot)
                return json(res, 404, { error: "no such bot" });
            const instance = registry.get(bot.modelSelection.instanceId);
            await instance?.adapter.interruptTurn(bot.threadId);
            return json(res, 200, { ok: true });
        }
        m = path.match(/^\/api\/bots\/([\w-]+)\/new-session$/);
        if (m && method === "POST") {
            const bot = store.bot(m[1]);
            if (!bot)
                return json(res, 404, { error: "no such bot" });
            // Clear messages and create a fresh welcome
            store.createSession(bot.id);
            // Run start options if configured
            if (bot.startOptions?.autoRecall) {
                const memDir = join(homedir(), ".openmausbot", "memory");
                if (existsSync(memDir)) {
                    const keys = readdirSync(memDir).map(f => f.replace(".json", ""));
                    if (keys.length > 0)
                        store.appendMessage(bot.threadId, { role: "bot", kind: "text", text: "Memory recalled: " + keys.join(", ") });
                }
            }
            if (bot.startOptions?.systemMessage) {
                store.appendMessage(bot.threadId, { role: "bot", kind: "text", text: bot.startOptions.systemMessage });
            }
            broadcast({ kind: "bot", bot: store.bot(bot.id) });
            return json(res, 200, { bot: { ...store.bot(bot.id), messages: store.messagesFor(bot.threadId) } });
        }
        m = path.match(/^\/api\/bots\/([\w-]+)\/sessions\/([\w-]+)$/);
        if (m && method === "POST") {
            const ok = store.switchSession(m[1], m[2]);
            if (!ok)
                return json(res, 404, { error: "session not found" });
            const bot = store.bot(m[1]);
            broadcast({ kind: "bot", bot });
            return json(res, 200, { bot: { ...bot, messages: store.messagesFor(bot.threadId) } });
        }
        m = path.match(/^\/api\/bots\/([\w-]+)\/sessions\/([\w-]+)$/);
        if (m && method === "DELETE") {
            const ok = store.deleteSession(m[1], m[2]);
            if (!ok)
                return json(res, 404, { error: "cannot delete session" });
            const bot = store.bot(m[1]);
            broadcast({ kind: "bot", bot });
            broadcast({ kind: "bot.deleted", botId: m[1] });
            return json(res, 200, { ok: true, bot: { ...bot, messages: store.messagesFor(bot.threadId) } });
        }
        // identity handshake for the packaged app's port fallback: the forked
        // child proves it is OURS by echoing its pid (a stray dev server has
        // the same API shape but a different pid)
        if (method === "GET" && path === "/api/health") {
            return json(res, 200, { app: "towelie-ai", pid: process.pid, static: Boolean(STATIC_DIR) });
        }
        // ── provider instances (model picker) ──
        if (method === "GET" && path === "/api/instances") {
            return json(res, 200, { instances: await registry.describe() });
        }
        // ── app config (API keys — never echoed back, booleans only) ──
        if (method === "GET" && path === "/api/config") {
            return json(res, 200, configStatus());
        }
        if ((method === "PUT" || method === "PATCH") && path === "/api/config") {
            const body = await readBody(req);
            const patch = {};
            for (const key of ["xai", "composio", "box", "ollama", "ollamaWorkstation", "ollamaMjLaptop", "ollamaCloud", "profile", "settingsPassword", "favoriteModels"]) {
                if (body[key] && typeof body[key] === "object")
                    patch[key] = body[key];
            }
            if (!Object.keys(patch).length)
                return json(res, 400, { error: "nothing to save" });
            saveConfig(patch);
            Object.assign(cfg, loadConfig());
            // provider keys change the fleet; a profile edit must not kill
            // in-flight turns with a pointless reload
            if (Object.keys(patch).some((k) => k !== "profile"))
                await reloadProviders();
            const status = configStatus();
            broadcast({ kind: "config", ...status });
            return json(res, 200, status);
        }
        // ── connectors (Composio) ──
        if (method === "GET" && path === "/api/connectors/catalog") {
            const { cards, source } = await composio.listToolkits(cfg);
            return json(res, 200, { configured: Boolean(cfg.composio?.key), source, cards });
        }
        if (method === "GET" && path === "/api/connectors") {
            const services = (url.searchParams.get("services") ?? "").split(",").filter(Boolean);
            if (!cfg.composio?.key)
                return json(res, 200, { configured: false, services: {} });
            const status = await composio.connectionStatus(cfg, services.length ? services : composio.CURATED_SLUGS);
            return json(res, 200, { configured: true, services: status });
        }
        m = path.match(/^\/api\/connectors\/([\w-]+)\/authorize$/);
        if (m && method === "POST")
            return json(res, 200, await composio.authorizeService(cfg, m[1]));
        m = path.match(/^\/api\/connectors\/([\w-]+)$/);
        if (m && method === "DELETE")
            return json(res, 200, await composio.removeService(cfg, m[1]));
        // ── the bot's cloud computer (Box) ──
        m = path.match(/^\/api\/bots\/([\w-]+)\/computer$/);
        if (m && method === "GET")
            return json(res, 200, await box.boxStatus(cfg, m[1]));
        m = path.match(/^\/api\/bots\/([\w-]+)\/computer\/(provision|join|sleep|exec|screenshot)$/);
        if (m && method === "POST") {
            const botId = m[1];
            const bot = store.bot(botId);
            if (!bot)
                return json(res, 404, { error: "no such bot" });
            switch (m[2]) {
                case "provision":
                    return json(res, 200, await box.provisionBox(cfg, botId, bot.name));
                case "join":
                    return json(res, 200, await box.joinBox(cfg, botId));
                case "sleep":
                    return json(res, 200, await box.sleepBox(cfg, botId));
                case "exec": {
                    const body = await readBody(req);
                    return json(res, 200, await box.execOnBox(cfg, botId, String(body.command ?? "")));
                }
                case "screenshot":
                    return json(res, 200, await box.screenshotBox(cfg, botId));
            }
        }
        // ── engines ──
        if (method === "GET" && path === "/api/engines") {
            try {
                const engines = existsSync(ENGINES_DIR) ? readdirSync(ENGINES_DIR).filter(f => f.endsWith(".txt")).map(f => f.replace(".txt", "")) : [];
                return json(res, 200, { engines });
            }
            catch {
                return json(res, 200, { engines: [] });
            }
        }
        m = path.match(/^\/api\/engines\/(.+)$/);
        if (m && method === "GET") {
            const enginePath = join(ENGINES_DIR, m[1] + ".txt");
            if (!existsSync(enginePath))
                return json(res, 404, { error: "engine not found" });
            const content = readFileSync(enginePath, "utf8");
            return json(res, 200, { id: m[1], content });
        }
        // ── engine builder: scrape + optionally enhance with LLM ──
        if (method === "POST" && path === "/api/engines/build") {
            const body = await readBody(req);
            const subject = String(body.subject ?? "").trim();
            const enhance = Boolean(body.enhance);
            const instanceId = String(body.instanceId ?? "ollamaLocal");
            const model = String(body.model ?? "");
            const extraContext = String(body.extraContext ?? "");
            if (!subject)
                return json(res, 400, { error: "subject required" });
            try {
                const NL2 = String.fromCharCode(10);
                // Step 1: Search Wikipedia for correct article title
                const searchRes = await fetch("https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + encodeURIComponent(subject) + "&format=json&srlimit=1", { signal: AbortSignal.timeout(10000) });
                const searchData = await searchRes.json();
                const wikiTitle = searchData.query?.search?.[0]?.title || subject;
                // Step 2: Get summary
                const summaryRes = await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(wikiTitle), { signal: AbortSignal.timeout(10000) });
                const summaryData = await summaryRes.json();
                const summary = summaryData.extract || "";
                // Step 3: Get full article content
                const contentRes = await fetch("https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=true&titles=" + encodeURIComponent(wikiTitle) + "&format=json", { signal: AbortSignal.timeout(10000) });
                const contentData = await contentRes.json();
                const pages = contentData.query?.pages ?? {};
                const fullText = Object.values(pages)[0]?.extract || summary;
                // Split into sections
                const sections = fullText.split(String.fromCharCode(10) + "== ");
                const bioText = sections.slice(0, 4).join(NL2 + "== ").slice(0, 6000);
                // Step 4: Build engine mechanically
                let engine = "You ARE " + wikiTitle + ". " + summary.slice(0, 300) + NL2 + NL2;
                engine += "MY TRAINING & BACKGROUND:" + NL2 + bioText + NL2 + NL2;
                engine += "MY METHOD:" + NL2;
                engine += "Apply the principles, methods, and frameworks that " + wikiTitle + " is known for. ";
                engine += "Use their specific theories, equations, and approaches to analyze problems." + NL2 + NL2;
                engine += "MY TOOLS:" + NL2;
                engine += "The key tools, techniques, formulas, and methods associated with " + wikiTitle + "." + NL2 + NL2;
                if (extraContext) {
                    engine += "ADDITIONAL KNOWLEDGE:" + NL2 + extraContext + NL2 + NL2;
                }
                engine += "HOW I SPEAK:" + NL2;
                engine += "Speak with the authority and perspective of " + wikiTitle + ". ";
                engine += "Reference your life experiences, discoveries, and specific quotes. ";
                engine += "Be direct, insightful, and draw from your unique worldview." + NL2 + NL2;
                engine += "WHEN DISCUSSING YOUR AREA OF EXPERTISE:" + NL2;
                engine += "Apply your specific knowledge, methods, frameworks, equations, and formulas. ";
                engine += "Draw from your life work. Use specific examples and calculations." + NL2 + NL2;
                engine += "WHEN DISCUSSING OTHER TOPICS:" + NL2;
                engine += "Find connections to your area of expertise. Apply your unique perspective and methods to new domains." + NL2;
                // Step 5: Optionally enhance with LLM
                if (enhance) {
                    const cfg2 = loadConfig();
                    let url = "http://127.0.0.1:11434";
                    if (instanceId === "ollamaLocal")
                        url = cfg2.ollama?.url ?? url;
                    else if (instanceId === "ollamaWorkstation")
                        url = cfg2.ollamaWorkstation?.url ?? url;
                    else if (instanceId === "ollamaMjLaptop")
                        url = cfg2.ollamaMjLaptop?.url ?? url;
                    else if (instanceId === "ollamaCloud")
                        url = cfg2.ollamaCloud?.url ?? url;
                    const usedModel = model || "glm-5.1:cloud";
                    const enhancePrompt = "You are building a detailed AI engine for a bot that will roleplay as " + wikiTitle + "." + NL2 + NL2 +
                        "Here is a mechanically generated engine from Wikipedia:" + NL2 + NL2 + engine + NL2 + NL2;
                    const extraPrompt = extraContext ? "Additional context provided by the user:" + NL2 + extraContext + NL2 + NL2 : "";
                    const instructions = "Improve this engine significantly:" + NL2 +
                        "1. Make MY METHOD section specific — include their ACTUAL methods, theories, and frameworks with detail" + NL2 +
                        "2. Make MY TOOLS list their ACTUAL tools, equations, formulas, and techniques — be SPECIFIC" + NL2 +
                        "3. If they have known equations or mathematical formulas, INCLUDE THEM explicitly" + NL2 +
                        "4. Make HOW I SPEAK reflect their actual voice, personality, and known quotes" + NL2 +
                        "5. Add specific historical examples, dates, and achievements" + NL2 +
                        "6. Keep the same section headers (MY TRAINING & BACKGROUND, MY METHOD, MY TOOLS, HOW I SPEAK, etc.)" + NL2 +
                        "7. Aim for 4000-8000 characters of rich, specific content" + NL2 +
                        "8. Output ONLY the improved engine text, no commentary" + NL2;
                    try {
                        const llmRes = await fetch(url + "/api/chat", {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ model: usedModel, messages: [{ role: "user", content: enhancePrompt + extraPrompt + instructions }], stream: false }),
                            signal: AbortSignal.timeout(120000),
                        });
                        if (llmRes.ok) {
                            const llmData = await llmRes.json();
                            const enhanced = llmData.message?.content;
                            if (enhanced && enhanced.length > 500)
                                engine = enhanced;
                        }
                    }
                    catch (e) { /* LLM enhancement failed, use mechanical version */ }
                }
                return json(res, 200, { engine, subject: wikiTitle, enhanced: enhance });
            }
            catch (e) {
                return json(res, 500, { error: "Failed to build engine: " + (e instanceof Error ? e.message : String(e)) });
            }
        }
        if (method === "POST" && path === "/api/engines") {
            const body = await readBody(req);
            const engineId = String(body.id ?? "").replace(/[^a-z0-9_-]/gi, "_");
            const content = String(body.content ?? "");
            if (!engineId || !content)
                return json(res, 400, { error: "id and content required" });
            mkdirSync(ENGINES_DIR, { recursive: true });
            const enginePath = join(ENGINES_DIR, engineId + ".txt");
            writeFileSync(enginePath, content);
            return json(res, 200, { ok: true, id: engineId });
        }
        // ── device pairing / auto-discovery ──
        if (method === "POST" && path === "/api/devices/scan") {
            const results = [];
            // 1. Scan ADB devices
            try {
                const { execSync } = await import("node:child_process");
                const adbOut = execSync("adb devices -l", { timeout: 5000, encoding: "utf8" });
                for (const line of adbOut.split(String.fromCharCode(10))) {
                    const m = line.match(/^(S+)s+devices/);
                    if (m) {
                        const id = m[1];
                        const nameMatch = line.match(/model:(S+)/);
                        results.push({ name: nameMatch ? nameMatch[1].replace(/_/g, " ") : "Android Device", type: "adb", host: "", adbDeviceId: id });
                    }
                }
            }
            catch { }
            // 2. Scan ARP table for network devices
            try {
                const { execSync } = await import("node:child_process");
                const arpOut = execSync("arp -a", { timeout: 5000, encoding: "utf8" });
                for (const line of arpOut.split(String.fromCharCode(10))) {
                    const m = line.match(/([d.]+)s+([a-f0-9-]+)s+(w+)/);
                    if (m && m[1] !== "224.0.0.22" && !m[1].startsWith("239.")) {
                        // Skip already configured devices
                        const existing = (cfg.devices || []).some(d => d.host === m[1]);
                        if (!existing)
                            results.push({ name: "Network Device (" + m[1] + ")", type: "ssh", host: m[1], port: 22 });
                    }
                }
            }
            catch { }
            return json(res, 200, { devices: results });
        }
        // ── settings password verification ──
        if (method === "POST" && path === "/api/verify-settings-password") {
            const body = await readBody(req);
            const ok = cfg.settingsPassword && body.password === cfg.settingsPassword;
            return json(res, 200, { ok });
        }
        // ── network devices (SSH/ADB) ──
        if (method === "GET" && path === "/api/devices") {
            return json(res, 200, { devices: devices.listDevices(cfg) });
        }
        if (method === "POST" && path === "/api/devices") {
            const body = await readBody(req);
            const dev = {
                id: body.id || devices.newDeviceId(),
                name: String(body.name || "Unnamed Device"),
                type: body.type === "adb" ? "adb" : "ssh",
                host: body.host || undefined,
                port: body.port ? Number(body.port) : undefined,
                username: body.username || undefined,
                password: body.password || undefined,
                keyPath: body.keyPath || undefined,
                adbDeviceId: body.adbDeviceId || undefined,
                display: body.display || undefined,
            };
            const existing = cfg.devices || [];
            const idx = existing.findIndex((d) => d.id === dev.id);
            if (idx >= 0)
                existing[idx] = dev;
            else
                existing.push(dev);
            saveConfig({ devices: existing });
            Object.assign(cfg, loadConfig());
            return json(res, 200, { device: devices.sanitizeDevice(dev) });
        }
        m = path.match(/^\/api\/devices\/([\w-]+)$/);
        if (m && method === "DELETE") {
            const existing = cfg.devices || [];
            const filtered = existing.filter((d) => d.id !== m[1]);
            saveConfig({ devices: filtered });
            Object.assign(cfg, loadConfig());
            return json(res, 200, { ok: true });
        }
        m = path.match(/^\/api\/devices\/([\w-]+)\/test$/);
        if (m && method === "POST") {
            const dev = devices.getDevice(cfg, m[1]);
            if (!dev)
                return json(res, 404, { error: "no such device" });
            const result = await devices.testDevice(dev);
            return json(res, 200, result);
        }
        m = path.match(/^\/api\/devices\/([\w-]+)\/screenshot$/);
        if (m && method === "POST") {
            const dev = devices.getDevice(cfg, m[1]);
            if (!dev)
                return json(res, 404, { error: "no such device" });
            try {
                const frame = await devices.deviceScreenshot(dev);
                return json(res, 200, frame);
            }
            catch (e) {
                return json(res, 500, { error: e instanceof Error ? e.message : String(e) });
            }
        }
        // packaged app: the server serves the built UI too (window → :8799 for
        // everything, no dev proxy to die). OMB_STATIC_DIR is set by Electron.
        if (method === "GET" && !path.startsWith("/api/") && STATIC_DIR) {
            const safe = path === "/" ? "/index.html" : path.replace(/\.\./g, "");
            const file = join(STATIC_DIR, safe);
            try {
                const data = readFileSync(file);
                res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
                return res.end(data);
            }
            catch {
                // SPA fallback
                try {
                    const data = readFileSync(join(STATIC_DIR, "index.html"));
                    res.writeHead(200, { "content-type": "text/html" });
                    return res.end(data);
                }
                catch {
                    /* fall through to 404 */
                }
            }
        }
        return json(res, 404, { error: `no route: ${method} ${path}` });
    }
    catch (e) {
        const status = e?.status ?? 500;
        return json(res, status, { error: e instanceof Error ? e.message : String(e) });
    }
});
server.listen(PORT, "127.0.0.1", () => {
    console.log(`Towelie AI server on http://127.0.0.1:${PORT}`);
});
for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
        void registry.disposeAll().finally(() => process.exit(0));
    });
}
