// Network device management — SSH and ADB connections for
// remote computer use. Device credentials are stored locally
// in ~/.openmausbot/config.json and NEVER echoed back (same
// pattern as API keys) — secrets are write-only.
import { execSync, spawn } from "node:child_process";
import type { AppConfig, NetworkDevice } from "./config.js";

// Sanitize device for the POST body — removes credentials
export function sanitizeDevice(dev: NetworkDevice): Record<string, unknown> {
  const { password: _pw, keyPath: _kp, ...rest } = dev;
  return rest;
}

// Get a device by id (credentials intact)
export function getDevice(cfg: AppConfig, devId: string): NetworkDevice | null {
  return cfg.devices?.find((d) => d.id === devId) ?? null;
}

// List devices (SAFE — no credentials exposed)
export function listDevices(cfg: AppConfig): Array<{ id: string; name: string; type: string; host?: string; port?: number; username?: string; adbDeviceId?: string; connected?: boolean }> {
  return (cfg.devices || []).map((d) => ({
    id: d.id, name: d.name, type: d.type,
    host: d.host, port: d.port, username: d.username,
    adbDeviceId: d.adbDeviceId,
    connected: false,
  }));
}

// Run a command on a device via SSH or ADB
export async function runDeviceCommand(dev: NetworkDevice, command: string, timeoutMs = 30000): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  if (dev.type === "ssh") {
    return runSSH(dev, command, timeoutMs);
  } else if (dev.type === "adb") {
    const adbCmd = dev.adbDeviceId ? `adb -s ${dev.adbDeviceId} shell ${command}` : `adb shell ${command}`;
    const out = execSync(adbCmd, { timeout: timeoutMs, encoding: "utf8" });
    return { stdout: out.toString().trim(), stderr: "", exitCode: 0 };
  }
  throw new Error("unknown device type: " + dev.type);
}

// Run SSH command using spawn for better error handling
function runSSH(dev: NetworkDevice, command: string, timeoutMs = 30000): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  const args = ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null"];
  if (dev.port) args.push("-p", String(dev.port));
  if (dev.keyPath) {
    args.push("-i", dev.keyPath, "-o", "BatchMode=yes");
  } else {
    args.push("-o", "BatchMode=yes");
  }
  const target = `${dev.username || "root"}@${dev.host}`;
  args.push(target, command);
  return new Promise((resolve) => {
    const child = spawn(args[0], args.slice(1), { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout?.on("data", (d) => (stdout += d));
    child.stderr?.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code }));
    child.on("error", (e) => resolve({ stdout: "", stderr: e.message, exitCode: -1 }));
    setTimeout(() => { try { child.kill(); } catch {} resolve({ stdout: "", stderr: "timeout", exitCode: -1 }); }, timeoutMs);
  });
}

// Test connection to a device
export async function testDevice(dev: NetworkDevice): Promise<{ ok: boolean; message: string }> {
  try {
    if (dev.type === "ssh") {
      const r = await runSSH(dev, "echo connected", 10000);
      return { ok: r.exitCode === 0, message: r.exitCode === 0 ? "Connected" : r.stderr.slice(0, 200) };
    } else if (dev.type === "adb") {
      const adbCmd = dev.adbDeviceId ? `adb -s ${dev.adbDeviceId} get-state` : `adb get-state`;
      const out = execSync(adbCmd, { timeout: 10000, encoding: "utf8" }).toString().trim();
      const ok = /device/i.test(out);
      return { ok, message: ok ? "Connected (" + out + ")" : out || "ADB not reachable — is adb in PATH?" };
    }
    return { ok: false, message: "unknown device type" };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

// Capture a screenshot from a device
export async function deviceScreenshot(dev: NetworkDevice): Promise<{ png: string; format: string }> {
  if (dev.type === "ssh") {
    const display = dev.display || "${DISPLAY:-:0}";
    const cmd = `DISPLAY=${display} (scrot /tmp/dev_screen.png 2>/dev/null || gnome-screenshot -f /tmp/dev_screen.png 2>/dev/null || import -window root /tmp/dev_screen.png 2>/dev/null) && cat /tmp/dev_screen.png | base64`;
    const r = await runSSH(dev, cmd, 30000);
    if (r.stdout && /^[A-Za-z0-9+/=]+$/m.test(r.stdout.trim())) {
      return { png: r.stdout.trim(), format: "png" };
    }
    throw new Error("screenshot failed: " + (r.stderr || r.stdout).slice(0, 200));
  } else if (dev.type === "adb") {
    const adbCmd = dev.adbDeviceId ? `adb -s ${dev.adbDeviceId} exec-out screencap -p` : `adb exec-out screencap -p`;
    const buf = execSync(adbCmd, { timeout: 30000, encoding: "buffer", maxBuffer: 10_000_000 });
    const b64 = buf.toString("base64");
    if (b64 && b64.length > 100) {
      return { png: b64, format: "png" };
    }
    throw new Error("ADB screencapture failed: no output");
  }
  throw new Error("unknown device type");
}

// Generate a new device ID
export function newDeviceId(): string {
  return "dev-" + new Date().getTime().toString(36) + "-" + Math.random().toString(36).slice(0, 4);
}
