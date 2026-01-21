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

// --- TYPY ---
interface UserInfo {
  username: string;
  role: "student" | "teacher" | "admin";
}

interface SearchResult {
  users: any[];
  subjects: any[];
  courses: any[];
  buildings: any[];
  classes: any[];
}

// --- KOMPONENT USER PROFILE (Tekstowy - widoczny tylko na desktop) ---
const UserProfileText = React.memo(() => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const API_BASE = getApiBaseUrl();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const [uRes, rRes] = await Promise.all([
          fetch(`${API_BASE}/api/auth/username`, { credentials: "include" }),
          fetch(`${API_BASE}/api/auth/role`, { credentials: "include" })
        ]);

        if (uRes.ok && rRes.ok) {
          const uData = await uRes.json();
          const rData = await rRes.json();
          setUserInfo({ username: uData.username, role: rData.role });
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUserInfo();
  }, [API_BASE]);

  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = { student: "Student", teacher: "Wykładowca", admin: "Admin" };
    return map[role] || role;
  };

  if (!userInfo) return null;

  return (
    <div className="flex flex-col items-end mr-3 leading-tight">
      <span className="text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider">
        {getRoleLabel(userInfo.role)}
      </span>
      <span className="text-sm font-medium text-[var(--color-text)]">
        {userInfo.username}
      </span>
    </div>
  );
});
UserProfileText.displayName = "UserProfileText";

