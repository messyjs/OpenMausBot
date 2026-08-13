// Bot tools — functions that Ollama bots can call during a turn.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { AppConfig } from "./config.ts";
import { getDevice, runDeviceCommand, deviceScreenshot } from "./devices.ts";

export interface ToolDef {
  type: "function";
  function: { name: string; description: string; parameters: { type: "object"; properties: Record<string, unknown>; required: string[] } };
}
export type ToolExecutor = (args: Record<string, unknown>) => Promise<string>;
const MEM_DIR = join(homedir(), ".openmausbot", "memory");

export function getShellTools(): ToolDef[] {
  return [
    { type:"function", function:{ name:"execute_command", description:"Execute a shell command. If device_id is provided, runs on that network device via SSH/ADB. If omitted, runs locally.", parameters:{ type:"object", properties:{ command:{type:"string",description:"The shell command to execute"}, device_id:{type:"string",description:"Optional: network device ID (e.g. dev-workstation)"}, timeout:{type:"number",description:"Optional: timeout in ms"} }, required:["command"] } } },
    { type:"function", function:{ name:"read_file", description:"Read the contents of a file. If device_id is provided, reads from that device via SSH.", parameters:{ type:"object", properties:{ path:{type:"string",description:"Path to the file"}, device_id:{type:"string",description:"Optional: network device ID"} }, required:["path"] } } },
    { type:"function", function:{ name:"write_file", description:"Write content to a file. If device_id is provided, writes on that device via SSH.", parameters:{ type:"object", properties:{ path:{type:"string",description:"Path to write to"}, content:{type:"string",description:"Content to write"}, device_id:{type:"string",description:"Optional: network device ID"} }, required:["path","content"] } } },
    { type:"function", function:{ name:"list_directory", description:"List files at a path. If device_id is provided, lists on that device via SSH.", parameters:{ type:"object", properties:{ path:{type:"string",description:"Directory path"}, device_id:{type:"string",description:"Optional: network device ID"} }, required:["path"] } } },
  ];
}
export function getMemoryTools(): ToolDef[] {
  return [
    { type:"function", function:{ name:"remember", description:"Store information in long-term memory for future conversations.", parameters:{ type:"object", properties:{ key:{type:"string",description:"Memory key"}, value:{type:"string",description:"Content to remember"} }, required:["key","value"] } } },
    { type:"function", function:{ name:"recall", description:"Retrieve from memory by key, or list all keys if no key given.", parameters:{ type:"object", properties:{ key:{type:"string",description:"Memory key (omit to list all)"} }, required:[] } } },
  ];
}
export function getDeviceTools(): ToolDef[] {
  return [
    { type:"function", function:{ name:"screenshot_device", description:"Capture a screenshot from a network device.", parameters:{ type:"object", properties:{ device_id:{type:"string",description:"Network device ID"} }, required:["device_id"] } } },
  ];
}

