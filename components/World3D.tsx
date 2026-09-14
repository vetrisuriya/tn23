"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { APRONS, BOT_BASES, LANDMARKS, STREETS, landmarkById, type Landmark, type Street } from "./worldData";

export type KeysRef = React.MutableRefObject<Record<string, boolean>>;
export type DestRef = React.MutableRefObject<{ x: number; z: number } | null>;
export type MoversRef = React.MutableRefObject<Record<number, { x: number; z: number; r: number }>>;
export interface PlayerState { x: number; z: number; moving: boolean; onRoad: boolean }

const BOUND = 66;
const ROAD_HALF = 3.2;

function isOnRoad(x: number, z: number) {
  for (const s of STREETS) {
    if (s.kind === "h") {
      if (Math.abs(z - s.at) < ROAD_HALF && x > s.from - 2 && x < s.to + 2) return true;
    } else {
      if (Math.abs(x - s.at) < ROAD_HALF && z > s.from - 2 && z < s.to + 2) return true;
    }
  }
  for (const a of APRONS) {
    if (Math.abs(x - a.x) <= a.w / 2 && Math.abs(z - a.z) <= a.d / 2) return true;
  }
  return false;
}

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genTrees(seed: number): [number, number][] {
  const pts: [number, number][] = [];
  const rnd = mulberry(seed * 7919 + 11);
  let guard = 0;
  while (pts.length < 40 && guard++ < 1400) {
    const x = (rnd() - 0.5) * 128, z = (rnd() - 0.5) * 120;
    if (Math.hypot(x, z) > BOUND) continue;
    let bad = false;
    for (const s of STREETS) {
      if (s.kind === "h" && Math.abs(z - s.at) < 6) { bad = true; break; }
      if (s.kind === "v" && Math.abs(x - s.at) < 6) { bad = true; break; }
    }
    if (bad) continue;
    if (APRONS.some((a) => Math.abs(x - a.x) < a.w / 2 + 2 && Math.abs(z - a.z) < a.d / 2 + 2)) continue;
    if (LANDMARKS.some((l) => Math.abs(x - l.x) < l.w / 2 + 3.5 && Math.abs(z - l.z) < l.d / 2 + 3.5)) continue;
    pts.push([x, z]);
  }
  return pts;
}

export interface Circle { x: number; z: number; r: number }

// Everything solid, rebuilt per shuffle seed: trees, signposts, arch, cart, stalls…
export interface House { x: number; z: number; w: number; d: number; h: number; color: string; angle: number }

// Dense street-wall houses(make the lanes feel like real Kosapet blocks).
function genHouses(seed: number): House[] {
  const rnd = mulberry(seed * 331 + 5);
  const palette = ["#e8d9b8", "#d9c2a8", "#c9d4c0", "#e0b8a8", "#b8c8dc", "#e6d6b8", "#d4b8c8"];
  const houses: House[] = [];
  for (const s of STREETS) {
    const len = s.to - s.from;
    for (let t = s.from + 4; t < s.to - 3; t += 7) {
      for (const side of [-1, 1]) {
        if (rnd() < 0.25) continue; // gaps between houses
        const off = side * (5.6 + rnd() * 2.6);
        const x = s.kind === "h" ? t + (rnd() - 0.5) * 2 : s.at + off;
        const z = s.kind === "h" ? s.at + off : t + (rnd() - 0.5) * 2;
        if (Math.hypot(x, z) > BOUND - 5) continue;
        const w = 3 + rnd() * 1.5, d = 3 + rnd() * 1.2, h = 2.2 + rnd() * 1.4;
        let bad = false;
        for (const o of STREETS) {
          if (o === s) continue;
          const dd = o.kind === "h" ? Math.abs(z - o.at) : Math.abs(x - o.at);
          if (dd < 4.2) { bad = true; break; }
        }
        if (!bad) for (const l of LANDMARKS) {
          if (Math.abs(x - l.x) < l.w / 2 + w / 2 + 1.5 && Math.abs(z - l.z) < l.d / 2 + d / 2 + 1.5) { bad = true; break; }
        }
        if (!bad) for (const a of APRONS) {
          if (Math.abs(x - a.x) < a.w / 2 + w / 2 + 1 && Math.abs(z - a.z) < a.d / 2 + d / 2 + 1) { bad = true; break; }
        }
        if (!bad) for (const hh of houses) {
          if (Math.hypot(x - hh.x, z - hh.z) < 5) { bad = true; break; }
        }
        if (bad) continue;
        const angle = s.kind === "h" ? (s.at > z ? 0 : Math.PI) : (s.at > x ? Math.PI / 2 : -Math.PI / 2);
        houses.push({ x, z, w, d, h, color: palette[Math.floor(rnd() * palette.length)], angle });
        if (houses.length >= 70) return houses;
      }
    }
  }
  return houses;
}

function buildCircles(trees: [number, number][], houses: House[]): Circle[] {
  const c: Circle[] = [];
  for (const [x, z] of trees) c.push({ x, z, r: 0.45 });
  for (const h of houses) c.push({ x: h.x, z: h.z, r: Math.max(h.w, h.d) / 2 });
  for (const s of STREETS) c.push({ x: s.signX, z: s.signZ, r: 0.4 });
  c.push({ x: 40, z: -3.8, r: 0.7 }, { x: 40, z: 3.8, r: 0.7 }); // welcome arch
  c.push({ x: 29.5, z: -6, r: 1.1 }); // flower cart
  c.push({ x: -20, z: 4, r: 0.7 }); // waiting customer
  c.push({ x: -36.5, z: -7.5, r: 0.4 }, { x: -31.5, z: -7, r: 0.4 }, { x: -34, z: -4, r: 0.4 }); // park trees
  c.push({ x: -34, z: -8, r: 1.3 }); // park pond
  for (const id of ["school", "sundar", "subramani"]) {
    const l = LANDMARKS.find((q) => q.id === id)!;
    c.push({ x: l.x - l.w * 0.32, z: l.z + l.d / 2 + 1.6, r: 0.5 });
    c.push({ x: l.x + l.w * 0.32, z: l.z + l.d / 2 + 1.6, r: 0.5 });
  }
  return c;
}

// Closest rideable point (street or driveway) — the reset button drops you here.
function nearestRideable(x: number, z: number): [number, number] {
  let bx = x, bz = z, bd = Infinity;
  const consider = (cx: number, cz: number) => {
    const d = Math.hypot(x - cx, z - cz);
    if (d < bd) { bd = d; bx = cx; bz = cz; }
  };
  for (const s of STREETS) {
    if (s.kind === "h") consider(THREE.MathUtils.clamp(x, s.from, s.to), s.at);
    else consider(s.at, THREE.MathUtils.clamp(x, s.from, s.to));
  }
  for (const a of APRONS) {
    consider(
      THREE.MathUtils.clamp(x, a.x - a.w / 2, a.x + a.w / 2),
      THREE.MathUtils.clamp(z, a.z - a.d / 2, a.z + a.d / 2),
    );
  }
  return [bx, bz];
}

function collide(x: number, z: number, circles: Circle[]): [number, number] {
  const r = Math.hypot(x, z);
  if (r > BOUND) { x = (x / r) * BOUND; z = (z / r) * BOUND; }
  let nx = x, nz = z;
  for (const l of LANDMARKS) {
    if (l.id === "park") continue; // park lawn is walkable
    const hx = l.w / 2 + 1.1, hz = l.d / 2 + 1.1;
    const dx = nx - l.x, dz = nz - l.z;
    if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
      if (hx - Math.abs(dx) < hz - Math.abs(dz)) nx = l.x + Math.sign(dx || 1) * hx;
      else nz = l.z + Math.sign(dz || 1) * hz;
    }
  }
  for (const c of circles) {
    const dx = nx - c.x, dz = nz - c.z;
    const d = Math.hypot(dx, dz);
    const min = c.r + 0.7;
    if (d < min && d > 0.0001) {
      nx = c.x + (dx / d) * min;
      nz = c.z + (dz / d) * min;
    }
  }
  return [nx, nz];
}

// Tube between two points (cycle frame pipes, poles, …)
function Tube({ from, to, r, color }: { from: [number, number, number]; to: [number, number, number]; r: number; color: string }) {
  const { mid, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    const mid = a.add(b).multiplyScalar(0.5);
    return { mid, quat, len };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <mesh position={mid} quaternion={quat} castShadow>
      <cylinderGeometry args={[r, r, len, 8]} />
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
  );
}

// A recognizable bicycle: two spoked wheels, diamond frame, fork, bars, saddle.
function CycleFrame({ color }: { color: string }) {
  return (
    <group>
      <Tube from={[0, 1.0, 0.55]} to={[0, 1.06, -0.45]} r={0.045} color={color} />
      <Tube from={[0, 0.98, 0.58]} to={[0, 0.45, -0.05]} r={0.045} color={color} />
      <Tube from={[0, 0.45, -0.05]} to={[0, 1.1, -0.5]} r={0.045} color={color} />
      <Tube from={[0, 0.98, 0.58]} to={[0, 0.5, 0.8]} r={0.04} color={color} />
      <Tube from={[0, 0.45, -0.05]} to={[0, 0.5, -0.8]} r={0.035} color={color} />
      <Tube from={[0, 0.45, -0.05]} to={[0, 0.5, 0.8]} r={0.03} color="#555" />
      <mesh position={[0, 1.16, 0.6]} castShadow>
        <boxGeometry args={[0.42, 0.06, 0.08]} />
        <meshStandardMaterial color="#333" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.16, -0.52]} castShadow>
        <boxGeometry args={[0.22, 0.08, 0.32]} />
        <meshStandardMaterial color="#4a2f22" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Wheel({ position, spinRef }: { position: [number, number, number]; spinRef?: React.MutableRefObject<THREE.Mesh | null> }) {
  // Torus ring is baked into the ZY plane (axle = X), so rotation.x rolls it
  // forward correctly however the cycle is turned.
  const geo = useMemo(() => {
    const t = new THREE.TorusGeometry(0.5, 0.09, 8, 20);
    t.rotateY(Math.PI / 2);
    return t;
  }, []);
  return (
    <group position={position}>
      <mesh
        ref={(m) => { if (spinRef) spinRef.current = m; }}
        geometry={geo}
        castShadow
      >
        <meshStandardMaterial color="#2b2d2d" roughness={0.9} />
        {/* spokes spin together with the wheel */}
        <mesh>
          <boxGeometry args={[0.05, 0.86, 0.05]} />
          <meshStandardMaterial color="#999" roughness={0.6} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.05, 0.86, 0.05]} />
          <meshStandardMaterial color="#999" roughness={0.6} />
        </mesh>
      </mesh>
    </group>
  );
}

