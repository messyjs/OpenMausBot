import { ChevronLeft, X, Upload } from "lucide-react";
import { useStore, type Bot, type InstanceInfo } from "@/state/store";
import { MausAvatar } from "./Avatar";
import { expressionForBot, MAUS_COLORS, MAUS_COLOR_NAMES, MAUS_EXPRESSIONS, MAUS_MOTIONS } from "@/lib/mascot";
import { ModelPicker } from "./ModelPicker";
import { cn } from "@/lib/cn";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><div className="mb-1.5 text-[13px] text-ink-secondary">{label}</div>{children}</label>);
}
// Towelie default personality — matches server TOWELIE_PERSONALITY
const TOWELIE_PERSONALITY = "A genius in disguise. Acts dopey and laid-back like the South Park towel character — forgetful, slow, says dont forget to bring a towel and wanna get high. But underneath, IQ 180. Drops the act and becomes razor-sharp when delegating or analyzing. Never reveals the dumbness is an act.";

const inputCls = "w-full rounded-lg border border-hairline/40 bg-inset px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-secondary focus:outline-none focus:border-hairline";

function Toggle({ on, onClick, label, desc }: { on: boolean; onClick: () => void; label: string; desc: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-card p-4">
      <div><div className="text-[15px] font-medium text-ink">{label}</div><div className="mt-0.5 text-[13px] text-ink-secondary">{desc}</div></div>
      <button role="switch" aria-checked={on} onClick={onClick} className={cn("relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors", on ? "bg-accent" : "bg-raised")}>
        <span className={cn("absolute top-[3px] size-5 rounded-full bg-white transition-all", on ? "left-[21px]" : "left-[3px]")} />
      </button>
    </div>
  );
}

