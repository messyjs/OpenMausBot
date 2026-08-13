// Settings login — password gate for the settings panel.
// First use: create a password. After that: enter password to unlock.
import { useState } from "react";
import { Lock, Unlock, X } from "lucide-react";
import { api, useStore } from "@/state/store";

export function SettingsLogin({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const { state } = useStore();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode] = useState<"login" | "create">(state.config?.settingsPassword?.configured ? "login" : "create");

  const submit = () => {
    setError(null);
    if (mode === "create") {
      if (password.length < 4) { setError("Password must be at least 4 characters"); return; }
      if (password !== confirm) { setError("Passwords do not match"); return; }
      api("/api/config", { method: "PUT", body: JSON.stringify({ settingsPassword: password }) })
        .then(() => { onSuccess(); })
        .catch((e) => setError(e.message));
    } else {
      api("/api/verify-settings-password", { method: "POST", body: JSON.stringify({ password }) })
        .then((r: any) => { if (r.ok) onSuccess(); else setError("Wrong password"); })
        .catch((e) => setError(e.message));
    }
  };

  const inputCls = "w-full rounded-lg border border-hairline/40 bg-inset px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-secondary focus:outline-none focus:border-hairline";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[360px] rounded-2xl border border-hairline/50 bg-panel p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-ink-secondary" />
            <span className="text-[16px] font-semibold text-ink">{mode === "create" ? "Set Settings Password" : "Enter Password"}</span>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-ink-secondary hover:bg-raised"><X size={16} /></button>
        </div>
        <div className="text-[13px] text-ink-secondary mb-4">
          {mode === "create" ? "Create a password to protect your bot and device settings." : "Enter your password to access settings."}
        </div>
        <div className="flex flex-col gap-3">
          <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? submit() : confirm && submit())} placeholder="Password" autoFocus />
          {mode === "create" && (
            <input type="password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Confirm password" />
          )}
          {error && <div className="text-[13px] text-danger">{error}</div>}
          <button onClick={submit} className="flex items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-[14px] font-medium text-white hover:bg-accent/90">
            <Unlock size={15} /> {mode === "create" ? "Create & Unlock" : "Unlock"}
          </button>
        </div>
      </div>
    </div>
  );
}
