import { memo, useId, type CSSProperties } from "react";
import { MAUS_COLORS, type MausColor, type MausExpression, type MausMotion } from "@/lib/mascot";

// Towelie — the South Park towel character.
// Light blue-grey body, big round white bloodshot eyes,
// stoned half-lidded expression, towel texture lines.

function shade(hex: string, amt: number) {
  const v = Number.parseInt(hex.slice(1), 16);
  const ch = (s: number) => Math.max(0, Math.min(255, ((v >> s) & 0xff) + amt));
  return "#" + [ch(16), ch(8), ch(0)].map((p) => p.toString(16).padStart(2, "0")).join("");
}

// Bloodshot veins radiating from eye edges
function Veins({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const vs = [-20,-50,-80,-110,-140,-170,20,50,80,110,140,170];
  return (
    <g stroke="#cc3333" strokeWidth="0.7" opacity="0.7" fill="none">
      {vs.map((a, i) => {
        const rad = (a * Math.PI) / 180;
        const x1 = cx + Math.cos(rad) * r * 0.8;
        const y1 = cy + Math.sin(rad) * r * 0.8;
        const len = 0.3 + (i % 3) * 0.15;
        const x2 = cx + Math.cos(rad) * r * (1 + len);
        const y2 = cy + Math.sin(rad) * r * (1 + len);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
    </g>
  );
}

function TowelieEye({ cx, cy, r, expression, side }: {
  cx: number; cy: number; r: number; expression: MausExpression; side: string;
}) {
  // How open the eye is (0=closed, 1=wide)
  const openMap: Record<string, number> = {
    deadpan: 0.55, friendly: 0.8, focused: 0.45, thinking: 0.5,
    excited: 0.95, sleepy: 0.2, surprised: 1.0, skeptical: 0.4,
    worried: 0.6, mischievous: 0.35,
  };
  const openness = openMap[expression] ?? 0.55;
  let pdx = 0, pdy = 0;
  if (expression === "thinking") { pdx = 2; pdy = -2; }
  if (expression === "skeptical") { pdx = side === "right" ? 2.5 : -1; }
  const pr = expression === "surprised" ? r * 0.22 : r * 0.28;
  const eyeH = r * 2 * openness;

  return (
    <g>
      <clipPath id={`eye-${side}-${cx}`}>
        <ellipse cx={cx} cy={cy} rx={r} ry={eyeH / 2} />
      </clipPath>
      <g clipPath={`url(#eye-${side}-${cx})`}>
        <circle cx={cx} cy={cy} r={r} fill="#f5f5f0" />
        <Veins cx={cx} cy={cy} r={r} />
        <circle cx={cx + pdx} cy={cy + pdy} r={pr} fill="#1a1a1a" />
      </g>
      <ellipse cx={cx} cy={cy} rx={r} ry={eyeH / 2} fill="none" stroke="#999" strokeWidth="0.5" />
    </g>
  );
}

function Mouth({ cx, cy, expression }: { cx: number; cy: number; expression: MausExpression }) {
  const w = 16;
  const paths: Record<string, string> = {
    deadpan: `M${cx-w/2} ${cy} L${cx+w/2} ${cy}`,
    friendly: `M${cx-w/2} ${cy} Q${cx} ${cy+7} ${cx+w/2} ${cy}`,
    focused: `M${cx-w/2} ${cy+1} L${cx+w/2} ${cy+1}`,
    thinking: `M${cx-w/3} ${cy} Q${cx} ${cy+3} ${cx+w/3} ${cy}`,
    excited: `M${cx-w/2} ${cy-2} Q${cx} ${cy+10} ${cx+w/2} ${cy-2}`,
    sleepy: `M${cx-w/3} ${cy+1} Q${cx} ${cy+3} ${cx+w/3} ${cy+1}`,
    surprised: `M${cx-4} ${cy} a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0`,
    skeptical: `M${cx-w/2} ${cy+2} Q${cx} ${cy-2} ${cx+w/2} ${cy}`,
    worried: `M${cx-w/2} ${cy+3} Q${cx} ${cy-2} ${cx+w/2} ${cy+3}`,
    mischievous: `M${cx-w/2} ${cy+1} Q${cx+2} ${cy+5} ${cx+w/2} ${cy-1}`,
  };
  return <path d={paths[expression] ?? paths.deadpan} stroke="#1a1a1a" strokeWidth="2" fill={expression === "surprised" ? "#1a1a1a" : "none"} strokeLinecap="round" />;
}

export const MausAvatar = memo(function MausAvatar({
  color = "teal", expression = "deadpan", size = 44,
  motion: _motion = "none", motionKey: _motionKey = 0,
  className, onDragStart, style,
}: {
  color?: MausColor; expression?: MausExpression; size?: number;
  motion?: MausMotion; motionKey?: number; className?: string;
  onDragStart?: React.DragEventHandler<SVGSVGElement>; style?: CSSProperties;
}) {
  const base = MAUS_COLORS[color] ?? MAUS_COLORS.teal;
  const dark = shade(base, -35);
  const gid = useId();

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} onDragStart={onDragStart} style={style}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={base} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>
      {/* Towel body — tall rectangle with rounded top, wavy bottom */}
      <path
        d="M28 12 Q30 8 34 10 L86 10 Q90 8 92 12 L92 80 Q88 90 84 80 Q80 90 76 80 Q72 90 68 80 Q64 90 60 80 Q56 90 52 80 Q48 90 44 80 Q40 90 36 80 Q32 90 28 80 Z"
        fill={`url(#${gid})`} stroke={dark} strokeWidth="1.5"
      />
      {/* Towel hanging loop */}
      <path d="M54 10 Q60 4 66 10" fill="none" stroke={dark} strokeWidth="2.5" />
      {/* Horizontal texture lines */}
      <g stroke={dark} strokeWidth="0.4" opacity="0.3">
        <line x1="30" y1="22" x2="90" y2="22" />
        <line x1="30" y1="35" x2="90" y2="35" />
        <line x1="30" y1="78" x2="90" y2="78" />
      </g>
      {/* Tag/label on left side */}
      <rect x="24" y="40" width="8" height="12" rx="1" fill={shade(base, -20)} stroke={dark} strokeWidth="0.5" />
      {/* Eyes — big, round, white, bloodshot */}
      <TowelieEye cx={43} cy={50} r={12} expression={expression} side="l" />
      <TowelieEye cx={77} cy={50} r={12} expression={expression} side="r" />
      {/* Mouth */}
      <Mouth cx={60} cy={72} expression={expression} />
    </svg>
  );
});

export function InitialsAvatar({ initials, size = 44 }: { initials: string; size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-full bg-raised text-[15px] font-semibold text-ink-secondary">{initials}</div>
  );
}