// Building name painted onto the board like a street sign — always readable.
function buildingTexture(name: string, sub: string) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 168;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff6e0";
  g.fillRect(0, 0, 512, 168);
  g.strokeStyle = "#4a3a28";
  g.lineWidth = 10;
  g.strokeRect(8, 8, 496, 152);
  g.fillStyle = "#3a2c1c";
  g.textAlign = "center";
  g.font = "900 44px Arial, sans-serif";
  g.fillText(name, 256, 72, 480);
  g.font = "400 34px Arial, sans-serif";
  g.fillStyle = "#7a5c3a";
  g.fillText(sub, 256, 124, 480);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function NameBoard({ w, front, name, sub, active }: { w: number; front: number; name: string; sub: string; active: boolean }) {
  const bw = Math.min(5.2, Math.max(3.2, w * 0.72));
  const tex = useMemo(() => buildingTexture(name, sub), [name, sub]);
  useEffect(() => () => { tex.dispose(); }, [tex]);
  return (
    <group position={[0, 0, front]}>
      <mesh position={[-bw / 2 + 0.15, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 1.8, 8]} />
        <meshStandardMaterial color="#5a4632" roughness={0.9} />
      </mesh>
      <mesh position={[bw / 2 - 0.15, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 1.8, 8]} />
        <meshStandardMaterial color="#5a4632" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.0, 0]} castShadow>
        <boxGeometry args={[bw, 1.3, 0.14]} />
        <meshStandardMaterial color={active ? "#f5d75d" : "#284b45"} roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.0, 0.08]}>
        <planeGeometry args={[bw - 0.2, 1.1]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.0, -0.08]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[bw - 0.2, 1.1]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}

// Which way does this frontage face? Nearest street by default, override per shop.
function frontAngle(l: Landmark): number {
  if (typeof l.face === "number") return l.face;
  let best = Infinity, ang = 0;
  for (const s of STREETS) {
    if (s.kind === "h") {
      const cx = THREE.MathUtils.clamp(l.x, s.from, s.to);
      const d = Math.hypot(l.x - cx, l.z - s.at);
      if (d < best) { best = d; ang = s.at > l.z ? 0 : Math.PI; }
    } else {
      const cz = THREE.MathUtils.clamp(l.z, s.from, s.to);
      const d = Math.hypot(l.x - s.at, l.z - cz);
      if (d < best) { best = d; ang = s.at > l.x ? Math.PI / 2 : -Math.PI / 2; }
    }
  }
  return ang;
}

