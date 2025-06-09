"use client";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

  // Otwieranie searcha z focus
  const openSearch = (withFocus = true) => {
    setSearchOpen(true);
    if (withFocus) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Zamykanie searcha z animacją
  const handleClose = () => {
    setSearchOpen(false);
    setInputValue("");
  };

  // Obsługa wpisywania z klawiatury poza inpucie
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignoruj, jeśli input lub textarea już jest aktywny
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (searchOpen || tag === "input" || tag === "textarea" || e.metaKey || e.ctrlKey || e.altKey) return;

      // Tylko znaki drukowane (literowe, cyfrowe, spacja)
      if (e.key.length === 1 && !e.repeat) {
        openSearch(false);
        setTimeout(() => {
          setInputValue(e.key);
          inputRef.current?.focus();
        }, 120);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  // Wpisywanie w inpucie
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <header className="fixed top-0 left-0 w-screen bg-[#202120] text-white px-6 py-3 flex items-center justify-between shadow-md z-50">
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
            backgroundColor: searchOpen ? "#292A2A" : "transparent",
            borderRadius: searchOpen ? 24 : 999,
            boxShadow: searchOpen
              ? "0 2px 8px 0 rgba(0,0,0,0.10)"
              : "none",
          }}
          transition={{ type: "spring", stiffness: 400, damping: 32, duration: 0.38 }}
          style={{
            overflow: "hidden",
            marginLeft: 8,
            height: 40,
            minWidth: 0,
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
                className="bg-transparent outline-none text-white px-3 py-1 text-sm w-full"
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
            tabIndex={0}
            onClick={() =>
              searchOpen
                ? inputRef.current?.focus()
                : openSearch()
            }
            initial={false}
            animate={{
              backgroundColor: searchOpen ? "#3A6A68" : "#292A2A",
            }}
            transition={{ duration: 0.22 }}
            className="rounded-full p-2 flex items-center"
            style={{
              cursor: "pointer",
              border: "none",
              outline: "none",
              marginLeft: searchOpen ? 0 : 0,
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke={searchOpen ? "#DFD4CA" : "#9C9793"}
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M16.65 16.65A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"
              />
            </svg>
          </motion.button>
        </motion.div>
        {/* End Search box */}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-[#DFD4CA]">Witaj Studencie!</span>
        <button
          onClick={() => setIsNavVisible(!isNavVisible)}
          className="bg-[#3A6A68] hover:bg-[#2f5553] text-white text-xs px-3 py-1 rounded"
        >
          {isNavVisible ? "Ukryj nawigację" : "Pokaż nawigację"}
        </button>
        <button className="bg-[#8B2E2F] hover:bg-red-800 text-white text-xs px-3 py-1 rounded">
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
