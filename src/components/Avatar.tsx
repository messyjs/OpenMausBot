import { memo, useId, type CSSProperties } from "react";
import { MAUS_COLORS, type MausColor, type MausExpression, type MausMotion } from "@/lib/mascot";

// Towelie — purple towel with Mickey Mouse arms/legs,
// white horizontal stripes at 20% and 80%, folded head overhang,
// fire-engine-red bloodshot googly eyes.

function shade(hex: string, amt: number) {
  const v = Number.parseInt(hex.slice(1), 16);
  const ch = (s: number) => Math.max(0, Math.min(255, ((v >> s) & 0xff) + amt));
  return "#" + [ch(16), ch(8), ch(0)].map((p) => p.toString(16).padStart(2, "0")).join("");
}

// Fire-engine-red bloodshot veins around each eye
function Veins({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const angles: number[] = [];
  for (let a = 0; a < 360; a += 25) angles.push(a);
  return (
    <g stroke="#cc1111" strokeWidth="0.8" opacity="0.8" fill="none">
      {angles.map((a, i) => {
        const rad = (a * Math.PI) / 180;
        const len = 0.25 + (i % 3) * 0.12;
        const x1 = cx + Math.cos(rad) * r * 0.82;
        const y1 = cy + Math.sin(rad) * r * 0.82;
        const x2 = cx + Math.cos(rad) * r * (1 + len);
        const y2 = cy + Math.sin(rad) * r * (1 + len);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
    </g>
  );
}

// Big round googly bloodshot eye
function Eye({ cx, cy, r, expression, side }: {
  cx: number; cy: number; r: number; expression: MausExpression; side: string;
}) {
  const openMap: Record<string, number> = {
    deadpan: 0.5, friendly: 0.85, focused: 0.4, thinking: 0.45,
    excited: 0.95, sleepy: 0.15, surprised: 1.0, skeptical: 0.35,
    worried: 0.55, mischievous: 0.3,
  };
  const open = openMap[expression] ?? 0.5;
  let pdx = 0, pdy = 0;
  if (expression === "thinking") { pdx = 1.5; pdy = -1.5; }
  if (expression === "skeptical" && side === "r") pdx = 2;
  const pr = expression === "surprised" ? r * 0.2 : r * 0.26;
  const eh = r * 2 * open;

  return (
    <g>
      <clipPath id={`twe-${side}-${cx}`}>
        <ellipse cx={cx} cy={cy} rx={r} ry={eh / 2} />
      </clipPath>
      <g clipPath={`url(#twe-${side}-${cx})`}>
        <circle cx={cx} cy={cy} r={r} fill="#f5f5f0" />
        <Veins cx={cx} cy={cy} r={r} />
        <circle cx={cx + pdx} cy={cy + pdy} r={pr} fill="#111" />
      </g>
      <ellipse cx={cx} cy={cy} rx={r} ry={eh / 2} fill="none" stroke="#888" strokeWidth="0.5" />
    </g>
  );
}

function Mouth({ cx, cy, expression }: { cx: number; cy: number; expression: MausExpression }) {
  const w = 14;
  const paths: Record<string, string> = {
    deadpan: `M${cx-w/2} ${cy} L${cx+w/2} ${cy}`,
    friendly: `M${cx-w/2} ${cy} Q${cx} ${cy+6} ${cx+w/2} ${cy}`,
    focused: `M${cx-w/2} ${cy+1} L${cx+w/2} ${cy+1}`,
    thinking: `M${cx-w/3} ${cy} Q${cx} ${cy+2} ${cx+w/3} ${cy}`,
    excited: `M${cx-w/2} ${cy-1} Q${cx} ${cy+8} ${cx+w/2} ${cy-1}`,
    sleepy: `M${cx-w/3} ${cy+1} Q${cx} ${cy+2} ${cx+w/3} ${cy+1}`,
    surprised: `M${cx-3} ${cy} a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0`,
    skeptical: `M${cx-w/2} ${cy+2} Q${cx} ${cy-1} ${cx+w/2} ${cy}`,
    worried: `M${cx-w/2} ${cy+2} Q${cx} ${cy-2} ${cx+w/2} ${cy+2}`,
    mischievous: `M${cx-w/2} ${cy} Q${cx+1} ${cy+4} ${cx+w/2} ${cy-1}`,
  };
  return <path d={paths[expression] ?? paths.deadpan} stroke="#111" strokeWidth="2" fill={expression === "surprised" ? "#111" : "none"} strokeLinecap="round" />;
}

export const MausAvatar = memo(function MausAvatar({
  color = "purple", expression = "deadpan", size = 44,
  motion: _motion = "none", motionKey: _motionKey = 0,
  className, onDragStart, style,
}: {
  color?: MausColor; expression?: MausExpression; size?: number;
  motion?: MausMotion; motionKey?: number; className?: string;
  onDragStart?: React.DragEventHandler<SVGSVGElement>; style?: CSSProperties;
}) {
  const base = MAUS_COLORS[color] ?? MAUS_COLORS.purple;
  const dark = shade(base, -40);
  const gid = useId();

  // Towel body dimensions (viewBox 0 0 120 120)
  const bx1 = 32, bx2 = 88; // body left/right
  const by1 = 14, by2 = 96; // body top/bottom
  const bh = by2 - by1;     // body height
  const stripe1Y = by1 + bh * 0.2; // 20% line
  const stripe2Y = by1 + bh * 0.8; // 80% line
  const foldY = stripe1Y;  // head folds at the top stripe

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} onDragStart={onDragStart} style={style}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={base} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>

      {/* === ARMS (Mickey Mouse style: thin stick + round hand) === */}
      <g stroke={dark} strokeWidth="2.5" strokeLinecap="round">
        <line x1={bx1-2} y1="52" x2={bx1-10} y2="48" />
        <line x1={bx2+2} y1="52" x2={bx2+10} y2="48" />
      </g>
      <circle cx={bx1-11} cy="47" r="4" fill={dark} />
      <circle cx={bx2+11} cy="47" r="4" fill={dark} />

      {/* === LEGS (Mickey Mouse style: thin sticks + round feet) === */}
      <g stroke={dark} strokeWidth="2.5" strokeLinecap="round">
        <line x1="50" y1={by2-1} x2="46" y2={by2+8} />
        <line x1="70" y1={by2-1} x2="74" y2={by2+8} />
      </g>
      <ellipse cx="44" cy={by2+9} rx="5" ry="3" fill={dark} />
      <ellipse cx="76" cy={by2+9} rx="5" ry="3" fill={dark} />

      {/* === TOWEL BODY (vertical rectangle, slightly rounded bottom) === */}
      <path
        d={`M${bx1} ${by1} L${bx2} ${by1} L${bx2} ${by2-2} Q${bx2} ${by2+2} ${bx2-4} ${by2} L${bx1+4} ${by2} Q${bx1} ${by2+2} ${bx1} ${by2-2} Z`}
        fill={`url(#${gid})`} stroke={dark} strokeWidth="1.5"
      />

      {/* === WHITE HORIZONTAL STRIPES at 20% and 80% === */}
      <rect x={bx1-1} y={stripe1Y-2.5} width={bx2-bx1+2} height="5" fill="#f5f5f0" opacity="0.95" />
      <rect x={bx1-1} y={stripe2Y-2.5} width={bx2-bx1+2} height="5" fill="#f5f5f0" opacity="0.95" />

      {/* === FOLDED HEAD (top portion folds forward at the top stripe) === */}
      {/* The towel from by1 to foldY folds over, creating an overhang */}
      <path
        d={`M${bx1} ${by1} L${bx2} ${by1} L${bx2+3} ${foldY+2} Q${bx2/2+bx1/2} ${foldY+8} ${bx1-3} ${foldY+2} Z`}
        fill={`url(#${gid})`} stroke={dark} strokeWidth="1.5"
      />
      {/* Shadow under the fold to give 3D effect */}
      <path
        d={`M${bx1-2} ${foldY+1} Q${bx2/2+bx1/2} ${foldY+7} ${bx2+2} ${foldY+1}`}
        fill="none" stroke={dark} strokeWidth="0.8" opacity="0.4"
      />

      {/* === EYES (fire-engine-red bloodshot googly eyes on the fold) === */}
      <Eye cx={45} cy={foldY-4} r={10} expression={expression} side="l" />
      <Eye cx={75} cy={foldY-4} r={10} expression={expression} side="r" />

      {/* === MOUTH (below the fold, on the main body) === */}
      <Mouth cx={60} cy={foldY+14} expression={expression} />
    </svg>
  );
});

export function InitialsAvatar({ initials, size = 44 }: { initials: string; size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-full bg-raised text-[15px] font-semibold text-ink-secondary">{initials}</div>
  );
}
