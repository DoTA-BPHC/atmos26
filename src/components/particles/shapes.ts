// Point clouds (int16 xyz, normalised to a unit box), loaded once and cached.
// Era shapes are modelled and sampled in Blender (scripts/blender/era_shapes.py);
// `halo` is the logo's brass ring, sampled from its layer (scripts/halo_points.py).

export const SHAPE_NAMES = ['hands', 'watch', 'locomotive', 'city', 'dna', 'brain', 'rings', 'halo'] as const;
export type ShapeName = (typeof SHAPE_NAMES)[number] | 'dust';

export const COUNT = 12000;

const cache = new Map<ShapeName, Promise<Float32Array>>();

export function loadShape(name: ShapeName): Promise<Float32Array> {
  let p = cache.get(name);
  if (!p) {
    p =
      name === 'dust'
        ? Promise.resolve(dust())
        : fetch(`/shapes/${name}.bin`)
            .then((r) => r.arrayBuffer())
            .then((buf) => {
              const q = new Int16Array(buf);
              const out = new Float32Array(COUNT * 3);
              for (let i = 0; i < COUNT * 3; i++) out[i] = q[i % q.length] / 32767;
              return out;
            });
    cache.set(name, p);
  }
  return p;
}

// a loose shell of drifting dust, the resting state between shapes
function dust() {
  const out = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const r = 1.3 + Math.random() * 1.6;
    const s = Math.sqrt(1 - u * u);
    out[i * 3] = Math.cos(a) * s * r * 1.6;
    out[i * 3 + 1] = u * r;
    out[i * 3 + 2] = Math.sin(a) * s * r;
  }
  return out;
}

// where and how a shape sits on screen
export interface ShapePose {
  shape: ShapeName;
  /** horizontal centre, -1 (left edge) .. 1 (right edge) */
  x?: number;
  /** vertical centre, -1 (bottom) .. 1 (top) */
  y?: number;
  /** size as a fraction of the smaller viewport side */
  size?: number;
  /** tilt in radians */
  rx?: number;
  ry?: number;
  rz?: number;
  /** slow spin around Y, radians per second */
  spin?: number;
  /** overall visibility 0..1 */
  opacity?: number;
  /** visibility on phones, where shapes share the screen with text */
  narrowOpacity?: number;
  /** size and vertical centre on phones (default: 0.6 × size, low band) */
  narrowSize?: number;
  narrowY?: number;
}