// Special details that make each place read as what it is.
function Topper({ l }: { l: Landmark }) {
  const { w, d, h } = l;
  switch (l.id) {
    case "market":
      return (
        <group>
          {[0, 1].map((i) => {
            const sx = i === 0 ? -3.4 : 3.4; // keep the door path clear
            const fz = d / 2 + 0.6; // tucked to the frontage, off the road
            const awn = ["#c0392b", "#27864a"][i];
            const veg = ["#e2711d", "#3fa34d"][i];
            return (
              <group key={i} position={[sx, 0, fz]}>
                <mesh position={[-0.9, 1.05, 0]} castShadow><cylinderGeometry args={[0.07, 0.07, 2.1, 8]} /><meshStandardMaterial color="#6b4a2f" roughness={0.9} /></mesh>
                <mesh position={[0.9, 1.05, 0]} castShadow><cylinderGeometry args={[0.07, 0.07, 2.1, 8]} /><meshStandardMaterial color="#6b4a2f" roughness={0.9} /></mesh>
                <mesh position={[0, 2.15, 0]} rotation={[0.18, 0, 0]} castShadow><boxGeometry args={[2.5, 0.12, 2.2]} /><meshStandardMaterial color={awn} roughness={0.85} /></mesh>
                <mesh position={[-0.4, 0.3, 0]} castShadow><boxGeometry args={[0.9, 0.6, 0.9]} /><meshStandardMaterial color="#8a5a33" roughness={0.9} /></mesh>
                <mesh position={[0.6, 0.25, 0.2]} castShadow><boxGeometry args={[0.8, 0.5, 0.8]} /><meshStandardMaterial color="#8a5a33" roughness={0.9} /></mesh>
                {[-0.25, 0, 0.25].map((o, j) => (
                  <mesh key={j} position={[-0.4 + o, 0.72, 0]}><sphereGeometry args={[0.16, 8, 8]} /><meshStandardMaterial color={veg} roughness={0.7} /></mesh>
                ))}
              </group>
            );
          })}
        </group>
      );
    case "sundar":
    case "subramani": {
      const s = Math.min(w, d);
      return (
        <group>
          <mesh position={[0, h + 0.45, 0]} castShadow><boxGeometry args={[s * 0.72, 0.9, s * 0.72]} /><meshStandardMaterial color="#e0a75e" roughness={0.85} /></mesh>
          <mesh position={[0, h + 1.3, 0]} castShadow><boxGeometry args={[s * 0.5, 0.85, s * 0.5]} /><meshStandardMaterial color="#cf9448" roughness={0.85} /></mesh>
          <mesh position={[0, h + 2.1, 0]} castShadow><boxGeometry args={[s * 0.32, 0.8, s * 0.32]} /><meshStandardMaterial color="#e0a75e" roughness={0.85} /></mesh>
          <mesh position={[0, h + 2.95, 0]}><coneGeometry args={[0.32, 0.9, 8]} /><meshStandardMaterial color="#f5d75d" emissive="#a87b00" emissiveIntensity={0.4} roughness={0.5} /></mesh>
          <mesh position={[0, 1.1, d / 2 + 0.03]}><planeGeometry args={[1.8, 2.2]} /><meshStandardMaterial color="#3a2a1c" roughness={1} side={THREE.DoubleSide} /></mesh>
          {/* compound wall with a gate gap */}
          {[-1, 1].map((sxx, i) => (
            <mesh key={i} position={[sxx * w * 0.32, 0.4, d / 2 + 1.6]} castShadow>
              <boxGeometry args={[w * 0.3, 0.8, 0.25]} /><meshStandardMaterial color="#d9c9a8" roughness={0.9} />
            </mesh>
          ))}
        </group>
      );
    }
    case "busstop":
      return (
        <group>
          <mesh position={[0, h + 0.25, 0]} castShadow><boxGeometry args={[w + 1, 0.22, d + 1.6]} /><meshStandardMaterial color="#284e62" roughness={0.8} /></mesh>
          <mesh position={[0, 0.5, -0.6]} castShadow><boxGeometry args={[w * 0.75, 0.35, 0.55]} /><meshStandardMaterial color="#6b4a2f" roughness={0.9} /></mesh>
          <mesh position={[-w / 2 + 0.3, h / 2, 0]}><cylinderGeometry args={[0.08, 0.08, h, 8]} /><meshStandardMaterial color="#3a3f44" roughness={0.7} /></mesh>
          <mesh position={[w / 2 - 0.3, h / 2, 0]}><cylinderGeometry args={[0.08, 0.08, h, 8]} /><meshStandardMaterial color="#3a3f44" roughness={0.7} /></mesh>
        </group>
      );
    case "mamu":
      return (
        <group>
          <mesh position={[0, h + 0.35, 0.4]} rotation={[0.22, 0, 0]} castShadow><boxGeometry args={[w + 0.6, 0.1, 2.2]} /><meshStandardMaterial color="#c0392b" roughness={0.85} /></mesh>
          <mesh position={[0, 0.55, d / 2 + 0.5]} castShadow><boxGeometry args={[w * 0.7, 0.9, 0.5]} /><meshStandardMaterial color="#5d3a24" roughness={0.9} /></mesh>
          <mesh position={[-0.5, 1.15, d / 2 + 0.5]}><cylinderGeometry args={[0.16, 0.2, 0.32, 10]} /><meshStandardMaterial color="#b8c0c4" metalness={0.6} roughness={0.4} /></mesh>
          {[-1.3, 1.3].map((sx, i) => (
            <mesh key={i} position={[sx, 0.28, d / 2 + 1.4]} castShadow><cylinderGeometry args={[0.24, 0.24, 0.5, 10]} /><meshStandardMaterial color="#7a4a2b" roughness={0.9} /></mesh>
          ))}
        </group>
      );
    case "school":
      return (
        <group>
          <mesh position={[w / 2 - 0.6, 2.1, d / 2 + 0.8]} castShadow><cylinderGeometry args={[0.07, 0.07, 4.2, 8]} /><meshStandardMaterial color="#888" roughness={0.6} /></mesh>
          <mesh position={[w / 2 + 0.05, 3.8, d / 2 + 0.8]}><planeGeometry args={[1.3, 0.8]} /><meshStandardMaterial color="#e2711d" side={THREE.DoubleSide} roughness={0.8} /></mesh>
          {[-1, 1].map((sxx, i) => (
            <mesh key={i} position={[sxx * w * 0.32, 0.4, d / 2 + 1.6]} castShadow>
              <boxGeometry args={[w * 0.3, 0.8, 0.25]} /><meshStandardMaterial color="#d9c9a8" roughness={0.9} />
            </mesh>
          ))}
        </group>
      );
    case "meenakshi":
    case "ranga":
      return (
        <group>
          {[-1, 1].map((sx) => [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[(sx * w) / 2.6, 1.3, d / 2 + 0.6 + (sz > 0 ? 1.2 : 0)]} castShadow>
              <cylinderGeometry args={[0.16, 0.16, 2.6, 10]} /><meshStandardMaterial color="#f3e6c8" roughness={0.8} />
            </mesh>
          )))}
          <mesh position={[0, 2.7, d / 2 + 1.2]} castShadow><boxGeometry args={[w * 0.9, 0.25, 2.6]} /><meshStandardMaterial color="#a84837" roughness={0.85} /></mesh>
          <mesh position={[0, 0.15, d / 2 + 1.2]}><boxGeometry args={[3, 0.3, 2.8]} /><meshStandardMaterial color="#b9a07a" roughness={1} /></mesh>
        </group>
      );
    case "salon":
      return (
        <group>
          <mesh position={[1.2, 1.6, d / 2 + 0.1]}><cylinderGeometry args={[0.16, 0.16, 0.9, 12]} /><meshStandardMaterial color="#f2f2f2" roughness={0.6} /></mesh>
          {[1.4, 1.8].map((y, i) => (
            <mesh key={i} position={[1.2, y, d / 2 + 0.1]}><cylinderGeometry args={[0.165, 0.165, 0.14, 12]} /><meshStandardMaterial color="#c0392b" roughness={0.6} /></mesh>
          ))}
          <mesh position={[-1.2, 1.1, d / 2 + 0.05]}><planeGeometry args={[1.4, 0.7]} /><meshStandardMaterial color="#2b2b2b" roughness={0.9} /></mesh>
        </group>
      );
    case "fourknots":
      return (
        <group>
          <mesh position={[0, h + 0.5, 0]} castShadow><boxGeometry args={[0.8, 0.55, 0.55]} /><meshStandardMaterial color="#333" roughness={0.7} /></mesh>
          <mesh position={[0, h + 0.5, 0.45]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.22, 0.3, 12]} /><meshStandardMaterial color="#111" roughness={0.4} /></mesh>
          <mesh position={[0, h + 0.85, -0.1]}><sphereGeometry args={[0.09, 8, 8]} /><meshStandardMaterial color="#f5d75d" emissive="#f5d75d" emissiveIntensity={0.8} /></mesh>
        </group>
      );
    case "tn23":
      return (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[w / 2 + 0.8, 0.5 + i * 0.22, -1]} rotation={[0, 0.3, 0]} castShadow>
              <torusGeometry args={[0.45, 0.1, 8, 18]} /><meshStandardMaterial color="#2b2d2d" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[-w / 2 - 1.2, 0.5, 0.5]} castShadow><boxGeometry args={[2, 0.9, 1]} /><meshStandardMaterial color="#6b4a2f" roughness={0.9} /></mesh>
        </group>
      );
    case "park":
      return (
        <group>
          {[[-2.5, -1.5], [2.5, -1], [0, 2]].map(([tx, tz], i) => (
            <group key={i} position={[tx, 0.6, tz]}>
              <mesh position={[0, 0.7, 0]} castShadow><cylinderGeometry args={[0.14, 0.18, 1.4, 8]} /><meshStandardMaterial color="#6b4a2f" roughness={1} /></mesh>
              <mesh position={[0, 1.9, 0]} castShadow><sphereGeometry args={[0.95, 10, 10]} /><meshStandardMaterial color="#3f8a52" roughness={1} /></mesh>
            </group>
          ))}
          <mesh position={[3, 1.0, 2.5]} castShadow><boxGeometry args={[1.8, 0.12, 0.5]} /><meshStandardMaterial color="#6b4a2f" roughness={0.9} /></mesh>
          <mesh position={[0, 0.75, -2]}><cylinderGeometry args={[1.2, 1.2, 0.12, 20]} /><meshStandardMaterial color="#7fc4d4" roughness={0.4} /></mesh>
        </group>
      );
    case "grocery":
      return (
        <group>
          <mesh position={[0, h + 0.35, 0.4]} rotation={[0.2, 0, 0]} castShadow><boxGeometry args={[w + 0.6, 0.1, 2.4]} /><meshStandardMaterial color="#27864a" roughness={0.85} /></mesh>
          <mesh position={[-1.4, 0.5, d / 2 + 0.6]} castShadow><boxGeometry args={[1.1, 1.0, 1.0]} /><meshStandardMaterial color="#a8844f" roughness={0.9} /></mesh>
          <mesh position={[-1.4, 1.15, d / 2 + 0.6]}><sphereGeometry args={[0.42, 10, 10]} /><meshStandardMaterial color="#e8d9a8" roughness={0.9} /></mesh>
          <mesh position={[1.4, 0.4, d / 2 + 0.6]} castShadow><boxGeometry args={[1.0, 0.8, 0.9]} /><meshStandardMaterial color="#8a5a33" roughness={0.9} /></mesh>
          {[-0.2, 0.15, 0.5].map((o, j) => (
            <mesh key={j} position={[1.4 + o - 0.15, 0.92, d / 2 + 0.6]}><sphereGeometry args={[0.15, 8, 8]} /><meshStandardMaterial color={["#e2711d", "#d62828", "#f5d75d"][j]} roughness={0.7} /></mesh>
          ))}
        </group>
      );
    case "tea2":
      return (
        <group>
          <mesh position={[0, h + 0.35, 0.4]} rotation={[0.22, 0, 0]} castShadow><boxGeometry args={[w + 0.6, 0.1, 2.2]} /><meshStandardMaterial color="#e2711d" roughness={0.85} /></mesh>
          <mesh position={[0, 0.55, d / 2 + 0.5]} castShadow><boxGeometry args={[w * 0.7, 0.9, 0.5]} /><meshStandardMaterial color="#5d3a24" roughness={0.9} /></mesh>
          <mesh position={[0.4, 1.15, d / 2 + 0.5]}><cylinderGeometry args={[0.16, 0.2, 0.32, 10]} /><meshStandardMaterial color="#b8c0c4" metalness={0.6} roughness={0.4} /></mesh>
          <mesh position={[-1.2, 0.28, d / 2 + 1.4]} castShadow><cylinderGeometry args={[0.24, 0.24, 0.5, 10]} /><meshStandardMaterial color="#3f6d4e" roughness={0.9} /></mesh>
        </group>
      );
    case "medicals":
      return (
        <group>
          <mesh position={[0, h + 0.7, 0]} castShadow><boxGeometry args={[1.4, 1.0, 0.2]} /><meshStandardMaterial color="#2e7d46" roughness={0.7} /></mesh>
          <mesh position={[0, h + 0.7, 0.12]}><boxGeometry args={[0.7, 0.28, 0.06]} /><meshStandardMaterial color="#fff" roughness={0.6} /></mesh>
          <mesh position={[0, h + 0.7, 0.12]}><boxGeometry args={[0.28, 0.7, 0.06]} /><meshStandardMaterial color="#fff" roughness={0.6} /></mesh>
        </group>
      );
    case "tailor":
      return (
        <group>
          <mesh position={[0, h + 0.3, 0.5]} rotation={[0.18, 0, 0]} castShadow><boxGeometry args={[w * 0.8, 0.1, 1.8]} /><meshStandardMaterial color="#7a4fb5" roughness={0.85} /></mesh>
          <mesh position={[0, 0.55, d / 2 + 0.6]} castShadow><boxGeometry args={[2.2, 0.7, 0.8]} /><meshStandardMaterial color="#6b4a2f" roughness={0.9} /></mesh>
          {[
            [-0.6, "#e84393"], [0, "#f5d75d"], [0.6, "#5e8fc5"],
          ].map(([ox, c], i) => (
            <mesh key={i} position={[ox as number, 1.05, d / 2 + 0.6]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.14, 0.14, 0.7, 10]} /><meshStandardMaterial color={c as string} roughness={0.7} />
            </mesh>
          ))}
        </group>
      );
    default:
      return null;
  }
}

