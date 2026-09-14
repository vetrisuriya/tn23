"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import styles from "./Game.module.css";
import {
  COPY, LANDMARKS, STREETS, BOT_BASES, ISSUES, FACTS, FIRST_CUSTOMER, randomCustomer,
  landmarkById, type Customer, type Lang,
} from "./worldData";
import { ensureAudio, hornSound, clickSound, stepSound, deliverSound, setMuted, setZone, startAmbience, type Zone } from "./sound";
import type { PlayerState } from "./World3D";

const World3D = dynamic(() => import("./World3D"), {
  ssr: false,
  loading: () => <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#29453f", fontWeight: 800 }}>Loading Kosapet… / கோசப்பேட்டை ஏற்றுகிறது…</div>,
});

const EMOTES = ["👋", "🙏", "😄", "📯", "💨"];
const SHIRTS = ["#e3a325", "#5e8fc5", "#4c9b77", "#bd6381"];
const SHOP_ID = "tn23";

const STR = {
  en: {
    tagline: "Run the repair shop. Deliver the cycle. Next customer!",
    begin: "BEGIN", customer: "CUSTOMER", issue: "Problem", to: "Deliver to",
    repairTitle: "Repair at the shop", stepOf: "Step",
    repairDone: "Repaired! Ride it to the customer.",
    deliverTitle: "Deliver the cycle", delivered: "Delivered!",
    thanks: "Nandri, TN23!",
    goShop: "Ride back to TN23 shop (follow the gold marker).",
    atShopRepair: "You are at the shop — tap each repair step.",
    roadOnly: "Road riding only", crossing: "SLOW DOWN · PEDESTRIAN CROSSING",
    horn: "🔔 Horn", jump: "⤒ Hop", completed: "deliveries", nextUp: "Next customer is waiting at the shop…",
  },
  ta: {
    tagline: "ரிப்பேர் கடையை நடத்துங்கள். சைக்கிளை டெலிவரி செய்யுங்கள். அடுத்த கஸ்டமர்!",
    begin: "தொடங்கு", customer: "கஸ்டமர்", issue: "பிரச்சனை", to: "கொடுக்க வேண்டிய இடம்",
    repairTitle: "கடையில் சரி செய்", stepOf: "படி",
    repairDone: "சரியாகிவிட்டது! கஸ்டமரிடம் ஓட்டுங்கள்.",
    deliverTitle: "சைக்கிளை டெலிவரி செய்", delivered: "டெலிவரி முடிந்தது!",
    thanks: "நன்றி, TN23!",
    goShop: "TN23 கடைக்கு திரும்புங்கள் (தங்க அடையாளத்தை பின்தொடருங்கள்).",
    atShopRepair: "கடையில் இருக்கிறீர்கள் — ஒவ்வொரு படியாக தொடுங்கள்.",
    roadOnly: "ரோட்டில் மட்டும் ஓட்டவும்", crossing: "மெதுவாக · பாதசாரி கிராசிங்",
    horn: "🔔 ஹாரன்", jump: "⤒ குதி", completed: "டெலிவரிகள்", nextUp: "அடுத்த கஸ்டமர் கடையில் காத்திருக்கிறார்…",
  },
} as const;

type Stage = "repair" | "deliver";

