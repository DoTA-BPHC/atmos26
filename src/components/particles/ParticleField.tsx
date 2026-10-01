import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { COUNT, loadShape, type ShapePose } from './shapes';
import { particles } from './store';

/**
 * One fixed field of brass and teal dots behind the home page. Sections ask
 * for a shape (see <ShapeSection>); the dots swirl from wherever they are into
 * the new cloud: hands, pocket watch, locomotive, circuit city, DNA, brain.
 * The clouds are modelled and sampled in Blender (scripts/blender/era_shapes.py).
 */

const VERT = /* glsl */ `
attribute vec3 aFrom;
attribute vec3 aTo;
attribute vec4 aRand;
uniform float uMorph;
uniform float uTime;
uniform float uSpinFrom;
uniform float uSpinTo;
uniform float uScaleFrom;
uniform float uScaleTo;
uniform vec3 uOffFrom;
uniform vec3 uOffTo;
uniform mat3 uTiltTo;
uniform vec3 uPointer;
uniform float uPointerOn;
uniform float uSize;
uniform float uPixelRatio;
varying float vDepth;
varying vec4 vRand;
varying float vFlash;

vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }

void main() {
  float e = uMorph;
  vec3 from = rotY(aFrom, uSpinFrom) * uScaleFrom + uOffFrom;
  vec3 to = rotY(uTiltTo * aTo, uSpinTo) * uScaleTo + uOffTo;
  // each dot leaves at its own moment, so the change ripples through the cloud
  float k = clamp((e - aRand.x * 0.35) / 0.65, 0.0, 1.0);
  k = 1.0 - pow(1.0 - k, 3.0);
  vec3 p = mix(from, to, k);
  // swirl outwards mid-flight
  float mid = sin(3.14159 * k);
  vec3 swirl = normalize(aRand.xyz - 0.5 + 1e-4) * (0.35 + aRand.w * 0.8);
  p += swirl * mid * 0.9;
  // breathing
  p += 0.012 * vec3(sin(uTime * 0.7 + aRand.x * 40.0), cos(uTime * 0.6 + aRand.y * 40.0), sin(uTime * 0.5 + aRand.z * 40.0));
  // the cursor pushes dots aside
  vec2 d = p.xy - uPointer.xy;
  float r = length(d);
  float push = uPointerOn * smoothstep(0.55, 0.0, r);
  p.xy += normalize(d + 1e-4) * push * 0.22;
  vFlash = push;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vDepth = clamp((-mv.z - 4.0) / 6.0, 0.0, 1.0);
  vRand = aRand;
  gl_PointSize = uSize * (0.6 + aRand.y * 0.9) * uPixelRatio * (7.0 / -mv.z);
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform float uOpacity;
varying float vDepth;
varying vec4 vRand;
varying float vFlash;
const vec3 BRASS_HI = vec3(0.91, 0.757, 0.44);
const vec3 BRASS = vec3(0.788, 0.588, 0.169);
const vec3 BRASS_LO = vec3(0.42, 0.306, 0.086);
const vec3 SIGNAL = vec3(0.498, 0.965, 1.0);
const vec3 TEAL = vec3(0.184, 0.639, 0.659);
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.36, d);
  if (a < 0.01) discard;
  vec3 col = mix(BRASS_HI, BRASS, vRand.x);
  col = mix(col, BRASS_LO, vDepth * 0.8);
  if (vRand.w > 0.86) col = mix(TEAL, SIGNAL, vRand.z);
  col = mix(col, SIGNAL, vFlash * 0.8);
  gl_FragColor = vec4(col, a * uOpacity * (1.0 - vDepth * 0.55));
}
`;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function ParticleField({ className = '' }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(0, 0, 7);

    const from = new Float32Array(COUNT * 3);
    const to = new Float32Array(COUNT * 3);
    const rand = new Float32Array(COUNT * 4);
    for (let i = 0; i < rand.length; i++) rand[i] = Math.random();
    const geo = new THREE.BufferGeometry();
    const aFrom = new THREE.BufferAttribute(from, 3);
    const aTo = new THREE.BufferAttribute(to, 3);
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    geo.setAttribute('aFrom', aFrom);
    geo.setAttribute('aTo', aTo);
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);

    const u = {
      uMorph: { value: 1 },
      uTime: { value: 0 },
      uSpinFrom: { value: 0 },
      uSpinTo: { value: 0 },
      uScaleFrom: { value: 1 },
      uScaleTo: { value: 1 },
      uOffFrom: { value: new THREE.Vector3() },
      uOffTo: { value: new THREE.Vector3() },
      uTiltTo: { value: new THREE.Matrix3() },
      uPointer: { value: new THREE.Vector3(99, 99, 0) },
      uPointerOn: { value: 0 },
      uSize: { value: 3.2 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uOpacity: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: u,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // ---- viewport maths ----
    let W = 1, H = 1, worldH = 1, worldW = 1;
    const resize = () => {
      W = el.clientWidth;
      H = el.clientHeight;
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      worldH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      worldW = worldH * camera.aspect;
      u.uSize.value = Math.max(2.2, Math.min(3.6, Math.min(W, H) / 260));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // ---- pose state ----
    let pose: ShapePose = { shape: 'dust', opacity: 0 };
    let spinSpeed = 0;
    let fromSpin = 0;
    let fromSpinSpeed = 0;
    let morphStart = -1;
    const MORPH_MS = still ? 0 : 1900;
    let opacity = 0;
    let token = 0;

    // on narrow screens shapes that sit beside text move below it instead
    const narrow = () => W < 768;
    const scaleFor = (p: ShapePose) =>
      ((narrow() ? (p.narrowSize ?? (p.size ?? 0.6) * (p.x ? 0.6 : 1)) : (p.size ?? 0.6)) * Math.min(W, H) * (worldH / H)) / 2;
    const offsetFor = (p: ShapePose) => {
      const x = narrow() ? 0 : (p.x ?? 0);
      const y = narrow() ? (p.narrowY ?? (p.x ? -0.62 : (p.y ?? 0))) : (p.y ?? 0);
      return new THREE.Vector3((x * worldW) / 2, (y * worldH) / 2, 0);
    };

    // capture where every dot is right now, as the start of the next morph
    const tmp = new THREE.Vector3();
    const tilt = new THREE.Matrix3();
    function freeze() {
      const e = u.uMorph.value;
      const k0 = e;
      const sf = u.uSpinFrom.value, st = u.uSpinTo.value;
      const cf = Math.cos(sf), snf = Math.sin(sf), ct = Math.cos(st), snt = Math.sin(st);
      const tm = u.uTiltTo.value.elements;
      for (let i = 0; i < COUNT; i++) {
        const j = i * 3;
        // same per-dot delay curve as the shader
        let k = Math.min(1, Math.max(0, (k0 - rand[i * 4] * 0.35) / 0.65));
        k = 1 - Math.pow(1 - k, 3);
        const fx = from[j], fy = from[j + 1], fz = from[j + 2];
        const ax = (cf * fx + snf * fz) * u.uScaleFrom.value + u.uOffFrom.value.x;
        const ay = fy * u.uScaleFrom.value + u.uOffFrom.value.y;
        const az = (-snf * fx + cf * fz) * u.uScaleFrom.value + u.uOffFrom.value.z;
        tmp.set(to[j], to[j + 1], to[j + 2]);
        const tx = tm[0] * tmp.x + tm[3] * tmp.y + tm[6] * tmp.z;
        const ty = tm[1] * tmp.x + tm[4] * tmp.y + tm[7] * tmp.z;
        const tz = tm[2] * tmp.x + tm[5] * tmp.y + tm[8] * tmp.z;
        const bx = (ct * tx + snt * tz) * u.uScaleTo.value + u.uOffTo.value.x;
        const by = ty * u.uScaleTo.value + u.uOffTo.value.y;
        const bz = (-snt * tx + ct * tz) * u.uScaleTo.value + u.uOffTo.value.z;
        from[j] = ax + (bx - ax) * k;
        from[j + 1] = ay + (by - ay) * k;
        from[j + 2] = az + (bz - az) * k;
      }
      u.uSpinFrom.value = 0;
      u.uScaleFrom.value = 1;
      u.uOffFrom.value.set(0, 0, 0);
      aFrom.needsUpdate = true;
    }

    async function goTo(next: ShapePose) {
      const my = ++token;
      const cloud = await loadShape(next.shape);
      if (my !== token) return;
      if (next.shape !== pose.shape || morphStart < 0) {
        freeze();
        to.set(cloud);
        aTo.needsUpdate = true;
        tilt.setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(next.rx ?? 0, next.ry ?? 0, next.rz ?? 0)));
        u.uTiltTo.value.copy(tilt);
        fromSpinSpeed = spinSpeed;
        fromSpin = 0;
        u.uSpinTo.value = 0;
        u.uMorph.value = 0;
        morphStart = performance.now();
      }
      pose = next;
      spinSpeed = still ? 0 : (next.spin ?? 0.12);
    }

    const unsub = particles.subscribe((p) => goTo(p));
    goTo(particles.get());

    // ---- pointer ----
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      u.uPointer.value.set(((e.clientX - r.left) / W - 0.5) * worldW, -((e.clientY - r.top) / H - 0.5) * worldH, 0);
    };
    if (fine && !still) window.addEventListener('pointermove', onMove, { passive: true });

    // ---- loop ----
    let raf = 0;
    let last = performance.now();
    let running = true;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      u.uTime.value += dt;
      if (morphStart >= 0) {
        const t = MORPH_MS ? Math.min(1, (now - morphStart) / MORPH_MS) : 1;
        u.uMorph.value = ease(t);
      }
      fromSpin += fromSpinSpeed * dt;
      u.uSpinFrom.value = fromSpin;
      u.uSpinTo.value += spinSpeed * dt;
      u.uScaleTo.value = scaleFor(pose);
      u.uOffTo.value.copy(offsetFor(pose));
      const target = (pose.opacity ?? 1) * (narrow() ? (pose.narrowOpacity ?? 1) : 1);
      opacity += (target - opacity) * Math.min(1, dt * 3);
      u.uOpacity.value = opacity;
      u.uPointerOn.value += ((fine && !still ? 1 : 0) - u.uPointerOn.value) * 0.1;
      if (opacity > 0.003) renderer.render(scene, camera);
      else renderer.clear();
      if (running) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onVis = () => {
      running = !document.hidden;
      if (running) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      } else cancelAnimationFrame(raf);
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      unsub();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} aria-hidden className={`pointer-events-none fixed inset-0 ${className}`} />;
}
