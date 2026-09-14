// Tiny procedural sounds via WebAudio — no audio assets needed.
// Call ensureAudio() from a user gesture (BEGIN button) before playing.
let ctx: AudioContext | null = null;
let muted = false;

export function ensureAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null; // audio unavailable — game stays silent
  }
}

export function isMuted() { return muted; }
export function setMuted(m: boolean) { muted = m; }

function tone(freq: number, delay: number, dur: number, type: OscillatorType = "sine", vol = 0.12) {
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  } catch { /* ignore */ }
}

export function hornSound() {
  tone(740, 0, 0.12, "square", 0.055);
  tone(932, 0.1, 0.2, "square", 0.055);
}
export function clickSound() { tone(620, 0, 0.06, "triangle", 0.08); }
export function stepSound(i: number) {
  tone(280 + i * 90, 0, 0.1, "triangle", 0.12);
  tone(1200, 0, 0.04, "square", 0.03);
}
export function deliverSound() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, "triangle", 0.1));
}

// ---------------- ambient street life ----------------
export type Zone = "market" | "temple" | "road" | "park" | "quiet";

let noiseBuf: AudioBuffer | null = null;
let trafficGain: GainNode | null = null;
let ambTimer: ReturnType<typeof setInterval> | null = null;
let cur: { zone: Zone; animals: boolean; npc: boolean } = { zone: "quiet", animals: false, npc: false };
const cool: Record<string, number> = {};

function ok(key: string, ms: number) {
  const now = Date.now();
  if (now - (cool[key] ?? 0) < ms) return false;
  cool[key] = now;
  return true;
}

function noiseBurst(dur: number, filterFreq: number, vol: number, delay = 0, type: BiquadFilterType = "bandpass") {
  if (!ctx || muted) return;
  try {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterFreq;
    f.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  } catch { /* ignore */ }
}

// market bargain shout: vendor calling out
function marketShout() {
  if (!ok("shout", 5000)) return;
  const base = 300 + Math.random() * 150;
  for (let i = 0; i < 3; i++) {
    tone(base - i * 40, i * 0.16, 0.14, "square", 0.035);
    tone(base * 1.5 - i * 50, i * 0.16 + 0.02, 0.1, "triangle", 0.03);
  }
  noiseBurst(0.5, 1200, 0.02);
}

// temple bell: rich decaying harmonics
function templeBell() {
  if (!ok("bell", 7000)) return;
  [660, 880, 1320, 1760].forEach((f, i) => tone(f, 0, 2.2 - i * 0.3, "sine", 0.05 - i * 0.008));
  tone(330, 0, 2.5, "sine", 0.04);
}

// temple drum (urumi/thavil-ish thump)
function templeDrum() {
  if (!ok("drum", 2600)) return;
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, t0);
    o.frequency.exponentialRampToValueAtTime(48, t0 + 0.25);
    g.gain.setValueAtTime(0.14, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + 0.4);
  } catch { /* ignore */ }
  noiseBurst(0.12, 900, 0.05);
}

// distant vehicle horn on the road
function distantHorn() {
  if (!ok("dhorn", 9000)) return;
  tone(520, 0, 0.15, "square", 0.025);
  tone(655, 0.12, 0.2, "square", 0.025);
}

// morning birds in the park
function birds() {
  if (!ok("birds", 6000)) return;
  for (let i = 0; i < 3; i++) {
    tone(2200 + Math.random() * 800, i * 0.14, 0.09, "sine", 0.03);
    tone(2800 + Math.random() * 600, i * 0.14 + 0.06, 0.07, "sine", 0.025);
  }
}

function moo() {
  if (!ok("moo", 11000)) return;
  tone(185, 0, 0.35, "square", 0.04);
  tone(140, 0.3, 0.45, "square", 0.04);
}
function bark() {
  if (!ok("bark", 7000)) return;
  noiseBurst(0.09, 1400, 0.09);
  noiseBurst(0.09, 1200, 0.09, 0.16);
}
function cluck() {
  if (!ok("cluck", 8000)) return;
  for (let i = 0; i < 4; i++) tone(900 + Math.random() * 300, i * 0.09, 0.06, "square", 0.03);
}
function baa() {
  if (!ok("baa", 10000)) return;
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    o.type = "square";
    o.frequency.value = 420;
    lfo.frequency.value = 9;
    lg.gain.value = 60;
    lfo.connect(lg);
    lg.connect(o.frequency);
    g.gain.setValueAtTime(0.035, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t0);
    lfo.start(t0);
    o.stop(t0 + 0.65);
    lfo.stop(t0 + 0.65);
  } catch { /* ignore */ }
}

// NPC gabble (Sims-style babble, no real words)
function chatter() {
  if (!ok("chat", 6500)) return;
  const n = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) {
    tone(200 + Math.random() * 320, i * 0.11, 0.09, "sawtooth", 0.022);
  }
}

function tick() {
  if (!ctx || muted) return;
  const r = Math.random();
  if (cur.zone === "market") {
    if (r < 0.4) marketShout();
    else if (r < 0.55) chatter();
  } else if (cur.zone === "temple") {
    if (r < 0.28) templeBell();
    else if (r < 0.6) templeDrum();
    else if (r < 0.7) chatter();
  } else if (cur.zone === "road") {
    if (r < 0.12) distantHorn();
  } else if (cur.zone === "park") {
    if (r < 0.3) birds();
  }
  if (cur.animals && r < 0.22) {
    [moo, bark, cluck, baa][Math.floor(Math.random() * 4)]();
  }
  if (cur.npc && r < 0.2) chatter();
}

export function setZone(zone: Zone, animals: boolean, npc: boolean) {
  cur = { zone, animals, npc };
}

export function startAmbience() {
  ensureAudio();
  if (!ctx || ambTimer) return;
  try {
    // continuous traffic hum, gain driven by zone
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = 68;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 220;
    trafficGain = ctx.createGain();
    trafficGain.gain.value = 0;
    o.connect(f);
    f.connect(trafficGain);
    trafficGain.connect(ctx.destination);
    o.start();
    ambTimer = setInterval(() => {
      if (!ctx || muted) return;
      if (trafficGain) {
        const want = cur.zone === "road" ? 0.035 : cur.zone === "market" ? 0.015 : 0.004;
        trafficGain.gain.setTargetAtTime(want, ctx.currentTime, 0.8);
      }
      tick();
    }, 900);
  } catch { /* ignore */ }
}
