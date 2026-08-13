// Engine Builder — scrape Wikipedia + optionally enhance with LLM
import { useState } from "react";
import { Loader2, Search, Sparkles, Save, X } from "lucide-react";
import { api, useStore } from "@/state/store";
import { cn } from "@/lib/cn";

export function EngineBuilder({ onClose }: { onClose: () => void }) {
  const { state } = useStore();
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState("");
  const [enhance, setEnhance] = useState(false);
  const [instanceId, setInstanceId] = useState("ollamaLocal");
  const [model, setModel] = useState("");
  const [saved, setSaved] = useState(false);
  const ollamaInstances = state.instances.filter((i) => i.driverKind === "ollama" && i.snapshot.state === "available");
  const selectedInstance = ollamaInstances.find((i) => i.instanceId === instanceId);

  const build = () => {
    if (!subject.trim() || loading) return;
    setLoading(true); setSaved(false);
    api("/api/engines/build", {
      method: "POST", body: JSON.stringify({ subject: subject.trim(), enhance, instanceId, model: model || selectedInstance?.models.default || "" }),
    })
      .then((data: any) => { setEngine(data.engine || ""); setLoading(false); })
      .catch((e) => { setEngine("Error: " + e.message); setLoading(false); });
  };

  const save = () => {
    if (!engine || !subject.trim()) return;
    const id = subject.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
    api("/api/engines", { method: "POST", body: JSON.stringify({ id, content: engine }) })
      .then(() => { setSaved(true); })
      .catch(() => {});
  };

  const inputCls = "w-full rounded-lg border border-hairline/40 bg-inset px-3 py-2 text-[13px] text-ink placeholder:text-ink-secondary focus:border-hairline focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="flex max-h-[85vh] w-[700px] flex-col rounded-2xl border border-hairline/50 bg-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-hairline/40 px-5 py-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-accent" />
            <span className="text-[16px] font-semibold text-ink">Bot Engine Builder</span>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-ink-secondary hover:bg-raised"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Subject input */}
          <div className="mb-4">
            <div className="mb-1.5 text-[13px] text-ink-secondary">Subject name (who is this bot?)</div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
                <input className={cn(inputCls, "pl-9")} value={subject} onChange={(e) => setSubject(e.target.value)} onKeyDown={(e) => e.key === "Enter" && build()} placeholder="e.g. Nikola Tesla, Albert Einstein, W.D. Gann..." />
              </div>
              <button onClick={build} disabled={loading || !subject.trim()} className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white hover:bg-accent/90 disabled:opacity-50">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Build
              </button>
            </div>
          </div>

          {/* LLM enhancement options */}
          <div className="mb-4 rounded-xl bg-card p-3">
            <label className="flex items-center gap-2 text-[13px] text-ink">
              <input type="checkbox" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} className="accent-accent" />
              <span>Enhance with LLM (optional — uses Ollama to improve the engine)</span>
            </label>
            {enhance && (
              <div className="mt-3 flex gap-2">
                <select className={inputCls} value={instanceId} onChange={(e) => { setInstanceId(e.target.value); setModel(""); }}>
                  {ollamaInstances.map((i) => <option key={i.instanceId} value={i.instanceId}>{i.displayName} ({i.models.options.length} models)</option>)}
                </select>
                <select className={inputCls} value={model} onChange={(e) => setModel(e.target.value)}>
                  <option value="">Default: {selectedInstance?.models.default ?? ""}</option>
                  {selectedInstance?.models.options.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Engine output */}
          {engine && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[13px] text-ink-secondary">Generated engine ({engine.length} chars)</span>
                <button onClick={save} disabled={saved} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px]", saved ? "bg-success/20 text-success" : "bg-raised text-ink hover:bg-raised-hover")}>
                  {saved ? "Saved!" : <><Save size={12} /> Save Engine</>}
                </button>
              </div>
              <textarea className={cn(inputCls, "h-[400px] resize-none font-mono text-[11px]")} value={engine} onChange={(e) => setEngine(e.target.value)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