export function getToolsForBot(opts: { hasNetwork: boolean }): ToolDef[] {
  const tools = [...getShellTools(), ...getMemoryTools()];
  if (opts.hasNetwork) tools.push(...getDeviceTools());
  return tools;
}
export function createToolExecutor(cfg: AppConfig, botDeviceId?: string): Record<string, ToolExecutor> {
  const executors: Record<string, ToolExecutor> = {};
  const nl = String.fromCharCode(10);

  executors.execute_command = async (args) => {
    const cmd = String(args.command ?? "");
    const devId = String(args.device_id ?? botDeviceId ?? "");
    const timeout = Number(args.timeout ?? 30000);
    if (!cmd) return "Error: no command provided";
    if (devId) {
      const dev = getDevice(cfg, devId);
      if (!dev) return "Error: device not found: " + devId;
      const r = await runDeviceCommand(dev, cmd, timeout);
      return r.stdout + (r.stderr ? nl + "[stderr] " + r.stderr : "") + nl + "[exit: " + r.exitCode + "]";
    }
    try {
      // Use spawn for non-blocking execution (GUI apps like notepad won't block)
      const { spawn } = require("node:child_process");
      const isWindows = process.platform === "win32";
      const child = spawn(isWindows ? "cmd" : "/bin/sh", isWindows ? ["/c", cmd] : ["-c", cmd], { detached: !isWindows, stdio: ["pipe", "pipe", "pipe"] });
      let stdout = "", stderr = "";
      child.stdout?.on("data", (d: Buffer) => stdout += d.toString());
      child.stderr?.on("data", (d: Buffer) => stderr += d.toString());
      return new Promise((resolve) => {
        const timer = setTimeout(() => { try { child.kill(); } catch {} resolve(stdout + (stderr ? nl + "[stderr] " + stderr : "") + nl + "[timed out after " + timeout + "ms]"); }, timeout);
        child.on("close", (code: number | null) => { clearTimeout(timer); resolve(stdout + (stderr ? nl + "[stderr] " + stderr : "") + nl + "[exit: " + code + "]"); });
        child.on("error", (e: Error) => { clearTimeout(timer); resolve("Error: " + e.message); });
      });
    } catch (e) {
      return "Error: " + (e instanceof Error ? e.message : String(e));
    }
  };

  executors.read_file = async (args) => {
    const path = String(args.path ?? "");
    const devId = String(args.device_id ?? botDeviceId ?? "");
    if (devId) {
      const dev = getDevice(cfg, devId);
      if (!dev) return "Error: device not found";
      const r = await runDeviceCommand(dev, "cat " + JSON.stringify(path), 10000);
      return r.stdout;
    }
    try { return readFileSync(path, "utf8"); } catch (e) { return "Error: " + e; }
  };

  executors.write_file = async (args) => {
    const path = String(args.path ?? "");
    const content = String(args.content ?? "");
    const devId = String(args.device_id ?? botDeviceId ?? "");
    if (devId) {
      const dev = getDevice(cfg, devId);
      if (!dev) return "Error: device not found";
      const r = await runDeviceCommand(dev, "mkdir -p $(dirname " + JSON.stringify(path) + ") && printf " + JSON.stringify(content) + " > " + JSON.stringify(path), 10000);
      return r.exitCode === 0 ? "Wrote " + content.length + " bytes to " + path : "Error: " + r.stderr;
    }
    try {
      const dir = path.substring(0, path.lastIndexOf("/"));
      if (dir) mkdirSync(dir, { recursive: true });
      writeFileSync(path, content);
      return "Wrote " + content.length + " bytes to " + path;
    } catch (e) { return "Error: " + e; }
  };

  executors.list_directory = async (args) => {
    const path = String(args.path ?? "");
    const devId = String(args.device_id ?? botDeviceId ?? "");
    if (devId) {
      const dev = getDevice(cfg, devId);
      if (!dev) return "Error: device not found";
      const r = await runDeviceCommand(dev, "ls -la " + JSON.stringify(path), 10000);
      return r.stdout;
    }
    try { return readdirSync(path).join(nl); } catch (e) { return "Error: " + e; }
  };

  executors.remember = async (args) => {
    const key = String(args.key ?? "");
    const value = String(args.value ?? "");
    if (!key) return "Error: no key";
    mkdirSync(MEM_DIR, { recursive: true });
    writeFileSync(join(MEM_DIR, key + ".json"), JSON.stringify({ key, value, at: Date.now() }));
    return "Remembered: " + key;
  };

  executors.recall = async (args) => {
    const key = String(args.key ?? "");
    if (!existsSync(MEM_DIR)) return "No memories yet.";
    if (key) {
      try {
        const data = JSON.parse(readFileSync(join(MEM_DIR, key + ".json"), "utf8"));
        return data.value;
      } catch { return "No memory found for key: " + key; }
    }
    const keys = readdirSync(MEM_DIR).map(f => f.replace(".json", ""));
    return "Memory keys: " + keys.join(", ");
  };

  executors.screenshot_device = async (args) => {
    const devId = String(args.device_id ?? botDeviceId ?? "");
    if (!devId) return "Error: no device_id";
    const dev = getDevice(cfg, devId);
    if (!dev) return "Error: device not found";
    const frame = await deviceScreenshot(dev);
    return "Screenshot captured (" + frame.png.length + " bytes base64)";
  };

  return executors;
}
