import * as THREE from 'three';
import type { ChamberSpec } from '../chamber';
import { shared, type ChamberUniforms } from '../materials';

/**
 * 2026. A brain cast in brass on a turned lab stand. Hundreds of neurons sit
 * on its folds, each tied to its nearest neighbours by a fine brass thread:
 * the nerve tracts. Longer arcs bridge the two hemispheres over the fissure
 * and tie the cerebellum to the back of the cortex. The tracts are strung
 * from the bottom up while the blueprint is drawn. Once built, small packets
 * of signal run along them; a click or a tap lights the base of the brain
 * stem, and one teal thought spreads out from there across the whole brain.
 */

const WIRE_VERT = /* glsl */ `
  attribute float aT;
  attribute float aDist;
  attribute float aH;
  attribute float aSeed;
  varying float vT;
  varying float vDist;
  varying float vH;
  varying float vSeed;
  void main() {
    vT = aT;
    vDist = aDist;
    vH = aH;
    vSeed = aSeed;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const WIRE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uFire;
  uniform float uDraw;
  uniform float uCast;
  uniform float uExit;
  varying float vT;
  varying float vDist;
  varying float vH;
  varying float vSeed;
  void main() {
    // strung with the drawing, bottom up
    float strung = 1.0 - smoothstep(uDraw * 1.02 - 0.02, uDraw * 1.02, vH);
    // resting tract: fine brass thread
    vec3 thread = vec3(0.62, 0.46, 0.2) * (0.22 + 0.18 * uCast);
    // ambient signal: brass-white packets running along each link
    float head = fract(uTime * 0.32 + vSeed * 3.7) * 1.6 - 0.3;
    float pk = exp(-pow((vT - head) * 9.0, 2.0)) * smoothstep(0.85, 1.0, uCast);
    vec3 col = thread + vec3(1.9, 1.35, 0.7) * pk * 0.55;
    // a thought: one teal front spreading from the spark across the brain
    float since = uTime - uFire;
    float front = since * 0.55;
    float wave = exp(-pow((vDist - front) * 9.0, 2.0)) * exp(-since * 0.35) * step(0.0, since);
    col += vec3(0.5, 2.1, 2.4) * wave * smoothstep(0.85, 1.0, uCast);
    float a = strung * (1.0 - uExit);
    if (a < 0.01) discard;
    gl_FragColor = vec4(col * a, 1.0);
  }`;

