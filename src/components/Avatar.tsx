import { memo, useId, type CSSProperties } from "react";
import {
  MAUS_COLORS,
  type MausColor,
  type MausExpression,
  type MausMotion,
} from "@/lib/mascot";

// Towelie avatar — a towel with white bloodshot eyes.
// Replaces the original SupaMaus mouse mascot.
// The body color comes from MausColor; eyes are always white with red veins.

function shade(hex: string, amount: number) {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) =>
    Math.max(0, Math.min(255, ((value >> shift) & 0xff) + amount));
  return `#${[channel(16), channel(8), channel(0)]
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("")}`;
}

// Red vein lines radiating from the eye edges
function Veins({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const veins = [
    { a: -30, len: 0.5 }, { a: -60, len: 0.4 }, { a: -120, len: 0.45 },
    { a: -150, len: 0.5 }, { a: 30, len: 0.4 }, { a: 60, len: 0.35 },
    { a: 120, len: 0.45 }, { a: 150, len: 0.4 },
  ];
  return (
    <g stroke="#d44" strokeWidth="0.8" opacity="0.6" fill="none">
      {veins.map((v, i) => {
        const rad = (v.a * Math.PI) / 180;
        const x1 = cx + Math.cos(rad) * r * 0.85;
        const y1 = cy + Math.sin(rad) * r * 0.85;
        const x2 = cx + Math.cos(rad) * r * (1 + v.len);
        const y2 = cy + Math.sin(rad) * r * (1 + v.len);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
    </g>
  );
}

// Eye with bloodshot veins — expression controls eyelid and pupil
function TowelieEye({
  cx, cy, r, expression, side,
}: {
  cx: number; cy: number; r: number;
  expression: MausExpression; side: "left" | "right";
}) {
  // Eyelid coverage based on expression (0 = fully open, 1 = closed)
  const lidMap: Record<MausExpression, number> = {
    deadpan: 0.35, friendly: 0.1, focused: 0.45, thinking: 0.3,
    excited: 0.05, sleepy: 0.75, surprised: 0.0, skeptical: 0.4,
    worried: 0.25, mischievous: 0.5,
  };
  const lid = lidMap[expression] ?? 0.3;
  // Pupil offset for thinking (looking up-right) and skeptical (looking sideways)
  let pupilDx = 0, pupilDy = 0;
  if (expression === "thinking") { pupilDx = 2; pupilDy = -2; }
  if (expression === "skeptical" && side === "right") { pupilDx = 2; }
  if (expression === "skeptical" && side === "left") { pupilDx = -1; }
  const pupilR = expression === "surprised" ? r * 0.25 : r * 0.3;
  const lidH = r * (1 - lid);

  return (
    <g>
      {/* White sclera */}
      <circle cx={cx} cy={cy} r={r} fill="#f8f8f8" stroke="#ccc" strokeWidth="0.5" />
      {/* Bloodshot veins */}
      <Veins cx={cx} cy={cy} r={r} />
      {/* Pupil */}
      <circle cx={cx + pupilDx} cy={cy + pupilDy} r={pupilR} fill="#1a1a1a" />
      {/* Eyelid (covers top portion based on expression) */}
      <clipPath id={`lid-${side}-${cx}-${cy}`}>
        <rect x={cx - r - 1} y={cy - r - 1} width={r * 2 + 2} height={lidH + 1} />
      </clipPath>
      {/* Red rim when sleepy */}
      {expression === "sleepy" && (
        <path d={`M${cx - r} ${cy + r * 0.3} Q${cx} ${cy + r * 0.6} ${cx + r} ${cy + r * 0.3}`} stroke="#d44" strokeWidth="1" fill="none" />
      )}
    </g>
  );
}

// Mouth based on expression
function TowelieMouth({ cx, cy, expression }: { cx: number; cy: number; expression: MausExpression }) {
  const w = 20;
  const paths: Record<MausExpression, string> = {
    deadpan: `M${cx - w/2} ${cy} L${cx + w/2} ${cy}`,
    friendly: `M${cx - w/2} ${cy} Q${cx} ${cy + 8} ${cx + w/2} ${cy}`,
    focused: `M${cx - w/2} ${cy + 1} L${cx + w/2} ${cy + 1}`,
    thinking: `M${cx - w/3} ${cy} Q${cx} ${cy + 3} ${cx + w/3} ${cy}`,
    excited: `M${cx - w/2} ${cy - 2} Q${cx} ${cy + 12} ${cx + w/2} ${cy - 2}`,
    sleepy: `M${cx - w/3} ${cy + 2} Q${cx} ${cy + 5} ${cx + w/3} ${cy + 2}`,
    surprised: `M${cx - 5} ${cy} a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0`,
    skeptical: `M${cx - w/2} ${cy + 3} Q${cx} ${cy - 2} ${cx + w/2} ${cy}`,
    worried: `M${cx - w/2} ${cy + 4} Q${cx} ${cy - 3} ${cx + w/2} ${cy + 4}`,
    mischievous: `M${cx - w/2} ${cy + 2} Q${cx + 3} ${cy + 6} ${cx + w/2} ${cy - 1}`,
  };
  const fill = expression === "surprised" ? "#1a1a1a" : "none";
  return (
    <path d={paths[expression] ?? paths.deadpan} stroke="#1a1a1a" strokeWidth="2.5" fill={fill} strokeLinecap="round" />
  );
}

export const MausAvatar = memo(function MausAvatar({
  color = "green",
  expression = "deadpan",
  size = 44,
  motion: _motion = "none",
  motionKey: _motionKey = 0,
  className,
  onDragStart,
  style,
}: {
  color?: MausColor;
  expression?: MausExpression;
  size?: number;
  motion?: MausMotion;
  motionKey?: number;
  className?: string;
  onDragStart?: React.DragEventHandler<SVGSVGElement>;
  style?: CSSProperties;
}) {
  const base = MAUS_COLORS[color] ?? MAUS_COLORS.green;
  const dark = shade(base, -30);
  const gradId = useId();

  // Towel body: a rectangle with wavy bottom edge
  // viewBox is 0 0 120 120
  const eyeY = 48;
  const eyeR = 11;
  const leftEyeX = 42;
  const rightEyeX = 78;
  const mouthY = 72;

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      onDragStart={onDragStart}
      style={style}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={base} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>
      {/* Towel body with wavy bottom */}
      <path
        d="M25 15 L95 15 L95 85 Q90 95 85 85 Q80 95 75 85 Q70 95 65 85 Q60 95 55 85 Q50 95 45 85 Q40 95 35 85 Q30 95 25 85 Z"
        fill={`url(#${gradId})}`}
        stroke={dark}
        strokeWidth="1.5"
      />
      {/* Towel hanging loop at top */}
      <path d="M55 15 Q60 8 65 15" fill="none" stroke={dark} strokeWidth="2" />
      {/* Horizontal fold line */}
      <line x1="28" y1="30" x2="92" y2="30" stroke={dark} strokeWidth="0.5" opacity="0.4" />
      {/* Eyes — white with bloodshot veins */}
      <TowelieEye cx={leftEyeX} cy={eyeY} r={eyeR} expression={expression} side="left" />
      <TowelieEye cx={rightEyeX} cy={eyeY} r={eyeR} expression={expression} side="right" />
      {/* Mouth */}
      <TowelieMouth cx={60} cy={mouthY} expression={expression} />
    </svg>
  );
});

export function InitialsAvatar({ initials, size = 44 }: { initials: string; size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-raised text-[15px] font-semibold text-ink-secondary"
    >
      {initials}
    </div>
  );
}
