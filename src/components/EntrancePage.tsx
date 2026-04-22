"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, Zap, BarChart3, Globe, Calendar } from "lucide-react";
import { fetchProgrammeTotals, EUROPE_REGION_ID } from "@/lib/api";

const MC_TERM_FILTER = {
  date_approved: { from: "2025-07-01", to: "2026-06-30" },
};

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const ORBS = [
  { color: "#674ea7", size: 900, x: "6%",   y: "8%",   blur: 160, opacity: 0.22, dur: 20, delay: 0 },
  { color: "#037EF3", size: 700, x: "60%",  y: "-8%",  blur: 140, opacity: 0.14, dur: 26, delay: 2 },
  { color: "#F85A40", size: 450, x: "82%",  y: "58%",  blur: 110, opacity: 0.09, dur: 17, delay: 6 },
  { color: "#0CB9C1", size: 520, x: "2%",   y: "65%",  blur: 130, opacity: 0.11, dur: 22, delay: 9 },
  { color: "#F48924", size: 360, x: "40%",  y: "80%",  blur: 100, opacity: 0.08, dur: 15, delay: 4 },
  { color: "#674ea7", size: 650, x: "46%",  y: "-12%", blur: 150, opacity: 0.13, dur: 24, delay: 7 },
  { color: "#037EF3", size: 300, x: "22%",  y: "40%",  blur: 90,  opacity: 0.06, dur: 18, delay: 11 },
];

const PROGS = [
  { src: "/logos/gv-white.png",  alt: "Global Volunteer", color: "#F85A40" },
  { src: "/logos/gta-white.png", alt: "Global Talent",    color: "#0CB9C1" },
  { src: "/logos/gte-white.png", alt: "Global Teacher",   color: "#F48924" },
];

