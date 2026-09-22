/**
 * CircuitRing
 * -----------
 * The brass ring + vortex from the ATMOS logo, with PCB-style traces
 * branching out on both sides. Traces draw themselves in on load and then
 * carry small pulses of light outwards.
 *
 * Drawn in a 1000×1000 viewBox, ring radius 330 (so the ring is 66% of the
 * svg width).
 */

const C = 500;
const R = 330;

// small deterministic random so the traces look the same on every load
function rand(seed: number) {
  const x = Math.sin(seed * 999.13) * 43758.5453;
  return x - Math.floor(x);
}

interface Trace {
  d: string;
  end: [number, number];
  delay: number;
}

function buildTraces(): Trace[] {
  const traces: Trace[] = [];
  let seed = 1;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      // spread over ±55° around the horizontal
      const a = ((-55 + i * 13.75 + (rand(seed++) - 0.5) * 6) * Math.PI) / 180;
      const sx = C + side * Math.cos(a) * (R + 14);
      const sy = C + Math.sin(a) * (R + 14);
      // radial stub, then a 45° bend, then straight out horizontally
      const stub = 20 + rand(seed++) * 30;
      const x1 = sx + side * Math.cos(a) * stub;
      const y1 = sy + Math.sin(a) * stub;
      const bend = (rand(seed++) > 0.5 ? 1 : -1) * (12 + rand(seed++) * 26);
      const x2 = x1 + side * Math.abs(bend);
      const y2 = y1 + bend;
      const x3 = x2 + side * (50 + rand(seed++) * 90);
      traces.push({
        d: `M${sx.toFixed(1)} ${sy.toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} L${x3.toFixed(1)} ${y2.toFixed(1)}`,
        end: [x3, y2],
        delay: 0.4 + rand(seed++) * 1.2,
      });
    }
  }
  return traces;
}

const traces = buildTraces();

export function CircuitRing() {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aspect-square w-[calc(var(--ring)*1.515)] pointer-events-none">
      {/* vortex inside the ring */}
      <div className="absolute inset-[17%] rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(30,111,120,0.55)_0%,rgba(18,62,68,0.45)_38%,rgba(74,48,26,0.55)_75%,rgba(20,14,8,0.9)_100%)]" />
        <div className="hero-vortex absolute -inset-[20%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(47,163,168,0.18)_60deg,transparent_120deg,rgba(201,150,43,0.14)_200deg,transparent_260deg,rgba(47,163,168,0.12)_320deg,transparent_360deg)] blur-2xl" />
      </div>

      <svg viewBox="0 0 1000 1000" className="absolute inset-0 w-full h-full overflow-visible">
        {/* brass ring */}
        <circle cx={C} cy={C} r={R} fill="none" stroke="#C9962B" strokeWidth={2.5} />
        <circle cx={C} cy={C} r={R - 9} fill="none" stroke="#C9962B" strokeOpacity={0.25} strokeWidth={1} />

        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {traces.map((tr, i) => (
            <g key={i}>
              <path
                d={tr.d}
                pathLength={1}
                stroke="#2FA3A8"
                strokeOpacity={0.55}
                strokeWidth={1.6}
                className="hero-trace"
                style={{ animationDelay: `${tr.delay}s` }}
              />
              <path
                d={tr.d}
                pathLength={1}
                stroke="#9ff6ff"
                strokeWidth={2.2}
                className="hero-trace-pulse"
                style={{ animationDelay: `${tr.delay + 1.6}s`, animationDuration: `${2.4 + (i % 4) * 0.6}s` }}
              />
              <circle
                cx={tr.end[0]}
                cy={tr.end[1]}
                r={4}
                stroke="#2FA3A8"
                strokeOpacity={0.7}
                strokeWidth={1.4}
                className="hero-trace-pad"
                style={{ animationDelay: `${tr.delay + 1}s` }}
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
