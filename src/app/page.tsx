"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import EntrancePage from "@/components/EntrancePage";
import Dashboard from "@/components/dashboard/Dashboard";
import HackathonPage from "@/components/HackathonPage";
import ComingSoon from "@/components/ComingSoon";

const IS_LIVE = process.env.NEXT_PUBLIC_SITE_LIVE === "true";

export default function Home() {
  const [view, setView] = useState<"entrance" | "dashboard" | "hackathon">("entrance");

  if (!IS_LIVE) return <ComingSoon />;

  return (
    <AnimatePresence mode="wait">
      {view === "entrance" && (
        <EntrancePage
          key="entrance"
          onEnter={() => setView("dashboard")}
          onHackathon={() => setView("hackathon")}
        />
      )}
      {view === "dashboard" && (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, filter: "blur(8px)", scale: 1.02 }}
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
          <Dashboard onHackathon={() => setView("hackathon")} />
        </motion.div>
      )}
      {view === "hackathon" && (
        <motion.div
          key="hackathon"
          initial={{ opacity: 0, filter: "blur(8px)", scale: 1.02 }}
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          exit={{ opacity: 0, filter: "blur(8px)" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
          <HackathonPage onBack={() => setView("dashboard")} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
