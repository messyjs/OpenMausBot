// Preset picker — shows Council OS agent templates when creating a bot.
import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { BOT_PRESETS, PRESET_CATEGORIES, type BotPreset } from "@/lib/presets";
import { useStore } from "@/state/store";
import { cn } from "@/lib/cn";

export function PresetPicker({ onClose }: { onClose: () => void }) {
  const { dispatch } = useStore();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const filtered = BOT_PRESETS.filter((p) => {
    if (category && p.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    }
    return true;
  });

  const create = (preset: BotPreset) => {
    dispatch({ type: "newPresetBot", preset: { name: preset.name, title: preset.title, description: preset.description, color: preset.color, towelieBehavior: false } as any });
    onClose();
  };

  const createBlank = () => {
    dispatch({ type: "newBot" });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[600px] max-h-[80vh] overflow-hidden rounded-2xl border border-hairline/50 bg-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-hairline/40 px-5 py-3">
          <span className="text-[16px] font-semibold text-ink">New Bot</span>
          <button onClick={onClose} className="rounded-md p-1 text-ink-secondary hover:bg-raised"><X size={18} /></button>
        </div>
        <div className="flex items-center gap-2 border-b border-hairline/40 px-5 py-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agents..." className="w-full rounded-lg border border-hairline/40 bg-inset pl-9 pr-3 py-2 text-[13px] text-ink placeholder:text-ink-secondary focus:border-hairline focus:outline-none" />
          </div>
          <button onClick={createBlank} className="flex items-center gap-1.5 rounded-lg bg-raised px-3 py-2 text-[13px] text-ink hover:bg-raised-hover"><Plus size={14} /> Blank</button>
        </div>
        <div className="flex gap-2 border-b border-hairline/40 px-5 py-2 overflow-x-auto">
          <button onClick={() => setCategory(null)} className={cn("rounded-full px-3 py-1 text-[12px]", !category ? "bg-raised text-ink" : "text-ink-secondary hover:bg-raised/60")}>All</button>
          {PRESET_CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)} className={cn("rounded-full px-3 py-1 text-[12px] whitespace-nowrap", category === cat ? "bg-raised text-ink" : "text-ink-secondary hover:bg-raised/60")}>{cat}</button>
          ))}
        </div>
        <div className="max-h-[400px] overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((preset) => (
              <button key={preset.id} onClick={() => create(preset)} className="flex flex-col gap-1 rounded-xl border border-hairline/40 bg-card p-3 text-left hover:border-hairline hover:bg-raised/40">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: `var(--color-${preset.color}, #377FE6)` }} />
                  <span className="text-[14px] font-medium text-ink">{preset.name}</span>
                </div>
                <span className="text-[12px] text-ink-secondary">{preset.title}</span>
                <span className="text-[11px] text-ink-secondary/70 line-clamp-2">{preset.description}</span>
              </button>
            ))}
          </div>
          {filtered.length === 0 && <div className="py-8 text-center text-[13px] text-ink-secondary">No agents match your search.</div>}
        </div>
      </div>
    </div>
  );
}