// --- GŁÓWNY KOMPONENT ---
export default function TopBar({
  isNavVisible,
  setIsNavVisible,
}: {
  isNavVisible: boolean;
  setIsNavVisible: (value: boolean) => void;
}) {
  // Stan Search
  const [searchOpen, setSearchOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Stan User / Avatar
  const DEFAULT_AVATAR = "/userPicture.jpg";
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false); // Dropdown pod avatarem
  
  const router = useRouter();
  const API_BASE = getApiBaseUrl();

  // Pobieranie Avatara
  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/user`, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.user?.userId) {
            setAvatarUrl(`${API_BASE}/api/users/${data.user.userId}/photo?t=${Date.now()}`);
          }
        }
      } catch (e) { console.error(e); }
    };
    fetchAvatar();
  }, [API_BASE]);

  // Obsługa Search
  const handleSearchClose = () => {
    setSearchOpen(false);
    setInputValue("");
    setSearchResults(null);
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (inputValue.length >= 3) {
        setIsSearching(true);
        try {
          const res = await fetch(`${API_BASE}/api/search?query=${inputValue}`, { credentials: "include" });
          if (res.ok) setSearchResults(await res.json());
          else setSearchResults({ users: [], subjects: [], courses: [], buildings: [], classes: [] });
        } catch (e) { setSearchResults(null); } 
        finally { setIsSearching(false); }
      } else {
        setSearchResults(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [inputValue, API_BASE]);

  // Logout
  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      router.push("/");
    } catch (e) { console.error(e); }
  };

  return (
    <>
      {/* --- GŁÓWNA BELKA --- */}
      <header className="fixed top-0 left-0 w-full h-[72px] bg-[var(--color-bg)] text-[var(--color-text)] px-4 flex items-center justify-between shadow-md z-50">
        
        {/* LEWA STRONA: Logo */}
        <div className="flex items-center gap-2">
           {/* Logo (obrazek) */}
          <Link href="/" className="flex-shrink-0">
            <Image src="/logouniwersytet.png" alt="Logo" width={40} height={40} className="w-10 h-10 object-contain" />
          </Link>
           {/* Tekst (ukryty na bardzo małych ekranach) */}
          <Link href="/" className="hidden sm:block font-bold tracking-wide text-xs sm:text-sm md:text-base leading-tight">
            UNIWERSYTET<br/>KAZIMIERZA WIELKIEGO
          </Link>
        </div>

        {/* PRAWA STRONA: Akcje */}
        <div className="flex items-center gap-1 sm:gap-3">
          
          {/* 1. Przycisk Search (Lupa) */}
          <button 
            onClick={() => {
                setSearchOpen(!searchOpen);
                if (!searchOpen) setTimeout(() => inputRef.current?.focus(), 100);
            }}
            className={`p-2 rounded-full transition-colors ${searchOpen ? 'bg-[var(--color-bg-secondary)] text-[var(--color-accent)]' : 'hover:bg-[var(--color-bg-secondary)]'}`}
            title="Wyszukaj"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>

          <div className="h-6 w-[1px] bg-[var(--color-text)]/20 mx-1"></div>

          {/* 2. Informacje o użytkowniku (Tylko Desktop) */}
          <div className="hidden md:block text-right">
            <UserProfileText />
          </div>

          {/* 3. Avatar z Dropdownem (Dla mobile i desktop) */}
          <div className="relative">
            <button 
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="relative block"
            >
                <img
                src={avatarUrl}
                alt="Profile"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[var(--color-text-secondary)] object-cover hover:opacity-80 transition-opacity"
                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                />
            </button>

            {/* Dropdown po kliknięciu w avatar */}
            <AnimatePresence>
                {userDropdownOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)}></div>
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 top-12 w-48 bg-[var(--color-bg-secondary)] rounded-md shadow-xl border border-[var(--color-text)]/10 z-50 py-2"
                        >
                            {/* Na mobile pokazujemy tu info o userze, bo ukryliśmy je w navbarze */}
                            <div className="md:hidden px-4 py-2 border-b border-[var(--color-text)]/10 mb-2">
                                <UserProfileText />
                            </div>
                            <Link href="/accountManagement" className="block px-4 py-2 text-sm hover:bg-[var(--color-bg)] transition-colors" onClick={() => setUserDropdownOpen(false)}>
                                Zarządzanie kontem
                            </Link>
                            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[var(--color-bg)] transition-colors flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                                </svg>
                                Wyloguj
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
          </div>

          {/* 4. Przycisk Logout (Szybki dostęp - ikona) */}
          <button 
            onClick={handleLogout}
            className="hidden sm:flex p-2 text-[var(--color-text-secondary)] hover:text-red-500 transition-colors"
            title="Wyloguj"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>

          {/* 5. Przycisk Menu (Hamburger) */}
          <button
            onClick={() => setIsNavVisible(!isNavVisible)}
            className="ml-1 p-2 rounded hover:bg-[var(--color-bg-secondary)] transition-colors"
            aria-label="Toggle Navigation"
          >
            {isNavVisible ? (
                 // Ikona X (Zamknij menu)
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                 </svg>
            ) : (
                // Ikona Hamburger (Otwórz menu)
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
            )}
          </button>
        </div>
      </header>

      {/* --- WYSUWANY PANEL SEARCH (POD BELKĄ) --- */}
      <AnimatePresence>
        {searchOpen && (
          <>
            {/* Tło przyciemniające resztę strony */}
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 top-[72px]"
                onClick={handleSearchClose}
            />

            {/* Kontener Search */}
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-[72px] left-0 w-full bg-[var(--color-bg-secondary)] border-b border-[var(--color-text)]/10 shadow-xl z-50 flex flex-col"
            >
                {/* Input Field + Close Button */}
                <div className="container mx-auto max-w-4xl p-4 flex gap-3">
                    <div className="relative flex-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)]">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        <input 
                            ref={inputRef}
                            type="text" 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Wpisz frazę (min. 3 znaki), np. Kowalski, Matematyka..."
                            className="w-full bg-[var(--color-bg)] border border-[var(--color-text)]/20 rounded-lg py-3 pl-10 pr-4 outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-all"
                        />
                         {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin h-4 w-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full"></div>}
                    </div>
                    
                    <button 
                        onClick={handleSearchClose}
                        className="bg-[var(--color-bg)] hover:bg-red-500 hover:text-white border border-[var(--color-text)]/20 text-[var(--color-text)] rounded-lg px-4 font-medium transition-colors flex items-center gap-2"
                    >
                        <span>Zamknij</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Wyniki Wyszukiwania (Scrollowalne wewnątrz panelu) */}
                {searchResults && (
                    <div className="container mx-auto max-w-4xl px-4 pb-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
                        <div className="space-y-4">
                             {/* Powielona logika wyświetlania wyników z poprzedniego kodu, ale w gridzie */}
                             {searchResults.users?.length > 0 && <ResultGroup title="Użytkownicy" items={searchResults.users} type="users" close={handleSearchClose} />}
                             {searchResults.subjects?.length > 0 && <ResultGroup title="Przedmioty" items={searchResults.subjects} type="subjects" close={handleSearchClose} />}
                             {searchResults.courses?.length > 0 && <ResultGroup title="Kierunki" items={searchResults.courses} type="courses" close={handleSearchClose} />}
                             
                             {!isSearching && inputValue.length >=3 && 
                              Object.values(searchResults).every(arr => Array.isArray(arr) && arr.length === 0) && (
                                <p className="text-center text-[var(--color-text-secondary)] py-4">Brak wyników</p>
                             )}
                        </div>
                    </div>
                )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Komponent pomocniczy do wyświetlania grupy wyników
const ResultGroup = ({ title, items, type, close }: { title: string, items: any[], type: string, close: () => void }) => (
    <div>
        <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2 border-b border-[var(--color-text)]/10 pb-1">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {items.map((item: any, i: number) => {
                const id = item.userId || item.subjectId || item.courseId || item.id;
                const mainText = item.name ? (item.surname ? `${item.name} ${item.surname}` : item.name) : (item.subjectName || "Element");
                const subText = item.email || item.alias || item.facultyName || "";
                
                return (
                    <Link 
                        key={i} 
                        href={`/search?type=${type}&id=${id}`} 
                        onClick={close}
                        className="flex flex-col p-3 bg-[var(--color-bg)] hover:bg-[var(--color-bg)]/80 border border-transparent hover:border-[var(--color-accent)] rounded transition-all"
                    >
                        <span className="font-medium text-sm text-[var(--color-accent)]">{mainText}</span>
                        {subText && <span className="text-xs text-[var(--color-text-secondary)]">{subText}</span>}
                    </Link>
                )
            })}
        </div>
    </div>
);