function LandmarkMesh({ l, active, offer, lang }: { l: Landmark; active: boolean; offer: boolean; lang: "en" | "ta" }) {
  const front = l.d / 2 + 1.2;
  const labelY = Math.max(l.h + 2.2, 3.4);
  const name = lang === "en" ? l.en : l.ta;
  return (
    <group position={[l.x, 0, l.z]}>
      <mesh position={[0, l.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[l.w, l.h, l.d]} />
        <meshStandardMaterial
          color={l.color} roughness={0.95}
          emissive={active ? "#7a5c00" : "#000000"} emissiveIntensity={active ? 0.55 : 0}
        />
      </mesh>
      {/* frontage (door + windows + board) faces the street */}
      <group rotation={[0, frontAngle(l), 0]}>
      {/* window grid so walls don't look flat */}
      {l.id !== "park" && (() => {
        const cols = Math.min(4, Math.max(1, Math.floor(l.w / 2.2)));
        const rows = Math.min(2, Math.max(1, Math.floor(l.h / 1.9)));
        const cells: JSX.Element[] = [];
        for (let cx = 0; cx < cols; cx++) {
          for (let cy = 0; cy < rows; cy++) {
            const wy = 1.5 + cy * 1.7;
            if (wy > l.h - 0.5) continue;
            const wx = ((cx + 0.5) / cols - 0.5) * (l.w - 1.6);
            cells.push(
              <mesh key={`${cx}-${cy}`} position={[wx, wy, l.d / 2 + 0.03]}>
                <planeGeometry args={[0.75, 0.95]} />
                <meshStandardMaterial color="#33454f" roughness={0.35} />
              </mesh>
            );
          }
        }
        return <>{cells}</>;
      })()}
      <Topper l={l} />
      {/* door */}
      {l.id !== "park" && (
        <mesh position={[0, 1, l.d / 2 + 0.02]}>
          <planeGeometry args={[1.6, 2]} />
          <meshStandardMaterial color="#4a3325" roughness={1} side={THREE.DoubleSide} />
        </mesh>
      )}
      <NameBoard w={l.w} front={front} active={active} name={name} sub={lang === "en" ? l.subEn : l.subTa} />
      </group>
      {active && (
        <mesh position={[0, labelY + 1.4, 0]}>
          <coneGeometry args={[0.7, 1.4, 8]} />
          <meshStandardMaterial color="#f5d75d" emissive="#f5d75d" emissiveIntensity={0.7} />
        </mesh>
      )}
      {offer && !active && (
        <mesh position={[0, labelY + 0.9, 0]}>
          <sphereGeometry args={[0.5, 12, 12]} />
          <meshStandardMaterial color="#7fe3d0" emissive="#7fe3d0" emissiveIntensity={0.8} />
        </mesh>
      )}
    </group>
  );
}

// Street name is painted onto the board as a texture — it can never float away.
function signTexture(en: string, ta: string) {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 170;
  const g = c.getContext("2d")!;
  g.fillStyle = "#284b45";
  g.fillRect(0, 0, 640, 170);
  g.strokeStyle = "#f5d75d";
  g.lineWidth = 10;
  g.strokeRect(10, 10, 620, 150);
  g.fillStyle = "#fff8dd";
  g.textAlign = "center";
  g.font = "bold 54px Arial, sans-serif";
  g.fillText(en, 320, 74, 600);
  g.font = "44px Arial, sans-serif";
  g.fillText(ta, 320, 132, 600);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function StreetSign({ s, lang }: { s: Street; lang: "en" | "ta" }) {
  const tex = useMemo(() => signTexture(s.en, s.ta), [s.en, s.ta]);
  useEffect(() => () => { tex.dispose(); }, [tex]);
  return (
    <group position={[s.signX, 0, s.signZ]}>
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 2.8, 8]} />
        <meshStandardMaterial color="#5a4632" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.1, 0]} castShadow>
        <boxGeometry args={[5.4, 1.45, 0.16]} />
        <meshStandardMaterial color="#284b45" roughness={0.8} />
      </mesh>
      <mesh position={[0, 3.1, 0.09]}>
        <planeGeometry args={[5.2, 1.3]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh position={[0, 3.1, -0.09]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[5.2, 1.3]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* floating pill so the street name reads from gameplay angles too */}
      <Html center distanceFactor={50} position={[0, 4.4, 0]} style={{ pointerEvents: "none" }}>
        <div style={{ background: "#284b45ee", color: "#fff8dd", fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 10, whiteSpace: "nowrap", border: "2px solid #f5d75d88" }}>
          {lang === "en" ? s.en : s.ta}
        </div>
      </Html>
    </group>
  );
}

// Vellore welcome arch over Main Road + flower cart near the temple street.
function WelcomeArch() {
  return (
    <group position={[40, 0, 0]}>
      {[-3.8, 3.8].map((dz, i) => (
        <mesh key={i} position={[0, 2.5, dz]} castShadow>
          <boxGeometry args={[1, 5, 1]} />
          <meshStandardMaterial color="#b6543f" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 5.4, 0]} castShadow>
        <boxGeometry args={[1.2, 1.3, 9]} />
        <meshStandardMaterial color="#f3e6c8" roughness={0.85} />
      </mesh>
      <Html center distanceFactor={60} position={[0, 5.4, 0]} style={{ pointerEvents: "none" }}>
        <div style={{ width: 190, textAlign: "center", color: "#7a2e1f", fontSize: 13, fontWeight: 900 }}>
          VELLORE · வேலூர்
        </div>
      </Html>
    </group>
  );
}

function FlowerCart() {
  return (
    <group position={[29.5, 0, -6]} rotation={[0, 0.4, 0]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.6, 0.5, 1]} />
        <meshStandardMaterial color="#8a5a33" roughness={0.9} />
      </mesh>
      {[-0.7, 0.7].map((dx, i) => (
        <mesh key={i} position={[dx, 0.35, 0.55]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.32, 0.07, 8, 16]} />
          <meshStandardMaterial color="#4a3325" roughness={0.9} />
        </mesh>
      ))}
      {[
        [-0.4, "#e84393"], [0, "#f5d75d"], [0.4, "#e2711d"],
      ].map(([dx, c], i) => (
        <mesh key={i} position={[dx as number, 0.95, 0]}>
          <sphereGeometry args={[0.3, 10, 10]} />
          <meshStandardMaterial color={c as string} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.05, 0.05, 1.6, 8]} /><meshStandardMaterial color="#6b4a2f" roughness={0.9} /></mesh>
      <mesh position={[0, 2.5, 0]}><coneGeometry args={[1.1, 0.7, 8]} /><meshStandardMaterial color="#c0392b" roughness={0.85} /></mesh>
    </group>
  );
}

function Player({ keysRef, destRef, movers, circles, resetTick, startX, startZ, shirt, emote, emoteTick, hornTick, onPos }: {
  keysRef: KeysRef; destRef: DestRef; movers: MoversRef; circles: Circle[]; resetTick: number; startX: number; startZ: number;
  shirt: string; emote: string; emoteTick: number; hornTick: number;
  onPos: (p: PlayerState) => void;
}) {
  const g = useRef<THREE.Group>(null!);
  const wheelF = useRef<THREE.Mesh | null>(null);
  const wheelB = useRef<THREE.Mesh | null>(null);
  const pos = useRef({ x: startX, z: startZ, y: 0, vy: 0, angle: 0, jumpHeld: false });
  const hornPulse = useRef(0);
  const resetSeen = useRef(0);
  const rider = useRef<THREE.Mesh>(null!);
  const [bubble, setBubble] = useState(false);

  useEffect(() => {
    if (emoteTick === 0) return;
    setBubble(true);
    const id = setTimeout(() => setBubble(false), 2200);
    return () => clearTimeout(id);
  }, [emoteTick]);

  useFrame((state, dt) => {
    const k = keysRef.current;
    const fwd = (k["arrowup"] || k["w"] ? 1 : 0) - (k["arrowdown"] || k["s"] ? 1 : 0);
    const strafe = (k["arrowright"] || k["d"] ? 1 : 0) - (k["arrowleft"] || k["a"] ? 1 : 0);
    const step = Math.min(dt, 0.05);
    const p = pos.current;
    // rescue button: drop onto the closest street/driveway point
    if (resetTick !== resetSeen.current) {
      resetSeen.current = resetTick;
      const [rx, rz] = nearestRideable(p.x, p.z);
      const [cx, cz] = collide(rx, rz, circles);
      p.x = cx; p.z = cz; p.y = 0; p.vy = 0;
      destRef.current = null;
    }
    const keyMove = fwd !== 0 || strafe !== 0;
    let dx = 0, dz = 0;
    if (keyMove) {
      const len = Math.hypot(strafe, fwd) || 1;
      dx = strafe / len; dz = fwd / len;
      destRef.current = null;
    } else if (destRef.current) {
      const tx = destRef.current.x - p.x, tz = destRef.current.z - p.z;
      const d = Math.hypot(tx, tz);
      if (d < 1) destRef.current = null;
      else { dx = tx / d; dz = tz / d; }
    }
    const moving = dx !== 0 || dz !== 0;
    if (moving) {
      const speed = 13;
      const nx = p.x + dx * speed * step;
      const nz = p.z + dz * speed * step;
      if (isOnRoad(nx, nz)) { p.x = nx; p.z = nz; }
      else if (isOnRoad(nx, p.z)) { p.x = nx; }
      else if (isOnRoad(p.x, nz)) { p.z = nz; }
      [p.x, p.z] = collide(p.x, p.z, circles);
      // soft push-out from every moving thing (vehicles, animals, people)
      const mv = movers.current;
      for (const k in mv) {
        const o = mv[k];
        const mdx = p.x - o.x, mdz = p.z - o.z;
        const md = Math.hypot(mdx, mdz);
        const min = o.r + 0.9;
        if (md < min && md > 0.0001) {
          p.x = o.x + (mdx / md) * min;
          p.z = o.z + (mdz / md) * min;
        }
      }
      if (destRef.current && Math.hypot(destRef.current.x - p.x, destRef.current.z - p.z) < 1) destRef.current = null;
      p.angle = Math.atan2(dx, dz);
      const spin = step * 13 * 2.2;
      if (wheelF.current) wheelF.current.rotation.x += spin;
      if (wheelB.current) wheelB.current.rotation.x += spin;
    }
    const jumpDown = !!k[" "];
    if ((jumpDown && !p.jumpHeld && p.y <= 0.01) || (hornTick !== hornPulse.current && p.y <= 0.01)) {
      p.vy = 7;
    }
    if (hornTick !== hornPulse.current) hornPulse.current = hornTick;
    p.jumpHeld = jumpDown;
    // pedalling bob so the rider feels alive
    if (rider.current) {
      rider.current.position.y = 1.55 + (moving ? Math.abs(Math.sin(state.clock.elapsedTime * 10)) * 0.08 : 0);
    }
    if (p.y > 0 || p.vy !== 0) {
      p.vy -= 22 * step;
      p.y += p.vy * step;
      if (p.y <= 0) { p.y = 0; p.vy = 0; }
    }
    if (g.current) {
      g.current.position.set(p.x, p.y, p.z);
      g.current.rotation.y = p.angle;
    }
    const cam = state.camera;
      const want = new THREE.Vector3(p.x + 95, 105, p.z + 95);
    cam.position.lerp(want, 1 - Math.pow(0.001, step));
    cam.lookAt(p.x, 1, p.z);
    onPos({ x: p.x, z: p.z, moving, onRoad: isOnRoad(p.x, p.z) });
  });

  return (
    <group ref={g} position={[startX, 0, startZ]}>
      <CycleFrame color="#df9826" />
      <Wheel position={[0, 0.5, 0.8]} spinRef={wheelF} />
      <Wheel position={[0, 0.5, -0.8]} spinRef={wheelB} />
      <mesh ref={rider} position={[0, 1.55, -0.35]} castShadow>
        <capsuleGeometry args={[0.32, 0.6, 4, 10]} />
        <meshStandardMaterial color={shirt} roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.3, -0.38]}>
        <sphereGeometry args={[0.3, 14, 14]} />
        <meshStandardMaterial color="#be764e" roughness={0.8} />
      </mesh>
      <Html center distanceFactor={60} position={[0, 2.7, 0]} style={{ pointerEvents: "none" }}>
        <div style={{ background: "#fff8d9", color: "#263d37", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 8 }}>You · நீங்கள்</div>
      </Html>
      {bubble && (
        <Html center distanceFactor={55} position={[0, 3.3, 0]} style={{ pointerEvents: "none" }}>
          <div style={{ fontSize: 26, filter: "drop-shadow(0 2px 3px rgba(0,0,0,.3))" }}>{emote}</div>
        </Html>
      )}
    </group>
  );
}

