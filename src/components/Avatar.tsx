import { memo, useId, type CSSProperties } from "react";
import { MAUS_COLORS, type MausColor, type MausExpression, type MausMotion } from "@/lib/mascot";

function shade(hex: string, amt: number) {
  const v = Number.parseInt(hex.slice(1), 16);
  const ch = (s: number) => Math.max(0, Math.min(255, ((v >> s) & 0xff) + amt));
  return "#" + [ch(16), ch(8), ch(0)].map((p) => p.toString(16).padStart(2, "0")).join("");
}

function Veins({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) {
  const veins: Array<{a:number;len:number;w:number}> = [];
  for (let a = 10; a < 360; a += 18) veins.push({ a, len: 0.2 + (a % 5) * 0.08, w: 0.6 + (a % 3) * 0.3 });
  const main = [{a:45,len:0.4,w:1.2},{a:135,len:0.35,w:1},{a:225,len:0.4,w:1.2},{a:315,len:0.35,w:1}];
  return (
    <g fill="none">
      {veins.map((v, i) => {
        const rad = (v.a * Math.PI) / 180;
        return <line key={i} x1={cx+Math.cos(rad)*rx*0.75} y1={cy+Math.sin(rad)*ry*0.75} x2={cx+Math.cos(rad)*rx*(1+v.len)} y2={cy+Math.sin(rad)*ry*(1+v.len)} stroke="#cc0000" strokeWidth={v.w} opacity="0.85" />;
      })}
      {main.map((v, i) => {
        const rad = (v.a * Math.PI) / 180;
        return <line key={"m"+i} x1={cx+Math.cos(rad)*rx*0.7} y1={cy+Math.sin(rad)*ry*0.7} x2={cx+Math.cos(rad)*rx*(1+v.len)} y2={cy+Math.sin(rad)*ry*(1+v.len)} stroke="#dd0000" strokeWidth={v.w} opacity="0.9" />;
      })}
    </g>
  );
}

function Eye({ cx, cy, rx, ry, expression, side }: {
  cx: number; cy: number; rx: number; ry: number; expression: MausExpression; side: string;
}) {
  const openMap: Record<string, number> = {
    deadpan: 0.45, friendly: 0.7, focused: 0.35, thinking: 0.4,
    excited: 0.85, sleepy: 0.12, surprised: 0.95, skeptical: 0.3,
    worried: 0.5, mischievous: 0.25,
  };
  const open = openMap[expression] ?? 0.45;
  let pdx = 0, pdy = 0;
  if (expression === "thinking") { pdx = 1.5; pdy = -1; }
  if (expression === "skeptical" && side === "r") pdx = 2;
  const pr = expression === "surprised" ? Math.min(rx, ry) * 0.22 : Math.min(rx, ry) * 0.28;
  const eh = ry * 2 * open;
  const gid = useId();
  return (
    <g>
      <clipPath id={gid}><ellipse cx={cx} cy={cy} rx={rx} ry={eh / 2} /></clipPath>
      <g clipPath={"url(#" + gid + ")"}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#f8f8f2" />
        <Veins cx={cx} cy={cy} rx={rx} ry={ry} />
        <circle cx={cx + pdx} cy={cy + pdy} r={pr} fill="#111" />
        <circle cx={cx + pdx - pr*0.3} cy={cy + pdy - pr*0.3} r={pr*0.3} fill="#fff" opacity="0.6" />
      </g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={eh / 2} fill="none" stroke="#777" strokeWidth="0.5" />
    </g>
  );
}

function Mouth({ cx, cy, expression }: { cx: number; cy: number; expression: MausExpression }) {
  const w = 14;
  const D: Record<string, string> = {
    deadpan: "M"+(cx-w/2)+" "+cy+" L"+(cx+w/2)+" "+cy,
    friendly: "M"+(cx-w/2)+" "+cy+" Q"+cx+" "+(cy+6)+" "+(cx+w/2)+" "+cy,
    focused: "M"+(cx-w/2)+" "+(cy+1)+" L"+(cx+w/2)+" "+(cy+1),
    thinking: "M"+(cx-w/3)+" "+cy+" Q"+cx+" "+(cy+2)+" "+(cx+w/3)+" "+cy,
    excited: "M"+(cx-w/2)+" "+(cy-1)+" Q"+cx+" "+(cy+8)+" "+(cx+w/2)+" "+(cy-1),
    sleepy: "M"+(cx-w/3)+" "+(cy+1)+" Q"+cx+" "+(cy+2)+" "+(cx+w/3)+" "+(cy+1),
    surprised: "M"+(cx-3)+" "+cy+" a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0",
    skeptical: "M"+(cx-w/2)+" "+(cy+2)+" Q"+cx+" "+(cy-1)+" "+(cx+w/2)+" "+cy,
    worried: "M"+(cx-w/2)+" "+(cy+2)+" Q"+cx+" "+(cy-2)+" "+(cx+w/2)+" "+(cy+2),
    mischievous: "M"+(cx-w/2)+" "+cy+" Q"+(cx+1)+" "+(cy+4)+" "+(cx+w/2)+" "+(cy-1),
  };
  return <path d={D[expression] ?? D.deadpan} stroke="#111" strokeWidth="2" fill={expression === "surprised" ? "#111" : "none"} strokeLinecap="round" />;
}
const MOTION_CSS: Record<string, { name: string; dur: string }> = {
  arrive: { name: "towel-arrive", dur: "0.6s" },
  switch: { name: "towel-switch", dur: "0.5s" },
  customize: { name: "towel-customize", dur: "0.8s" },
  alert: { name: "towel-alert", dur: "0.4s" },
  thinking: { name: "towel-thinking", dur: "1.2s" },
  working: { name: "towel-working", dur: "0.6s" },
  launch: { name: "towel-launch", dur: "0.5s" },
  success: { name: "towel-success", dur: "0.6s" },
  celebrate: { name: "towel-celebrate", dur: "0.8s" },
  blink: { name: "towel-blink", dur: "0.15s" },
  surprise: { name: "towel-surprise", dur: "0.4s" },
  failure: { name: "towel-failure", dur: "0.6s" },
};

export const MausAvatar = memo(function MausAvatar({
  color = "purple", expression = "deadpan", size = 44,
  motion = "none", motionKey = 0,
  className, onDragStart, style,
}: {
  color?: MausColor; expression?: MausExpression; size?: number;
  motion?: MausMotion; motionKey?: number; className?: string;
  onDragStart?: React.DragEventHandler<SVGSVGElement>; style?: CSSProperties;
}) {
  const base = MAUS_COLORS[color] ?? MAUS_COLORS.purple;
  const dark = shade(base, -40);
  const gid = useId();
  const mc = motion !== "none" ? MOTION_CSS[motion] : null;
  const bx1 = 32, bx2 = 88, by1 = 14, by2 = 96;
  const bh = by2 - by1, stripe1Y = by1 + bh * 0.2, stripe2Y = by1 + bh * 0.8, foldY = stripe1Y;
  const lc = "#f0f0f0", ld = "#cccccc";
  const animStyle = mc ? { animation: mc.name + " " + mc.dur + " ease-in-out" } as CSSProperties : undefined;

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} onDragStart={onDragStart} style={style}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={base} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>
      <g key={motionKey} style={animStyle}>

        <g stroke={lc} strokeWidth="2.5" strokeLinecap="round">
          <line x1={bx1-2} y1="52" x2={bx1-10} y2="48" />
          <line x1={bx2+2} y1="52" x2={bx2+10} y2="48" />
        </g>
        <circle cx={bx1-11} cy="47" r="4" fill={lc} stroke={ld} strokeWidth="0.5" />
        <circle cx={bx2+11} cy="47" r="4" fill={lc} stroke={ld} strokeWidth="0.5" />

        <g stroke={lc} strokeWidth="2.5" strokeLinecap="round">
          <line x1="50" y1={by2-1} x2="46" y2={by2+8} />
          <line x1="70" y1={by2-1} x2="74" y2={by2+8} />
        </g>
        <ellipse cx="44" cy={by2+9} rx="5" ry="3" fill={lc} stroke={ld} strokeWidth="0.5" />
        <ellipse cx="76" cy={by2+9} rx="5" ry="3" fill={lc} stroke={ld} strokeWidth="0.5" />

        <path d={"M"+bx1+" "+by1+" L"+bx2+" "+by1+" L"+bx2+" "+(by2-2)+" Q"+bx2+" "+(by2+2)+" "+(bx2-4)+" "+by2+" L"+(bx1+4)+" "+by2+" Q"+bx1+" "+(by2+2)+" "+bx1+" "+(by2-2)+" Z"} fill={"url(#"+gid+")"} stroke={dark} strokeWidth="1.5" />

        <rect x={bx1-1} y={stripe1Y-2.5} width={bx2-bx1+2} height="5" fill="#f8f8f8" opacity="0.95" />
        <rect x={bx1-1} y={stripe2Y-2.5} width={bx2-bx1+2} height="5" fill="#f8f8f8" opacity="0.95" />

        <path d={"M"+bx1+" "+by1+" L"+bx2+" "+by1+" L"+(bx2+3)+" "+(foldY+2)+" Q"+((bx2+bx1)/2)+" "+(foldY+8)+" "+(bx1-3)+" "+(foldY+2)+" Z"} fill={"url(#"+gid+")"} stroke={dark} strokeWidth="1.5" />
        <path d={"M"+(bx1-2)+" "+(foldY+1)+" Q"+((bx2+bx1)/2)+" "+(foldY+7)+" "+(bx2+2)+" "+(foldY+1)} fill="none" stroke={dark} strokeWidth="0.8" opacity="0.4" />

        <Eye cx={45} cy={foldY-4} rx={7} ry={11} expression={expression} side="l" />
        <Eye cx={75} cy={foldY-4} rx={7} ry={11} expression={expression} side="r" />
        <Mouth cx={60} cy={foldY+14} expression={expression} />
      </g>
    </svg>
  );
});

export function InitialsAvatar({ initials, size = 44 }: { initials: string; size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-full bg-raised text-[15px] font-semibold text-ink-secondary">{initials}</div>
  );
}