export default function Game() {
  const [started, setStarted] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  // Fixed first customer so server HTML == client HTML (no hydration error);
  // a real random customer is drawn on mount (client only).
  const [customer, setCustomer] = useState<Customer>(FIRST_CUSTOMER);
  useEffect(() => { setCustomer(randomCustomer()); }, []);
  const [stage, setStage] = useState<Stage>("repair");
  const [stepIdx, setStepIdx] = useState(0); // repair steps done
  const [celebrateMsg, setCelebrateMsg] = useState("");
  const [earned, setEarned] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [talkId, setTalkId] = useState<string | null>(null);
  const [hornTick, setHornTick] = useState(0);
  const [hornMsg, setHornMsg] = useState(false);
  const [emote, setEmote] = useState("👋");
  const [emoteTick, setEmoteTick] = useState(0);
  const [shirt, setShirt] = useState(SHIRTS[0]);
  const [mutedUi, setMutedUi] = useState(false);
  // fresh random town on every visit (seed only feeds the client-side 3D world)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  // small screens get smaller 3D labels so signs don't pile up
  const [compact] = useState(() => typeof window !== "undefined" && window.innerWidth < 820);
  const [resetTick, setResetTick] = useState(0);
  const [worldReady, setWorldReady] = useState(false);
  const readyRef = useRef(false);
  const [hud, setHud] = useState<PlayerState & { dist: number }>({ x: -7, z: 0, moving: false, onRoad: true, dist: 99 });

  const keysRef = useRef<Record<string, boolean>>({});
  const posRef = useRef<PlayerState>({ x: -7, z: 0, moving: false, onRoad: true });
  const lastHud = useRef(0);
  const t = COPY[lang];
  const s = STR[lang];

  const issue = ISSUES.find((i) => i.id === customer.issueId)!;
  const steps = lang === "en" ? issue.stepsEn : issue.stepsTa;
  const shop = landmarkById(SHOP_ID);
  const dest = landmarkById(customer.destId);
  const targetId = celebrateMsg ? null : stage === "repair" ? SHOP_ID : customer.destId;
  const target = targetId ? landmarkById(targetId) : null;

  const onPos = useCallback((_p: PlayerState) => {
    posRef.current = _p;
    const now = performance.now();
    if (now - lastHud.current < 150) return;
    lastHud.current = now;
    if (!readyRef.current) { readyRef.current = true; setWorldReady(true); }
    setHud((h) => ({ ..._p, dist: h.dist }));
  }, []);

  // ambient street life follows the rider: market shouts, temple bells, traffic…
  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      const p = posRef.current;
      const dMarket = Math.hypot(p.x - 45.5, p.z + 7);
      const dTemple = Math.min(Math.hypot(p.x - 44, p.z + 14), Math.hypot(p.x - 10, p.z + 41));
      const onRoad = STREETS.some((st) => (st.kind === "h" ? Math.abs(p.z - st.at) < 5 : Math.abs(p.x - st.at) < 5));
      const inPark = Math.abs(p.x + 44) < 6 && Math.abs(p.z + 20) < 5;
      const zone: Zone = dTemple < 13 ? "temple" : dMarket < 13 ? "market" : onRoad ? "road" : inPark ? "park" : "quiet";
      const animals =
        Math.hypot(p.x - 10, p.z - 18) < 11 || Math.hypot(p.x - 20, p.z + 20) < 11 ||
        Math.hypot(p.x - 20, p.z - 38) < 10 || Math.hypot(p.x + 12, p.z - 32.5) < 8 ||
        Math.hypot(p.x + 28, p.z + 2) < 8;
      const npc =
        Math.hypot(p.x + 20, p.z - 4) < 7 ||
        Math.hypot(p.x + 16, p.z + 6) < 9 || Math.hypot(p.x - 10, p.z - 12) < 9 || Math.hypot(p.x - 14, p.z - 38) < 9;
      setZone(zone, animals, npc);
    }, 600);
    return () => clearInterval(id);
  }, [started]);

  // live distance to current target (repair shop or delivery spot)
  useEffect(() => {
    const id = setInterval(() => {
      const p = posRef.current;
      const tgt = targetId ? landmarkById(targetId) : null;
      const dist = tgt ? Math.hypot(p.x - tgt.x, p.z - tgt.z) : 99;
      setHud((h) => (Math.abs(h.dist - dist) > 0.3 || h.x !== p.x ? { ...p, dist } : h));
    }, 200);
    return () => clearInterval(id);
  }, [targetId]);

  // distance to a building's edge (not its center) — driveways bring you to the door
  const edgeDist = (px: number, pz: number, l: { x: number; z: number; w: number; d: number }) =>
    Math.hypot(Math.max(Math.abs(px - l.x) - l.w / 2, 0), Math.max(Math.abs(pz - l.z) - l.d / 2, 0));
  const nearShop = edgeDist(hud.x, hud.z, shop) < 3;
  const nearDest = stage === "deliver" && edgeDist(hud.x, hud.z, dest) < 3;
  const crossing =
    (Math.abs(hud.x - 2.7) < 5.5 && Math.abs(hud.z) < 6) ||
    (Math.abs(hud.x - 36.6) < 5.5 && Math.abs(hud.z + 12) < 6);

  const doStep = useCallback(() => {
    if (stage !== "repair" || !nearShop || celebrateMsg) return;
    stepSound(stepIdx);
    const next = stepIdx + 1;
    setStepIdx(next);
    if (next >= steps.length) {
      setStage("deliver"); // repaired — now deliver!
    }
  }, [stage, nearShop, celebrateMsg, stepIdx, steps.length]);

  const deliver = useCallback(() => {
    if (stage !== "deliver" || !nearDest || celebrateMsg) return;
    deliverSound();
    setEarned((e) => e + customer.reward);
    setDoneCount((c) => c + 1);
    setCelebrateMsg(`+₹${customer.reward}`);
    setTalkId(customer.destId);
    const prevDest = customer.destId;
    setTimeout(() => {
      setCelebrateMsg("");
      setCustomer(randomCustomer(prevDest)); // next customer walks into the shop
      setStage("repair");
      setStepIdx(0);
    }, 1800);
  }, [stage, nearDest, celebrateMsg, customer]);

  const ring = useCallback(() => {
    hornSound();
    setHornTick((h) => h + 1);
    setHornMsg(true);
    setTimeout(() => setHornMsg(false), 900);
  }, []);

  const sendEmote = useCallback((e: string) => {
    setEmote(e);
    setEmoteTick((n) => n + 1);
    if (e === "📯") ring();
  }, [ring]);

  const jump = useCallback(() => {
    keysRef.current[" "] = true;
    setTimeout(() => { keysRef.current[" "] = false; }, 140);
  }, []);

  useEffect(() => {
    if (!started) return;
    const dn = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
      keysRef.current[k] = true;
      if (k === "e" || k === "enter") { if (stage === "repair") doStep(); else deliver(); }
      if (k === "h") ring();
    };
    const up = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, [started, doStep, deliver, ring]);

  const hold = (k: string) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); keysRef.current[k] = true; },
    onPointerUp: () => { keysRef.current[k] = false; },
    onPointerLeave: () => { keysRef.current[k] = false; },
    onPointerCancel: () => { keysRef.current[k] = false; },
  });

  // person badges appear only when you're close to them
  const badges = useMemo(() => ({
    customer: Math.hypot(hud.x + 20, hud.z - 4) < 12,
    bots: BOT_BASES.map((b) => Math.hypot(hud.x - b.cx, hud.z - b.cz) < 13),
  }), [hud.x, hud.z]);

  const talk = talkId ? LANDMARKS.find((l) => l.id === talkId) ?? null : null;
  const toPct = (v: number) => `${((v + 70) / 140) * 100}%`;
  const repaired = stage === "deliver";
  const progress = stage === "repair" ? Math.round((stepIdx / steps.length) * 50) : 50 + 25;

  return (
    <main className={styles.game}>
      <div className={styles.canvasWrap}>
        {started && (
          <World3D
            keysRef={keysRef} targetId={targetId} offerIds={[]} lang={lang}
            hornTick={hornTick} shirt={shirt} emote={emote} emoteTick={emoteTick}
            customer={stage === "repair" ? { name: lang === "en" ? customer.nameEn : customer.nameTa, color: customer.color } : null}
            seed={seed} resetTick={resetTick} badges={badges} compact={compact}
            onPos={onPos}
          />
        )}
      </div>

      {(!started || !worldReady) && (
        <div className={styles.overlay}>
          <div className={styles.overlayCard}>
            <p>VELLORE · TAMIL NADU</p>
            <h1 style={{ textShadow: `0 3px 0 ${shirt}, 0 6px 0 #31534c` }}>TN23</h1>
            <strong>{t.sub}</strong>
            {!started ? (
              <>
                <p className={styles.tagline}>{s.tagline}</p>
                <button className={styles.beginBtn} onClick={() => { ensureAudio(); clickSound(); startAmbience(); setStarted(true); }}>{s.begin}</button>
                <p className={styles.hint}>{t.keys} · {s.roadOnly}</p>
                <button className={styles.langBtn} onClick={() => setLang(lang === "en" ? "ta" : "en")}>{t.lang}</button>
              </>
            ) : (
              <p className={styles.tagline}>{lang === "en" ? "Opening the shop…" : "கடை திறக்கிறது…"}</p>
            )}
          </div>
        </div>
      )}

      <header className={styles.header}>
        <div>
          <p>VELLORE · TAMIL NADU · 3D</p>
          <h1 style={{ textShadow: `0 3px 0 ${shirt}, 0 6px 0 #31534c` }}>TN23</h1>
          <strong style={{ borderBottom: `4px solid ${shirt}` }}>{t.sub}</strong>
        </div>
        <button onClick={() => setLang(lang === "en" ? "ta" : "en")}>{t.lang}</button>
        <button onClick={() => { const m = !mutedUi; setMutedUi(m); setMuted(m); }} aria-label="sound">{mutedUi ? "🔇" : "🔊"}</button>
      </header>

      <aside className={styles.mission} style={{ borderColor: shirt }}>
        <small>{s.customer} #{doneCount + 1} · {t.mission}</small>
        <h2>🔧 {lang === "en" ? customer.nameEn : customer.nameTa} · {lang === "en" ? issue.en : issue.ta} · ₹{customer.reward}</h2>
        {celebrateMsg ? (
          <p>{t.done} {celebrateMsg} {s.thanks}</p>
        ) : stage === "repair" ? (
          <>
            <p><b>{s.repairTitle}</b> — {nearShop ? s.atShopRepair : s.goShop}</p>
            <div className={styles.steps}>
              {steps.map((label, i) => (
                <button
                  key={i}
                  className={`${styles.stepBtn} ${i < stepIdx ? styles.done : ""}`}
                  disabled={i !== stepIdx || !nearShop}
                  onClick={doStep}
                >
                  {i < stepIdx ? "✓ " : `${s.stepOf} ${i + 1}: `}{label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p><b>{s.deliverTitle}</b> — {s.to}: {lang === "en" ? dest.en : dest.ta}</p>
            <div className={styles.actionRow}>
              <button onClick={deliver} disabled={!nearDest}>{t.interact} →</button>
            </div>
            {nearDest && <p className={styles.nearMsg}>📍 {lang === "en" ? dest.en : dest.ta}</p>}
          </>
        )}
        <div><i style={{ width: `${celebrateMsg ? 100 : progress}%` }} /></div>
        {target && !celebrateMsg && (
          <b>{Math.round(hud.dist * 4)} m → {lang === "en" ? target.en : target.ta} · {s.roadOnly}</b>
        )}
        <span className={styles.earned}>₹{earned} {t.total} · {doneCount} {s.completed}</span>
        <p className={styles.fact}>{lang === "en" ? FACTS[doneCount % FACTS.length].en : FACTS[doneCount % FACTS.length].ta}</p>
        {target?.maps && <a href={target.maps} target="_blank" rel="noreferrer">{t.maps}</a>}
      </aside>

      <div className={styles.minimap}>
        <i className={styles.mapRoadH} style={{ top: "50%", left: "33.6%", width: "46.4%" }} />
        <i className={styles.mapRoadV} style={{ left: "30.3%", top: "26%", height: "18.1%" }} />
        <i className={styles.mapRoadV} style={{ left: "27.2%", top: "26.3%", height: "34%" }} />
        <i className={styles.mapRoadV} style={{ left: "51.9%", top: "25%", height: "46.4%" }} />
        <i className={styles.mapRoadH} style={{ top: "30.9%", left: "27.2%", width: "16.6%" }} />
        <i className={styles.mapRoadH} style={{ top: "26.3%", left: "22%", width: "22.1%" }} />
        <i className={styles.mapRoadV} style={{ left: "35.9%", top: "15.7%", height: "11%" }} />
        <i className={styles.mapRoadV} style={{ left: "14.3%", top: "21.4%", height: "26.4%" }} />
        <i className={styles.mapRoadH} style={{ top: "63.8%", left: "27.1%", width: "29.3%" }} />
        <i className={styles.mapRoadV} style={{ left: "61.1%", top: "50%", height: "20%" }} />
        <i className={styles.mapRoadV} style={{ left: "76.1%", top: "31.4%", height: "40%" }} />
        <i className={styles.mapRoadH} style={{ top: "41.4%", left: "47.1%", width: "30%" }} />
        <i className={styles.mapRoadV} style={{ left: "57.8%", top: "50%", height: "14.3%" }} />
        <i className={styles.mapRoadV} style={{ left: "30.2%", top: "15.7%", height: "10.9%" }} />
        <i className={styles.mapRoadV} style={{ left: "44.2%", top: "15.7%", height: "33%" }} />
        <i className={styles.mapRoadV} style={{ left: "39.1%", top: "15.7%", height: "10.5%" }} />
        <i className={styles.mapRoadH} style={{ top: "71.7%", left: "28.6%", width: "37.1%" }} />
        <i className={styles.mapRoadH} style={{ top: "58.6%", left: "58.6%", width: "20%" }} />
        <i className={styles.mapRoadV} style={{ left: "85%", top: "48.6%", height: "15.7%" }} />
        {LANDMARKS.map((l) => (
          <i key={l.id} title={l.en} className={l.id === targetId ? styles.mapTarget : undefined}
            style={{ left: toPct(l.x), top: toPct(l.z) }} />
        ))}
        <em style={{ left: toPct(hud.x), top: toPct(hud.z) }} />
      </div>

      <div className={styles.controls}>
        <div className={styles.actionRow}>
          {stage === "repair"
            ? <button onClick={doStep} disabled={!nearShop || stepIdx >= steps.length}>{t.repair} <span>→</span></button>
            : <button onClick={deliver} disabled={!nearDest}>{t.interact} <span>→</span></button>}
          <button className={styles.horn} onClick={ring}>{s.horn}</button>
          <button className={styles.horn} onClick={jump}>{s.jump}</button>
        </div>
        <div className={styles.actionRow}>
          <button onClick={() => { clickSound(); setResetTick((n) => n + 1); }}>⟳ {lang === "en" ? "Reset" : "மீட்பு"}</button>
          <button onClick={() => { clickSound(); setSeed(Math.floor(Math.random() * 1e9)); }}>🔀 {lang === "en" ? "Shuffle" : "மாற்று"}</button>
        </div>
        <p className={styles.keysHint}>{hornMsg ? "Peeep! 📯" : `${t.keys} · E = action · H = horn`}</p>
        <p className={styles.touchHint}>{hornMsg ? "Peeep! 📯" : `${lang === "en" ? "D-pad or tap the ground to ride · buttons act" : "D-பேட் அல்லது தரையைத் தொட்டு ஓட்டவும்"}`}</p>
        {crossing && <p className={styles.nearMsg}>{s.crossing}</p>}
        {!celebrateMsg && stage === "deliver" && <p>{s.nextUp}</p>}
        <div className={styles.dpad}>
          <button {...hold("arrowup")}>↑</button>
          <span>
            <button {...hold("arrowleft")}>←</button>
            <button {...hold("arrowdown")}>↓</button>
            <button {...hold("arrowright")}>→</button>
          </span>
        </div>
        <div className={styles.emoteBar}>
          {EMOTES.map((e) => (
            <button key={e} onClick={() => sendEmote(e)} className={e === emote ? styles.emoteActive : undefined}>{e}</button>
          ))}
          <span className={styles.outfitRow}>
            {SHIRTS.map((c) => (
              <button key={c} onClick={() => setShirt(c)} style={{ background: c }}
                className={c === shirt ? styles.shirtActive : undefined} aria-label={c} />
            ))}
          </span>
        </div>
        <div className={styles.npcRow}>
          {LANDMARKS.filter((l) => l.npcEn).map((l) => (
            <button key={l.id} onClick={() => setTalkId(l.id)}>{lang === "en" ? l.npcEn : l.npcTa}</button>
          ))}
        </div>
      </div>

      {talk && (
        <div className={styles.dialogue}>
          <section>
            <small>{lang === "en" ? talk.subEn : talk.subTa}</small>
            <h3>
              {celebrateMsg
                ? `${lang === "en" ? customer.nameEn : customer.nameTa} — ${s.thanks}`
                : talk.npcEn ? (lang === "en" ? talk.npcEn : talk.npcTa) : (lang === "en" ? talk.en : talk.ta)}
            </h3>
            <p>“{talk.quoteEn ? (lang === "en" ? talk.quoteEn : talk.quoteTa) : (lang === "en" ? talk.en : talk.ta)}”</p>
            <div className={styles.dialogBtns}>
              <button onClick={() => setTalkId(null)}>{t.close}</button>
              {talk.maps && <a href={talk.maps} target="_blank" rel="noreferrer">{t.maps}</a>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
