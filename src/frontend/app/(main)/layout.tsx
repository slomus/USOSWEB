"use client";
import TopBar from "@/app/components/TopBar";
import Navigation from "@/app/components/Navigation";
import Footer from "../components/Footer";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const transition = { type: "spring", stiffness: 300, damping: 30, duration: 0.4 };

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isNavVisible, setIsNavVisible] = useState(false);

  return (
    <>
      <TopBar isNavVisible={isNavVisible} setIsNavVisible={setIsNavVisible} />
      <AnimatePresence>
        {isNavVisible && <Navigation key="navigation" transition={transition} />}
      </AnimatePresence>
      <motion.div
        animate={{ marginLeft: isNavVisible ? 256 : 0 }} // 256px = 64 * 4
        transition={transition}
        className="pt-[72px] min-h-screen bg-[#181716]"
        style={{ marginLeft: isNavVisible ? 256 : 0 }} // Dla pewności, nadpisuje Tailwind
      >
        {children}
        <Footer />
      </motion.div>
    </>
  );
}