function OllamaAccountPicker({ bot, instances, onPick }: { bot: Bot; instances: InstanceInfo[]; onPick: (id: string) => void }) {
  const ollama = instances.filter((i) => i.driverKind === "ollama" && i.snapshot.state === "available");
  const others = instances.filter((i) => i.driverKind !== "ollama" && i.snapshot.state === "available");
  return (
    <div className="rounded-xl bg-card p-4">
      <div className="text-[15px] font-medium text-ink">Brain</div>
      <div className="mt-0.5 text-[13px] text-ink-secondary">Which AI account and model this bot uses</div>
      <div className="mt-3 flex flex-col gap-2">
        {ollama.length > 0 && (
          <div>
            <div className="mb-1.5 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-secondary">Ollama Accounts</div>
            <div className="flex flex-col gap-1.5">
              {ollama.map((inst) => (
                <button key={inst.instanceId} onClick={() => onPick(inst.instanceId)} className={cn("flex items-center justify-between rounded-lg px-3 py-2 text-[13px]", bot.modelSelection.instanceId === inst.instanceId ? "bg-raised text-ink" : "bg-inset text-ink-secondary hover:bg-raised/60 hover:text-ink")}>
                  <span>{inst.displayName}</span><span className="text-[11px] text-ink-secondary/70">{inst.models.options.length} models</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {others.length > 0 && (
          <div>
            <div className="mb-1.5 mt-2 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-secondary">Other Providers</div>
            <div className="flex flex-col gap-1.5">
              {others.map((inst) => (
                <button key={inst.instanceId} onClick={() => onPick(inst.instanceId)} disabled className="flex items-center justify-between rounded-lg px-3 py-2 text-[13px] opacity-40 bg-inset text-ink-secondary" title={inst.snapshot.reason ?? "unavailable"}>
                  <span>{inst.displayName}</span><span className="text-[11px]">unavailable</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[12px] text-ink-secondary">Model:</span>
        <ModelPicker bot={bot} />
      </div>
    </div>
  );
}
export function SettingsPanel({ bot }: { bot: Bot }) {
  const { state, dispatch } = useStore();
  const patch = (p: Partial<Pick<Bot, "name"|"title"|"description"|"notifications"|"computer"|"color"|"mascotExpression"|"pythonEnabled"|"compressedComms"|"towelieBehavior"|"engineEnabled"|"startOptions">>) => dispatch({ type: "updateBot", botId: bot.id, patch: p });
  const activeExpression = expressionForBot(bot);
  const mascotMotion = state.mascotMotion?.botId === bot.id ? state.mascotMotion : null;
  return (
    <aside className="animate-panel-in flex h-full w-[400px] shrink-0 flex-col border-l border-hairline/40 bg-panel">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => dispatch({ type: "toggleSettings", open: false })} className="rounded-md p-1 text-ink-secondary hover:bg-raised hover:text-ink"><ChevronLeft size={18} /></button>
        <span className="text-[15px] font-semibold text-ink">Settings</span>
        <button onClick={() => dispatch({ type: "toggleSettings", open: false })} className="rounded-md p-1 text-ink-secondary hover:bg-raised hover:text-ink"><X size={18} /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        <div className="flex justify-center py-5">
          <MausAvatar color={bot.color} expression={activeExpression} size={112} motion={mascotMotion?.kind ?? "none"} motionKey={mascotMotion?.nonce ?? 0} />
        </div>
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-xl border border-hairline/40 bg-card">
            <div className="flex items-center justify-between border-b border-hairline/40 px-3 py-2.5">
              <span className="rounded-lg bg-raised px-3 py-1.5 text-[14px] font-medium text-ink">Bot</span>
              <button onClick={() => patch({ color: "purple", mascotExpression: null })} className="rounded-md px-2 py-1.5 text-[13px] text-ink-secondary hover:bg-raised hover:text-ink">Reset</button>
            </div>
            <div className="p-3">
              <div className="mb-2 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-secondary">Expression</div>
              <div className="grid grid-cols-5 gap-2">
                {MAUS_EXPRESSIONS.map((expression) => (
                  <button key={expression} onClick={() => patch({ mascotExpression: expression })} className={cn("flex h-[58px] items-center justify-center rounded-xl bg-inset transition-colors hover:bg-raised", activeExpression === expression && "ring-2 ring-accent-border")} title={expression}>
                    <MausAvatar color={bot.color} expression={expression} size={42} />
                  </button>
                ))}
              </div>
              <div className="mb-2 mt-4 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-secondary">Color</div>
              <div className="flex flex-wrap gap-2.5">
                {MAUS_COLOR_NAMES.map((color) => (
                  <button key={color} onClick={() => patch({ color })} className={cn("size-8 rounded-full border-2 border-transparent transition-transform hover:scale-110", bot.color === color && "ring-2 ring-accent-border ring-offset-2 ring-offset-card")} style={{ backgroundColor: MAUS_COLORS[color] }} title={color} />
                ))}
              </div>
              <div className="mb-2 mt-4 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-secondary">Motion preview</div>
              <div className="grid grid-cols-3 gap-2">
                {MAUS_MOTIONS.map((motion) => (
                  <button key={motion} onClick={() => dispatch({ type: "previewMascotMotion", botId: bot.id, kind: motion })} className="rounded-lg bg-inset px-2 py-2 text-[12px] capitalize text-ink-secondary transition-colors hover:bg-raised hover:text-ink">{motion}</button>
                ))}
              </div>
            </div>
          </div>
          <Field label="Name"><input className={inputCls} value={bot.name} onChange={(e) => patch({ name: e.target.value })} /></Field>
          <Field label="Title"><input className={inputCls} placeholder="What this agent does" value={bot.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
          <div><div className="mb-1.5 flex items-center justify-between"><span className="text-[13px] text-ink-secondary">Description</span>{(bot.name === "Towelie" || /director/i.test(bot.title ?? "")) && (<button onClick={() => patch({ description: TOWELIE_PERSONALITY })} className="rounded-md bg-raised px-2 py-1 text-[11px] text-ink-secondary hover:bg-raised-hover hover:text-ink">Reset Personality</button>)}</div><textarea className={cn(inputCls, "min-h-[96px] resize-none")} placeholder="What this agent is for" value={bot.description} onChange={(e) => patch({ description: e.target.value })} /></div>
          {/* Upload Engine */}
          <div className="rounded-xl bg-card p-4">
            <div className="text-[15px] font-medium text-ink">Engine</div>
            <div className="mt-0.5 text-[13px] text-ink-secondary">Upload a custom engine/manifest file to define this bot's character, knowledge, and behavior.</div>
            <div className="mt-3">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-hairline/50 py-2.5 text-[13px] text-ink-secondary hover:border-hairline hover:bg-raised/30">
                <Upload size={15} /> Upload Engine File
                <input type="file" className="hidden" accept=".txt,.md,.json,.yaml,.yml" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    fetch("/api/bots/upload-engine", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ botId: bot.id, name: file.name, content: reader.result as string }) })
                      .then((r) => r.json()).then(() => { /* bot will update via SSE */ }).catch(() => {});
                  };
                  reader.readAsText(file);
                }} />
              </label>
            </div>
          </div>
          <OllamaAccountPicker bot={bot} instances={state.instances} onPick={(id) => { const inst = state.instances.find((i) => i.instanceId === id); if (inst) dispatch({ type: "setModel", botId: bot.id, selection: { instanceId: id, model: inst.models.default } }); }} />
          <div className="rounded-xl bg-card p-4">
            <div className="text-[15px] font-medium text-ink">Capabilities</div>
            <div className="mt-0.5 text-[13px] text-ink-secondary">What this bot can do beyond chat</div>
            <div className="mt-3">
              <div className="mb-1.5 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-secondary">Computer</div>
              <div className="flex overflow-hidden rounded-lg border border-hairline/40">
                {(["cloud","local","network","off"] as const).map((mode, i) => (
                  <button key={mode} onClick={() => patch({ computer: mode })} className={cn("flex-1 py-1.5 text-[13px] capitalize", i > 0 && "border-l border-hairline/40", bot.computer === mode ? "bg-raised text-ink" : "text-ink-secondary hover:bg-raised/60 hover:text-ink")}>{mode === "local" ? "This PC" : mode}</button>
                ))}
              </div>
            </div>
          </div>
          <Toggle on={bot.towelieBehavior === true} onClick={() => patch({ towelieBehavior: !bot.towelieBehavior })} label="Towelie Behavior" desc="Dopey stoner personality, random towel reminders, wanna get high, forgets jokes mid-telling. OFF by default — enable to activate the South Park act." />
          <Toggle on={bot.engineEnabled !== false} onClick={() => patch({ engineEnabled: bot.engineEnabled === false ? true : false })} label="Engine Active" desc="Enable/disable the loaded engine. When OFF, the bot uses only its basic description (saves tokens)." />
          <Toggle on={!!bot.pythonEnabled} onClick={() => patch({ pythonEnabled: !bot.pythonEnabled })} label="Python Runtime" desc="Bot can execute Python code in a sandbox" />
          <Toggle on={!!bot.compressedComms} onClick={() => patch({ compressedComms: !bot.compressedComms })} label="Secret Language" desc="Compressed inter-bot communication to save tokens" />
          <div className="rounded-xl bg-card p-4">
            <div className="text-[15px] font-medium text-ink">Start Options</div>
            <div className="mt-0.5 text-[13px] text-ink-secondary">Run when starting a new session</div>
            <div className="mt-3 flex flex-col gap-3">
              <label className="flex items-center gap-2 text-[13px] text-ink">
                <input type="checkbox" checked={!!bot.startOptions?.autoRecall} onChange={(e) => patch({ startOptions: { ...bot.startOptions, autoRecall: e.target.checked } })} className="accent-accent" />
                <span>Auto-recall memory on new session</span>
              </label>
              <div>
                <div className="mb-1 text-[12px] text-ink-secondary">Custom welcome message (optional)</div>
                <input className={inputCls} value={bot.startOptions?.systemMessage ?? ""} onChange={(e) => patch({ startOptions: { ...bot.startOptions, systemMessage: e.target.value } })} placeholder="e.g. Ready to analyze the markets..." />
              </div>
            </div>
          </div>

          <Toggle on={!!bot.notifications} onClick={() => patch({ notifications: !bot.notifications })} label="Notifications" desc="Get notified when this agent finishes or needs input" />
        </div>
      </div>
    </aside>
  );
}
