// Code editor side panel — shows code from chat, editable, bot can update
import { useState } from "react";
import { X, Save, Copy, Code } from "lucide-react";
import { useStore } from "@/state/store";

export function CodeEditorPanel() {
  const { state, dispatch } = useStore();
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const editor = state.codeEditor;
  if (!editor) return null;
  const copy = () => { navigator.clipboard?.writeText(editor.content); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const save = () => {
    // Save to file if we can detect a path, otherwise just keep in state
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return (
    <aside className="animate-panel-in flex h-full w-[500px] shrink-0 flex-col border-l border-hairline/40 bg-panel">
      <div className="flex items-center justify-between border-b border-hairline/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Code size={18} className="text-ink-secondary" />
          <span className="text-[15px] font-semibold text-ink">{editor.lang || "code"}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copy} className="rounded-md p-1.5 text-ink-secondary hover:bg-raised hover:text-ink" title="Copy">
            {copied ? <span className="text-[11px] text-success">Copied!</span> : <Copy size={15} />}
          </button>
          <button onClick={save} className="rounded-md p-1.5 text-ink-secondary hover:bg-raised hover:text-ink" title="Save">
            {saved ? <span className="text-[11px] text-success">Saved!</span> : <Save size={15} />}
          </button>
          <button onClick={() => dispatch({ type: "closeCodeEditor" })} className="rounded-md p-1.5 text-ink-secondary hover:bg-raised hover:text-ink" title="Close">
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <textarea
          value={editor.content}
          onChange={(e) => dispatch({ type: "updateCodeEditor", content: e.target.value })}
          className="h-full w-full resize-none bg-inset p-4 font-mono text-[12px] leading-relaxed text-ink focus:outline-none"
          spellCheck={false}
          placeholder="Code will appear here..."
        />
      </div>
      <div className="border-t border-hairline/40 px-4 py-2 text-[11px] text-ink-secondary">
        Bot can update this panel without rewriting the full script
      </div>
    </aside>
  );
}
