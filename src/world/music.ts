/**
 * The score: music for the whole site, written as code and played on the
 * sound engine's context (same hall, same compressor). Nothing is recorded.
 *
 * It keeps 60 bpm on the wall clock's seconds, so every beat falls on the
 * escapement's tick. One conductor picks a progression for the era on stage
 * and every instrument plays that chord, so textures cross-fade without
 * clashing with each other or with the drone's D. The eras climb from minor
 * to major, and from plucked strings to synthesis:
 *
 *  rest          a pad and a music box (the hero, pages without a floor)
 *  clockwork     a harpsichord in Alberti figures, D minor
 *  steam         strings chugging in eighths and a brass swell, Aeolian
 *  silicon       a square-wave arpeggiator through a sweeping filter, Dorian
 *  genome        glass plucks, three against four, Lydian
 *  intelligence  a wide supersaw that breathes on the beat, a choir, D major
 *  summit        it all resolves on D once the artwork lands
 */
import type { EraId } from '../data/eras';

export type Scene = 'rest' | EraId | 'summit';
type Weights = Record<Scene, number>;
type Layer = 'pad' | 'motif' | 'clock' | 'steam' | 'silicon' | 'genome' | 'intel' | 'bass';

const STEP = 0.25; // a sixteenth at 60 bpm, in seconds
const BAR = 16; // sixteenths
const AHEAD = 0.15; // how far ahead notes are scheduled
const GAIN = 1.5; // every era sits near -26 dBFS RMS on its own, under the effects

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = (name: string) => {
  const [, l, acc, oct] = /^([A-G])([#b]?)(\d)$/.exec(name)!;
  return PC[l] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0) + (Number(oct) + 1) * 12;
};
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

interface Chord {
  bass: number;
  /** four pad tones, low to high; voice i always takes tone i */
  tones: number[];
  steps: number;
}
// 'bass | four tones', and how many beats it lasts
const ch = (spec: string, beats = 4): Chord => {
  const [b, t] = spec.split('|');
  return { bass: midi(b.trim()), tones: t.trim().split(/\s+/).map(midi), steps: beats * 4 };
};

const PROGRESSIONS: Record<Scene, Chord[]> = {
  // Dm9, Bbmaj7/D, Gm7/D, A7sus4, A7
  rest: [ch('D2|F3 A3 C4 E4'), ch('D2|F3 A3 Bb3 D4'), ch('D2|G3 Bb3 D4 F4'), ch('A1|G3 A3 D4 E4', 2), ch('A1|G3 A3 C#4 E4', 2)],
  // Dm, Gm/D, A7/C#, Dm
  clockwork: [ch('D2|D3 F3 A3 D4'), ch('D2|D3 G3 Bb3 D4'), ch('C#2|E3 G3 A3 C#4'), ch('D2|D3 F3 A3 D4')],
  // Dm, Bb, C, Dm, A
  steam: [ch('D2|D3 F3 A3 D4'), ch('Bb1|D3 F3 Bb3 D4'), ch('C2|E3 G3 C4 E4'), ch('D2|D3 F3 A3 D4', 2), ch('A1|C#3 E3 A3 E4', 2)],
  // Dm9, G6/D, Dm7, Cadd9
  silicon: [ch('D2|F3 A3 C4 E4'), ch('D2|G3 B3 D4 E4'), ch('D2|F3 A3 C4 D4'), ch('C2|E3 G3 C4 D4')],
  // Dmaj7#11, E/D, Dmaj9, Bm11
  genome: [ch('D2|F#3 A3 C#4 G#4'), ch('D2|E3 G#3 B3 E4'), ch('D2|F#3 A3 C#4 E4'), ch('B1|D3 F#3 A3 E4')],
  // Dadd9, Bm7, Gmaj9, A7sus4, A7
  intelligence: [ch('D2|D3 F#3 A3 E4'), ch('B1|D3 F#3 A3 D4'), ch('G1|D3 F#3 A3 B3'), ch('A1|E3 G3 A3 D4', 2), ch('A1|E3 G3 A3 C#4', 2)],
  // Dadd9, Gmaj7/D, Em7/D, A7, D
  summit: [ch('D2|D3 F#3 A3 E4'), ch('D2|D3 G3 B3 F#4'), ch('D2|E3 G3 B3 D4', 2), ch('A1|E3 G3 A3 C#4', 2), ch('D2|D3 F#3 A3 D4')],
};

// the pad opens up as the eras get closer to now
const BRIGHT: Record<Scene, number> = {
  rest: 900,
  clockwork: 750,
  steam: 950,
  silicon: 1300,
  genome: 1600,
  intelligence: 2100,
  summit: 2300,
};

// how much of each layer goes to the hall
const SEND: Record<Layer, number> = { pad: 0.35, motif: 0.7, clock: 0.25, steam: 0.18, silicon: 0.3, genome: 0.55, intel: 0.35, bass: 0.05 };

const zero = (): Weights => ({ rest: 0, clockwork: 0, steam: 0, silicon: 0, genome: 0, intelligence: 0, summit: 0 });
const jitter = () => (Math.random() - 0.5) * 0.016;
const vel = () => 0.9 + Math.random() * 0.2;

export class Score {
  private timer = 0;
  private offset = NaN; // wall-clock seconds minus context seconds
  private next = 0; // the next sixteenth to schedule, counted on the wall clock
  private page: Scene = 'rest';
  private landed = false;
  private worldAt = -1e9;
  private presence = 0;
  private floors = zero();
  private live = false;
  private harmony: Scene = 'rest';
  private want: Scene = 'rest';
  private jump = false;
  private start = 0;
  private chordIdx = -1;
  private level: Record<Layer, number> = { pad: 0, motif: 0, clock: 0, steam: 0, silicon: 0, genome: 0, intel: 0, bass: 0 };
  private pulse = 0;

  private layers = {} as Record<Layer, GainNode>;
  private padFilter!: BiquadFilterNode;
  private padOsc: OscillatorNode[][] = [];
  private sawOsc: OscillatorNode[][] = [];
  private breath!: GainNode;
  private choir!: OscillatorNode;
  private plucks = new Map<number, { buf: AudioBuffer; rate: number }>();

  private ctx: AudioContext;
  private dry: AudioNode;
  private wet: AudioNode;
  /** called when the ascent stops reporting (the page left the world) */
  private onIdle: () => void;

  constructor(ctx: AudioContext, dry: AudioNode, wet: AudioNode, onIdle: () => void) {
    this.ctx = ctx;
    this.dry = dry;
    this.wet = wet;
    this.onIdle = onIdle;
    this.build();
  }

  play() {
    if (this.timer) return;
    this.offset = NaN;
    this.timer = window.setInterval(this.tick, 25);
  }

  pause() {
    clearInterval(this.timer);
    this.timer = 0;
  }

  /** the page's own floor, heard whenever the ascent isn't on screen */
  setPage(scene: Scene) {
    this.page = scene;
    this.landed = false;
  }

  /** the ascent, every frame: how much of it is on screen and each floor's level */
  setWorld(presence: number, floors: Partial<Record<Scene, number>>) {
    this.worldAt = performance.now();
    this.presence = presence;
    const w = zero();
    for (const k in floors) w[k as Scene] = floors[k as Scene] ?? 0;
    this.floors = w;
  }

  /** the artwork has landed: resolve on the next beat, not the next bar */
  land() {
    this.landed = true;
    this.want = 'summit';
    this.jump = true;
  }

  // ---------------------------------------------------------------- setup
  private build() {
    const ctx = this.ctx;
    for (const k of Object.keys(SEND) as Layer[]) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(this.dry);
      const send = ctx.createGain();
      send.gain.value = SEND[k];
      g.connect(send).connect(this.wet);
      this.layers[k] = g;
    }

    // the arpeggiator's echo, a dotted sixteenth that darkens as it repeats
    const echo = ctx.createDelay(1);
    echo.delayTime.value = 0.375;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2200;
    const back = ctx.createGain();
    back.gain.value = 0.55;
    this.layers.silicon.connect(echo).connect(tone).connect(fb).connect(echo);
    tone.connect(back).connect(this.dry);

    const first = PROGRESSIONS.rest[0].tones;

    // pad: four voices, each a saw and a triangle a hair apart, through one
    // slow filter; they glide from chord to chord instead of retriggering
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = BRIGHT.rest;
    this.padFilter.Q.value = 0.8;
    this.padFilter.connect(this.layers.pad);
    const drift = ctx.createOscillator();
    drift.frequency.value = 0.05;
    const depth = ctx.createGain();
    depth.gain.value = 160;
    drift.connect(depth).connect(this.padFilter.frequency);
    drift.start();
    first.forEach((m, i) => {
      const pan = ctx.createStereoPanner();
      pan.pan.value = [-0.35, -0.1, 0.1, 0.35][i];
      pan.connect(this.padFilter);
      this.padOsc.push(
        (['sawtooth', 'triangle'] as const).map((type, j) => {
          const o = ctx.createOscillator();
          o.type = type;
          o.frequency.value = hz(m);
          o.detune.value = j ? 7 : -7;
          const g = ctx.createGain();
          g.gain.value = type === 'sawtooth' ? 0.018 : 0.03;
          o.connect(g).connect(pan);
          o.start();
          return o;
        }),
      );
    });

    // supersaw: five detuned saws per tone, spread across the stereo field,
    // through a gain that breathes on each beat
    this.breath = ctx.createGain();
    this.breath.connect(this.layers.intel);
    const sawFilter = ctx.createBiquadFilter();
    sawFilter.type = 'lowpass';
    sawFilter.frequency.value = 2600;
    sawFilter.Q.value = 0.5;
    sawFilter.connect(this.breath);
    first.forEach((m) => {
      this.sawOsc.push(
        [-18, -9, 0, 9, 18].map((cents, j) => {
          const o = ctx.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = hz(m);
          o.detune.value = cents;
          const pan = ctx.createStereoPanner();
          pan.pan.value = (j - 2) * 0.35;
          const g = ctx.createGain();
          g.gain.value = 0.007;
          o.connect(g).connect(pan).connect(sawFilter);
          o.start();
          return o;
        }),
      );
    });

    // choir: a saw through the formants of "ah", singing the top line
    this.choir = ctx.createOscillator();
    this.choir.type = 'sawtooth';
    this.choir.frequency.value = hz(first[3] + 12);
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5.2;
    const vDepth = ctx.createGain();
    vDepth.gain.value = 9;
    vibrato.connect(vDepth).connect(this.choir.detune);
    vibrato.start();
    const voice = ctx.createGain();
    voice.gain.value = 0.2;
    voice.connect(this.breath);
    for (const [f, q, g] of [[800, 7, 1], [1150, 9, 0.6], [2900, 12, 0.18]] as const) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = q;
      const gg = ctx.createGain();
      gg.gain.value = g;
      this.choir.connect(bp).connect(gg).connect(voice);
    }
    this.choir.start();
  }

  // ---------------------------------------------------------------- the clock
  private tick = () => {
    const ctx = this.ctx;
    if (ctx.state !== 'running') return;
    const now = ctx.currentTime;
    // re-anchor to the wall clock after a suspend (the context's time stops)
    const off = Date.now() / 1000 - now;
    if (!(Math.abs(off - this.offset) < 0.05)) {
      this.offset = off;
      this.next = Math.ceil((Date.now() / 1000 + 0.05) / STEP);
    }
    this.mix(now);
    while (this.next * STEP - this.offset < now + AHEAD) {
      const t = this.next * STEP - this.offset;
      if (t >= now) this.step(this.next, t);
      this.next++;
    }
  };

  // who is on stage: the ascent while it reports, otherwise the page
  private weights(): Weights {
    const live = performance.now() - this.worldAt < 400 && this.presence > 0.01;
    if (this.live && !live) this.onIdle();
    this.live = live;
    const w = zero();
    if (live) {
      for (const k in this.floors) w[k as Scene] = this.floors[k as Scene] * this.presence;
      w.rest = 1 - this.presence;
    } else {
      w[this.landed ? 'summit' : this.page] = 1;
    }
    return w;
  }

  private mix(now: number) {
    const w = this.weights();

    // the harmony follows the strongest scene, once it is clearly on stage
    let top: Scene = this.harmony;
    for (const k in w) if (w[k as Scene] > w[top]) top = k as Scene;
    if (w[top] > 0.35 && !(this.jump && this.want === 'summit')) this.want = top;

    const eras = Math.max(w.clockwork, w.steam, w.silicon, w.genome, w.intelligence, w.summit);
    const target: Record<Layer, number> = {
      pad: 1,
      motif: w.rest + 0.6 * w.summit,
      clock: w.clockwork,
      steam: w.steam,
      silicon: w.silicon,
      genome: w.genome + 0.3 * w.summit,
      intel: w.intelligence + 0.8 * w.summit,
      bass: 0.55 + 0.45 * eras,
    };
    for (const k in target) {
      const l = k as Layer;
      if (Math.abs(target[l] - this.level[l]) < 0.01) continue;
      this.level[l] = target[l];
      this.layers[l].gain.setTargetAtTime(target[l] * GAIN, now, 1.2);
    }
    this.pulse = (0.4 * w.intelligence) / (w.intelligence + w.summit + 1e-3);

    let sum = 0, bright = 0;
    for (const k in w) {
      sum += w[k as Scene];
      bright += w[k as Scene] * BRIGHT[k as Scene];
    }
    this.padFilter.frequency.setTargetAtTime(sum > 0 ? bright / sum : BRIGHT[this.harmony], now, 1.5);
  }

  // ---------------------------------------------------------------- the conductor
  private step(step: number, t: number) {
    if (this.want !== this.harmony && (step % BAR === 0 || (this.jump && step % 4 === 0))) {
      this.harmony = this.want;
      this.start = step;
      this.chordIdx = -1;
      this.jump = false;
    }
    const prog = PROGRESSIONS[this.harmony];
    const cycle = prog.reduce((s, c) => s + c.steps, 0);
    const rel = step - this.start;
    const r = rel % cycle;
    const round = Math.floor(rel / cycle);
    let i = 0, at = 0;
    while (r >= at + prog[i].steps) at += prog[i++].steps;
    const chord = prog[i];
    const local = r - at;
    if (i !== this.chordIdx) {
      this.chordIdx = i;
      this.glide(chord, t);
    }

    const on = (l: Layer) => this.level[l] > 0.02;
    const odd = round % 2 === 1;
    const tones = chord.tones;

    // music box: a five-note phrase over two bars, answered by silence
    if (on('motif') && Math.floor(r / 32) % 2 === 0) {
      const phrase: Record<number, number> = { 0: 3, 6: 2, 8: 3, 12: 1, 20: 0 };
      const n = phrase[r % 32];
      if (n !== undefined) {
        let m = tones[odd ? 3 - n : n] + 12;
        while (m < 72) m += 12;
        this.fm(t + jitter(), hz(m), 3.5, 1.2, 2.6, 0.045 * vel(), this.layers.motif, (n - 1.5) * 0.25);
      }
    }

    // clockwork: Alberti figures in eighths, a bass pluck on each new chord
    if (on('clock') && step % 2 === 0) {
      const figure = odd ? [0, 1, 2, 3, 3, 2, 1, 0] : [0, 3, 1, 3, 0, 3, 2, 3];
      const e = (r / 2) % 8;
      this.pluck(t + jitter(), tones[figure[e]], 0.2 * vel(), 0.25);
      if (local === 0) this.pluck(t, chord.bass + 12, 0.24, -0.1);
    }

    // steam: strings chugging on the root, accented like the drivers
    if (on('steam') && step % 2 === 0) {
      const e = (r / 2) % 8;
      const shape = [0, 0, 12, 0, 0, 0, 7, 12][e];
      const accent = [1, 0.55, 0.8, 0.55, 0.95, 0.55, 0.8, 0.65][e];
      this.string(t, hz(chord.bass + 12 + shape), 0.06 * accent);
      if (r % 32 === 0) this.swell(t, [tones[2], tones[3]]);
    }

    // silicon: sixteenths up the chord, the filter sweeping across the phrase
    if (on('silicon')) {
      const seq = [...tones, ...tones.map((m) => m + 12)];
      const order = odd ? [0, 2, 4, 6, 7, 5, 3, 1] : [0, 1, 2, 3, 4, 5, 6, 7];
      const sweep = 500 + 2600 * Math.pow(Math.sin((Math.PI * r) / cycle), 2);
      this.blip(t, hz(seq[order[r % 8]]), sweep, (r % 4 === 0 ? 0.03 : 0.022) * vel());
    }

    // genome: glass plucks on dotted eighths, three against the beat's four
    if (on('genome') && r % 3 === 0) {
      const k = r / 3;
      const n = [0, 1, 2, 3, 2][k % 5];
      this.fm(t + jitter(), hz(tones[n] + 12), 2.76, 2.4, 1.2, 0.035 * vel(), this.layers.genome, k % 2 ? 0.45 : -0.45);
    }

    // intelligence: the supersaw ducks on each beat and swells back
    if (this.pulse > 0.02 && step % 4 === 0) {
      this.breath.gain.setTargetAtTime(1 - this.pulse, t, 0.01);
      this.breath.gain.setTargetAtTime(1, t + 0.06, 0.14);
    }

    this.bassline(chord, local, r, t);
  }

  private bassline(chord: Chord, local: number, r: number, t: number) {
    const f = hz(chord.bass);
    switch (this.harmony) {
      case 'steam':
        if (r % 8 === 0) this.sub(t, f, 0.6, 0.02, 0.16);
        break;
      case 'silicon':
        if ([0, 6, 10].includes(r % BAR)) this.sub(t, f, 0.35, 0.005, 0.15);
        break;
      case 'clockwork':
        break;
      default:
        if (local === 0) this.sub(t, f, chord.steps * STEP + 0.4, 0.35, 0.12);
    }
  }

  private glide(chord: Chord, t: number) {
    chord.tones.forEach((m, i) => {
      for (const o of this.padOsc[i]) o.frequency.setTargetAtTime(hz(m), t, 0.07);
      for (const o of this.sawOsc[i]) o.frequency.setTargetAtTime(hz(m), t, 0.09);
    });
    this.choir.frequency.setTargetAtTime(hz(chord.tones[3] + 12), t, 0.12);
  }

  // ---------------------------------------------------------------- voices
  private env(at: number, peak: number, attack: number, dur: number) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    return g;
  }

  private pan(value: number, out: AudioNode) {
    const p = this.ctx.createStereoPanner();
    p.pan.value = value;
    p.connect(out);
    return p;
  }

  // free a note's nodes once its source has finished
  private done(src: AudioScheduledSourceNode, tail: AudioNode) {
    src.onended = () => tail.disconnect();
  }

  // FM: a carrier and a modulator whose index falls away (bells, tines, glass)
  private fm(at: number, f: number, ratio: number, index: number, decay: number, gain: number, out: AudioNode, pan: number) {
    const ctx = this.ctx;
    const car = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const idx = ctx.createGain();
    car.frequency.value = f;
    mod.frequency.value = f * ratio;
    idx.gain.setValueAtTime(f * index, at);
    idx.gain.exponentialRampToValueAtTime(f * 0.02, at + decay * 0.35);
    mod.connect(idx).connect(car.frequency);
    const g = this.env(at, gain, 0.004, decay);
    const p = this.pan(pan, out);
    car.connect(g).connect(p);
    car.start(at);
    mod.start(at);
    car.stop(at + decay + 0.05);
    mod.stop(at + decay + 0.05);
    this.done(car, p);
  }

  // a plucked string (Karplus-Strong), rendered once per pitch and replayed
  private pluck(at: number, m: number, gain: number, pan: number) {
    const { buf, rate } = this.strung(m);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    const p = this.pan(pan, this.layers.clock);
    src.connect(g).connect(p);
    src.start(at);
    this.done(src, p);
  }

  private strung(m: number) {
    const hit = this.plucks.get(m);
    if (hit) return hit;
    const sr = this.ctx.sampleRate;
    const f = hz(m);
    const N = Math.max(2, Math.round(sr / f - 0.5));
    const t60 = Math.min(2.6, Math.max(0.9, 2.6 - (m - 38) * 0.05));
    const len = Math.floor(sr * t60);
    const buf = this.ctx.createBuffer(1, len, sr);
    const y = buf.getChannelData(0);
    // the excitation: softened noise, notched where the quill strikes
    const burst = new Float32Array(N);
    let s = 0;
    for (let i = 0; i < N; i++) burst[i] = s = s * 0.25 + (Math.random() * 2 - 1) * 0.75;
    const pick = Math.max(1, Math.round(N * 0.13));
    for (let i = 0; i < N && i < len; i++) y[i] = burst[i] - (i >= pick ? burst[i - pick] : 0);
    // each pass round the string averages two samples and loses a little
    const loss = Math.pow(0.001, 1 / (f * t60));
    for (let i = N; i < len; i++) y[i] = loss * 0.5 * (y[i - N] + (i - N - 1 >= 0 ? y[i - N - 1] : 0));
    let peak = 0;
    for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(y[i]));
    const tail = Math.floor(len * 0.9);
    for (let i = 0; i < len; i++) y[i] *= (0.9 / (peak || 1)) * (i > tail ? (len - i) / (len - tail) : 1);
    // the averaging adds half a sample to the period; replay at the true pitch
    const out = { buf, rate: (f * (N + 0.5)) / sr };
    this.plucks.set(m, out);
    return out;
  }

  // a bowed eighth: two saws with a filter that closes as the note dies
  private string(at: number, f: number, gain: number) {
    const ctx = this.ctx;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1800, at);
    lp.frequency.exponentialRampToValueAtTime(420, at + 0.2);
    lp.Q.value = 1.5;
    const g = this.env(at, gain, 0.008, 0.26);
    lp.connect(g).connect(this.layers.steam);
    for (const d of [-8, 8]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = d;
      o.connect(lp);
      o.start(at);
      o.stop(at + 0.3);
      this.done(o, g);
    }
  }

  // brass: the chord's top two tones, filter and level swelling together
  private swell(at: number, notes: number[]) {
    const ctx = this.ctx;
    notes.forEach((m, i) => {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(300, at);
      lp.frequency.exponentialRampToValueAtTime(2400, at + 1.3);
      lp.frequency.exponentialRampToValueAtTime(500, at + 3.2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.03, at + 1.1);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 3.4);
      const p = this.pan(i ? 0.3 : -0.3, this.layers.steam);
      lp.connect(g).connect(p);
      for (const d of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = hz(m);
        o.detune.value = d;
        o.connect(lp);
        o.start(at);
        o.stop(at + 3.5);
        this.done(o, p);
      }
    });
  }

  // a sequencer step: a square through a resonant filter that snaps shut
  private blip(at: number, f: number, cutoff: number, gain: number) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 6;
    lp.frequency.setValueAtTime(cutoff * 1.6, at);
    lp.frequency.exponentialRampToValueAtTime(Math.max(200, cutoff * 0.45), at + 0.1);
    const g = this.env(at, gain, 0.003, 0.15);
    o.connect(lp).connect(g).connect(this.layers.silicon);
    o.start(at);
    o.stop(at + 0.18);
    this.done(o, g);
  }

  // the bass: a sine, with a quiet triangle an octave up so small speakers hear it
  private sub(at: number, f: number, dur: number, attack: number, gain: number) {
    const ctx = this.ctx;
    const g = this.env(at, gain, attack, dur);
    g.connect(this.layers.bass);
    for (const [type, mul, lvl] of [['sine', 1, 1], ['triangle', 2, 0.22]] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mul;
      const gg = ctx.createGain();
      gg.gain.value = lvl;
      o.connect(gg).connect(g);
      o.start(at);
      o.stop(at + dur + 0.05);
      this.done(o, g);
    }
  }
}
