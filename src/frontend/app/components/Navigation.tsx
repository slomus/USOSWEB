"use client";
import Link from "next/link";
import ThemeToggleButton from "./ThemeToggleButton";
import { motion, Transition } from "framer-motion";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation"; // <--- NOWY IMPORT
import { getApiBaseUrl } from "@/app/config/api";

type UserRole = "student" | "teacher" | "admin";

type MenuItem = {
  label: string;
  href: string;
  disabled?: boolean;
};

// Dodajemy prop onClose, aby móc zamknąć menu po kliknięciu (opcjonalne, ale zalecane na mobile)
export default function Navigation({ 
  transition, 
  onClose 
}: { 
  transition: Transition,
  onClose?: () => void 
}) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname(); // <--- POBIERAMY AKTUALNĄ ŚCIEŻKĘ
  const API_BASE = getApiBaseUrl();

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/role`, {
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
    { label: "Strona główna", href: "/MainPage" },
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
    { label: "Strona główna", href: "/MainPage" },
    { label: " ZARZĄDZANIE ", href: "#", disabled: true },
    { label: "Użytkownicy", href: "/admin/users" },
    { label: "Oceny", href: "/admin/marks" },
    { label: "Wnioski", href: "/admin/applications" },
    { label: "Przedmioty", href: "/admin/subjects" },
    { label: " DLA WSZYSTKICH ", href: "#", disabled: true },
    { label: "Wiadomości", href: "/messages" },
    { label: "Plan zajęć", href: "/admin/scheduleLesson" },
    { label: "Kalendarz", href: "/admin/calendar" },
    { label: "Kontakt", href: "/contact" },
    { label: "O nas", href: "/aboutUs" },
  ];

  // Menu dla wykładowców
  const teacherMenuItems: MenuItem[] = [
    { label: "Strona główna", href: "/MainPage" },
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

  let menuItems = studentMenuItems;
  if (role === "admin") {
    menuItems = adminMenuItems;
  } else if (role === "teacher") {
    menuItems = teacherMenuItems;
  }

  const navClasses = "fixed top-[72px] left-0 w-full md:w-64 bg-[var(--color-bg-secondary)] text-[var(--color-text)] px-4 py-6 shadow-md h-[calc(100vh-72px)] z-40 overflow-y-auto";

  if (loading) {
    return (
      <motion.nav
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -300, opacity: 0 }}
        transition={transition}
        className={navClasses}
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
      className={navClasses}
    >
      <ul className="space-y-3 pb-20">
        <ThemeToggleButton />
        
        {menuItems.map((item, index) => {
          // Sprawdzamy, czy obecna ścieżka jest taka sama jak href w menu
          const isActive = pathname === item.href;

          return (
            <li key={index}>
              {item.disabled ? (
                <div className="mt-4 mb-2 px-3 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider opacity-70 border-b border-[var(--color-text)]/10 pb-1">
                  {item.label}
                </div>
              ) : (
                <Link href={item.href} legacyBehavior passHref>
                  <a
                    rel="noopener noreferrer"
                    onClick={onClose}
                    className={`block px-3 py-2 rounded transition-all text-sm ${
                      isActive 
                        ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold border-l-4 border-[var(--color-accent)] pl-2" // Styl Aktywny
                        : "hover:bg-[var(--color-bg)] text-[var(--color-text)] border-l-4 border-transparent pl-2" // Styl Nieaktywny
                    }`}
                  >
                    {item.label}
                  </a>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </motion.nav>
  );
}