"use client";
import Image from "next/image";
import Link from "next/link";
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/app/config/api";

interface UserInfo {
  username: string;
  role: "student" | "teacher" | "admin";
}

// Typy odpowiedzi z API (bazując na strukturze zwracanej przez endpoint search)
interface SearchResult {
  users: any[];
  subjects: any[];
  courses: any[];
  buildings: any[];
  classes: any[];
  [key: string]: any;
}

const UserProfile = React.memo(() => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = getApiBaseUrl();

  useEffect(() => {
    let isMounted = true;

    const fetchUserInfo = async () => {
      try {
        const usernameResponse = await fetch(`${API_BASE}/api/auth/username`, {
          credentials: "include",
        });
        
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
      case "student": return "Student";
      case "teacher": return "Wykładowca";
      case "admin": return "Administrator";
      default: return role;
    }
  };

  if (loading) {
    return <div className="text-sm text-[var(--color-text-secondary)]">Ładowanie...</div>;
  }

  if (error || !userInfo) {
    return <div className="text-sm text-[var(--color-text-secondary)]">{error || "Błąd"}</div>;
  }

  return (
    <div className="text-sm hidden sm:block">
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
  
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const DEFAULT_AVATAR = "/userPicture.jpg";
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserId = async () => {
      const API_BASE = getApiBaseUrl();
      try {
        const res = await fetch(`${API_BASE}/api/auth/user`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.user?.userId) {
            setAvatarUrl(`${API_BASE}/api/users/${data.user.userId}/photo?t=${new Date().getTime()}`);
          }
        }
      } catch (err) {
        console.error("Nie udało się pobrać ID użytkownika do zdjęcia:", err);
      }
    };

    fetchUserId();
  }, []);

  const openSearch = useCallback((withFocus = true) => {
    setSearchOpen(true);
    if (withFocus) {
      setTimeout(() => inputRef.current?.focus(), 101);
    }
  }, []);

  const handleClose = useCallback(() => {
    setSearchOpen(false);
    setInputValue("");
    setSearchResults(null);
  }, []);

  // Funkcja pomocnicza: kliknięcie w wynik zamyka search i czyści input
  const handleResultClick = useCallback(() => {
    setSearchOpen(false);
    setInputValue("");
    setSearchResults(null);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    },
    []
  );

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (inputValue.length >= 3) {
        setIsSearching(true);
        const API_BASE = getApiBaseUrl();

        try {
          const response = await fetch(
            `${API_BASE}/api/search?query=${inputValue}`,
            { credentials: "include" }
          );

          if (response.ok) {
            const data = await response.json();
            setSearchResults(data);
          } else {
            console.error("Błąd zapytania search:", response.status);
            setSearchResults({ users: [], subjects: [], courses: [], buildings: [], classes: [] });
          }
        } catch (error) {
          console.error("Błąd sieci podczas wyszukiwania:", error);
          setSearchResults({ users: [], subjects: [], courses: [], buildings: [], classes: [] });
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults(null);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [inputValue]);

  const handleLogout = useCallback(async () => {
    const API_BASE = getApiBaseUrl();

    try {
      const response = await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });

      if (response.ok) {
        router.push("/");
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
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logouniwersytet.png" alt="Logo" width={50} height={50} />
          <span className="font-bold tracking-wide text-sm hidden md:block">
            UNIWERSYTET KAZIMIERZA WIELKIEGO
          </span>
        </Link>

        {/* --- SEARCH BOX --- */}
        <div className="relative">
          <motion.div
            className="flex items-center"
            initial={false}
            animate={{
              width: searchOpen ? 300 : 40,
              backgroundColor: searchOpen ? "[var(--color-text)]" : "transparent",
              borderRadius: searchOpen ? 24 : 999,
              boxShadow: searchOpen ? "0 2px 8px 0 rgba(0,0,0,0.10)" : "none",
            }}
            transition={{ type: "spring", stiffness: 400, damping: 32, duration: 0.38 }}
            style={{ overflow: "hidden", marginLeft: 9, height: 41, minWidth: 1 }}
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
                />
              )}
            </AnimatePresence>
            <motion.button
              type="button"
              onClick={() => searchOpen ? inputRef.current?.focus() : openSearch()}
              initial={false}
              animate={{ backgroundColor: searchOpen ? "var(--color-accent)" : "var(--color-bg)" }}
              transition={{ duration: 0.22 }}
              className="rounded-full p-2 flex items-center justify-center"
              style={{ cursor: "pointer", border: "none", outline: "none", marginLeft: searchOpen ? 1 : 0 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" style={{ color: searchOpen ? "var(--color-bg)" : "var(--color-text-secondary)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </motion.button>
          </motion.div>

          {/* --- WYNIKI WYSZUKIWANIA --- */}
          <AnimatePresence>
            {searchOpen && inputValue.length >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-[50px] left-[10px] w-[350px] sm:w-[450px] bg-[var(--color-bg-secondary)] text-[var(--color-text)] shadow-2xl rounded-lg overflow-hidden border border-[var(--color-text)]/10 z-[100] max-h-[70vh] flex flex-col"
              >
                {/* Header wyników */}
                <div className="p-3 border-b border-[var(--color-text)]/10 bg-[var(--color-bg)] flex justify-between items-center sticky top-0 z-10">
                  <span className="text-xs font-bold uppercase text-[var(--color-text-secondary)]">Wyniki wyszukiwania</span>
                  {isSearching && <span className="text-xs text-[var(--color-accent)] animate-pulse">Szukanie...</span>}
                  <button onClick={handleClose} className="text-xs text-red-500 hover:underline">Zamknij</button>
                </div>
                
                {/* Lista wyników */}
                <div className="overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[var(--color-accent)] scrollbar-track-transparent">
                  {searchResults ? (
                    <div className="flex flex-col gap-4">
                      
                      {/* --- UŻYTKOWNICY --- */}
                      {searchResults.users && searchResults.users.length > 0 && (
                        <div>
                          <h4 className="px-2 mb-2 text-[10px] font-bold text-[var(--color-accent)] uppercase tracking-widest border-b border-[var(--color-accent)]/20 pb-1">Użytkownicy</h4>
                          {searchResults.users.map((user: any) => (
                            <Link
                              key={user.userId}
                              href={`/search?type=users&id=${user.userId}`}
                              onClick={handleResultClick}
                              className="block px-3 py-2 hover:bg-[var(--color-bg)] rounded transition-colors group"
                            >
                              <div className="font-medium text-sm group-hover:text-[var(--color-accent)]">
                                {user.name} {user.surname}
                              </div>
                              <div className="text-xs text-[var(--color-text-secondary)]">
                                {user.email} • <span className="capitalize">{user.role}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* --- PRZEDMIOTY --- */}
                      {searchResults.subjects && searchResults.subjects.length > 0 && (
                        <div>
                          <h4 className="px-2 mb-2 text-[10px] font-bold text-[var(--color-accent)] uppercase tracking-widest border-b border-[var(--color-accent)]/20 pb-1">Przedmioty</h4>
                          {searchResults.subjects.map((subj: any) => (
                            <Link
                              key={subj.subjectId}
                              href={`/search?type=subjects&id=${subj.subjectId}`}
                              onClick={handleResultClick}
                              className="block px-3 py-2 hover:bg-[var(--color-bg)] rounded transition-colors group"
                            >
                              <div className="font-medium text-sm group-hover:text-[var(--color-accent)]">
                                {subj.name}
                              </div>
                              <div className="text-xs text-[var(--color-text-secondary)]">
                                {subj.alias} • ECTS: {subj.ects}
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* --- KIERUNKI (COURSES) --- */}
                      {searchResults.courses && searchResults.courses.length > 0 && (
                        <div>
                          <h4 className="px-2 mb-2 text-[10px] font-bold text-[var(--color-accent)] uppercase tracking-widest border-b border-[var(--color-accent)]/20 pb-1">Kierunki</h4>
                          {searchResults.courses.map((item: any) => {
                            // Czasem API może zwrócić obiekt w wrapperze, bezpieczniej sprawdzić
                            const course = item.course || item;
                            return (
                              <Link
                                key={course.courseId}
                                href={`/search?type=courses&id=${course.courseId}`}
                                onClick={handleResultClick}
                                className="block px-3 py-2 hover:bg-[var(--color-bg)] rounded transition-colors group"
                              >
                                <div className="font-medium text-sm group-hover:text-[var(--color-accent)]">
                                  {course.name}
                                </div>
                                <div className="text-xs text-[var(--color-text-secondary)]">
                                  {course.alias} • {course.facultyName}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}

                       {/* --- ZAJĘCIA (CLASSES) --- */}
                       {searchResults.classes && searchResults.classes.length > 0 && (
                        <div>
                          <h4 className="px-2 mb-2 text-[10px] font-bold text-[var(--color-accent)] uppercase tracking-widest border-b border-[var(--color-accent)]/20 pb-1">Zajęcia</h4>
                          {searchResults.classes.map((cls: any) => (
                            <Link
                              key={cls.classId}
                              href={`/search?type=classes&id=${cls.classId}`}
                              onClick={handleResultClick}
                              className="block px-3 py-2 hover:bg-[var(--color-bg)] rounded transition-colors group"
                            >
                              <div className="font-medium text-sm group-hover:text-[var(--color-accent)]">
                                {cls.subjectName}
                              </div>
                              <div className="text-xs text-[var(--color-text-secondary)]">
                                <span className="capitalize">{cls.classType}</span> • Gr: {cls.groupNr} • {cls.buildingName}
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* --- BUDYNKI --- */}
                      {searchResults.buildings && searchResults.buildings.length > 0 && (
                        <div>
                          <h4 className="px-2 mb-2 text-[10px] font-bold text-[var(--color-accent)] uppercase tracking-widest border-b border-[var(--color-accent)]/20 pb-1">Budynki</h4>
                          {searchResults.buildings.map((b: any) => (
                            <Link
                              key={b.buildingId}
                              href={`/search?type=buildings&id=${b.buildingId}`}
                              onClick={handleResultClick}
                              className="block px-3 py-2 hover:bg-[var(--color-bg)] rounded transition-colors group"
                            >
                              <div className="font-medium text-sm group-hover:text-[var(--color-accent)]">
                                {b.name}
                              </div>
                              <div className="text-xs text-[var(--color-text-secondary)] truncate">
                                {b.address}
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* --- BRAK WYNIKÓW --- */}
                      {!isSearching && 
                       (!searchResults.users?.length && 
                        !searchResults.subjects?.length && 
                        !searchResults.courses?.length && 
                        !searchResults.buildings?.length && 
                        !searchResults.classes?.length) && (
                          <div className="text-center py-6 text-[var(--color-text-secondary)] text-sm italic">
                            Brak wyników dla podanej frazy.
                          </div>
                      )}

                    </div>
                  ) : (
                    !isSearching && <div className="text-[var(--color-text-secondary)] italic p-4 text-sm text-center">Wpisz frazę aby wyszukać...</div>
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
          className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text)] text-xs px-3 py-1 rounded transition-colors"
        >
          {isNavVisible ? "Ukryj nawigację" : "Pokaż nawigację"}
        </button>
        <button
          className="bg-[var(--color-accent2)] hover:bg-red-800 text-[var(--color-text)] text-xs px-3 py-1 rounded transition-colors"
          onClick={handleLogout}
        >
          Wyloguj
        </button>
        
        {/* AVATAR */}
        <img
          src={avatarUrl}
          alt="Avatar"
          width={50}
          height={50}
          className="rounded-full border border-[#9C9793] object-cover w-[50px] h-[50px] cursor-pointer"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src.indexOf(DEFAULT_AVATAR) === -1) {
              target.src = DEFAULT_AVATAR;
            }
          }}
        />
      </div>
    </header>
  );
}