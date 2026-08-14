// Network device management — add/edit/remove SSH and ADB devices.
// Credentials (passwords, key paths) are stored locally and never
// echoed back by the server. This component handles the CRUD UI.
import { useState } from "react";
import { Check, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { api, useStore, type DeviceInfo } from "@/state/store";
import { cn } from "@/lib/cn";

export function DeviceManager() {
  const { state, dispatch } = useStore();
  const [editing, setEditing] = useState<(DeviceInfo & { password?: string; keyPath?: string; tunnelUrl?: string; tailscaleIp?: string }) | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [foundDevices, setFoundDevices] = useState<Array<{name: string; type: string; host: string; port?: number; adbDeviceId?: string}>>([]);

  const scan = () => {
    setScanning(true);
    api("/api/devices/scan", { method: "POST" })
      .then((data: any) => { setFoundDevices(data.devices || []); setScanning(false); })
      .catch(() => setScanning(false));
  };
  const addFoundDevice = (d: any) => {
    api("/api/devices", { method: "POST", body: JSON.stringify({ id: "", name: d.name, type: d.type, host: d.host, port: d.port, adbDeviceId: d.adbDeviceId }) })
      .then(() => api("/api/devices"))
      .then(({ devices }) => { dispatch({ type: "devices", devices }); setFoundDevices(foundDevices.filter(f => f.host !== d.host)); })
      .catch(() => {});
  };

  const addDevice = () => {
    setEditing({ id: "", name: "", type: "ssh", host: "", port: 22, username: "root" });
    setTestResult(null);
  };

  const saveDevice = () => {
    if (!editing) return;
    api("/api/devices", { method: "POST", body: JSON.stringify(editing) })
      .then(() => api("/api/devices"))
      .then(({ devices }) => { dispatch({ type: "devices", devices }); setEditing(null); })
      .catch((e) => setTestResult({ ok: false, message: e.message }));
  };

  const deleteDevice = (id: string) => {
    api("/api/devices/" + id, { method: "DELETE" })
      .then(() => api("/api/devices"))
      .then(({ devices }) => dispatch({ type: "devices", devices }))
      .catch(() => {});
  };

  const testConn = () => {
    if (!editing) return;
    setTesting(editing.id || "new");
    setTestResult(null);
    api("/api/devices", { method: "POST", body: JSON.stringify(editing) })
      .then((saved) => {
        if (saved.device && saved.device.id) {
          setEditing({ ...editing, id: saved.device.id });
          return api("/api/devices/" + saved.device.id + "/test", { method: "POST" });
        }
        throw new Error("Save failed");
      })
      .then((result) => setTestResult(result))
      .then(() => api("/api/devices"))
      .then(({ devices }) => dispatch({ type: "devices", devices }))
      .catch((e) => setTestResult({ ok: false, message: e.message }))
      .finally(() => setTesting(null));
  };

  const inputClass = "w-full rounded-lg border border-hairline/40 bg-inset px-3 py-2 text-[13px] text-ink placeholder:text-ink-secondary focus:border-hairline focus:outline-none";
  const labelClass = "mb-1 text-[12px] text-ink-secondary";

  return (
    <div className="mt-4 rounded-xl bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[15px] font-medium text-ink">Network Devices</div>
          <div className="mt-0.5 text-[13px] text-ink-secondary">
            SSH and ADB devices on your network. Credentials stored locally, never shared.
          </div>
        </div>
        <button onClick={addDevice} className="flex items-center gap-1.5 rounded-lg bg-raised px-3 py-1.5 text-[13px] text-ink hover:bg-raised-hover">
          <Plus size={14} /> Add
        </button>
        <button onClick={scan} disabled={scanning} className="flex items-center gap-1.5 rounded-lg bg-raised px-3 py-1.5 text-[13px] text-ink hover:bg-raised-hover disabled:opacity-50">
          {scanning ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Scan
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {state.devices.map((dev) => (
          <div key={dev.id} className="flex items-center justify-between rounded-lg bg-inset px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={cn("size-1.5 rounded-full", dev.connected ? "bg-success" : "bg-ink-secondary/40")} />
              <span className="text-[13px] text-ink">{dev.name}</span>
              <span className="text-[11px] text-ink-secondary">{dev.type.toUpperCase()}</span>
              {dev.host && <span className="text-[11px] text-ink-secondary/70">{dev.host}</span>}
              {dev.adbDeviceId && <span className="text-[11px] text-ink-secondary/70">{dev.adbDeviceId}</span>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { setEditing(dev); setTestResult(null); }} className="rounded-md px-2 py-1 text-[12px] text-ink-secondary hover:bg-raised hover:text-ink">Edit</button>
              <button onClick={() => deleteDevice(dev.id)} className="rounded-md p-1 text-ink-secondary hover:bg-raised hover:text-danger"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {foundDevices.length > 0 && (
          <div className="mt-2 rounded-lg border border-accent/30 bg-accent/5 p-2">
            <div className="mb-1.5 text-[12px] font-medium text-accent">Found {foundDevices.length} devices — click to add</div>
            {foundDevices.map((d, i) => (
              <button key={i} onClick={() => addFoundDevice(d)} className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[12px] text-ink hover:bg-raised/60">
                <span>{d.name}</span>
                <span className="text-ink-secondary">{d.type.toUpperCase()} {d.host || d.adbDeviceId}</span>
              </button>
            ))}
          </div>
        )}

        {state.devices.length === 0 && !editing && (
          <div className="text-[13px] text-ink-secondary py-2 text-center">No devices configured. Click "Add" to connect an SSH or ADB device.</div>
        )}
      </div>
      {editing && (
        <div className="mt-3 rounded-lg border border-hairline/40 bg-inset p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink">{editing.id ? "Edit device" : "New device"}</span>
            <button onClick={() => setEditing(null)} className="rounded-md p-1 text-ink-secondary hover:bg-raised"><X size={14} /></button>
          </div>
          <div className="flex flex-col gap-3">
            <div><div className={labelClass}>Name</div>
              <input className={inputClass} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="My Workstation" /></div>
            <div><div className={labelClass}>Type</div>
              <div className="flex gap-2">
                {(["ssh", "adb"] as const).map((t) => (
                  <button key={t} onClick={() => setEditing({ ...editing, type: t })}
                    className={cn("flex-1 rounded-lg border py-1.5 text-[13px]", editing.type === t ? "border-accent bg-accent/10 text-ink" : "border-hairline/40 text-ink-secondary hover:bg-raised/60")}>
                    {t.toUpperCase()}</button>
                ))}</div></div>
            {editing.type === "ssh" && (<>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2"><div className={labelClass}>Host</div>
                  <input className={inputClass} value={editing.host || ""} onChange={(e) => setEditing({ ...editing, host: e.target.value })} placeholder="192.168.1.100" /></div>
                <div><div className={labelClass}>Port</div>
                  <input type="number" className={inputClass} value={editing.port || 22} onChange={(e) => setEditing({ ...editing, port: Number(e.target.value) })} /></div>
              </div>
              <div><div className={labelClass}>Username</div>
                <input className={inputClass} value={editing.username || ""} onChange={(e) => setEditing({ ...editing, username: e.target.value })} placeholder="root" /></div>
              <div><div className={labelClass}>Password (optional)</div>
                <input type="password" className={inputClass} onChange={(e) => setEditing({ ...editing, password: e.target.value })} placeholder="Leave empty for key-based auth" /></div>
              <div><div className={labelClass}>SSH Key Path (optional)</div>
                <input className={inputClass} value={(editing as any).keyPath || ""} onChange={(e) => setEditing({ ...editing, keyPath: e.target.value } as any)} placeholder="~/.ssh/id_rsa" /></div>
              <div><div className={labelClass}>Cloudflare Tunnel URL (optional)</div>
                <input className={inputClass} value={(editing as any).tunnelUrl || ""} onChange={(e) => setEditing({ ...editing, tunnelUrl: e.target.value } as any)} placeholder="https://my-tunnel.example.com" /></div>
              <div><div className={labelClass}>Tailscale IP/Hostname (optional)</div>
                <input className={inputClass} value={(editing as any).tailscaleIp || ""} onChange={(e) => setEditing({ ...editing, tailscaleIp: e.target.value } as any)} placeholder="100.x.x.x or tailnet-name" /></div>
            </>)}
            {editing.type === "adb" && (
              <div><div className={labelClass}>ADB Device ID (optional)</div>
                <input className={inputClass} value={editing.adbDeviceId || ""} onChange={(e) => setEditing({ ...editing, adbDeviceId: e.target.value })} placeholder="e.g. emulator-5554" /></div>
            )}
            {testResult && (
              <div className={cn("rounded-lg px-3 py-2 text-[12px]", testResult.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                {testResult.message}</div>
            )}
            <div className="flex gap-2">
              <button onClick={saveDevice} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-raised py-2 text-[13px] text-ink hover:bg-raised-hover"><Check size={14} /> Save</button>
              <button onClick={testConn} disabled={!!testing} className="flex items-center justify-center gap-1.5 rounded-lg bg-raised px-4 py-2 text-[13px] text-ink hover:bg-raised-hover disabled:opacity-50">
                {testing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Test</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