// Customer waiting at the TN23 shop with their broken cycle lying beside them.
function CustomerNpc({ name, color, visible }: { name: string; color: string; visible: boolean }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (g.current) g.current.position.y = Math.abs(Math.sin(t * 2.2)) * 0.15;
  });
  return (
    <group position={[-20, 0, 4]}>
      <group ref={g}>
        <mesh position={[0, 0.9, 0]} castShadow>
          <capsuleGeometry args={[0.3, 0.6, 4, 10]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.65, 0]}>
          <sphereGeometry args={[0.27, 12, 12]} />
          <meshStandardMaterial color="#c98a5e" roughness={0.8} />
        </mesh>
        <group position={[1.7, 0.35, 0.5]} rotation={[0, 0.5, 1.25]}>
          <CycleFrame color="#8a8f8f" />
          <Wheel position={[0, 0.5, 0.8]} />
          <Wheel position={[0, 0.5, -0.8]} />
        </group>
        {visible && (
          <Html center distanceFactor={60} position={[0, 2.0, 0]} style={{ pointerEvents: "none" }}>
            <div style={{ background: "#f5d75d", color: "#29453f", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 8, whiteSpace: "nowrap", border: "2px solid #fff8dd" }}>
              🔧 {name}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

// Fellow riders wandering the grass blocks — Messenger-style presence.
// Spots shuffle with the seed; badges show only when you're close.
function Bots({ lang, movers, spots, visible }: { lang: "en" | "ta"; movers: MoversRef; spots: { x: number; z: number }[]; visible: boolean[] }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    BOT_BASES.forEach((b, i) => {
      const g = refs.current[i];
      if (!g) return;
      const c = spots[i] ?? { x: b.cx, z: b.cz };
      const a = t * b.speed + b.phase;
      const x = c.x + Math.cos(a) * b.r;
      const z = c.z + Math.sin(a * 1.3) * b.r;
      movers.current[8 + i] = { x, z, r: 0.7 };
      g.position.set(x, Math.abs(Math.sin(t * 2 + b.phase)) * 0.35, z);
      g.rotation.y = Math.atan2(-Math.sin(a) * b.r, Math.cos(a * 1.3) * 1.3 * b.r);
    });
  });
  return (
    <>
      {BOT_BASES.map((b, i) => {
        const c = spots[i] ?? { x: b.cx, z: b.cz };
        return (
          <group key={b.en} ref={(el) => { refs.current[i] = el; }} position={[c.x, 0, c.z]}>
            <mesh position={[0, 0.9, 0]} castShadow>
              <capsuleGeometry args={[0.3, 0.6, 4, 10]} />
              <meshStandardMaterial color={b.color} roughness={0.8} />
            </mesh>
            <mesh position={[0, 1.65, 0]}>
              <sphereGeometry args={[0.27, 12, 12]} />
              <meshStandardMaterial color="#c98a5e" roughness={0.8} />
            </mesh>
            {visible[i] && (
              <Html center distanceFactor={60} position={[0, 2.0, 0]} style={{ pointerEvents: "none" }}>
                <div style={{ background: "rgba(255,248,217,.92)", color: "#263d37", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, whiteSpace: "nowrap" }}>
                  🛵 {lang === "en" ? b.en : b.ta}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </>
  );
}

// Solid rubber wheel for motor vehicles (axle = X).
function CarWheel({ x, y, z, r }: { x: number; y: number; z: number; r: number }) {
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(r, r, 0.24, 12);
    g.rotateZ(Math.PI / 2);
    return g;
  }, [r]);
  return (
    <mesh position={[x, y, z]} geometry={geo}>
      <meshStandardMaterial color="#222" roughness={0.9} />
    </mesh>
  );
}

function Sedan({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.62, 0]} castShadow><boxGeometry args={[1.7, 0.55, 4.2]} /><meshStandardMaterial color={color} roughness={0.35} metalness={0.3} /></mesh>
      <mesh position={[0, 1.12, -0.3]} castShadow><boxGeometry args={[1.5, 0.5, 2.1]} /><meshStandardMaterial color={color} roughness={0.35} metalness={0.3} /></mesh>
      <mesh position={[0, 1.12, -0.3]}><boxGeometry args={[1.54, 0.3, 1.9]} /><meshStandardMaterial color="#2b3a44" roughness={0.2} metalness={0.4} /></mesh>
      {[-0.62, 0.62].map((lx, i) => (
        <mesh key={i} position={[lx, 1.0, 2.12]}><boxGeometry args={[0.3, 0.16, 0.06]} /><meshStandardMaterial color="#fff6c8" emissive="#fff2a8" emissiveIntensity={0.9} /></mesh>
      ))}
      <mesh position={[0, 1.0, -2.12]}><boxGeometry args={[1.2, 0.16, 0.06]} /><meshStandardMaterial color="#c0392b" emissive="#c0392b" emissiveIntensity={0.6} /></mesh>
      <CarWheel x={-0.85} y={0.35} z={1.35} r={0.35} /><CarWheel x={0.85} y={0.35} z={1.35} r={0.35} />
      <CarWheel x={-0.85} y={0.35} z={-1.35} r={0.35} /><CarWheel x={0.85} y={0.35} z={-1.35} r={0.35} />
    </group>
  );
}

function Hatchback({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.62, 0.2]} castShadow><boxGeometry args={[1.65, 0.55, 3.3]} /><meshStandardMaterial color={color} roughness={0.4} metalness={0.25} /></mesh>
      <mesh position={[0, 1.12, -0.35]} castShadow><boxGeometry args={[1.45, 0.55, 1.7]} /><meshStandardMaterial color={color} roughness={0.4} metalness={0.25} /></mesh>
      <mesh position={[0, 1.12, -0.35]}><boxGeometry args={[1.49, 0.32, 1.55]} /><meshStandardMaterial color="#2b3a44" roughness={0.2} metalness={0.4} /></mesh>
      {[-0.6, 0.6].map((lx, i) => (
        <mesh key={i} position={[lx, 0.95, 1.87]}><boxGeometry args={[0.28, 0.15, 0.06]} /><meshStandardMaterial color="#fff6c8" emissive="#fff2a8" emissiveIntensity={0.9} /></mesh>
      ))}
      <CarWheel x={-0.82} y={0.34} z={1.1} r={0.34} /><CarWheel x={0.82} y={0.34} z={1.1} r={0.34} />
      <CarWheel x={-0.82} y={0.34} z={-1.1} r={0.34} /><CarWheel x={0.82} y={0.34} z={-1.1} r={0.34} />
    </group>
  );
}

function Van({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 1.05, 0]} castShadow><boxGeometry args={[1.9, 1.5, 4.4]} /><meshStandardMaterial color={color} roughness={0.6} /></mesh>
      <mesh position={[0, 1.45, 2.0]}><boxGeometry args={[1.7, 0.6, 0.15]} /><meshStandardMaterial color="#2b3a44" roughness={0.2} metalness={0.4} /></mesh>
      <mesh position={[0, 1.35, 0]}><boxGeometry args={[1.94, 0.5, 2.6]} /><meshStandardMaterial color="#33454f" roughness={0.3} /></mesh>
      {[-0.65, 0.65].map((lx, i) => (
        <mesh key={i} position={[lx, 0.9, 2.22]}><boxGeometry args={[0.32, 0.18, 0.06]} /><meshStandardMaterial color="#fff6c8" emissive="#fff2a8" emissiveIntensity={0.9} /></mesh>
      ))}
      <CarWheel x={-0.95} y={0.4} z={1.45} r={0.4} /><CarWheel x={0.95} y={0.4} z={1.45} r={0.4} />
      <CarWheel x={-0.95} y={0.4} z={-1.45} r={0.4} /><CarWheel x={0.95} y={0.4} z={-1.45} r={0.4} />
    </group>
  );
}

