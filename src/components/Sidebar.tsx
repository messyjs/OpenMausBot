import { track } from "@/lib/analytics";
import { useEffect, useState } from "react";
import { Pin, PinOff, Plus, Search, Settings, Puzzle, Trash2, Users, MessageSquare } from "lucide-react";
import { useStore, formatTime, type Bot } from "@/state/store";
import { MausAvatar, InitialsAvatar } from "./Avatar";
import { expressionForBot } from "@/lib/mascot";
import { cn } from "@/lib/cn";
import { PresetPicker } from "./PresetPicker";

const isElectron = navigator.userAgent.includes("Electron");

function profileInitials(profile?: { name?: string; email?: string }): string {
  const name = profile?.name?.trim();
  if (name) { const w = name.split(/s+/); return w.slice(0, 2).map((x) => x[0]!.toUpperCase()).join(""); }
  const email = profile?.email?.trim();
  return email ? email[0]!.toUpperCase() : "?";
}

function preview(bot: Bot): string {
  if (bot.busy) return "Working...";
  const last = bot.messages[bot.messages.length - 1];
  if (!last) return "";
  if (last.kind === "options" && last.card) return last.card.title;
  if (last.kind === "activity" && last.tool) return last.tool.name;
  if (last.kind === "screen") return "Screen frame";
  return last.text ?? "";
}

interface MenuState { botId: string; x: number; y: number; }
// Chat mode toggle — Single | Director | Group
function ChatModeToggle() {
  const { state, dispatch } = useStore();
  const modes = [
    { id: "single", label: "Single", icon: MessageSquare, desc: "Chat directly with one bot" },
    { id: "director", label: "Director", icon: Users, desc: "Director routes to selected bots" },
    { id: "group", label: "Group", icon: Users, desc: "Director picks bots automatically" },
  ] as const;
  return (
    <div className="flex gap-1 px-2 py-1.5 border-b border-hairline/40">
      {modes.map((m) => (
        <button key={m.id} onClick={() => dispatch({ type: "setChatMode", mode: m.id })}
          className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-medium",
            state.chatMode === m.id ? "bg-raised text-ink" : "text-ink-secondary hover:bg-raised/60 hover:text-ink")}
          title={m.desc}>
          <m.icon size={13} /> {m.label}
        </button>
      ))}
    </div>
  );
}

// Director badge at top of sidebar
function DirectorBadge({ bot }: { bot: Bot }) {
  const { dispatch } = useStore();
  return (
    <button onClick={() => dispatch({ type: "select", id: bot.id })}
      className="group flex w-full items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2.5 text-left hover:bg-accent/10">
      <MausAvatar color={bot.color} expression={expressionForBot(bot)} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-semibold text-ink">{bot.name}</span>
          <span className="rounded bg-accent/20 px-1.5 py-px text-[10px] font-medium text-accent">DIRECTOR</span>
        </div>
        <span className="truncate text-[12px] text-ink-secondary">{bot.title || "Director"}</span>
      </div>
    </button>
  );
}

