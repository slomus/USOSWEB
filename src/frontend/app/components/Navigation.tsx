"use client";
import Link from "next/link";
import ThemeToggleButton from "./ThemeToggleButton";
import { motion } from "framer-motion";
import { Transition } from "framer-motion";
import { useEffect, useState } from "react";

type UserRole = "student" | "teacher" | "admin";

type MenuItem = {
  label: string;
  href: string;
  disabled?: boolean;
};

export default function Navigation({ transition }: { transition: Transition }) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const response = await fetch("http://localhost:8083/api/auth/role", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setRole(data.role);
        }
      } catch (error) {
        console.error("Błąd pobierania roli:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, []);

  // Menu dla studentów
  const studentMenuItems: MenuItem[] = [
    { label: "Strona główna", href: "/StudentMainPage" },
    { label: "Plan zajęć", href: "/scheduleLesson" },
    { label: "Wiadomości", href: "/messages" },
    { label: "Kalendarz", href: "/calendar" },
    { label: "Oceny", href: "/marks" },
    { label: "Wnioski", href: "/getApplication" },
    { label: "Kierunek", href: "/field" },
    { label: "Rejestracja na przedmioty", href: "/enrollment" },
    { label: "Zaliczenia i egzaminy", href: "/examsPasses" },
    { label: "Zarządzanie kontem", href: "/accountManagement" },
    { label: "Kontakt", href: "/contact" },
    { label: "O nas", href: "/aboutUs" },
  ];

  // Menu dla adminów
  const adminMenuItems: MenuItem[] = [
    { label: "Strona główna", href: "/StudentMainPage" },
    { label: " ZARZĄDZANIE ", href: "#", disabled: true },
    { label: "Użytkownicy", href: "/admin/users" },
    { label: "Oceny", href: "/admin/marks" },
    { label: "Wnioski", href: "/admin/applications" },
    { label: "Przedmioty", href: "/admin/subjects" },
    { label: " DLA WSZYSTKICH ", href: "#", disabled: true },
    { label: "Wiadomości", href: "/messages" },
    { label: "Plan zajęć", href: "#" },
    { label: "Kalendarz", href: "/admin/calendar" },
    { label: "Kontakt", href: "/contact" },
    { label: "O nas", href: "/aboutUs" },
  ];

  // Menu dla wykładowców
  const teacherMenuItems: MenuItem[] = [
    { label: "Strona główna", href: "/StudentMainPage" },
    { label: "Moje zajęcia", href: "/teacher/subjects" },
    { label: "Oceny studentów", href: "/teacher/marks" },
    { label: "Plan zajęć", href: "/teacher/scheduleLesson" },
    { label: "Kalendarz", href: "/teacher/calendar" },
    { label: "Wiadomości", href: "/messages" },
    { label: "Użytkownicy", href: "/teacher/users" },
    { label: "Zarządzanie kontem", href: "/accountManagement" },
    { label: "Kontakt", href: "/contact" },
    { label: "O nas", href: "/aboutUs" },
  ];

  // Wybierz odpowiednie menu na podstawie roli
  let menuItems = studentMenuItems;
  if (role === "admin") {
    menuItems = adminMenuItems;
  } else if (role === "teacher") {
    menuItems = teacherMenuItems;
  }

  if (loading) {
    return (
      <motion.nav
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -300, opacity: 0 }}
        transition={transition}
        className="fixed top-[72px] left-0 w-64 bg-[var(--color-bg-secondary)] text-[var(--color-text)] px-4 py-6 shadow-md h-[calc(100vh-72px)] z-40"
      >
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent)]"></div>
        </div>
      </motion.nav>
    );
  }

  return (
    <motion.nav
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={transition}
      className="fixed top-[72px] left-0 w-64 bg-[var(--color-bg-secondary)] text-[var(--color-text)] px-4 py-6 shadow-md h-[calc(100vh-72px)] z-40 overflow-y-auto"
    >
      <ul className="space-y-3">
        <ThemeToggleButton />
        
        {menuItems.map((item, index) => (
          <li key={index}>
            {item.disabled ? (
              <div className="px-3 py-2 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                {item.label}
              </div>
            ) : (
              <Link href={item.href} legacyBehavior passHref>
                <a
                  rel="noopener noreferrer"
                  className="block px-3 py-2 rounded hover:bg-[var(--color-bg)] transition-all text-sm"
                >
                  {item.label}
                </a>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </motion.nav>
  );
}