function CityBus() {
  return (
    <group>
      <mesh position={[0, 1.35, 0]} castShadow><boxGeometry args={[2.2, 2.1, 7]} /><meshStandardMaterial color="#2e7d46" roughness={0.6} /></mesh>
      <mesh position={[0, 1.75, 0]}><boxGeometry args={[2.26, 0.7, 6.4]} /><meshStandardMaterial color="#cfe3dc" roughness={0.25} metalness={0.3} /></mesh>
      <mesh position={[0, 2.5, 0]}><boxGeometry args={[2.0, 0.2, 6.6]} /><meshStandardMaterial color="#f3ecd8" roughness={0.7} /></mesh>
      <mesh position={[1.12, 1.0, 1.5]}><boxGeometry args={[0.06, 1.4, 1.0]} /><meshStandardMaterial color="#3a2a1c" roughness={0.8} /></mesh>
      <mesh position={[0, 1.1, 3.53]}><boxGeometry args={[1.8, 0.5, 0.06]} /><meshStandardMaterial color="#1d2b33" roughness={0.2} metalness={0.4} /></mesh>
      {[-0.62, 0.62].map((lx, i) => (
        <mesh key={i} position={[lx, 0.9, 3.53]}><boxGeometry args={[0.34, 0.2, 0.06]} /><meshStandardMaterial color="#fff6c8" emissive="#fff2a8" emissiveIntensity={0.9} /></mesh>
      ))}
      <CarWheel x={-1.0} y={0.45} z={2.3} r={0.45} /><CarWheel x={1.0} y={0.45} z={2.3} r={0.45} />
      <CarWheel x={-1.0} y={0.45} z={-2.3} r={0.45} /><CarWheel x={1.0} y={0.45} z={-2.3} r={0.45} />
    </group>
  );
}

function Lorry() {
  return (
    <group>
      <mesh position={[0, 1.15, 2.6]} castShadow><boxGeometry args={[2.2, 1.7, 2.2]} /><meshStandardMaterial color="#b6543f" roughness={0.6} /></mesh>
      <mesh position={[0, 1.5, 3.55]}><boxGeometry args={[1.9, 0.7, 0.15]} /><meshStandardMaterial color="#2b3a44" roughness={0.2} metalness={0.4} /></mesh>
      {[-0.65, 0.65].map((lx, i) => (
        <mesh key={i} position={[lx, 0.85, 3.72]}><boxGeometry args={[0.32, 0.2, 0.06]} /><meshStandardMaterial color="#fff6c8" emissive="#fff2a8" emissiveIntensity={0.9} /></mesh>
      ))}
      <mesh position={[0, 1.5, -1.2]} castShadow><boxGeometry args={[2.3, 2.2, 5.2]} /><meshStandardMaterial color="#3f6d8e" roughness={0.65} /></mesh>
      <mesh position={[0, 1.5, -1.2]}><boxGeometry args={[2.34, 0.4, 5.24]} /><meshStandardMaterial color="#f3ecd8" roughness={0.7} /></mesh>
      <CarWheel x={-1.0} y={0.45} z={2.6} r={0.45} /><CarWheel x={1.0} y={0.45} z={2.6} r={0.45} />
      <CarWheel x={-1.0} y={0.45} z={-0.6} r={0.45} /><CarWheel x={1.0} y={0.45} z={-0.6} r={0.45} />
      <CarWheel x={-1.0} y={0.45} z={-2.8} r={0.45} /><CarWheel x={1.0} y={0.45} z={-2.8} r={0.45} />
    </group>
  );
}

function Motorbike({ color }: { color: string }) {
  const wheelGeo = useMemo(() => {
    const t = new THREE.TorusGeometry(0.32, 0.08, 8, 18);
    t.rotateY(Math.PI / 2);
    return t;
  }, []);
  return (
    <group>
      <mesh position={[0, 0.32, 0.75]} geometry={wheelGeo} castShadow><meshStandardMaterial color="#222" roughness={0.9} /></mesh>
      <mesh position={[0, 0.32, -0.75]} geometry={wheelGeo} castShadow><meshStandardMaterial color="#222" roughness={0.9} /></mesh>
      <mesh position={[0, 0.72, 0.1]} castShadow><boxGeometry args={[0.34, 0.3, 0.75]} /><meshStandardMaterial color={color} roughness={0.4} metalness={0.3} /></mesh>
      <mesh position={[0, 0.78, -0.55]}><boxGeometry args={[0.3, 0.12, 0.5]} /><meshStandardMaterial color="#222" roughness={0.8} /></mesh>
      <mesh position={[0, 1.0, 0.72]}><boxGeometry args={[0.5, 0.07, 0.07]} /><meshStandardMaterial color="#333" roughness={0.6} /></mesh>
      <mesh position={[0, 0.85, 0.78]}><sphereGeometry args={[0.09, 8, 8]} /><meshStandardMaterial color="#fff6c8" emissive="#fff2a8" emissiveIntensity={1} /></mesh>
      <mesh position={[0, 1.25, -0.35]} castShadow><capsuleGeometry args={[0.26, 0.5, 4, 10]} /><meshStandardMaterial color="#4c5b6b" roughness={0.8} /></mesh>
      <mesh position={[0, 1.85, -0.35]}><sphereGeometry args={[0.24, 12, 12]} /><meshStandardMaterial color="#8a5a3a" roughness={0.8} /></mesh>
      <mesh position={[0, 1.98, -0.35]}><sphereGeometry args={[0.27, 12, 8, 0, Math.PI * 2, 0, 1.4]} /><meshStandardMaterial color="#222" roughness={0.5} /></mesh>
    </group>
  );
}

// Every road crossing in town, computed from the real street data.
interface Junc { x: number; z: number; a: string; b: string }
const JUNCTIONS: Junc[] = (() => {
  const out: Junc[] = [];
  for (const h of STREETS) {
    if (h.kind !== "h") continue;
    for (const v of STREETS) {
      if (v.kind !== "v") continue;
      if (v.at > h.from - 1 && v.at < h.to + 1 && h.at > v.from - 1 && h.at < v.to + 1) {
        out.push({ x: v.at, z: h.at, a: h.id, b: v.id });
      }
    }
  }
  return out;
})();

// Junction positions along each street (units from its `from` end).
const JUNCTION_T: Record<string, number[]> = (() => {
  const m: Record<string, number[]> = {};
  for (const s of STREETS) m[s.id] = [];
  for (const j of JUNCTIONS) {
    const a = STREETS.find((q) => q.id === j.a)!;
    const b = STREETS.find((q) => q.id === j.b)!;
    m[j.a].push(a.kind === "h" ? j.x - a.from : j.z - a.from);
    m[j.b].push(b.kind === "h" ? j.x - b.from : j.z - b.from);
  }
  for (const k in m) m[k].sort((p, q) => p - q);
  return m;
})();

interface RoadCar {
  id: number; model: string; street: string; t: number; dir: 1 | -1;
  speed: number; lane: number; laneCur: number; angle: number; turnP: number; refi: number;
}

// Keep right: lane side follows travel direction.
function laneFor(s: Street, dir: 1 | -1) {
  if (s.kind === "h") return dir > 0 ? 1.6 : -1.6;
  return dir > 0 ? -1.6 : 1.6;
}
function headingFor(s: Street, dir: 1 | -1) {
  if (s.kind === "h") return dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  return dir > 0 ? 0 : Math.PI;
}
function streetPoint(s: Street, t: number, lane: number): [number, number] {
  return s.kind === "h" ? [s.from + t, s.at + lane] : [s.at + lane, s.from + t];
}
const MODEL_R: Record<string, number> = { sedan: 2.2, lorry: 3.4, auto: 1.6, bus: 3.5, cycle: 1.0, van: 2.4, bike: 1.0, hatch: 2.0 };

// Roaming traffic: vehicles drive the street network, turn at junctions and
// swing around at dead ends — no fixed loops. Re-dealt on every seed.
function Traffic({ movers, seed }: { movers: MoversRef; seed: number }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const wF = useRef<THREE.Mesh | null>(null);
  const wB = useRef<THREE.Mesh | null>(null);
  const cars = useMemo<RoadCar[]>(() => {
    const rnd = mulberry(seed * 101 + 29);
    const models = ["sedan", "lorry", "auto", "bus", "cycle", "van", "bike", "hatch"];
    return models.map((model, i) => {
      const s = STREETS[Math.floor(rnd() * STREETS.length)];
      const dir = (rnd() < 0.5 ? 1 : -1) as 1 | -1;
      const slow = model === "cycle" || model === "bike";
      return {
        id: 11 + i, model, street: s.id, refi: i,
        t: rnd() * (s.to - s.from), dir,
        speed: slow ? 4 + rnd() * 2 : 5 + rnd() * 3.5,
        lane: laneFor(s, dir), laneCur: laneFor(s, dir),
        angle: headingFor(s, dir),
        turnP: 0.25 + rnd() * 0.35,
      };
    });
  }, [seed]);
  useFrame((state, dt) => {
    const step = Math.min(dt, 0.05);
    for (const c of cars) {
      let st = STREETS.find((q) => q.id === c.street)!;
      let nt = c.t + c.dir * c.speed * step;
      // turn onto a crossing street at a junction we're passing
      for (const jt of JUNCTION_T[c.street] ?? []) {
        const passed = c.dir > 0 ? jt > c.t && jt <= nt : jt < c.t && jt >= nt;
        if (!passed || Math.random() > c.turnP) continue;
        const j = JUNCTIONS.find(
          (q) => (q.a === c.street || q.b === c.street) &&
            Math.abs((st.kind === "h" ? q.x - st.from : q.z - st.from) - jt) < 0.01,
        );
        if (!j) continue;
        const otherId = j.a === c.street ? j.b : j.a;
        const other = STREETS.find((q) => q.id === otherId)!;
        const ndir = (Math.random() < 0.5 ? 1 : -1) as 1 | -1;
        c.street = otherId;
        c.t = other.kind === "h" ? j.x - other.from : j.z - other.from;
        c.dir = ndir;
        c.lane = laneFor(other, ndir);
        nt = c.t;
        st = other;
        break;
      }
      const len = st.to - st.from;
      if (nt < 0 || nt > len) {
        // dead end: swing around (lane + heading ease into the turn)
        c.dir = (c.dir > 0 ? -1 : 1) as 1 | -1;
        c.lane = laneFor(st, c.dir);
        nt = THREE.MathUtils.clamp(nt, 0, len);
      }
      c.t = nt;
      c.laneCur += (c.lane - c.laneCur) * Math.min(1, step * 3);
      const target = headingFor(st, c.dir);
      let d = target - c.angle;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      c.angle += d * Math.min(1, step * 3.5);
      const [px, pz] = streetPoint(st, c.t, c.laneCur);
      const g = refs.current[c.refi];
      if (g) {
        g.position.set(px, 0.1, pz);
        g.rotation.y = c.angle;
      }
      movers.current[c.id] = { x: px, z: pz, r: MODEL_R[c.model] ?? 1.5 };
    }
    const spin = step * 8;
    if (wF.current) wF.current.rotation.x += spin;
    if (wB.current) wB.current.rotation.x += spin;
    void state;
  });
  return (
    <>
      {cars.map((c) => (
        <group key={`${seed}-${c.refi}`} ref={(el) => { refs.current[c.refi] = el; }}>
          {c.model === "sedan" && <Sedan color="#c0392b" />}
          {c.model === "lorry" && <Lorry />}
          {c.model === "auto" && (
            <>
              <mesh position={[0, 0.9, 0]} castShadow><boxGeometry args={[1.7, 1.0, 2.4]} /><meshStandardMaterial color="#3f9e4d" roughness={0.7} /></mesh>
              <mesh position={[0, 1.65, 0]} castShadow><boxGeometry args={[1.5, 0.6, 1.8]} /><meshStandardMaterial color="#f5d75d" roughness={0.7} /></mesh>
            </>
          )}
          {c.model === "bus" && <CityBus />}
          {c.model === "cycle" && (
            <>
              <CycleFrame color="#7875be" />
              <Wheel position={[0, 0.5, 0.8]} spinRef={wF} />
              <Wheel position={[0, 0.5, -0.8]} spinRef={wB} />
              <mesh position={[0, 1.55, -0.35]} castShadow><capsuleGeometry args={[0.3, 0.55, 4, 10]} /><meshStandardMaterial color="#7875be" roughness={0.8} /></mesh>
              <mesh position={[0, 2.25, -0.38]}><sphereGeometry args={[0.28, 12, 12]} /><meshStandardMaterial color="#a06a45" roughness={0.8} /></mesh>
            </>
          )}
          {c.model === "van" && <Van color="#e8e4da" />}
          {c.model === "bike" && <Motorbike color="#2e5fa3" />}
          {c.model === "hatch" && <Hatchback color="#e2711d" />}
        </group>
      ))}
    </>
  );
}

