"use client";
import Image from "next/image";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "../wrappers/fetchWithAuth";
import { User } from "../wrappers/fetchWithAuth";

const UserProfile = React.memo(() => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      try {
        const response = await fetchWithAuth(
          "http://localhost:8083/api/auth/username"
        );
        if (response.ok && isMounted) {
          const data = await response.json();
          setUser(data);
        }
      } catch (error) {
        if (isMounted) {
          console.error(error);
          setError("Błąd ładowania użytkownika");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUser();

    return () => {
      isMounted = false;
    };
  }, []); // Pusta tablica - wykonuje się tylko raz

  if (loading) return <div>Ładowanie...</div>;
  if (error) return <div>{error}</div>;
  if (!user) return <div>Błąd ładowania użytkownika</div>;

  return <div>Witaj, {user.username}!</div>;
});

UserProfile.displayName = "UserProfile";

export default function TopBar({
  isNavVisible,
  setIsNavVisible,
}: {
  isNavVisible: boolean;
  setIsNavVisible: (value: boolean) => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const openSearch = useCallback((withFocus = true) => {
    setSearchOpen(true);
    if (withFocus) {
      setTimeout(() => inputRef.current?.focus(), 101);
    }
  }, []);

  const handleClose = useCallback(() => {
    setSearchOpen(false);
    setInputValue("");
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    },
    []
  );

  const handleLogout = useCallback(async () => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

    try {
      const response = await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({}),
      });

      if (response.ok) {
        console.log("Logout successful");
        router.push("/");
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }, [router]);

  // Memoizujemy UserProfile aby nie renderował się przy każdej zmianie
  const memoizedUserProfile = useMemo(() => <UserProfile />, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      
      // Jeśli search jest już otwarty, nie reaguj na dodatkowe klawisze
      if (searchOpen) return;
      
      // Ignoruj jeśli użytkownik pisze w innym input/textarea
      if (tag === "input" || tag === "textarea") return;
      
      // Ignoruj kombinacje z Ctrl, Meta, Alt
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Reaguj tylko na pojedyncze znaki alfanumeryczne
      if (e.key.length === 1 && !e.repeat) {
        e.preventDefault(); // Zapobiega wpisywaniu znaku w inne miejsca
        openSearch(false);
        setTimeout(() => {
          setInputValue(e.key);
          inputRef.current?.focus();
        }, 121);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, openSearch]); // Dodajemy zależności

  return (
    <header className="fixed top-0 left-0 w-screen bg-[var(--color-bg)] text-[var(--color-text)] px-6 py-3 flex items-center justify-between shadow-md z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Image src="/logouniwersytet.png" alt="Logo" width={50} height={50} />
          <span className="font-bold tracking-wide text-sm">UNIVERSITY</span>
        </div>

        {/* Search box */}
        <motion.div
          className="flex items-center"
          initial={false}
          animate={{
            width: searchOpen ? 220 : 40,
            backgroundColor: searchOpen ? "[var(--color-text)]" : "transparent",
            borderRadius: searchOpen ? 24 : 999,
            boxShadow: searchOpen ? "0 2px 8px 0 rgba(0,0,0,0.10)" : "none",
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 32,
            duration: 0.38,
          }}
          style={{
            overflow: "hidden",
            marginLeft: 9,
            height: 41,
            minWidth: 1,
          }}
        >
          <AnimatePresence initial={false}>
            {searchOpen && (
              <motion.input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Szukaj..."
                className="bg-transparent outline-none text-[var(--color-text)] px-3 py-1 text-sm w-full"
                style={{ minWidth: 0 }}
                key="search-input"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
                onBlur={handleClose}
              />
            )}
          </AnimatePresence>
          <motion.button
            type="button"
            aria-label="Szukaj"
            tabIndex={1}
            onClick={() =>
              searchOpen ? inputRef.current?.focus() : openSearch()
            }
            initial={false}
            animate={{
              backgroundColor: searchOpen
                ? "var(--color-accent)"
                : "var(--color-bg)",
            }}
            transition={{ duration: 0.22 }}
            className="rounded-full p-2 flex items-center justify-center"
            style={{
              cursor: "pointer",
              border: "none",
              outline: "none",
              marginLeft: searchOpen ? 1 : 0,
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
              style={{
                color: searchOpen ? "var(--color-bg)" : "var(--color-text-secondary)"
              }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </motion.button>
        </motion.div>
      </div>

      <div className="flex items-center gap-4">
        {memoizedUserProfile}
        <button
          onClick={() => setIsNavVisible(!isNavVisible)}
          className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text)] text-xs px-3 py-1 rounded"
        >
          {isNavVisible ? "Ukryj nawigację" : "Pokaż nawigację"}
        </button>
        <button
          className="bg-[var(--color-accent2)] hover:bg-red-800 text-[var(--color-text)] text-xs px-3 py-1 rounded"
          onClick={handleLogout}
        >
          Logout
        </button>
        <Image
          src="/userPicture.jpg"
          alt="Avatar"
          width={50}
          height={50}
          className="rounded-full border border-[#9C9793]"
        />
      </div>
    </header>
  );
}