import { newEventId, newId } from "../contracts.js";
import { appendNative } from "./native.js";
const DRIVER_KIND = "ollama";
const DEFAULT_URL = "http://127.0.0.1:11434";
function decodeConfig(raw) {
    const o = (raw ?? {});
    return {
        url: typeof o.url === "string" ? o.url : DEFAULT_URL,
        apiKeyEnv: typeof o.apiKeyEnv === "string" ? o.apiKeyEnv : "OLLAMA_API_KEY",
    };
}
// Fallback catalog used when /api/tags is unreachable at boot — the
// driver still loads and the snapshot explains the situation.
const FALLBACK_MODELS = {
    default: "llama3.2",
    options: [
        { id: "llama3.2", label: "Llama 3.2" },
        { id: "llama3.1", label: "Llama 3.1" },
        { id: "qwen2.5", label: "Qwen 2.5" },
        { id: "mistral", label: "Mistral" },
        { id: "phi3", label: "Phi-3" },
    ],
};
/** Pretty-print an Ollama model tag for the model picker. */
function modelLabel(id) {
    // "llama3.2:latest" → "Llama 3.2"
    const base = id.replace(/:latest$/, "").replace(/:[\w.-]+$/, (tag) => ` (${tag.slice(1)})`);
    return base
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
/** Fetch the live model list from Ollama. Returns null on failure. */
async function fetchModels(baseUrl, apiKey) {
    const headers = {};
    if (apiKey)
        headers.authorization = `Bearer ${apiKey}`;
    const res = await fetch(`${baseUrl}/api/tags`, {
        headers,
        signal: AbortSignal.timeout(5000),
    });
    if (!res.ok)
        return null;
    const json = await res.json();
    const names = (json.models ?? [])
        .map((m) => m.name ?? m.model)
        .filter(Boolean);
    if (!names.length)
        return null;
    // Deduplicate and sort
    const unique = [...new Set(names)].sort();
    return {
        default: unique[0],
        options: unique.map((id) => ({ id, label: modelLabel(id) })),
    };
}
export const OllamaDriver = {
    driverKind: DRIVER_KIND,
    metadata: { displayName: "Ollama", supportsMultipleInstances: true },
    models: FALLBACK_MODELS,
    decodeConfig,
    defaultConfig: () => decodeConfig({}),
    async create(input) {
        const { instanceId, config } = input;
        const apiKey = input.environment[config.apiKeyEnv] ?? process.env[config.apiKeyEnv] ?? "";
        const listeners = new Set();
        const active = new Map();
        // Live model catalog — refreshed on create and on each snapshot.
        let liveModels = null;
        try {
            liveModels = await fetchModels(config.url, apiKey);
        }
        catch {
            // server not running yet — the snapshot will explain
        }
        const models = liveModels ?? FALLBACK_MODELS;
        const emit = (event) => {
            for (const l of [...listeners])
                l(event);
        };
        const base = (threadId, turnId) => ({
            eventId: newEventId(),
            provider: DRIVER_KIND,
            threadId,
            turnId,
            createdAt: new Date().toISOString(),
        });
        // ── core chat completion (Ollama /api/chat, NDJSON streaming) ──────
        const complete = async (messages, model, opts) => {
            const headers = { "content-type": "application/json" };
            if (apiKey)
                headers.authorization = `Bearer ${apiKey}`;
            const reqBody = { model, messages, stream: opts.stream };
            if (opts.tools && opts.tools.length > 0)
                reqBody.tools = opts.tools;
            const res = await fetch(`${config.url}/api/chat`, {
                method: "POST",
                headers,
                body: JSON.stringify(reqBody),
            });
            if (!res.ok) {
                const body = await res.text().catch(() => "");
                throw new Error(`Ollama HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
            }
            if (!opts.stream) {
                const json = await res.json();
                const tcs = (json.message?.tool_calls ?? []).map((tc) => ({ name: tc.function?.name ?? "", arguments: typeof tc.function?.arguments === "string" ? tc.function.arguments : JSON.stringify(tc.function?.arguments ?? {}) }));
                return { text: json.message?.content ?? "", usage: json.eval_count ? { input: json.prompt_eval_count ?? 0, output: json.eval_count ?? 0 } : null, toolCalls: tcs };
            }
            // Ollama streams NDJSON: one JSON object per line, each with a
            // `message.content` delta. The final line has `done: true`.
            let text = "";
            let usage = null;
            const toolCalls = [];
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buf = "";
            for (;;) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buf += decoder.decode(value, { stream: true });
                let nl;
                while ((nl = buf.indexOf("\n")) !== -1) {
                    const line = buf.slice(0, nl).trim();
                    buf = buf.slice(nl + 1);
                    if (!line)
                        continue;
                    let chunk;
                    try {
                        chunk = JSON.parse(line);
                    }
                    catch {
                        continue;
                    }
                    const delta = chunk.message?.content;
                    if (delta) {
                        text += delta;
                        opts.onDelta?.(delta);
                    }
                    if (chunk.message?.tool_calls) {
                        for (const tc of chunk.message.tool_calls) {
                            toolCalls.push({ name: tc.function?.name ?? "", arguments: typeof tc.function?.arguments === "string" ? tc.function.arguments : JSON.stringify(tc.function?.arguments ?? {}) });
                        }
                    }
                    if (chunk.done) {
                        usage = {
                            input: chunk.prompt_eval_count ?? 0,
                            output: chunk.eval_count ?? 0,
                        };
                    }
                }
            }
            return { text, usage, toolCalls };
        };
        const sendTurn = async (turn) => {
            const { threadId } = turn;
            if (active.has(threadId))
                throw new Error("a turn is already running on this thread");
            const turnId = newId();
            const abort = new AbortController();
            active.set(threadId, { abort, turnId });
            const model = turn.model || models.default;
            const messages = [
                ...(turn.system ? [{ role: "system", content: turn.system }] : []),
                ...(turn.transcript ?? []).map((m) => ({
                    role: m.role === "assistant" ? "assistant" : "user",
                    content: m.text,
                })),
                { role: "user", content: turn.text },
            ];
            appendNative(threadId, { dir: "out", source: "ollama.chat", msg: { model, messages } });
            emit({ ...base(threadId, turnId), type: "turn.started" });
            emit({ ...base(threadId, turnId), type: "session.started", sessionId: null, model });
            (async () => {
                try {
                    const executors = turn.integrations?.botTools?.executors;
                    const toolDefs = turn.integrations?.botTools?.tools;
                    let convMsgs = [...messages];
                    let finalText = "";
                    let finalUsage = null;
                    const MAX_TOOL_ROUNDS = 10;
                    const tcS = String.fromCharCode(60) + "tool_call" + String.fromCharCode(62);
                    const tcE = String.fromCharCode(60) + "/tool_call" + String.fromCharCode(62);
                    const tcR = new RegExp(tcS + String.fromCharCode(92) + "s" + String.fromCharCode(92) + "S" + String.fromCharCode(93) + "*?" + tcE, "g");
                    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
                        let roundMsgs = convMsgs;
                        if (round === 0 && toolDefs && toolDefs.length > 0) {
                            const tl = toolDefs.map((t) => "- " + t.function.name + ": " + t.function.description).join(String.fromCharCode(10));
                            const ex = tcS + String.fromCharCode(10) + JSON.stringify({ name: "execute_command", arguments: { command: "notepad.exe" } }) + String.fromCharCode(10) + tcE;
                            const ti = String.fromCharCode(10) + String.fromCharCode(10) + "You have access to these tools:" + String.fromCharCode(10) + tl + String.fromCharCode(10) + String.fromCharCode(10) + "To use a tool, output a tool_call block in this format:" + String.fromCharCode(10) + ex + String.fromCharCode(10) + "You can make multiple tool calls. After tool results are provided, continue based on the results.";
                            roundMsgs = [{ role: "system", content: (turn.system || "") + ti }, ...convMsgs.slice(1)];
                        }
                        const result = await complete(roundMsgs, model, {
                            stream: true, signal: abort.signal,
                            onDelta: (delta) => emit({ ...base(threadId, turnId), type: "content.delta", streamKind: "assistant_text", delta }),
                        });
                        finalText = result.text;
                        finalUsage = result.usage;
                        const matches = finalText.match(tcR);
                        const nativeCalls = result.toolCalls || [];
                        if ((!matches || matches.length === 0) && nativeCalls.length === 0)
                            break;
                        if (!executors)
                            break;
                        const calls = [];
                        for (const m of (matches || [])) {
                            try {
                                const j = JSON.parse(m.replace(new RegExp(tcS + "|" + tcE, "g"), "").trim());
                                calls.push({ name: j.name || "", args: j.arguments || {} });
                            }
                            catch { }
                        }
                        for (const tc of nativeCalls) {
                            try {
                                calls.push({ name: tc.name, args: JSON.parse(tc.arguments) });
                            }
                            catch {
                                calls.push({ name: tc.name, args: {} });
                            }
                        }
                        if (calls.length === 0)
                            break;
                        finalText = finalText.replace(tcR, "").trim();
                        for (const call of calls) {
                            emit({ ...base(threadId, turnId), type: "item.started", itemType: "tool", title: call.name });
                            const fn = executors[call.name];
                            const tr = fn ? await fn(call.args) : "Error: unknown tool " + call.name;
                            emit({ ...base(threadId, turnId), type: "item.completed", itemType: "tool", ok: !tr.startsWith("Error") });
                            convMsgs = [...convMsgs, { role: "assistant", content: tcS + String.fromCharCode(10) + JSON.stringify({ name: call.name, arguments: call.args }) + String.fromCharCode(10) + tcE }, { role: "user", content: "Tool result: " + tr }];
                        }
                    }
                    appendNative(threadId, { dir: "in", source: "ollama.chat", msg: { text: finalText, usage: finalUsage } });
                    if (finalText.trim())
                        emit({ ...base(threadId, turnId), type: "item.completed", itemType: "assistant_text", text: finalText });
                    if (finalUsage)
                        emit({ ...base(threadId, turnId), type: "thread.token-usage.updated", ...finalUsage });
                    active.delete(threadId);
                    emit({ ...base(threadId, turnId), type: "turn.completed", ok: true, stopReason: null, cost: null });
                }
                catch (e) {
                    active.delete(threadId);
                    const aborted = e.name === "AbortError";
                    if (!aborted)
                        emit({ ...base(threadId, turnId), type: "runtime.error", message: e.message });
                    emit({ ...base(threadId, turnId), type: "turn.completed", ok: false, stopReason: aborted ? "interrupted" : "error", cost: null });
                }
            })();
            return { turnId };
        };
        const snapshot = async () => {
            try {
                // refresh the model list opportunistically
                const fresh = await fetchModels(config.url, apiKey);
                if (fresh) {
                    liveModels = fresh;
                    // mutate the instance's models in place so the picker updates
                    instance.models = fresh;
                }
            }
            catch {
                // server not running — report unavailable
            }
            if (!liveModels) {
                return {
                    state: "unavailable",
                    reason: `Ollama not reachable at ${config.url} — is it running? (ollama serve)`,
                };
            }
            return { state: "available", authenticated: true, version: null };
        };
        const instance = {
            instanceId,
            driverKind: DRIVER_KIND,
            displayName: input.displayName,
            enabled: input.enabled,
            models,
            snapshot,
            adapter: {
                provider: DRIVER_KIND,
                capabilities: { sessionModelSwitch: "in-session" },
                sendTurn,
                interruptTurn: async (threadId) => active.get(threadId)?.abort.abort(),
                respondToRequest: async () => {
                    throw new Error("ollama driver has no pending asks");
                },
                hasSession: (threadId) => active.has(threadId),
                stopAll: async () => {
                    for (const { abort } of active.values())
                        abort.abort();
                },
                onEvent: (listener) => {
                    listeners.add(listener);
                    return () => listeners.delete(listener);
                },
            },
            generateText: async (prompt) => {
                // Use a small/fast model if available, else the default
                const smallModel = models.options.find((o) => /phi|mini|small|tiny|qwen.*0\.5|qwen.*1\.5/i.test(o.id))?.id;
                const { text } = await complete([{ role: "user", content: prompt }], smallModel ?? models.default, { stream: false });
                return text;
            },
            dispose: async () => {
                for (const { abort } of active.values())
                    abort.abort();
                listeners.clear();
            },
        };
        return instance;
    },
};