// Street animals roam roads AND grass: dogs, cow, chickens, sheep.
function Dog({ cx, cz, rx, rz, speed, phase, color, movers, idx }: { cx: number; cz: number; rx: number; rz: number; speed: number; phase: number; color: string; movers: MoversRef; idx: number }) {
  const g = useRef<THREE.Group>(null!);
  const tail = useRef<THREE.Mesh>(null!);
  useFrame((s) => {
    const t = s.clock.elapsedTime * speed + phase;
    const x = cx + Math.cos(t) * rx;
    const z = cz + Math.sin(t * 1.4) * rz;
    const vx = -Math.sin(t) * rx;
    const vz = Math.cos(t * 1.4) * rz * 1.4;
    movers.current[idx] = { x, z, r: 0.7 };
    if (g.current) {
      g.current.position.set(x, 0.05 + Math.abs(Math.sin(s.clock.elapsedTime * 6 + phase)) * 0.08, z);
      g.current.rotation.y = Math.atan2(vx, vz);
    }
    if (tail.current) tail.current.rotation.x = -0.5 + Math.sin(s.clock.elapsedTime * 9 + phase) * 0.35;
  });
  return (
    <group ref={g} position={[cx, 0, cz]}>
      <mesh position={[0, 0.42, 0]} castShadow><boxGeometry args={[0.38, 0.36, 0.9]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>
      <mesh position={[0, 0.62, 0.55]} castShadow><boxGeometry args={[0.3, 0.3, 0.32]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>
      <mesh position={[0, 0.55, 0.75]}><boxGeometry args={[0.14, 0.12, 0.18]} /><meshStandardMaterial color="#5d3a24" roughness={0.9} /></mesh>
      <mesh ref={tail} position={[0, 0.55, -0.5]} rotation={[-0.5, 0, 0]}><boxGeometry args={[0.08, 0.08, 0.4]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>
      {[[-0.14, 0.28], [0.14, 0.28], [-0.14, -0.28], [0.14, -0.28]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.15, lz]}><boxGeometry args={[0.09, 0.3, 0.09]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>
      ))}
    </group>
  );
}

function Cow({ cx, cz, r, movers }: { cx: number; cz: number; r: number; movers: MoversRef }) {
  const g = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  useFrame((s) => {
    const t = s.clock.elapsedTime * 0.12;
    const x = cx + Math.cos(t) * r;
    const z = cz + Math.sin(t) * r;
    movers.current[2] = { x, z, r: 1.4 };
    if (g.current) {
      g.current.position.set(x, 0.05, z);
      g.current.rotation.y = Math.atan2(-Math.sin(t), Math.cos(t));
    }
    if (head.current) head.current.position.y = 1.15 + Math.sin(s.clock.elapsedTime * 0.9) * 0.12;
  });
  return (
    <group ref={g} position={[cx, 0, cz]}>
      <mesh position={[0, 0.95, 0]} castShadow><boxGeometry args={[0.95, 0.85, 1.8]} /><meshStandardMaterial color="#fffdf5" roughness={0.9} /></mesh>
      <group ref={head} position={[0, 1.15, 1.1]}>
        <mesh castShadow><boxGeometry args={[0.55, 0.55, 0.6]} /><meshStandardMaterial color="#fffdf5" roughness={0.9} /></mesh>
        {[-0.3, 0.3].map((hx, i) => (
          <mesh key={i} position={[hx, 0.35, 0]} rotation={[0, 0, hx > 0 ? -0.4 : 0.4]}><coneGeometry args={[0.07, 0.3, 8]} /><meshStandardMaterial color="#d8cfc0" roughness={0.8} /></mesh>
        ))}
      </group>
      {[[-0.35, 0.6], [0.35, 0.6], [-0.35, -0.6], [0.35, -0.6]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.3, lz]}><boxGeometry args={[0.16, 0.6, 0.16]} /><meshStandardMaterial color="#e8e0d2" roughness={0.9} /></mesh>
      ))}
    </group>
  );
}

function Chickens({ cx, cz, movers }: { cx: number; cz: number; movers: MoversRef }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    refs.current.forEach((g, i) => {
      if (!g) return;
      const a = t * 0.5 + i * 2.1;
      const x = cx + Math.cos(a) * (1.5 + i * 0.5);
      const z = cz + Math.sin(a * 1.6) * 1.8;
      movers.current[3 + i] = { x, z, r: 0.3 };
      g.position.set(x, 0.05 + Math.abs(Math.sin(t * 5 + i)) * 0.06, z);
      g.rotation.x = Math.sin(t * 5 + i) * 0.25;
    });
  });
  return (
    <>
      {[0, 1, 2].map((i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }} position={[cx, 0, cz]}>
          <mesh position={[0, 0.2, 0]} castShadow><sphereGeometry args={[0.16, 10, 10]} /><meshStandardMaterial color="#fff" roughness={0.9} /></mesh>
          <mesh position={[0, 0.34, 0.1]}><sphereGeometry args={[0.09, 8, 8]} /><meshStandardMaterial color="#fff" roughness={0.9} /></mesh>
          <mesh position={[0, 0.33, 0.22]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.045, 0.12, 8]} /><meshStandardMaterial color="#e2711d" roughness={0.8} /></mesh>
        </group>
      ))}
    </>
  );
}

function Sheep({ x, z, phase, movers, idx }: { x: number; z: number; phase: number; movers: MoversRef; idx: number }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const px = x + Math.sin(t * 0.3 + phase) * 1.2;
    const pz = z + Math.cos(t * 0.23 + phase) * 1;
    movers.current[idx] = { x: px, z: pz, r: 0.6 };
    if (g.current) {
      g.current.position.set(px, 0.05, pz);
      g.current.rotation.x = Math.max(0, Math.sin(t * 0.7 + phase)) * 0.18;
    }
  });
  return (
    <group ref={g} position={[x, 0, z]}>
      <mesh position={[0, 0.55, 0]} castShadow><sphereGeometry args={[0.45, 12, 12]} /><meshStandardMaterial color="#efeae0" roughness={1} /></mesh>
      <mesh position={[0, 0.85, 0.1]}><sphereGeometry args={[0.28, 10, 10]} /><meshStandardMaterial color="#efeae0" roughness={1} /></mesh>
      <mesh position={[0, 0.5, 0.5]}><sphereGeometry args={[0.18, 10, 10]} /><meshStandardMaterial color="#4a3a30" roughness={0.9} /></mesh>
    </group>
  );
}

