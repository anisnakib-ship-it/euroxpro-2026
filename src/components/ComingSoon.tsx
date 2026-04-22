"use client";

import { motion } from "framer-motion";

export default function ComingSoon() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050810] px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-lg"
      >
        {/* Glowing orb */}
        <div className="relative mx-auto mb-8 w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 opacity-80" />
          <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-white">
            X
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
          EuroXpro 2026
        </h1>
        <p className="text-lg text-slate-400 mb-2">
          Something exciting is being built.
        </p>
        <p className="text-sm text-slate-500">
          We&apos;re adding new features. Stay tuned for the launch.
        </p>

        {/* Subtle animated line */}
        <motion.div
          className="mt-10 mx-auto h-px w-48 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        <p className="mt-6 text-xs text-slate-600">
          AIESEC in Europe
        </p>
      </motion.div>
    </div>
  );
}
