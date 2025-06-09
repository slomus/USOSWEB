"use client";
import Link from "next/link";
import ThemeToggleButton from "./ThemeToggleButton";
import { motion } from "framer-motion";
import { Transition } from "framer-motion";

export default function Navigation({ transition }: { transition: Transition }) {
  const menuItems = [
    { label: "Strona główna", href: "#" },
    { label: "Plan zajęć", href: "#" },
    { label: "Wiadomości", href: "#" },
    { label: "Kalendarz", href: "#" },
    { label: "Oceny", href: "#" },
    { label: "Wnioski", href: "#" },
    { label: "Kierunek", href: "#" },
    { label: "Rejestracja na przedmioty", href: "#" },
    { label: "Egzaminy i zaliczenia", href: "#" },
    { label: "Zarządzanie kontem", href: "#" },
    { label: "Kontakt", href: "#" },
    { label: "O nas", href: "#" },
  ];

  return (
    <motion.nav
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={transition}
      className="fixed top-[72px] left-0 w-64 bg-[#403E3C] text-[#DFD4CA] px-4 py-6 shadow-md h-[calc(100vh-72px)] z-40"
    >
      <ul className="space-y-3">
        <ThemeToggleButton />
        {menuItems.map((item, index) => (
          <li key={index}>
            <Link href={item.href} legacyBehavior passHref>
              <a
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 rounded hover:bg-[#6B6160] transition-all text-sm"
              >
                {item.label}
              </a>
            </Link>
          </li>
        ))}
      </ul>
    </motion.nav>
  );
}