/* ─────────────────────────────────────────────
   Particle field — stable, no layout jitter
───────────────────────────────────────────── */
function ParticleField() {
  const shouldReduce = useReducedMotion();
  const particles = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: (i * 13.71 + 7.3) % 100,
        y: (i * 7.37 + 19.1) % 100,
        size: i % 3 === 0 ? 2 : i % 3 === 1 ? 1.5 : 1,
        opacity: 0.04 + (i % 6) * 0.025,
        duration: 14 + (i % 13),
        delay: (i * 0.41) % 14,
        driftX: ((i * 3.7) % 24) - 12,
        driftY: -(8 + (i % 18)),
      })),
    []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: "rgba(255,255,255,0.85)",
            opacity: p.opacity,
          }}
          animate={shouldReduce ? undefined : {
            y: [0, p.driftY, 0],
            x: [0, p.driftX * 0.35, 0],
            opacity: [p.opacity, p.opacity * 3.5, p.opacity],
          }}
          transition={shouldReduce ? undefined : {
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Pulsing concentric rings behind logo
───────────────────────────────────────────── */
function PulsingRings() {
  const shouldReduce = useReducedMotion();
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{
            width: 420 + i * 200,
            height: 420 + i * 200,
            borderColor: `rgba(103,78,167,${0.1 - i * 0.02})`,
          }}
          animate={shouldReduce ? undefined : {
            scale: [1, 1.04 + i * 0.01, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={shouldReduce ? undefined : {
            duration: 4.5 + i * 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.85,
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Count-up number
───────────────────────────────────────────── */
function CountUp({ target, delay = 0 }: { target: number; delay?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      const totalFrames = 90;
      let frame = 0;
      const timer = setInterval(() => {
        frame++;
        const progress = frame / totalFrames;
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(eased * target));
        if (frame >= totalFrames) {
          setCount(target);
          clearInterval(timer);
        }
      }, 1000 / 60);
      return () => clearInterval(timer);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [target, delay]);

  return <span>{count.toLocaleString()}</span>;
}

/* ─────────────────────────────────────────────
   Aurora gradient sweep at top
───────────────────────────────────────────── */
function Aurora() {
  const shouldReduce = useReducedMotion();
  return (
    <div className="absolute top-0 left-0 right-0 h-[55vh] pointer-events-none overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 60% at 50% -10%, rgba(103,78,167,0.28) 0%, rgba(3,126,243,0.12) 45%, transparent 75%)",
          filter: "blur(2px)",
        }}
        animate={shouldReduce ? undefined : { opacity: [0.7, 1, 0.7], scaleX: [1, 1.06, 1] }}
        transition={shouldReduce ? undefined : { duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 20% 20%, rgba(3,126,243,0.1) 0%, transparent 70%)",
        }}
        animate={shouldReduce ? undefined : { opacity: [0.4, 0.85, 0.4], x: [-20, 20, -20] }}
        transition={shouldReduce ? undefined : { duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 35% at 80% 15%, rgba(248,90,64,0.07) 0%, transparent 70%)",
        }}
        animate={shouldReduce ? undefined : { opacity: [0.3, 0.7, 0.3] }}
        transition={shouldReduce ? undefined : { duration: 11, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main entrance page
───────────────────────────────────────────── */
const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.11, delayChildren: 0.45 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 32, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export default function EntrancePage({ onEnter, onHackathon }: { onEnter: () => void; onHackathon: () => void }) {
  const shouldReduce = useReducedMotion();
  const [totals, setTotals] = useState({ oGX: 0, iCX: 0 });
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchProgrammeTotals({ person_home_region: [EUROPE_REGION_ID], ...MC_TERM_FILTER }),
      fetchProgrammeTotals({ opportunity_home_region: [EUROPE_REGION_ID], ...MC_TERM_FILTER }),
    ]).then(([oGX, iCX]) => {
      setTotals({
        oGX: oGX.GV + oGX.GTa + oGX.GTe,
        iCX: iCX.GV + iCX.GTa + iCX.GTe,
      });
      setFetchFailed(false);
    }).catch(() => setFetchFailed(true));
  }, []);
  return (
    <motion.div
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: "#050810" }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97, filter: "blur(10px)" }}
      transition={{ duration: 0.55, ease: [0.4, 0, 1, 1] }}
    >
      {/* ── Animated orbs ── */}
      <div className="absolute inset-0 pointer-events-none">
        {ORBS.map((orb, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: orb.size,
              height: orb.size,
              left: orb.x,
              top: orb.y,
              background: orb.color,
              opacity: orb.opacity,
              filter: `blur(${orb.blur}px)`,
              willChange: "transform",
            }}
            animate={shouldReduce ? undefined : {
              x: [0, 50, -30, 0],
              y: [0, -40, 25, 0],
              scale: [1, 1.12, 0.93, 1],
            }}
            transition={shouldReduce ? undefined : {
              duration: orb.dur,
              delay: orb.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* ── Aurora ── */}
      <Aurora />

      {/* ── Particles ── */}
      <ParticleField />

      {/* ── Grid ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.028,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />

      {/* ── Diagonal scan sweep ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(108deg, transparent 38%, rgba(103,78,167,0.055) 50%, transparent 62%)",
        }}
        animate={{ x: ["-100%", "230%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear", repeatDelay: 7 }}
      />

      {/* ── Concentric rings ── */}
      <PulsingRings />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Top bar */}
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: "easeOut" }}
          className="flex items-center justify-between px-6 md:px-10 py-5"
        >
          {/* Europe logo left */}
          <motion.div
            className="relative cursor-pointer"
            style={{ height: 36, width: 200 }}
            initial={{ opacity: 0.45 }}
            whileHover={{
              opacity: 1,
              scale: 1.06,
              filter: "drop-shadow(0 0 14px rgba(103,78,167,0.7)) drop-shadow(0 0 32px rgba(103,78,167,0.35))",
            } as never}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.22 }}
            onClick={onEnter}
            title="Enter Dashboard"
          >
            <Image
              src="/logos/europe-white.png"
              alt="AIESEC in Europe"
              fill
              sizes="200px"
              className="object-contain object-left"
            />
          </motion.div>

          {/* EuroXpro Games 2026 pill right */}
          <motion.div
            className="flex items-center gap-2.5 px-4 py-2 rounded-full border"
            style={{
              background: "linear-gradient(135deg, rgba(103,78,167,0.18), rgba(3,126,243,0.09))",
              borderColor: "rgba(103,78,167,0.38)",
            }}
            animate={{
              borderColor: [
                "rgba(103,78,167,0.3)",
                "rgba(103,78,167,0.65)",
                "rgba(103,78,167,0.3)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <motion.div
              animate={{ rotate: [0, 18, -12, 18, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 5 }}
            >
              <Zap className="w-3.5 h-3.5 text-[#a78bfa]" />
            </motion.div>
            <span className="text-[11px] font-bold tracking-wide" style={{ color: "rgba(255,255,255,0.55)" }}>
              EuroXpro Games 2026 · March 25–29
            </span>
          </motion.div>
        </motion.div>

        {/* ── Hero center ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="flex flex-col items-center gap-7 max-w-4xl w-full"
          >

            {/* Live indicator */}
            <motion.div variants={fadeUp} className="flex items-center gap-2.5">
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"
                animate={{ opacity: [1, 0.2, 1], scale: [1, 0.7, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              <span
                className="text-[11px] font-bold uppercase tracking-[0.22em]"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                AIESEC in Europe · Live Data
              </span>
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"
                animate={{ opacity: [1, 0.2, 1], scale: [1, 0.7, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: 0.55 }}
              />
            </motion.div>

            {/* Hero logo */}
            <motion.div variants={fadeUp} className="relative flex justify-center">
              {/* Glow bloom */}
              <motion.div
                className="absolute inset-x-0 -bottom-4 h-20 blur-3xl rounded-full mx-auto w-3/4"
                style={{ background: "rgba(103,78,167,0.45)" }}
                animate={{ opacity: [0.5, 1, 0.5], scaleX: [0.8, 1.15, 0.8] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <div
                style={{
                  filter: [
                    "drop-shadow(0 0 14px rgba(255,255,255,0.95))",
                    "drop-shadow(0 0 42px rgba(103,78,167,1))",
                    "drop-shadow(0 0 110px rgba(103,78,167,0.55))",
                  ].join(" "),
                }}
              >
                <div className="relative h-[72px] md:h-[90px] w-[340px] md:w-[560px]">
                  <Image
                    src="/logos/europe-white.png"
                    alt="AIESEC in Europe"
                    fill
                    sizes="(max-width: 768px) 340px, 560px"
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.div variants={fadeUp} className="space-y-1">
              <h1
                className="text-5xl md:text-7xl font-black tracking-tight leading-none"
                style={{
                  background:
                    "linear-gradient(135deg, #ffffff 0%, #c4b5fd 35%, #818cf8 65%, #2dd4bf 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Exchange Approvals
              </h1>
              <p
                className="text-2xl md:text-3xl font-light tracking-[0.18em] uppercase"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                Tracker
              </p>
            </motion.div>

            {/* Divider */}
            <motion.div
              variants={fadeUp}
              className="w-32 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(103,78,167,0.8), rgba(3,126,243,0.5), transparent)",
              }}
            />

            {/* MC Term badge */}
            <motion.div variants={fadeUp}>
              <div
                className="flex items-center gap-2.5 px-4 py-2 rounded-full border"
                style={{
                  background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(3,126,243,0.07))",
                  borderColor: "rgba(16,185,129,0.3)",
                }}
              >
                <Calendar className="w-3 h-3 flex-shrink-0" style={{ color: "#34d399" }} />
                <span className="text-[11px] font-bold tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>
                  MC Term 2025–2026
                </span>
                <span
                  className="h-3 w-px"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                />
                <span className="text-[11px] font-data tabular-nums" style={{ color: "rgba(52,211,153,0.8)" }}>
                  Jul 1, 2025 → Jun 30, 2026
                </span>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div variants={fadeUp}>
              <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className="text-4xl md:text-5xl font-black tabular-nums"
                    style={{ color: "#a78bfa" }}
                  >
                    <CountUp target={totals.oGX} delay={900} />
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.2em]"
                    style={{ color: "rgba(255,255,255,0.28)" }}
                  >
                    oGX Approvals
                  </span>
                </div>

                <div
                  className="h-12 w-px hidden md:block"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                />

                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className="text-4xl md:text-5xl font-black tabular-nums"
                    style={{
                      color: "#ffffff",
                      textShadow: "0 0 18px rgba(255,255,255,0.85), 0 0 48px rgba(255,255,255,0.4), 0 0 90px rgba(255,255,255,0.18)",
                    }}
                  >
                    <CountUp target={totals.iCX} delay={1050} />
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.2em]"
                    style={{ color: "rgba(255,255,255,0.28)" }}
                  >
                    iCX Approvals
                  </span>
                </div>
              </div>
              {fetchFailed && (
                <p className="text-center text-[11px] mt-3" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Live data unavailable
                </p>
              )}
            </motion.div>

            {/* Programme pills */}
            <motion.div
              variants={fadeUp}
              className="flex items-center gap-3 flex-wrap justify-center"
            >
              {PROGS.map((prog, i) => (
                <motion.div
                  key={prog.alt}
                  className="flex items-center gap-2.5 px-4 py-2 rounded-full border"
                  style={{
                    background: `${prog.color}0f`,
                    borderColor: `${prog.color}30`,
                  }}
                  whileHover={{
                    scale: 1.08,
                    y: -3,
                    boxShadow: `0 8px 28px ${prog.color}35`,
                    borderColor: `${prog.color}65`,
                  } as never}
                  transition={{ duration: 0.2 }}
                >
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: prog.color,
                      boxShadow: `0 0 6px ${prog.color}`,
                    }}
                    animate={{ scale: [1, 1.6, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{
                      duration: 2.2 + i * 0.35,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.4,
                    }}
                  />
                  <div className="relative h-4 w-[88px]">
                    <Image
                      src={prog.src}
                      alt={prog.alt}
                      fill
                      sizes="88px"
                      className="object-contain object-left"
                    />
                  </div>
                </motion.div>
              ))}

              <div
                className="h-6 w-px mx-1"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />

              {/* Region pill */}
              <motion.div
                className="flex items-center gap-2 px-3.5 py-2 rounded-full border cursor-default"
                style={{
                  borderColor: "rgba(103,78,167,0.35)",
                  background: "rgba(103,78,167,0.09)",
                }}
                whileHover={{
                  scale: 1.06,
                  borderColor: "rgba(103,78,167,0.65)",
                } as never}
                transition={{ duration: 0.2 }}
              >
                <Globe className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
                <span
                  className="text-[10px] font-bold tracking-widest uppercase"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  Europe Region
                </span>
              </motion.div>
            </motion.div>

            {/* ── CTA buttons ── */}
            <motion.div variants={fadeUp} className="relative">
              {/* Glow pulse behind buttons */}
              <motion.div
                className="absolute -inset-3 rounded-2xl blur-2xl"
                style={{ background: "rgba(103,78,167,0.22)" }}
                animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.9, 1.05, 0.9] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="flex items-center gap-4 flex-wrap justify-center relative">
                {/* Enter Dashboard */}
                <motion.button
                  onClick={onEnter}
                  className="group relative flex items-center gap-3 px-7 py-3.5 rounded-2xl cursor-pointer focus-visible:outline-none overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(103,78,167,0.42) 0%, rgba(3,126,243,0.28) 100%)",
                    border: "1px solid rgba(103,78,167,0.6)",
                    boxShadow: "0 0 40px rgba(103,78,167,0.28), inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                  whileHover={{
                    scale: 1.05,
                    boxShadow:
                      "0 0 80px rgba(103,78,167,0.65), inset 0 1px 0 rgba(255,255,255,0.12)",
                    borderColor: "rgba(103,78,167,0.95)",
                  } as never}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background:
                        "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.07) 50%, transparent 65%)",
                    }}
                  />
                  <BarChart3
                    className="w-5 h-5 relative z-10 flex-shrink-0"
                    style={{ color: "#a78bfa" }}
                  />
                  <span className="text-white font-bold text-base tracking-wide relative z-10">
                    Enter Dashboard
                  </span>
                  <ArrowRight
                    className="w-5 h-5 relative z-10 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                    style={{ color: "#a78bfa" }}
                  />
                </motion.button>

                {/* EuroXpro Games 2026 */}
                <motion.button
                  onClick={onHackathon}
                  className="group relative flex items-center gap-3 px-7 py-3.5 rounded-2xl cursor-pointer focus-visible:outline-none overflow-hidden"
                  style={{
                    background: "rgba(248,90,64,0.25)",
                    border: "1px solid rgba(248,90,64,0.5)",
                    boxShadow: "0 0 30px rgba(248,90,64,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}
                  whileHover={{
                    scale: 1.05,
                    boxShadow:
                      "0 0 60px rgba(248,90,64,0.45), inset 0 1px 0 rgba(255,255,255,0.10)",
                    borderColor: "rgba(248,90,64,0.9)",
                  } as never}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background:
                        "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.07) 50%, transparent 65%)",
                    }}
                  />
                  <motion.div
                    animate={{ rotate: [0, 18, -12, 18, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
                    className="relative z-10 flex-shrink-0"
                  >
                    <Zap className="w-5 h-5" style={{ color: "#F85A40" }} />
                  </motion.div>
                  <span className="text-white font-bold text-base tracking-wide relative z-10">
                    EuroXpro Games 2026
                  </span>
                </motion.button>
              </div>
            </motion.div>

            {/* Scope context */}
            <motion.div variants={fadeUp}>
              <p
                className="text-[11px] font-data"
                style={{ color: "rgba(255,255,255,0.15)" }}
              >
                oGX · iCX · Global Volunteer · Global Talent · Global Teacher
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* ── Bottom bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.4 }}
          className="flex items-center justify-between px-6 md:px-10 py-5"
        >
          {/* AIESEC logo */}
          <div className="flex items-center gap-2">
            <div className="relative h-4 w-16 opacity-18">
              <Image
                src="/logos/aiesec-white.png"
                alt="AIESEC"
                fill
                sizes="64px"
                className="object-contain object-left"
              />
            </div>
            <span
              className="text-[10px] font-data"
              style={{ color: "rgba(255,255,255,0.12)" }}
            >
              Global
            </span>
          </div>

          {/* Centre meta */}
          <div
            className="flex items-center gap-2 text-[10px] font-data"
            style={{ color: "rgba(255,255,255,0.14)" }}
          >
            <motion.span
              className="w-1 h-1 rounded-full inline-block"
              style={{ backgroundColor: "#674ea7" }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            Approvals Tracker · EuroXpro Games 2026 · March 25–29
            <motion.span
              className="w-1 h-1 rounded-full inline-block"
              style={{ backgroundColor: "#037EF3" }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
            />
          </div>

          {/* Author */}
          <span
            className="text-[10px] font-data"
            style={{ color: "rgba(255,255,255,0.1)" }}
          >
            By{" "}
            <span style={{ color: "rgba(167,139,250,0.45)" }}>Anis Nakib</span>
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
