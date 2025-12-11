"use client";
import Image from "next/image";
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface UserInfo {
  username: string;
  role: "student" | "teacher" | "admin";
}

// Typy odpowiedzi z API (bazując na PDF str. 43-44)
interface SearchResult {
  users: any[];
  subjects: any[];
  courses: any[];
  // Dodajemy pola opcjonalne, gdyby backend zwrócił coś innego
  [key: string]: any;
}

const UserProfile = React.memo(() => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

  useEffect(() => {
    let isMounted = true;

    const fetchUserInfo = async () => {
      try {
        // Pobierz nazwę użytkownika
        const usernameResponse = await fetch(`${API_BASE}/api/auth/username`, {
          credentials: "include",
        });
        
        // Pobierz rolę użytkownika
        const roleResponse = await fetch(`${API_BASE}/api/auth/role`, {
          credentials: "include",
        });

        if (usernameResponse.ok && roleResponse.ok && isMounted) {
          const usernameData = await usernameResponse.json();
          const roleData = await roleResponse.json();
          
          setUserInfo({
            username: usernameData.username,
            role: roleData.role,
          });
        } else if (isMounted) {
          setError("Błąd ładowania danych");
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

    fetchUserInfo();

    return () => {
      isMounted = false;
    };
  }, [API_BASE]);

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case "student":
        return "Student";
      case "teacher":
        return "Wykładowca";
      case "admin":
        return "Administrator";
      default:
        return role;
    }
  };
  if (loading) {
    return (
      <div className="text-sm text-[var(--color-text-secondary)]">
        Ładowanie...
      </div>
    );
  }

  if (error || !userInfo) {
    return (
      <div className="text-sm text-[var(--color-text-secondary)]">
        {error || "Błąd"}
      </div>
    );
  }

  return (
    <div className="text-sm">
      <span className="text-[var(--color-text-secondary)]">Zalogowany jako </span>
      <span className="font-medium text-[var(--color-accent)]">{getRoleLabel(userInfo.role)}</span>
      <span className="text-[var(--color-text-secondary)]">, </span>
      <span className="font-medium text-[var(--color-text)]">{userInfo.username}</span>
    </div>
  );
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
  
  // Nowe stany do obsługi wyszukiwania
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
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
    setSearchResults(null); // Czyścimy wyniki po zamknięciu
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    },
    []
  );

  // --- LOGIKA WYSZUKIWANIA (NOWE) ---
  useEffect(() => {
    // Debounce: czekamy 500ms po ostatnim wpisaniu znaku
    const delayDebounceFn = setTimeout(async () => {
      // Triggeruj tylko jeśli wpisano 3 lub więcej znaków
      if (inputValue.length >= 3) {
        setIsSearching(true);
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

        try {
          console.log(`Wysyłam zapytanie: ${API_BASE}/api/search?query=${inputValue}`);
          
          // Używamy fetchWithAuth, zakładając, że endpoint może wymagać ciasteczek/tokena
          // Jeśli endpoint jest publiczny, można zamienić na zwykły fetch
          const response = await fetchWithAuth(
            `${API_BASE}/api/search?query=${inputValue}`
          );

          if (response.ok) {
            const data = await response.json();
            console.log("Otrzymane dane:", data); // Log do konsoli
            setSearchResults(data);
          } else {
            console.error("Błąd zapytania search:", response.status);
            setSearchResults({ error: `Błąd API: ${response.status}`, users: [], subjects: [], courses: [] });
          }
        } catch (error) {
          console.error("Błąd sieci podczas wyszukiwania:", error);
          setSearchResults({ error: "Błąd połączenia", users: [], subjects: [], courses: [] });
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults(null); // Czyścimy wyniki jeśli < 3 znaki
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [inputValue]);

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

  const memoizedUserProfile = useMemo(() => <UserProfile />, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (searchOpen) return;
      if (tag === "input" || tag === "textarea") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key.length === 1 && !e.repeat) {
        e.preventDefault();
        openSearch(false);
        setTimeout(() => {
          setInputValue(e.key);
          inputRef.current?.focus();
        }, 121);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, openSearch]);

  return (
    <header className="fixed top-0 left-0 w-screen bg-[var(--color-bg)] text-[var(--color-text)] px-6 py-3 flex items-center justify-between shadow-md z-50">
      <div className="flex items-center gap-4 relative">
        <div className="flex items-center gap-2">
          <Image src="/logouniwersytet.png" alt="Logo" width={50} height={50} />
          <span className="font-bold tracking-wide text-sm">
            UNIWERSYTET KAZIMIERZA WIELKIEGO
          </span>
        </div>

        {/* Search box wrapper */}
        <div className="relative">
          <motion.div
            className="flex items-center"
            initial={false}
            animate={{
              width: searchOpen ? 300 : 40, // Zwiększyłem nieco szerokość po otwarciu
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
                  placeholder="Szukaj (min. 3 znaki)..."
                  className="bg-transparent outline-none text-[var(--color-text)] px-3 py-1 text-sm w-full"
                  style={{ minWidth: 0 }}
                  key="search-input"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                  // Usunąłem onBlur={handleClose}, aby można było klikać w wyniki
                  // Zamiast tego zamykanie można obsłużyć np. kliknięciem poza komponentem (clickOutside)
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
                  color: searchOpen
                    ? "var(--color-bg)"
                    : "var(--color-text-secondary)",
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

          {/* --- PANEL WYNIKÓW WYSZUKIWANIA (DEBUG VIEW) --- */}
          <AnimatePresence>
            {searchOpen && inputValue.length >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-[50px] left-[10px] w-[400px] bg-white text-black shadow-xl rounded-lg overflow-hidden border border-gray-200 z-[100]"
              >
                <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-gray-500">
                    Wyniki API (Debug)
                  </span>
                  {isSearching && <span className="text-xs text-blue-500 animate-pulse">Szukanie...</span>}
                  <button onClick={handleClose} className="text-xs text-red-500 hover:underline">Zamknij</button>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto p-4 text-xs font-mono">
                  {searchResults ? (
                    <>
                      {/* Wyświetlanie sformatowanego JSON-a */}
                      <pre className="whitespace-pre-wrap break-all">
                        {JSON.stringify(searchResults, null, 2)}
                      </pre>
                    </>
                  ) : (
                    !isSearching && <div className="text-gray-400 italic">Brak wyników lub błąd zapytania...</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
          Wyloguj
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