const SPARK_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uFire;
  uniform float uCast;
  uniform float uExit;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float since = uTime - uFire;
    float idle = 0.2 + 0.08 * sin(uTime * 1.3);
    float flash = exp(-since * 3.0) * step(0.0, since) * 2.5;
    float g = smoothstep(0.5, 0.0, d) * (idle + flash) * smoothstep(0.85, 1.0, uCast) * (1.0 - uExit);
    if (g < 0.01) discard;
    gl_FragColor = vec4(vec3(1.0, 0.8, 0.5) * g, 1.0);
  }`;

type Neuron = { p: THREE.Vector3; n: THREE.Vector3; region: number };

const SEGMENTS = 8;
const SPAN: [number, number] = [-7.2, 4.4];

function wires(root: THREE.Object3D, u: ChamberUniforms) {
  const found: { nodes?: number[]; spark?: number[] } = {};
  root.traverse((o) => {
    if (o.userData.chamber === 'intelligence') Object.assign(found, o.userData);
  });
  const { nodes, spark: sparkRaw } = found;
  if (!nodes || !sparkRaw) return;

  // Blender z-up → web y-up
  const spark = new THREE.Vector3(sparkRaw[0], sparkRaw[2], -sparkRaw[1]);
  const neurons: Neuron[] = [];
  for (let i = 0; i + 6 < nodes.length; i += 7) {
    neurons.push({
      p: new THREE.Vector3(nodes[i], nodes[i + 2], -nodes[i + 1]),
      n: new THREE.Vector3(nodes[i + 3], nodes[i + 5], -nodes[i + 4]).normalize(),
      region: nodes[i + 6],
    });
  }

  // links: [from, to, callosal]
  const links: [number, number, boolean][] = [];
  const seen = new Set<number>();
  const count = neurons.length;
  const addLink = (a: number, b: number, callosal: boolean) => {
    if (a === b) return;
    const key = a < b ? a * count + b : b * count + a;
    if (seen.has(key)) return;
    seen.add(key);
    links.push([a, b, callosal]);
  };

  // each neuron to its 3 nearest in the same region
  for (let i = 0; i < count; i++) {
    const near: { j: number; d: number }[] = [];
    for (let j = 0; j < count; j++) {
      if (j === i || neurons[j].region !== neurons[i].region) continue;
      const d = neurons[i].p.distanceTo(neurons[j].p);
      if (d <= 1.4) near.push({ j, d });
    }
    near.sort((a, b) => a.d - b.d);
    for (const { j } of near.slice(0, 3)) addLink(i, j, false);
  }

  const spread = (list: number[], k: number) => {
    if (list.length <= k) return list;
    return Array.from({ length: k }, (_, m) => list[Math.floor((m * list.length) / k)]);
  };
  const all = neurons.map((_, i) => i);

  // corpus callosum: left to right over the fissure
  const rightIdx = all.filter((i) => neurons[i].region === 1);
  const leftUpper = all
    .filter((i) => neurons[i].region === 0 && neurons[i].p.y > 1.5)
    .sort((a, b) => Math.abs(neurons[a].p.x) - Math.abs(neurons[b].p.x))
    .slice(0, 150)
    .sort((a, b) => neurons[a].p.z - neurons[b].p.z);
  const mirror = new THREE.Vector3();
  for (const i of spread(leftUpper, 24)) {
    const q = neurons[i].p;
    mirror.set(-q.x, q.y, q.z);
    let best = -1;
    let bestD = Infinity;
    for (const j of rightIdx) {
      const d = neurons[j].p.distanceToSquared(mirror);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    if (best >= 0) addLink(i, best, true);
  }

  // cerebellum to the occipital cortex
  const cortexBack = all.filter((i) => neurons[i].region < 2 && neurons[i].p.z < -2);
  const cerebellum = all.filter((i) => neurons[i].region === 2);
  for (const i of spread(cerebellum, 10)) {
    let best = -1;
    let bestD = Infinity;
    for (const j of cortexBack) {
      const d = neurons[j].p.distanceToSquared(neurons[i].p);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    if (best >= 0) addLink(i, best, false);
  }

  // sample every link as a quadratic Bézier, 8 segments
  const [span0, span1] = SPAN;
  const verts = links.length * SEGMENTS * 2;
  const pos = new Float32Array(verts * 3);
  const t = new Float32Array(verts);
  const dist = new Float32Array(verts);
  const h = new Float32Array(verts);
  const seed = new Float32Array(verts);
  const ctrl = new THREE.Vector3();
  const lift = new THREE.Vector3();
  const pt = new THREE.Vector3();
  let maxDist = 0;
  let v = 0;
  const put = (a: THREE.Vector3, b: THREE.Vector3, tt: number, s: number) => {
    const w0 = (1 - tt) * (1 - tt);
    const w1 = 2 * (1 - tt) * tt;
    const w2 = tt * tt;
    pt.set(
      w0 * a.x + w1 * ctrl.x + w2 * b.x,
      w0 * a.y + w1 * ctrl.y + w2 * b.y,
      w0 * a.z + w1 * ctrl.z + w2 * b.z,
    );
    pos[v * 3] = pt.x;
    pos[v * 3 + 1] = pt.y;
    pos[v * 3 + 2] = pt.z;
    t[v] = tt;
    const d = pt.distanceTo(spark);
    dist[v] = d;
    if (d > maxDist) maxDist = d;
    h[v] = THREE.MathUtils.clamp((pt.y - span0) / (span1 - span0), 0, 1);
    seed[v] = s;
    v++;
  };
  for (const [ia, ib, callosal] of links) {
    const a = neurons[ia];
    const b = neurons[ib];
    const d = a.p.distanceTo(b.p);
    ctrl.copy(a.p).add(b.p).multiplyScalar(0.5);
    if (callosal) {
      ctrl.y += 0.6 + 0.25 * d;
    } else {
      lift.copy(a.n).add(b.n);
      if (lift.lengthSq() > 1e-6) lift.normalize();
      ctrl.addScaledVector(lift, 0.12 + 0.22 * d);
    }
    const s = Math.random();
    for (let k = 0; k < SEGMENTS; k++) {
      put(a.p, b.p, k / SEGMENTS, s);
      put(a.p, b.p, (k + 1) / SEGMENTS, s);
    }
  }
  if (maxDist > 0) for (let i = 0; i < verts; i++) dist[i] /= maxDist;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aT', new THREE.BufferAttribute(t, 1));
  geo.setAttribute('aDist', new THREE.BufferAttribute(dist, 1));
  geo.setAttribute('aH', new THREE.BufferAttribute(h, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const uniforms = {
    uTime: shared.uTime,
    uFire: shared.uFire,
    uDraw: u.uDraw,
    uCast: u.uCast,
    uExit: u.uExit,
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: WIRE_VERT,
    fragmentShader: WIRE_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.renderOrder = 4;
  root.add(lines);

  // the spark, where a thought starts
  const sparkGeo = new THREE.BufferGeometry().setAttribute(
    'position',
    new THREE.Float32BufferAttribute([spark.x, spark.y, spark.z], 3),
  );
  const sparkMat = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uPixelRatio: shared.uPixelRatio },
    vertexShader: /* glsl */ `
      uniform float uPixelRatio;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 70.0 * uPixelRatio / max(1.0, -mv.z * 0.12);
      }`,
    fragmentShader: SPARK_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Points(sparkGeo, sparkMat);
  glow.frustumCulled = false;
  glow.renderOrder = 5;
  root.add(glow);

  return {
    dispose() {
      geo.dispose();
      mat.dispose();
      sparkGeo.dispose();
      sparkMat.dispose();
    },
  };
}

export const intelligence: ChamberSpec = {
  id: 'intelligence',
  url: '/world/intelligence.glb',
  span: SPAN,
  setup: wires,
  backdrop: { pos: [6.5, 1.5, 15.0], look: [0.0, 0.8, 0] },
  portrait: 1.2,
  camera: [
    { t: 0.0, pos: [1.0, -11.0, 15.0], look: [0.0, -6.0, 0] },
    { t: 0.14, pos: [1.5, -5.0, 18.0], look: [0.0, -2.5, 0] },
    // the whole brain, head on, while it is drawn
    { t: 0.34, pos: [0.6, 1.4, 19.0], look: [0.0, 1.0, 0] },
    // three-quarter, the lobes and the cerebellum
    { t: 0.56, pos: [10.0, 1.0, 9.5], look: [0.0, 0.8, 0] },
    // low on the other side, under the temporal lobe
    { t: 0.74, pos: [-8.0, -2.5, 8.0], look: [0.0, 1.0, 0] },
    // over the fissure
    { t: 0.88, pos: [2.5, 10.0, 6.5], look: [0.0, 2.5, 0] },
    { t: 1.0, pos: [0.0, 13.0, 12.0], look: [0.0, 19.0, 0] },
  ],
};
