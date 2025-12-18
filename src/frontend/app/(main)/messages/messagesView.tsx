"use client";

import { useState, useEffect, useRef } from "react";
import { getApiBaseUrl } from "@/app/config/api";

// --- KONFIGURACJA API ---
const API_BASE = getApiBaseUrl();

// --- TYPY DANYCH ---
// Typ folderu jest teraz stringiem, ponieważ nazwy przychodzą z API
type FolderName = string;

// Zaktualizowany typ obsługujący camelCase i snake_case
type EmailSummary = {
  // ID
  emailUid?: string;    
  email_uid?: string;   
  id?: string | number; 
  message_id?: string;
  uid?: string;

  // Nadawca
  senderEmail?: string; 
  sender_email?: string; 
  senderName?: string;
  sender_name?: string;

  // Inne pola
  title: string;
  sendDate?: string;    
  send_date?: string;   
  isRead?: boolean;     
  is_read?: boolean;    

  [key: string]: any;   
};

type EmailDetails = EmailSummary & {
  content: string;
};

// --- POMOCNICZA FUNKCJA DO WYCIĄGANIA ID ---
const getEmailId = (email: EmailSummary): string => {
  const id = email.emailUid || email.email_uid || email.id || email.message_id || email.uid;
  return id ? String(id) : "";
};

// --- POMOCNICZE FUNKCJE DO PÓL ---
const getSenderEmail = (e: EmailSummary) => e.senderEmail || e.sender_email || "";
const getSenderName = (e: EmailSummary) => e.senderName || e.sender_name || "";
const getSendDate = (e: EmailSummary) => e.sendDate || e.send_date || "";
const getIsRead = (e: EmailSummary) => (e.isRead !== undefined ? e.isRead : e.is_read);

