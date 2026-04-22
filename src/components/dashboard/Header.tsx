"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import { Zap, Globe, BarChart3 } from "lucide-react";

const PROG_LOGOS = [
  { src: "/logos/gv-white.png",  alt: "Global Volunteer", color: "#F85A40", label: "GV"  },
  { src: "/logos/gta-white.png", alt: "Global Talent",    color: "#0CB9C1", label: "GTa" },
  { src: "/logos/gte-white.png", alt: "Global Teacher",   color: "#F48924", label: "GTe" },
];

/* ── Interactive Europe logo with mouse-tracking glow ── */
function EuropeLogo() {
  const ref = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 120, damping: 20 });
  const springY = useSpring(rawY, { stiffness: 120, damping: 20 });
  const rotateX = useTransform(springY, [-1, 1], [4, -4]);
  const rotateY = useTransform(springX, [-1, 1], [-4, 4]);
  const glowX   = useTransform(springX, [-1, 1], [-14, 14]);
  const glowY   = useTransform(springY, [-1, 1], [-10, 10]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    rawX.set(((e.clientX - r.left)  / r.width  - 0.5) * 2);
    rawY.set(((e.clientY - r.top)   / r.height - 0.5) * 2);
  };

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={() => { rawX.set(0); rawY.set(0); }}
      className="relative cursor-default" style={{ perspective: "600px" }}>
      {/* Mouse-tracking glow bloom */}
      <motion.div className="absolute -inset-10 rounded-3xl blur-3xl pointer-events-none"
        style={{
          x: glowX, y: glowY,
          background: "radial-gradient(ellipse at center, rgba(103,78,167,0.8) 0%, rgba(103,78,167,0.2) 55%, transparent 75%)",
        }}
        animate={{ opacity: [0.55, 0.9, 0.55] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Outer pulse ring */}
      <motion.div className="absolute -inset-14 rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(103,78,167,0.18) 0%, transparent 70%)" }}
        animate={{ scale: [0.88, 1.08, 0.88], opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      />
      {/* Logo with 3-D tilt */}
      <motion.div style={{ rotateX, rotateY }}
        whileHover={{ scale: 1.03 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="relative h-[90px] w-[360px] md:w-[500px]"
      >
        <div style={{
          filter: [
            "drop-shadow(0 0 12px rgba(255,255,255,0.9))",
            "drop-shadow(0 0 30px rgba(103,78,167,1))",
            "drop-shadow(0 0 80px rgba(103,78,167,0.55))",
          ].join(" "),
          height: "100%", width: "100%", position: "relative",
        }}>
          <Image src="/logos/europe-white.png" alt="AIESEC in Europe" fill
            sizes="(max-width: 768px) 360px, 500px"
            className="object-contain object-left" priority />
        </div>
      </motion.div>
    </div>
  );
}

export default function Header() {
  return (
    <header className="relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0f0922 0%, #080d1e 55%, #050810 100%)" }}>

      {/* ── Ambient background layers ── */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[1000px] h-[640px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(103,78,167,0.32) 0%, transparent 65%)" }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.65, 0.95, 0.65] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -top-16 right-0 w-[420px] h-[420px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(3,126,243,0.12) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-72 h-44"
          style={{ background: "radial-gradient(ellipse, rgba(248,90,64,0.08) 0%, transparent 70%)" }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute top-0 right-72 w-56 h-36"
          style={{ background: "radial-gradient(ellipse, rgba(12,185,193,0.1) 0%, transparent 70%)" }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
        {/* Scan sweep */}
        <motion.div className="absolute inset-0"
          style={{ background: "linear-gradient(105deg, transparent 38%, rgba(103,78,167,0.05) 50%, transparent 62%)" }}
          animate={{ x: ["-100%", "210%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear", repeatDelay: 5 }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-8 pb-6">

        {/* ── Top row: logo left · badges right ── */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">

          {/* Left: Logo + tagline */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-3"
          >
            <EuropeLogo />

            {/* Tagline pill */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex items-center gap-3 flex-wrap"
            >
              {/* Dashboard title chip */}
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                style={{
                  background: "linear-gradient(135deg, rgba(103,78,167,0.18), rgba(103,78,167,0.06))",
                  borderColor: "rgba(103,78,167,0.3)",
                }}
              >
                <BarChart3 className="w-3 h-3 flex-shrink-0" style={{ color: "#a78bfa" }} />
                <span className="text-xs font-bold tracking-wide" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Exchange Approvals Tracker
                </span>
              </div>

              {/* Scope context */}
              <div className="flex items-center gap-1.5">
                <Globe className="w-3 h-3" style={{ color: "rgba(255,255,255,0.2)" }} />
                <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.28)" }}>
                  Europe Region · oGX + iCX · GV · GTa · GTe
                </span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Badges */}
          <motion.div
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
            className="flex flex-wrap items-center gap-3 lg:mt-2"
          >
            {/* Live pulse */}
            <motion.div
              className="flex items-center gap-2 rounded-full px-4 py-2 border"
              style={{ background: "rgba(52,211,153,0.07)", borderColor: "rgba(52,211,153,0.25)" }}
              animate={{ borderColor: ["rgba(52,211,153,0.2)", "rgba(52,211,153,0.6)", "rgba(52,211,153,0.2)"] }}
              transition={{ duration: 2, repeat: Infinity }}
              whileHover={{ scale: 1.06, background: "rgba(52,211,153,0.12)" } as never}
            >
              <motion.span className="w-2 h-2 rounded-full bg-emerald-400 block flex-shrink-0"
                animate={{ opacity: [1, 0.2, 1], scale: [1, 0.8, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Live</span>
            </motion.div>

            {/* AIESEC logo badge */}
            <motion.div
              className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 border"
              style={{
                background: "rgba(3,126,243,0.08)",
                borderColor: "rgba(3,126,243,0.25)",
              }}
              whileHover={{ scale: 1.05, borderColor: "rgba(3,126,243,0.55)", boxShadow: "0 0 18px rgba(3,126,243,0.2)" } as never}
              transition={{ duration: 0.2 }}
            >
              <div className="relative h-5 w-20">
                <Image src="/logos/aiesec-white.png" alt="AIESEC" fill sizes="80px" className="object-contain object-left"
                  style={{ opacity: 0.7 }} />
              </div>
              <div className="h-3.5 w-px bg-white/10" />
              <span className="text-white/40 text-[10px] font-bold tracking-widest uppercase">Global</span>
            </motion.div>

            {/* EuroXpro Games 2026 badge */}
            <motion.div
              className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 border cursor-default"
              style={{
                background: "linear-gradient(135deg, rgba(103,78,167,0.2) 0%, rgba(3,126,243,0.1) 100%)",
                borderColor: "rgba(103,78,167,0.35)",
              }}
              whileHover={{ scale: 1.05, borderColor: "rgba(103,78,167,0.7)", boxShadow: "0 0 22px rgba(103,78,167,0.3)" } as never}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                animate={{ rotate: [0, 18, -12, 18, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 4 }}
              >
                <Zap className="w-4 h-4 text-[#a78bfa]" />
              </motion.div>
              <div>
                <div className="text-white text-sm font-bold leading-tight">EuroXpro Games 2026</div>
                <div className="text-white/40 text-[11px]">March 25 → 29</div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* ── Programme strip ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mt-6 pt-5 flex flex-wrap gap-2 items-center"
          style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}
        >
          {/* Section label */}
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] mr-1"
            style={{ color: "rgba(255,255,255,0.18)" }}>
            Programmes
          </span>

          {/* Programme pills */}
          {PROG_LOGOS.map((prog, i) => (
            <motion.div
              key={prog.alt}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.07 }}
              whileHover={{ scale: 1.09, y: -2, boxShadow: `0 6px 22px ${prog.color}45`, borderColor: `${prog.color}70` } as never}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white/[0.035] transition-colors duration-200 cursor-default"
              style={{ borderColor: `${prog.color}30` }}
            >
              <motion.span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: prog.color, boxShadow: `0 0 4px ${prog.color}` }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.75, 1, 0.75] }}
                transition={{ duration: 2.2 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.35 }}
              />
              <div className="relative h-3.5 w-[88px]">
                <Image src={prog.src} alt={prog.alt} fill sizes="88px" className="object-contain object-left" />
              </div>
            </motion.div>
          ))}

          <div className="h-4 w-px bg-white/[0.08] mx-1" />

          {/* Europe region pill */}
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.88 }}
            whileHover={{ scale: 1.09, y: -2, boxShadow: "0 6px 22px rgba(103,78,167,0.45)", borderColor: "rgba(103,78,167,0.75)" } as never}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-default transition-colors duration-200"
            style={{ borderColor: "rgba(103,78,167,0.38)", background: "rgba(103,78,167,0.1)" }}
          >
            <motion.span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] flex-shrink-0"
              style={{ boxShadow: "0 0 4px #674ea7" }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.75, 1, 0.75] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative h-3.5 w-[110px]">
              <Image src="/logos/europe-white.png" alt="AIESEC in Europe" fill sizes="110px" className="object-contain object-left" />
            </div>
          </motion.div>

          {/* Right spacer → AIESEC "Powered by" micro-badge */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-widest font-semibold"
              style={{ color: "rgba(255,255,255,0.12)" }}>
              Powered by
            </span>
            <div className="relative h-4 w-16 opacity-20">
              <Image src="/logos/aiesec-white.png" alt="AIESEC" fill sizes="64px" className="object-contain object-right" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Bottom accent line ── */}
      <div className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(103,78,167,0.5) 30%, rgba(3,126,243,0.3) 70%, transparent 100%)" }}
      />
    </header>
  );
}
