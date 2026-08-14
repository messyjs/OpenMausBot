import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Monitor, Square, X, PanelRightOpen } from "lucide-react";
import { useStore, formatTime, type Bot, type Message } from "@/state/store";
import { MausAvatar } from "./Avatar";
import { expressionForBot } from "@/lib/mascot";
import { OptionCard } from "./OptionCard";
import { Composer } from "./Composer";
import { ModelPicker } from "./ModelPicker";
import { cn } from "@/lib/cn";

// Minimal markdown for bot bubbles: **bold**, `code`, headings, lists.
// Rendered as React nodes — model output never reaches the DOM as HTML.
function inlineMd(text: string, keyBase: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      parts.push(<strong key={`${keyBase}-${i++}`}>{tok.slice(2, -2)}</strong>);
    } else {
      parts.push(
        <code key={`${keyBase}-${i++}`} className="rounded bg-inset px-1 py-px text-[13px]">
          {tok.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function CodeBlock({ code, lang, botId }: { code: string; lang?: string; botId: string }) {
  const { dispatch } = useStore();
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="my-2 overflow-hidden rounded-lg border border-hairline/40 bg-inset">
      <div className="flex items-center justify-between border-b border-hairline/30 px-3 py-1.5">
        <span className="text-[11px] font-medium uppercase text-ink-secondary">{lang || "code"}</span>
        <div className="flex gap-2">
          <button onClick={() => dispatch({ type: "openCodeEditor", code: { content: code, lang: lang || "code", botId } })} className="flex items-center gap-1 text-[11px] text-ink-secondary hover:text-accent" title="Open in side editor">
            <PanelRightOpen size={11} /> Edit
          </button>
          <button onClick={copy} className="text-[11px] text-ink-secondary hover:text-ink">{copied ? "Copied!" : "Copy"}</button>
        </div>
      </div>
      <pre className="overflow-x-auto p-3 text-[12px] leading-relaxed"><code className="font-mono text-ink">{code}</code></pre>
    </div>
  );
}

function Markdownish({ text, botId }: { text: string; botId?: string }) {
  const parts: React.ReactNode[] = [];
  const tcS = String.fromCharCode(96).repeat(3);
  const nl = String.fromCharCode(10);
  const bs = String.fromCharCode(92);
  const codeRe = new RegExp(tcS + "(" + bs + bs + "w*)" + nl + "(" + bs + bs + "s" + bs + bs + "S*?)" + tcS, "g");
  let last = 0; let m: RegExpExecArray | null; let ki = 0;
  const rl = (line: string, key: string) => {
    const h = line.match(/^#{1,4}\s+(.*)$/);
    if (h) return <div key={key} className="mt-1.5 font-semibold">{inlineMd(h[1], key)}</div>;
    const b = line.match(/^\s*[-*]\s+(.*)$/);
    if (b) return <div key={key} className="flex gap-2 pl-1"><span className="text-ink-secondary">-</span><span className="min-w-0">{inlineMd(b[1], key)}</span></div>;
    const n = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (n) return <div key={key} className="flex gap-2 pl-1"><span className="text-ink-secondary">{n[1]}.</span><span className="min-w-0">{inlineMd(n[2], key)}</span></div>;
    if (!line.trim()) return <div key={key} className="h-2.5" />;
    return <div key={key}>{inlineMd(line, key)}</div>;
  };
  while ((m = codeRe.exec(text))) {
    if (m.index > last) text.slice(last, m.index).split(nl).forEach((l) => parts.push(rl(l, "t" + ki++)));
    parts.push(<CodeBlock key={"c" + ki++} code={m[2]} lang={m[1]} botId={botId || ""} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) text.slice(last).split(nl).forEach((l) => parts.push(rl(l, "t" + ki++)));
  return <>{parts}</>;
}
function Bubble({ message, botId }: { message: Message; botId?: string }) {
  const user = message.role === "user";
  return (
    <div className={cn("flex w-full", user ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
          user ? "whitespace-pre-wrap bg-bubble-user text-ink" : "bg-card text-ink",
        )}
      >
        {user ? message.text : <Markdownish text={message.text ?? ""} botId={botId} />}
      </div>
    </div>
  );
}

/** A tool run: spinner while live, check/cross once settled. */
function ActivityChip({ message }: { message: Message }) {
  const tool = message.tool;
  if (!tool) return null;
  const failed = tool.ok === false;
  return (
    <div className="flex justify-start">
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border border-hairline/40 bg-panel px-3 py-1.5 text-[13px]",
          failed ? "text-danger" : "text-ink-secondary",
        )}
      >
        {tool.ok === undefined ? (
          <Loader2 size={13} className="animate-spin" />
        ) : failed ? (
          <X size={13} />
        ) : (
          <Check size={13} className="text-success" />
        )}
        <span className="max-w-[480px] truncate font-mono">{tool.name}</span>
      </div>
    </div>
  );
}

function ScreenFrame({ png, mime }: { png: string; mime?: string }) {
  return (
    <div className="flex justify-start">
      <img
        src={`data:${mime ?? "image/png"};base64,${png}`}
        alt="Bot's screen"
        className="max-w-[70%] rounded-2xl border border-hairline/40"
      />
    </div>
  );
}

function StreamingBubble({ text, botId }: { text: string; botId?: string }) {
  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[70%] rounded-2xl bg-card px-4 py-2.5 text-[15px] leading-relaxed text-ink">
        <Markdownish text={text} botId={botId} />
        <span className="ml-0.5 inline-block h-[14px] w-[2px] animate-pulse bg-ink-secondary align-middle" />
      </div>
    </div>
  );
}

export function ChatView({ bot, isSecondary }: { bot: Bot; isSecondary?: boolean }) {
  const { state, dispatch } = useStore();
  const secSession = isSecondary ? state.bots.find((b) => b.id === state.secondarySession?.botId)?.sessions?.find((s) => s.id === state.secondarySession?.sessionId) : null;
  const scrollRef = useRef<HTMLDivElement>(null);

  const streaming = state.streaming[bot.threadId];
  const provisioning = state.provisioning[bot.id];
  const mascotMotion = state.mascotMotion?.botId === bot.id ? state.mascotMotion : null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [bot.id, bot.messages.length, streaming, bot.busy]);

  const first = bot.messages[0];

  return (
    <main className="relative flex h-full min-w-0 flex-1 flex-col bg-app">
      {isSecondary && (
        <div className="flex items-center justify-between border-b border-hairline/40 bg-panel px-3 py-1.5">
          <div className="flex items-center gap-2 text-[12px] text-ink-secondary"><span className="font-medium text-ink">{bot.name}</span><span>/</span><span>{secSession?.title ?? "Session"}</span></div>
          <button onClick={() => dispatch({ type: "setSecondarySession", session: null })} className="rounded-md p-1 text-ink-secondary hover:bg-raised hover:text-ink" title="Close"><X size={14} /></button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3">
        <button
          onClick={() => dispatch({ type: "toggleSettings" })}
          className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-raised/50"
          title="Bot settings"
        >
          <MausAvatar
            color={bot.color}
            expression={expressionForBot(bot)}
            size={28}
            motion={mascotMotion?.kind ?? "none"}
            motionKey={mascotMotion?.nonce ?? 0}
          />
          <span className="text-[15px] font-semibold text-ink">{bot.name}</span>
          {bot.busy && <Loader2 size={14} className="animate-spin text-ink-secondary" />}
        </button>
        <div className="flex items-center gap-2">
          {bot.busy && (
            <button
              onClick={() => dispatch({ type: "interrupt", botId: bot.id })}
              className="flex items-center gap-1.5 rounded-full border border-hairline/40 bg-raised/60 px-2.5 py-1 text-[13px] text-ink-secondary hover:bg-raised hover:text-ink"
              title="Stop this turn"
            >
              <Square size={12} className="fill-current" />
              Stop
            </button>
          )}
          <ModelPicker bot={bot} />
          <button
            onClick={() => dispatch({ type: "toggleComputer" })}
            className={cn(
              "rounded-md p-1.5 hover:bg-raised",
              state.computerOpen ? "text-accent" : "text-ink-secondary hover:text-ink",
            )}
            title="Bot's computer"
          >
            <Monitor size={18} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {state.error && (
        <div className="mx-auto w-full max-w-[900px] px-5">
          <div className="mb-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
            {state.error}
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5">
        <div className="mx-auto flex max-w-[900px] flex-col gap-3 pb-4">
          {first && (
            <div className="py-3 text-center text-[13px] text-ink-secondary">
              Today {formatTime(first.at)}
            </div>
          )}
          {bot.messages.map((m) => {
            switch (m.kind) {
              case "options":
                return <OptionCard key={m.id} botId={bot.id} message={m} />;
              case "activity":
                return <ActivityChip key={m.id} message={m} />;
              case "screen":
                return m.png ? <ScreenFrame key={m.id} png={m.png} mime={m.mime} /> : null;
              default:
                return <Bubble key={m.id} message={m} botId={bot.id} />;
            }
          })}
          {provisioning && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-full border border-hairline/40 bg-panel px-3 py-1.5 text-[13px] text-ink-secondary">
                <Loader2 size={13} className="animate-spin" />
                Setting up this bot's computer…
              </div>
            </div>
          )}
          {streaming ? (
            <StreamingBubble text={streaming} botId={bot.id} />
          ) : (
            bot.busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl bg-raised px-4 py-3">
                  <span className="size-1.5 animate-bounce rounded-full bg-ink-secondary [animation-delay:0ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-ink-secondary [animation-delay:150ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-ink-secondary [animation-delay:300ms]" />
                </div>
              </div>
            )
          )}
        </div>
      </div>

      <Composer bot={bot} />
    </main>
  );
}