// --- KOMPONENT: Sugestie Email ---
function EmailSuggestInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [visible, setVisible] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (value.length >= 2) {
        fetchSuggestions(value);
      } else {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  const fetchSuggestions = async (query: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/messaging/suggest-email?q=${encodeURIComponent(
          query
        )}&limit=5&scope=all`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.items || []);
        setVisible(true);
      }
    } catch (e) {
      console.error("Błąd sugestii:", e);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setVisible(true);
        }}
        placeholder="Odbiorca (wpisz min. 2 znaki)..."
        className="w-full p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-text-secondary)]/20 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
      />
      {visible && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {suggestions.map((s) => (
            <li
              key={s.userId || s.email}
              onClick={() => {
                onChange(s.email);
                setVisible(false);
              }}
              className="px-4 py-2 hover:bg-[var(--color-accent)] hover:text-white cursor-pointer transition-colors border-b border-white/10 last:border-0"
            >
              <div className="font-bold text-sm">{s.displayName}</div>
              <div className="text-xs opacity-80">{s.email}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// --- GŁÓWNY KOMPONENT STRONY ---
export default function MessagesPage() {
  // Lista folderów pobrana z API
  const [availableFolders, setAvailableFolders] = useState<string[]>([]);
  // Aktualnie wybrany folder (domyślnie pusty string, ustawiany po fetchu)
  const [currentFolder, setCurrentFolder] = useState<FolderName>("");

  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetails | null>(null);
  
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({ to: "", subject: "", body: "" });
  const [isSending, setIsSending] = useState(false);

  const [offset, setOffset] = useState(0);
  const limit = 20;
  const [totalCount, setTotalCount] = useState(0);

  const formatHeaders = {
    "Content-Type": "application/json",
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Brak daty";
    try {
      return new Date(dateString).toLocaleString("pl-PL", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch (e) {
      return dateString;
    }
  };

  // Helper do ikon folderów
  const getFolderIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("inbox") || lower.includes("odebrane")) return "📥";
    if (lower.includes("sent") || lower.includes("wysłane")) return "📤";
    if (lower.includes("trash") || lower.includes("kosz") || lower.includes("deleted")) return "🗑️";
    if (lower.includes("draft") || lower.includes("robocze")) return "📝";
    return "📁";
  };

  // Helper do nazwy wyświetlanej
  const getFolderLabel = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === "inbox") return "Odebrane";
    if (lower === "sent") return "Wysłane";
    if (lower === "trash") return "Kosz";
    // Capitalize first letter for others
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  // --- API ACTIONS ---

  // 0. Pobieranie listy folderów
  const fetchFolders = async () => {
    setIsLoadingFolders(true);
    try {
      const res = await fetch(`${API_BASE}/api/messaging/list-folders`, {
        method: "GET",
        credentials: "include",
        headers: formatHeaders,
      });

      if (res.ok) {
        const data = await res.json();
        // Zakładamy, że API zwraca obiekt { folders: ["inbox", "sent", ...] } lub tablicę
        const foldersList = Array.isArray(data) ? data : (data.folders || data.items || []);
        
        setAvailableFolders(foldersList);

        // Ustaw domyślny folder, jeśli żaden nie jest wybrany
        if (!currentFolder && foldersList.length > 0) {
            // Preferuj "inbox" jeśli istnieje, w przeciwnym razie pierwszy
            const inbox = foldersList.find((f: string) => f.toLowerCase() === 'inbox');
            setCurrentFolder(inbox || foldersList[0]);
        }
      } else {
        console.error("Błąd pobierania folderów", res.status);
      }
    } catch (err) {
      console.error("Błąd sieci przy pobieraniu folderów:", err);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  // 1. Pobieranie listy maili (get_all_emails)
  const fetchEmails = async () => {
    if (!currentFolder) return;

    setIsLoadingList(true);
    try {
      const res = await fetch(`${API_BASE}/api/messaging/get_all_emails`, {
        method: "POST",
        credentials: "include",
        headers: formatHeaders,
        body: JSON.stringify({ 
            limit, 
            offset, 
            folder: currentFolder // Dynamiczny folder
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success || Array.isArray(data.emails)) {
          const fetchedEmails = data.emails || [];
          setEmails(fetchedEmails);
          setTotalCount(data.total_count || 0);
        }
      } else {
        console.error("Błąd pobierania listy maili", res.status);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingList(false);
    }
  };

  // 2. Pobieranie szczegółów maila (get_email)
  const openEmail = async (summary: EmailSummary) => {
    const uid = getEmailId(summary);
    
    if (!uid) {
      alert("Błąd integracji: Nie znaleziono ID wiadomości.");
      return;
    }

    setSelectedEmail(null);
    setIsLoadingDetails(true);
    
    try {
      const res = await fetch(`${API_BASE}/api/messaging/get_email`, {
        method: "POST",
        credentials: "include",
        headers: formatHeaders,
        body: JSON.stringify({
          email_uid: uid,
          folder: currentFolder, // Dynamiczny folder
        }),
      });

      const data = await res.json();

      if (res.ok && (data.success || data.content)) {
        const fullEmail = {
          ...summary,
          ...data,
          content: data.content || "Brak treści wiadomości.",
        };
        setSelectedEmail(fullEmail);

        // Automatyczne oznaczanie jako przeczytane przy otwarciu
        if (!getIsRead(fullEmail)) {
          markAsRead(uid);
        }
      } else {
        console.error("Błąd API:", data);
        alert("Błąd serwera: " + (data.message || "Nie udało się pobrać treści."));
      }
    } catch (err) {
      console.error(err);
      alert("Błąd połączenia.");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // 3. Oznaczanie jako przeczytane (set_email_read)
  const markAsRead = async (uid: string) => {
    try {
      await fetch(`${API_BASE}/api/messaging/set_email_read`, {
        method: "POST",
        credentials: "include",
        headers: formatHeaders,
        body: JSON.stringify({ 
            email_uid: uid, 
            folder: currentFolder // Dynamiczny folder
        }),
      });
      
      // Aktualizacja stanu lokalnego
      setEmails((prev) =>
        prev.map((e) => (getEmailId(e) === uid ? { ...e, isRead: true, is_read: true } : e))
      );
      if (selectedEmail && getEmailId(selectedEmail) === uid) {
          setSelectedEmail(prev => prev ? ({ ...prev, isRead: true, is_read: true }) : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 3b. Oznaczanie jako NIEprzeczytane (set_email_unread)
  const markAsUnread = async (uid: string) => {
    try {
      await fetch(`${API_BASE}/api/messaging/set_email_unread`, {
        method: "POST",
        credentials: "include",
        headers: formatHeaders,
        body: JSON.stringify({ 
            email_uid: uid, 
            folder: currentFolder // Dynamiczny folder
        }),
      });

      // Aktualizacja stanu lokalnego
      setEmails((prev) =>
        prev.map((e) => (getEmailId(e) === uid ? { ...e, isRead: false, is_read: false } : e))
      );
      if (selectedEmail && getEmailId(selectedEmail) === uid) {
          setSelectedEmail(prev => prev ? ({ ...prev, isRead: false, is_read: false }) : null);
      }
    } catch (e) {
        console.error(e);
        alert("Nie udało się oznaczyć jako nieprzeczytane.");
    }
  };

  // 4. Wysyłanie maila (send-email)
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    try {
      const res = await fetch(`${API_BASE}/api/messaging/send-email`, {
        method: "POST",
        credentials: "include",
        headers: formatHeaders,
        body: JSON.stringify({
            to: composeData.to,
            subject: composeData.subject,
            body: composeData.body
        }),
      });
      
      const data = await res.json();

      if (data.success || res.ok) {
        alert("Wiadomość wysłana pomyślnie!");
        setIsComposeOpen(false);
        setComposeData({ to: "", subject: "", body: "" });
        // Jeśli jesteśmy w folderze wysłane, odśwież
        if (currentFolder.toLowerCase().includes('sent')) fetchEmails();
      } else {
        alert("Błąd wysyłania: " + (data.message || "Nieznany błąd"));
      }
    } catch (err) {
      console.error(err);
      alert("Błąd połączenia z serwerem.");
    } finally {
      setIsSending(false);
    }
  };

  // 5. Usuwanie maila (delete_email)
  const handleDelete = async () => {
    if (!selectedEmail) return;
    const uid = getEmailId(selectedEmail);
    if (!uid) return;

    if (!confirm("Czy na pewno chcesz usunąć tę wiadomość?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/messaging/delete_email`, {
        method: "POST",
        credentials: "include",
        headers: formatHeaders,
        body: JSON.stringify({ 
            email_uid: uid,
            folder: currentFolder // Dynamiczny folder
        }),
      });
      const data = await res.json();
      
      if(data.success || res.ok) {
          setSelectedEmail(null);
          fetchEmails(); // Odśwież listę
      } else {
          alert("Nie udało się usunąć wiadomości.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Inicjalizacja: Pobierz foldery
  useEffect(() => {
    fetchFolders();
  }, []);

  // Gdy zmienia się folder lub offset, pobierz maile
  useEffect(() => {
    if (currentFolder) {
        fetchEmails();
        setSelectedEmail(null);
    }
  }, [currentFolder, offset]);

  // Reset offsetu przy zmianie folderu
  useEffect(() => {
    setOffset(0);
  }, [currentFolder]);

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col font-sans pt-24 pb-12">
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 h-[calc(100vh-8rem)] flex gap-6">
        
        {/* LEWA KOLUMNA - FOLDERY */}
        <aside className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
            <button
                onClick={() => setIsComposeOpen(true)}
                className="w-full py-3 px-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Nowa wiadomość
            </button>

            <nav className="bg-[var(--color-bg-secondary)] rounded-2xl shadow-lg overflow-hidden p-2 flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-16rem)]">
                {isLoadingFolders ? (
                   <div className="p-4 text-center opacity-50 text-sm">Ładowanie folderów...</div> 
                ) : (
                    availableFolders.map((folderName) => (
                        <button
                            key={folderName}
                            onClick={() => setCurrentFolder(folderName)}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
                                currentFolder === folderName
                                    ? "bg-[var(--color-accent)] text-white shadow-md font-semibold"
                                    : "hover:bg-white/10 text-[var(--color-text-secondary)]"
                            }`}
                        >
                            <span>{getFolderIcon(folderName)}</span>
                            {getFolderLabel(folderName)}
                        </button>
                    ))
                )}
            </nav>
        </aside>

        {/* ŚRODKOWA KOLUMNA - LISTA MAILI */}
        <div className={`flex-1 flex flex-col bg-[var(--color-bg-secondary)] rounded-2xl shadow-lg overflow-hidden ${selectedEmail ? 'hidden md:flex md:w-1/3 md:flex-none' : 'w-full'}`}>
            <div className="p-4 border-b border-[var(--color-text-secondary)]/10 flex justify-between items-center bg-[var(--color-bg)]/5">
                <h2 className="text-xl font-bold">
                    {currentFolder ? getFolderLabel(currentFolder) : "Wiadomości"}
                </h2>
                <span className="text-sm opacity-60">{totalCount} wiadomości</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {isLoadingList ? (
                    <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent)]"></div>
                    </div>
                ) : emails.length === 0 ? (
                    <div className="text-center p-10 opacity-60">
                        {currentFolder ? "Brak wiadomości w tym folderze." : "Wybierz folder."}
                    </div>
                ) : (
                    emails.map((email, idx) => {
                        const uid = getEmailId(email) || String(idx);
                        const isRead = getIsRead(email);
                        const senderName = getSenderName(email);
                        const senderEmail = getSenderEmail(email);
                        const date = getSendDate(email);

                        return (
                          <div
                              key={uid}
                              onClick={() => openEmail(email)}
                              className={`p-4 rounded-xl cursor-pointer transition-all border border-transparent ${
                                  selectedEmail && getEmailId(selectedEmail) === uid
                                      ? "bg-[var(--color-bg)] border-[var(--color-accent)] shadow-md"
                                      : isRead
                                      ? "bg-[var(--color-bg)]/40 hover:bg-[var(--color-bg)]/60"
                                      : "bg-[var(--color-bg)] border-l-4 border-l-[var(--color-accent)] font-semibold shadow-sm"
                              }`}
                          >
                              <div className="flex justify-between items-start mb-1">
                                  <span className="text-sm font-bold truncate pr-2" title={senderEmail}>
                                      {senderName || senderEmail}
                                  </span>
                                  <span className="text-xs whitespace-nowrap opacity-70">
                                      {formatDate(date).split(',')[0]}
                                  </span>
                              </div>
                              <h3 className="text-md truncate mb-1 text-[var(--color-accent)]">{email.title}</h3>
                          </div>
                        )
                    })
                )}
            </div>

            <div className="p-3 border-t border-[var(--color-text-secondary)]/10 flex justify-between items-center text-sm bg-[var(--color-bg)]/5">
                <button 
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    className="px-3 py-1 rounded hover:bg-black/10 disabled:opacity-30 transition-colors"
                >
                    &larr; Nowsze
                </button>
                <span>{offset + 1}-{Math.min(offset + limit, totalCount)}</span>
                <button 
                    disabled={offset + limit >= totalCount}
                    onClick={() => setOffset(offset + limit)}
                    className="px-3 py-1 rounded hover:bg-black/10 disabled:opacity-30 transition-colors"
                >
                    Starsze &rarr;
                </button>
            </div>
        </div>

        {/* PRAWA KOLUMNA - TREŚĆ MAILA */}
        <div className={`flex-[1.5] bg-[var(--color-bg)] border border-[var(--color-bg-secondary)] rounded-2xl shadow-xl overflow-hidden flex flex-col ${!selectedEmail ? 'hidden md:flex justify-center items-center bg-opacity-50' : ''}`}>
            {selectedEmail ? (
                <>
                    <div className="p-6 border-b border-[var(--color-accent)]/20 bg-[var(--color-bg-secondary)]/10">
                        <div className="flex justify-between items-start mb-4">
                            <h1 className="text-2xl font-bold leading-tight">{selectedEmail.title}</h1>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => markAsUnread(getEmailId(selectedEmail))}
                                    className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-sm font-semibold"
                                    title="Oznacz jako nieprzeczytane"
                                >
                                    ✉️ Nieprzeczytane
                                </button>
                                <button 
                                    onClick={handleDelete}
                                    className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors" 
                                    title="Usuń do kosza"
                                >
                                    🗑️ Usuń
                                </button>
                                <button 
                                    onClick={() => setSelectedEmail(null)}
                                    className="md:hidden p-2 bg-gray-200 rounded-lg"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center font-bold text-lg">
                                {(getSenderName(selectedEmail) || getSenderEmail(selectedEmail) || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="font-semibold text-sm">
                                    {getSenderName(selectedEmail)} 
                                    <span className="font-normal opacity-70 ml-1">&lt;{getSenderEmail(selectedEmail)}&gt;</span>
                                </div>
                                <div className="text-xs opacity-60">
                                    {formatDate(getSendDate(selectedEmail))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 p-8 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {isLoadingDetails ? (
                            <div className="flex gap-2 items-center text-[var(--color-accent)]">
                                ⏳ Ładowanie treści...
                            </div>
                        ) : (
                            selectedEmail.content
                        )}
                    </div>
                </>
            ) : (
                <div className="text-center p-6 opacity-40">
                    <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2z"></path></svg>
                    <p className="text-lg">Wybierz wiadomość z listy, aby ją przeczytać.</p>
                </div>
            )}
        </div>

      </main>

      {/* --- MODAL NOWA WIADOMOŚĆ --- */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[var(--color-bg)] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                
                <div className="px-6 py-4 border-b border-[var(--color-accent)] flex justify-between items-center bg-[var(--color-accent)] text-white rounded-t-2xl">
                    <h3 className="font-bold text-lg">Nowa wiadomość</h3>
                    <button onClick={() => setIsComposeOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">✕</button>
                </div>

                <form onSubmit={handleSend} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1 opacity-70">Odbiorca:</label>
                        <EmailSuggestInput 
                            value={composeData.to}
                            onChange={(val) => setComposeData({...composeData, to: val})}
                            disabled={isSending}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1 opacity-70">Temat:</label>
                        <input 
                            type="text" 
                            required
                            value={composeData.subject}
                            onChange={(e) => setComposeData({...composeData, subject: e.target.value})}
                            className="w-full p-3 rounded-lg bg-[var(--color-bg-secondary)]/20 border border-[var(--color-text-secondary)]/20 focus:outline-none focus:border-[var(--color-accent)]"
                            placeholder="Wpisz temat..."
                        />
                    </div>

                    <div className="flex-1 min-h-[200px]">
                        <label className="block text-sm font-semibold mb-1 opacity-70">Treść:</label>
                        <textarea 
                            required
                            value={composeData.body}
                            onChange={(e) => setComposeData({...composeData, body: e.target.value})}
                            className="w-full h-full p-3 rounded-lg bg-[var(--color-bg-secondary)]/20 border border-[var(--color-text-secondary)]/20 focus:outline-none focus:border-[var(--color-accent)] resize-none"
                            placeholder="Napisz wiadomość..."
                        />
                    </div>
                    
                    <div className="flex justify-end pt-2">
                        <button 
                            type="button" 
                            onClick={() => setIsComposeOpen(false)}
                            className="mr-3 px-6 py-2 rounded-lg hover:bg-black/5 transition-colors"
                        >
                            Anuluj
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSending}
                            className="px-8 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold rounded-lg shadow transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSending ? (
                                <>
                                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                                  Wysyłanie...
                                </>
                            ) : "Wyślij"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}