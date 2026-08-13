import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { StoreProvider, useStore } from "@/state/store";
import { Onboarding } from "@/components/Onboarding";
import { emailGateDone, initAnalytics } from "@/lib/analytics";
import { Sidebar } from "@/components/Sidebar";
import { ChatView } from "@/components/ChatView";
import { SettingsPanel } from "@/components/SettingsPanel";
import { PluginsPanel } from "@/components/PluginsPanel";
import { ComputerPanel } from "@/components/ComputerPanel";
import { AppSettingsPanel } from "@/components/AppSettingsPanel";
import { SettingsLogin } from "@/components/SettingsLogin";
import { EngineBuilder } from "@/components/EngineBuilder";

function Shell() {
  const { state, dispatch } = useStore();
  const [showLogin, setShowLogin] = useState(false);
  const [autoEngine, setAutoEngine] = useState(false);
  // Check URL for ?open=engine-builder
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("open") === "engine-builder") {
      setAutoEngine(true);
      dispatch({ type: "toggleAppSettings", open: true });
    }
  }, []);
  const bot = state.bots.find((b) => b.id === state.selectedId) ?? state.bots[0];
  const onLoginSuccess = () => { setShowLogin(false); dispatch({ type: "unlockSettings", on: true }); };
  return (
    <div className="relative flex h-full">
      <Sidebar />
      {bot ? (
        <div className="flex h-full min-w-0 flex-1 flex-col">
          {/* Primary chat (top pane) */}
          <div style={{ height: state.secondarySession ? state.splitPosition + "%" : "100%" }} className="min-h-0 overflow-hidden">
            <ChatView bot={bot} />
          </div>
          {/* Draggable divider */}
          {state.secondarySession && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                const onMove = (ev: MouseEvent) => {
                  const container = (e.target as HTMLElement).parentElement;
                  if (!container) return;
                  const rect = container.getBoundingClientRect();
                  const pct = Math.max(5, Math.min(95, ((ev.clientY - rect.top) / rect.height) * 100));
                  dispatch({ type: "setSplitPosition", position: pct });
                };
                const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
                document.addEventListener("mousemove", onMove);
                document.addEventListener("mouseup", onUp);
              }}
              className="h-1.5 shrink-0 cursor-row-resize bg-hairline/40 hover:bg-accent/50 transition-colors"
            />
          )}
          {/* Secondary chat (bottom pane) */}
          {state.secondarySession && (
            <div style={{ height: (100 - state.splitPosition) + "%" }} className="min-h-0 overflow-hidden border-t border-hairline/40">
              {(() => {
                const secBot = state.bots.find((b) => b.id === state.secondarySession!.botId);
                return secBot ? <ChatView bot={secBot} isSecondary /> : null;
              })()}
            </div>
          )}
        </div>
      ) : (
        <main className="flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-3 bg-app text-ink-secondary">
          <Loader2 size={20} className="animate-spin" />
          <div className="text-[14px]">
            {state.connected ? "No bots yet" : "Connecting to the bot server…"}
          </div>
          {!state.connected && (
            <div className="text-[12px]">
              Start it with <code className="rounded bg-raised px-1.5 py-0.5">pnpm dev:server</code>
            </div>
          )}
        </main>
      )}
      {showLogin && <SettingsLogin onSuccess={onLoginSuccess} onClose={() => setShowLogin(false)} />}
      {state.settingsOpen && bot && (state.settingsUnlocked || !state.config?.settingsPassword?.configured ? <SettingsPanel bot={bot} /> : <SettingsLogin onSuccess={onLoginSuccess} onClose={() => { setShowLogin(false); dispatch({ type: "toggleSettings", open: false }); }} />)}
      {state.computerOpen && bot && <ComputerPanel bot={bot} />}
      {autoEngine && <EngineBuilder onClose={() => setAutoEngine(false)} />}
      {state.appSettingsOpen && (state.settingsUnlocked || !state.config?.settingsPassword?.configured ? <AppSettingsPanel /> : <SettingsLogin onSuccess={onLoginSuccess} onClose={() => { setShowLogin(false); dispatch({ type: "toggleAppSettings", open: false }); }} />)}
      {state.pluginsOpen && <PluginsPanel />}
    </div>
  );
}

export default function App() {
  const [gated, setGated] = useState(() => !emailGateDone());
  useEffect(() => {
    initAnalytics();
  }, []);
  return (
    <StoreProvider>
      <Shell />
      {gated && <Onboarding onDone={() => setGated(false)} />}
    </StoreProvider>
  );
}
