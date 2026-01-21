"use client";
import TopBar from "@/app/components/TopBar";
import Navigation from "@/app/components/Navigation";
import Footer from "../components/Footer";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

const transition = { type: "spring", stiffness: 300, damping: 30, duration: 0.4 };

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isNavVisible, setIsNavVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Wykrywanie szerokości ekranu (responsywność w logice JS)
  useEffect(() => {
    const handleResize = () => {
      // Ustawiamy breakpoint na 768px (standardowy md w Tailwind)
      setIsMobile(window.innerWidth < 768);
    };

    // Sprawdź na starcie
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Logika marginesu: przesuwamy tylko jeśli nawigacja jest otwarta I NIE jesteśmy na mobile
  const contentMargin = isNavVisible && !isMobile ? 256 : 0;

  return (
    <>
      <TopBar isNavVisible={isNavVisible} setIsNavVisible={setIsNavVisible} />
      
      <AnimatePresence>
        {isNavVisible && (
          <Navigation 
            key="navigation" 
            transition={transition} 
            // Opcjonalnie: Przekazujemy funkcję zamykania, aby zamknąć menu po kliknięciu linku na mobile
            onClose={() => isMobile && setIsNavVisible(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        animate={{ marginLeft: contentMargin }}
        transition={transition}
        // min-h-screen zapewnia, że tło pokrywa cały ekran
        className="pt-[72px] min-h-screen bg-[#181716]"
        style={{ marginLeft: contentMargin }}
      >
        {children}
        <Footer />
      </motion.div>
    </>
  );
}