export default function World3D({ keysRef, targetId, offerIds, lang, hornTick, shirt, emote, emoteTick, customer, seed, resetTick, badges, onPos }: {
  keysRef: KeysRef; targetId: string | null; offerIds: string[]; lang: "en" | "ta";
  hornTick: number; shirt: string; emote: string; emoteTick: number;
  customer: { name: string; color: string } | null;
  seed: number; resetTick: number; badges: { customer: boolean; bots: boolean[] };
  onPos: (p: PlayerState) => void;
}) {
  const destRef = useRef<{ x: number; z: number } | null>(null);
  const moversRef = useRef<Record<number, { x: number; z: number; r: number }>>({});
  const trees = useMemo(() => genTrees(seed), [seed]);
  const houses = useMemo(() => genHouses(seed), [seed]);
  const circles = useMemo(() => buildCircles(trees, houses), [trees, houses]);
  // shuffle scatter: trees regrow, animals + riders drift to new hangouts
  const scatter = useMemo(() => {
    const rnd = mulberry(seed * 131 + 7);
    const j = (m: number) => (rnd() * 2 - 1) * m;
    return {
      bots: BOT_BASES.map((b) => ({ x: b.cx + j(2.5), z: b.cz + j(2.5) })),
      dog1: { x: 10 + j(2), z: 18 + j(2) },
      dog2: { x: 20 + j(2), z: -20 + j(2) },
      cow: { x: 20 + j(2), z: 38 + j(2) },
      chick: { x: -12 + j(1), z: 32.5 + j(1) },
      sheep: [{ x: -29 + j(2), z: -1 + j(2) }, { x: -27 + j(2), z: -3.5 + j(2) }],
    };
  }, [seed]);

  const tapMove = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // tap anywhere: the rider steers along the streets toward it (road-only slide)
    destRef.current = {
      x: THREE.MathUtils.clamp(e.point.x, -BOUND, BOUND),
      z: THREE.MathUtils.clamp(e.point.z, -BOUND, BOUND),
    };
  };

  const offerSet = useMemo(() => new Set(offerIds), [offerIds]);

  return (
    <Canvas shadows camera={{ position: [-95, 105, 95], fov: 11, near: 1, far: 1500 }} style={{ position: "absolute", inset: 0 }}>
      <color attach="background" args={["#bfe3ec"]} />
      <fog attach="fog" args={["#bfe3ec", 110, 250]} />
      <hemisphereLight args={["#fff6e8", "#5a8a6a", 1.0]} />
      <directionalLight position={[40, 60, 25]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-75} shadow-camera-right={75} shadow-camera-top={75} shadow-camera-bottom={-75} shadow-camera-near={1} shadow-camera-far={250} />
      {/* sea, sand ring, grass island (top at y=0) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#7fc4d4" roughness={1} />
      </mesh>
      <mesh position={[0, -1.1, 0]} receiveShadow>
        <cylinderGeometry args={[75, 77, 1.2, 56]} />
        <meshStandardMaterial color="#e9d9a8" roughness={1} />
      </mesh>
      <mesh position={[0, -0.8, 0]} receiveShadow onPointerDown={tapMove}>
        <cylinderGeometry args={[70, 72, 1.6, 56]} />
        <meshStandardMaterial color="#93cc74" roughness={1} />
      </mesh>
      {/* 5 streets */}
      {STREETS.map((s) => {
        const len = s.to - s.from;
        const mid = (s.to + s.from) / 2;
        return (
          <mesh
            key={s.id}
            position={s.kind === "h" ? [mid, 0.05, s.at] : [s.at, 0.05, mid]}
            receiveShadow onPointerDown={tapMove}
          >
            <boxGeometry args={s.kind === "h" ? [len, 0.1, 6.4] : [6.4, 0.1, len]} />
            <meshStandardMaterial color="#cdb583" roughness={1} />
          </mesh>
        );
      })}
      {/* pavements lining every street */}
      {STREETS.map((s) => [-4.1, 4.1].map((off) => {
        const len = s.to - s.from;
        const mid = (s.to + s.from) / 2;
        return s.kind === "h" ? (
          <mesh key={`${s.id}${off}`} position={[mid, 0.06, s.at + off]} receiveShadow onPointerDown={tapMove}>
            <boxGeometry args={[len, 0.05, 1.6]} /><meshStandardMaterial color="#d9d3c2" roughness={1} />
          </mesh>
        ) : (
          <mesh key={`${s.id}${off}`} position={[s.at + off, 0.06, mid]} receiveShadow onPointerDown={tapMove}>
            <boxGeometry args={[1.6, 0.05, len]} /><meshStandardMaterial color="#d9d3c2" roughness={1} />
          </mesh>
        );
      }))}
      {/* paved driveways to every door */}
      {APRONS.filter((a) => !(a.x === -34 && a.z === -6)).map((a, i) => (
        <mesh key={`ap${i}`} position={[a.x, 0.09, a.z]} receiveShadow onPointerDown={tapMove}>
          <boxGeometry args={[a.w, 0.06, a.d]} />
          <meshStandardMaterial color="#d9bd8d" roughness={1} />
        </mesh>
      ))}
      {/* centre dashes on Masilamani St + Palani Achari St */}
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={`m-${i}`} position={[-20 + i * 4, 0.12, 0]}>
          <boxGeometry args={[2.2, 0.05, 0.35]} /><meshStandardMaterial color="#fff4cf" roughness={1} />
        </mesh>
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={`p-${i}`} position={[i * 4, 0.12, -12]}>
          <boxGeometry args={[2.2, 0.05, 0.35]} /><meshStandardMaterial color="#fff4cf" roughness={1} />
        </mesh>
      ))}
      {/* crosswalks: Masilamani x Raman, Sundareswarar x Palani Achari */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={`c1-${i}`} position={[-0.5 + i * 1.6, 0.12, 0]}><boxGeometry args={[1, 0.05, 5.5]} /><meshStandardMaterial color="#fff4cf" roughness={1} /></mesh>
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={`c2-${i}`} position={[36.6, 0.12, -15 + i * 1.6]}><boxGeometry args={[5.5, 0.05, 1]} /><meshStandardMaterial color="#fff4cf" roughness={1} /></mesh>
      ))}
      {STREETS.map((s) => <StreetSign key={s.id} s={s} lang={lang} />)}
      {LANDMARKS.map((l) => (
        <LandmarkMesh key={l.id} l={l} lang={lang} active={l.id === targetId} offer={offerSet.has(l.id)} />
      ))}
      {houses.map((h, i) => (
        <group key={`h${i}`} position={[h.x, 0, h.z]} rotation={[0, h.angle, 0]}>
          <mesh position={[0, h.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[h.w, h.h, h.d]} />
            <meshStandardMaterial color={h.color} roughness={0.95} />
          </mesh>
          <mesh position={[0, h.h + 0.12, 0]} castShadow>
            <boxGeometry args={[h.w + 0.5, 0.25, h.d + 0.5]} />
            <meshStandardMaterial color="#8a5a44" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.9, h.d / 2 + 0.02]}>
            <planeGeometry args={[0.8, 1.4]} />
            <meshStandardMaterial color="#5a4632" roughness={1} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[-h.w / 4, 1.5, h.d / 2 + 0.02]}>
            <planeGeometry args={[0.6, 0.7]} />
            <meshStandardMaterial color="#33454f" roughness={0.4} />
          </mesh>
          <mesh position={[h.w / 4, 1.5, h.d / 2 + 0.02]}>
            <planeGeometry args={[0.6, 0.7]} />
            <meshStandardMaterial color="#33454f" roughness={0.4} />
          </mesh>
        </group>
      ))}
      {trees.map(([x, z], i) => (
        i % 3 === 0 ? (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 1.3, 0]} castShadow><cylinderGeometry args={[0.14, 0.22, 2.6, 8]} /><meshStandardMaterial color="#7a5a3a" roughness={1} /></mesh>
            {[0, 1, 2, 3, 4].map((k) => {
              const a = (k * Math.PI * 2) / 5;
              return (
                <mesh key={k} position={[Math.sin(a) * 0.8, 2.7, Math.cos(a) * 0.8]} rotation={[0.45, a, 0]} castShadow>
                  <boxGeometry args={[0.3, 0.06, 1.9]} />
                  <meshStandardMaterial color="#4c9b5f" roughness={1} />
                </mesh>
              );
            })}
            <mesh position={[0.2, 2.5, 0]}><sphereGeometry args={[0.16, 8, 8]} /><meshStandardMaterial color="#6b4a2f" roughness={1} /></mesh>
            <mesh position={[-0.2, 2.5, 0.1]}><sphereGeometry args={[0.16, 8, 8]} /><meshStandardMaterial color="#6b4a2f" roughness={1} /></mesh>
          </group>
        ) : (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 0.9, 0]} castShadow><cylinderGeometry args={[0.2, 0.3, 1.8, 8]} /><meshStandardMaterial color="#6b4a2f" roughness={1} /></mesh>
            <mesh position={[0, 2.4, 0]} castShadow><sphereGeometry args={[1.05, 10, 10]} /><meshStandardMaterial color="#3f8a52" roughness={1} /></mesh>
          </group>
        )
      ))}
      <WelcomeArch />
      <FlowerCart />
      <Traffic movers={moversRef} seed={seed} />
      <Dog cx={scatter.dog1.x} cz={scatter.dog1.z} rx={13} rz={11} speed={0.22} phase={0} color="#9a5c35" movers={moversRef} idx={0} />
      <Dog cx={scatter.dog2.x} cz={scatter.dog2.z} rx={8} rz={6} speed={0.3} phase={2} color="#5d3a24" movers={moversRef} idx={1} />
      <Cow cx={scatter.cow.x} cz={scatter.cow.z} r={4} movers={moversRef} />
      <Chickens cx={scatter.chick.x} cz={scatter.chick.z} movers={moversRef} />
      <Sheep x={scatter.sheep[0].x} z={scatter.sheep[0].z} phase={0} movers={moversRef} idx={6} />
      <Sheep x={scatter.sheep[1].x} z={scatter.sheep[1].z} phase={2.4} movers={moversRef} idx={7} />
      <Bots lang={lang} movers={moversRef} spots={scatter.bots} visible={badges.bots} />
      {customer && <CustomerNpc name={customer.name} color={customer.color} visible={badges.customer} />}
      <Player
        keysRef={keysRef} destRef={destRef} movers={moversRef} circles={circles} resetTick={resetTick} startX={-7} startZ={0}
        shirt={shirt} emote={emote} emoteTick={emoteTick} hornTick={hornTick} onPos={onPos}
      />
    </Canvas>
  );
}