// Bot list item with collapsible sessions and enable toggle
function BotListItem({ bot, onMenu, isDirector }: { bot: Bot; onMenu: (m: MenuState) => void; isDirector: boolean }) {
  const { state, dispatch } = useStore();
  const selected = state.selectedId === bot.id;
  const last = bot.messages[bot.messages.length - 1];
  const enabled = state.enabledBotIds.includes(bot.id);
  const mascotMotion = state.mascotMotion?.botId === bot.id ? state.mascotMotion : null;

  return (
    <div className="group flex flex-col">
      <button
        onClick={() => dispatch({ type: "select", id: bot.id })}
        onContextMenu={(e) => { e.preventDefault(); onMenu({ botId: bot.id, x: e.clientX, y: e.clientY }); }}
        className={cn("group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left",
          selected ? "bg-raised" : "hover:bg-raised/50")}
      >
        {state.chatMode !== "single" && !isDirector && (
          <button onClick={(e) => { e.stopPropagation(); dispatch({ type: "toggleBotEnabled", botId: bot.id }); }}
            className={cn("shrink-0 rounded-md p-0.5", enabled ? "text-success" : "text-ink-secondary/30 hover:text-ink-secondary")}
            title={enabled ? "Enabled" : "Disabled"}>
            <span className={cn("flex size-4 items-center justify-center rounded-full border", enabled ? "border-success bg-success/20" : "border-hairline")} />
          </button>
        )}
        <MausAvatar color={bot.color} expression={expressionForBot(bot)} size={bot.color === "purple" ? 44 : 36} motion={mascotMotion?.kind ?? "none"} motionKey={mascotMotion?.nonce ?? 0} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 truncate text-[15px] font-semibold text-ink">
              {bot.pinned && <Pin size={12} className="shrink-0 text-ink-secondary" />}
              <span className="truncate">{bot.name}</span>
            </span>
            {selected && last && <span className="shrink-0 text-xs text-ink-secondary">{formatTime(last.at)}</span>}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[13px] text-ink-secondary">{preview(bot)}</span>
            {bot.unread && !selected && <span className="size-2 shrink-0 rounded-full bg-accent" />}
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete " + bot.name + "?")) dispatch({ type: "deleteBot", botId: bot.id }); }}
          className="shrink-0 rounded-md p-1 text-ink-secondary opacity-0 group-hover:opacity-100 hover:bg-raised hover:text-danger" title="Delete bot">
          <Trash2 size={14} />
        </button>
      </button>
    </div>
  );
}
export function Sidebar() {
  const { state, dispatch } = useStore();
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  const director = state.bots.find((b) => b.id === state.directorId) || state.bots.find((b) => b.name === "Towelie" || /director/i.test(b.title ?? ""));
  const otherBots = state.bots.filter((b) => !b.hidden && b.id !== director?.id).sort((a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false));

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-r border-hairline/40 bg-panel">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-1" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
        {isElectron ? <div className="w-14" /> : (<div className="flex items-center gap-2"><span className="size-3 rounded-full bg-[#ff5f57]" /><span className="size-3 rounded-full bg-[#febc2e]" /><span className="size-3 rounded-full bg-[#28c840]" /></div>)}
        <button onClick={() => { track("bot_created"); setShowPresets(true); }} className="rounded-md p-1 text-ink-secondary hover:bg-raised hover:text-ink" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties} title="New bot"><Plus size={20} strokeWidth={2} /></button>
      </div>

      {/* Chat mode toggle */}
      <ChatModeToggle />

      {/* Search */}
      <div className="px-3 pt-2 pb-2">
        <div className="flex items-center gap-2 rounded-lg bg-raised/70 px-3 py-2"><Search size={16} className="text-ink-secondary" /><input placeholder="Search" className="w-full bg-transparent text-[14px] text-ink placeholder:text-ink-secondary focus:outline-none" /></div>
      </div>

      {/* Director at top */}
      {director && <div className="px-2 pb-2"><DirectorBadge bot={director} /></div>}

      {/* Bots list */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="flex flex-col gap-0.5">
          {otherBots.map((b) => <BotListItem key={b.id} bot={b} onMenu={setMenu} isDirector={false} />)}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 pb-3 pt-2">
        <button onClick={() => dispatch({ type: "togglePlugins", open: true })} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-raised/50"><Puzzle size={20} className="text-ink-secondary" /><span className="text-[14px] text-ink">Plugins</span></button>
        <div className="flex items-center">
          <button onClick={() => dispatch({ type: "toggleAppSettings" })} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-raised/50"><InitialsAvatar initials={profileInitials(state.config?.profile)} size={28} /><span className="truncate text-[14px] text-ink">{state.config?.profile?.name?.trim() || state.config?.profile?.email?.trim() || "You"}</span></button>
          <button onClick={() => dispatch({ type: "toggleAppSettings" })} className="rounded-md p-2 text-ink-secondary hover:bg-raised hover:text-ink" title="App settings"><Settings size={18} /></button>
        </div>
      </div>
      {menu && <BotContextMenu menu={menu} onClose={() => setMenu(null)} />}
      {showPresets && <PresetPicker onClose={() => setShowPresets(false)} />}
    </aside>
  );
}
function BotContextMenu({ menu, onClose }: { menu: MenuState; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const bot = state.bots.find((b) => b.id === menu.botId);
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-bot-menu]")) onClose(); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("mousedown", onDown); window.addEventListener("keydown", onKey); window.addEventListener("blur", onClose);
    return () => { window.removeEventListener("mousedown", onDown); window.removeEventListener("keydown", onKey); window.removeEventListener("blur", onClose); };
  }, [onClose]);
  if (!bot) return null;
  const top = Math.min(menu.y, window.innerHeight - 340); const left = Math.min(menu.x, window.innerWidth - 240);
  const item = (icon: React.ReactNode, label: string, onClick?: () => void, opts?: { danger?: boolean; disabled?: boolean; hint?: string }) => (
    <button key={label} disabled={opts?.disabled} onClick={() => { onClick?.(); onClose(); }} title={opts?.hint} className={cn("flex w-full items-center gap-3 px-3.5 py-2 text-left text-[14px]", opts?.danger ? "text-danger" : "text-ink", opts?.disabled ? "cursor-default opacity-40" : "hover:bg-raised/70")}>{icon}{label}</button>
  );
  return (
    <div data-bot-menu style={{ top, left }} className="fixed z-40 w-[228px] overflow-hidden rounded-xl border border-hairline/50 bg-card py-1.5 shadow-2xl shadow-black/60">
      {item(bot.pinned ? <PinOff size={16} className="text-ink-secondary" /> : <Pin size={16} className="text-ink-secondary" />, bot.pinned ? "Unpin" : "Pin", () => dispatch({ type: "updateBot", botId: bot.id, patch: { pinned: !bot.pinned } }))}
      {item(<Settings size={16} className="text-ink-secondary" />, "Settings", () => dispatch({ type: "toggleSettings", open: true }), { hint: "Open bot settings" })}
      {item(<Users size={16} className="text-ink-secondary" />, "Set as Director", () => dispatch({ type: "setDirector", botId: bot.id }))}
      <div className="mx-2 my-1 border-t border-hairline/40" />
      {item(<Trash2 size={16} />, "Delete", () => dispatch({ type: "deleteBot", botId: bot.id }), { danger: true })}
    </div>
  );
}
