"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring, animate } from "framer-motion";
import Image from "next/image";
import { CheckCircle2, Heart, Briefcase, Lightbulb } from "lucide-react";
import { ApprovalStats, ProgrammeTotals } from "@/lib/api";
import { ExchangeMode } from "./Filters";

interface Props {
  stats: ApprovalStats | null;
  total: number;
  programmeTotals: ProgrammeTotals;
  mode: ExchangeMode;
  loading: boolean;
  refreshing?: boolean;
}

/* Smooth count-up using framer-motion's animate engine */
function AnimatedNumber({ value, accent }: { value: number; accent: string }) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => Math.round(v).toLocaleString());
  const prevRef = useRef(0);

  useEffect(() => {
    const ctrl = animate(mv, value, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1], // expo-out
      from: prevRef.current,
    });
    prevRef.current = value;
    return ctrl.stop;
  }, [value, mv]);

  return (
    <motion.span className="font-data tabular-nums" style={{ color: "white" }}>
      {display}
    </motion.span>
  );
}

interface CardConfig {
  label: string;
  value: number;
  sub: string;
  icon: React.ElementType;
  accent: string;
  logoSrc: string;
  logoAlt: string;
  isHero?: boolean;
}

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  show: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.55, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

/* 3-D tilt card wrapper */
function TiltCard({ children, accent, className = "" }: { children: React.ReactNode; accent: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 150, damping: 18 });
  const springY = useSpring(rawY, { stiffness: 150, damping: 18 });
  const rotateX = useTransform(springY, [-1, 1], [6, -6]);
  const rotateY = useTransform(springX, [-1, 1], [-6, 6]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    rawX.set(((e.clientX - rect.left) / rect.width  - 0.5) * 2);
    rawY.set(((e.clientY - rect.top)  / rect.height - 0.5) * 2);
  };

  const handleMouseLeave = () => { rawX.set(0); rawY.set(0); };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{ perspective: "700px" }}
    >
      <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>
        {children}
      </motion.div>
    </div>
  );
}

export default function StatsCards({ stats, total, programmeTotals, mode, loading, refreshing }: Props) {
  const p = mode === "oGX" ? "o" : "i"; // prefix: oGV / iGV etc.
  const cards: CardConfig[] = [
    {
      label: mode === "oGX" ? "Total oGX" : "Total iCX",
      value: total,
      sub: mode === "oGX" ? "European EPs going abroad" : "Foreign EPs hosted in Europe",
      icon: CheckCircle2,
      accent: mode === "oGX" ? "#674ea7" : "#037EF3",
      logoSrc: "/logos/europe-white.png",
      logoAlt: "AIESEC in Europe",
      isHero: true,
    },
    {
      label: `${p}GV`,
      value: programmeTotals.GV,
      sub: "Global Volunteer · #7",
      icon: Heart,
      accent: "#F85A40",
      logoSrc: "/logos/gv-white.png",
      logoAlt: "Global Volunteer",
    },
    {
      label: `${p}GTa`,
      value: programmeTotals.GTa,
      sub: "Global Talent · #8",
      icon: Briefcase,
      accent: "#0CB9C1",
      logoSrc: "/logos/gta-white.png",
      logoAlt: "Global Talent",
    },
    {
      label: `${p}GTe`,
      value: programmeTotals.GTe,
      sub: "Global Teacher · #9",
      icon: Lightbulb,
      accent: "#F48924",
      logoSrc: "/logos/gte-white.png",
      logoAlt: "Global Teacher",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;

        return (
          <TiltCard key={card.label} accent={card.accent}>
          <motion.div
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate={refreshing ? { opacity: 0.45 } : "show"}
            whileHover={{ y: -5, scale: 1.025 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="relative group rounded-2xl overflow-hidden cursor-default"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid rgba(255,255,255,0.07)`,
              backdropFilter: "blur(16px)",
            }}
          >
            {/* Animated gradient border on hover */}
            <motion.div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: `linear-gradient(135deg, ${card.accent}30, transparent 50%, ${card.accent}18)`,
                boxShadow: `inset 0 0 0 1px ${card.accent}40`,
              }}
            />

            {/* Top glow — always faint, stronger on hover */}
            <div
              className="absolute inset-x-0 top-0 h-24 opacity-30 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at 50% -10%, ${card.accent}55 0%, transparent 70%)` }}
            />

            {/* Accent left stripe */}
            <div
              className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full"
              style={{ background: `linear-gradient(180deg, ${card.accent} 0%, ${card.accent}00 100%)` }}
            />

            {/* Sparkle dots on hero */}
            {card.isHero && (
              <>
                <motion.div
                  className="absolute top-3 right-3 w-1 h-1 rounded-full"
                  style={{ backgroundColor: card.accent }}
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.3, 0.8] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute top-6 right-7 w-0.5 h-0.5 rounded-full"
                  style={{ backgroundColor: card.accent }}
                  animate={{ opacity: [0.1, 0.8, 0.1], scale: [0.8, 1.4, 0.8] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
                />
              </>
            )}

            <div className="pl-5 pr-4 pt-5 pb-4">
              {/* Top row: logo + icon badge */}
              <div className="flex items-start justify-between mb-4">
                <div className="relative h-5 w-28 flex-shrink-0">
                  <Image src={card.logoSrc} alt={card.logoAlt} fill sizes="112px" className="object-contain object-left" />
                </div>

                <motion.div
                  className="flex-shrink-0 p-2 rounded-xl"
                  style={{ background: `${card.accent}22` }}
                  whileHover={{ scale: 1.15, rotate: 8 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Icon className="w-4 h-4" style={{ color: card.accent }} />
                </motion.div>
              </div>

              {/* Number — count-up or skeleton */}
              <div className="text-[2.25rem] font-black leading-none mb-1">
                {loading ? (
                  <div className="h-9 w-24 rounded-lg shimmer-bg" />
                ) : (
                  <AnimatedNumber value={card.value} accent={card.accent} />
                )}
              </div>

              {/* Labels */}
              <div className="text-white/65 text-sm font-semibold mt-1.5">{card.label}</div>
              <div className="text-white/30 text-[11px] mt-0.5 font-data">{card.sub}</div>

              {/* Share progress bar — programme cards only */}
              {!loading && !card.isHero && total > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-white/20 text-[10px] uppercase tracking-widest font-semibold">Share</span>
                    <motion.span
                      className="font-data text-[11px] font-bold"
                      style={{ color: card.accent }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 + i * 0.1 }}
                    >
                      {Math.round((card.value / total) * 100)}%
                    </motion.span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: `${card.accent}18` }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${card.accent}99, ${card.accent})` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((card.value / total) * 100)}%` }}
                      transition={{ duration: 1.1, delay: 0.4 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
          </TiltCard>
        );
      })}
    </div>
  );
}
