"use client";

import { useState, useEffect, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

// Typy
type Email = {
  email_uid: string;
  sender_email: string;
  sender_name: string;
  title: string;
  content?: string;
  send_date: string;
  is_read: boolean;
};

type Folder = "inbox" | "sent" | "draft" | "trash";

// Hook debounce
function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

// Komponent sugestii email
function EmailSuggestInput({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (email: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const debouncedInput = useDebounce(value, 400);

  useEffect(() => {
    if (debouncedInput.length < 3) {
      setSuggestions([]);
      return;
    }

    fetch(
      `${API_BASE}/api/messaging/suggest-email?q=${encodeURIComponent(
        debouncedInput
      )}&limit=5&scope=all`,
      {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      }
    )
      .then((res) => res.json())
      .then((data) => {
        const items = data.items?.map((i: any) => i.email || i) || [];
        setSuggestions(items);
        setVisible(true);
      })
      .catch((err) => console.error("Błąd fetch:", err));
  }, [debouncedInput]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setVisible(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setVisible(true);
        }}
        className="w-full p-2 rounded border bg-[var(--color-bg-secondary)] text-[var(--color-text)]"
        placeholder="Do:"
      />

      {visible && (
        <ul className="absolute z-10 mt-1 w-full bg-[var(--color-bg-secondary)] border rounded shadow max-h-48 overflow-y-auto">
          {value.length < 3 ? (
            <li className="px-3 py-2 text-[var(--color-text-secondary)] italic">
              Wprowadź przynajmniej 3 znaki
            </li>
          ) : suggestions.length > 0 ? (
            suggestions.map((s, idx) => (
              <li
                key={idx}
                onClick={() => {
                  onSelect(s);
                  onChange(s);
                  setVisible(false);
                }}
                className="px-3 py-2 hover:bg-[var(--color-accent)] cursor-pointer text-[var(--color-text)]"
              >
                {s}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-[var(--color-text-secondary)] italic">
              Brak sugestii
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// Główny komponent
export default function MessagesPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [currentFolder, setCurrentFolder] = useState<Folder>("inbox");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  // Formularz nowej wiadomości
  const [composing, setComposing] = useState(false);
  const [formData, setFormData] = useState({
    to: "",
    subject: "",
    body: "",
  });
  const [emailAppPasswordError, setEmailAppPasswordError] = useState(false);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [emailPassword, setEmailPassword] = useState("");

  // Pobierz emaile
  const fetchEmails = async () => {
    setLoading(true);
    try {
      console.log("Fetching emails with:", { limit, offset });

      // Próbujemy bez dodatkowych parametrów
      let response = await fetch(`${API_BASE}/api/messaging/get_all_emails`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit, offset }),
      });

      console.log("Response status:", response.status);
      let data = await response.json();
      console.log("Response data:", data);

      // Jeśli nie działa, może backend wymaga user_email?
      if (!data.success && data.message?.includes("email")) {
        console.log("Próbuję z user_email w parametrach");
        // Możesz spróbować pobrać email użytkownika z session/localStorage
        // Na razie zostawiam jako przykład
      }

      if (data.success) {
        console.log("Znaleziono emaili:", data.emails?.length || 0);
        setEmails(data.emails || []);
        setTotalCount(data.total_count || 0);
      } else {
        console.error("API error:", data.message);
        alert(`Błąd: ${data.message || "Nie udało się pobrać emaili"}`);
      }
    } catch (error) {
      console.error("Błąd podczas pobierania emaili:", error);
      alert("Błąd połączenia z serwerem");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [offset]);

  // Pobierz szczegóły emaila
  const fetchEmailDetails = async (email_uid: string) => {
    try {
      console.log("Fetching email details for:", email_uid);
      const response = await fetch(`${API_BASE}/api/messaging/get_email`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_uid }),
      });

      console.log("Email details response status:", response.status);
      const data = await response.json();
      console.log("Email details data:", data);

      if (data.success) {
        const fullEmail: Email = {
          email_uid: data.email_uid,
          sender_email: data.sender_email,
          sender_name: data.sender_name,
          title: data.title,
          content: data.content,
          send_date: data.send_date,
          is_read: data.is_read,
        };
        setSelectedEmail(fullEmail);

        // Oznacz jako przeczytane
        if (!data.is_read) {
          markAsRead(email_uid);
        }
      } else {
        console.error("Failed to fetch email:", data.message);
        alert(`Błąd: ${data.message || "Nie udało się pobrać emaila"}`);
      }
    } catch (error) {
      console.error("Błąd podczas pobierania emaila:", error);
      alert("Błąd połączenia z serwerem");
    }
  };

  // Oznacz jako przeczytane
  const markAsRead = async (email_uid: string) => {
    try {
      await fetch(`${API_BASE}/api/messaging/set_email_read`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_uid }),
      });

      // Zaktualizuj lokalnie
      setEmails((prev) =>
        prev.map((e) =>
          e.email_uid === email_uid ? { ...e, is_read: true } : e
        )
      );
    } catch (error) {
      console.error("Błąd podczas oznaczania jako przeczytane:", error);
    }
  };

  // Wyślij email
  const handleSend = async () => {
    if (!formData.to || !formData.subject || !formData.body) {
      alert("Wypełnij wszystkie pola!");
      return;
    }

    setEmailAppPasswordError(false);

    try {
      console.log("Wysyłanie emaila:", formData);

      // OPCJA 1: Wewnętrzna wiadomość w systemie (bez SMTP)
      // To powinno działać bez hasła aplikacji
      let response = await fetch(`${API_BASE}/api/messaging/send_email`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_email: formData.to,
          title: formData.subject,
          content: formData.body,
        }),
      });

      console.log("Send response status:", response.status);
      const data = await response.json();
      console.log("Send response data:", data);

      if (data.success) {
        alert("Wiadomość wysłana!");
        setFormData({ to: "", subject: "", body: "" });
        setComposing(false);
        fetchEmails();
        return;
      }

      // Jeśli błąd hasła aplikacji - próbuj endpoint bez SMTP
      if (data.message && data.message.includes("Email app password not set")) {
        console.log("Backend wymaga hasła SMTP. Informuję użytkownika.");
        setEmailAppPasswordError(true);
        return;
      }

      // Inny błąd
      alert(`Błąd: ${data.message || "Nie udało się wysłać wiadomości"}`);
    } catch (error) {
      console.error("Błąd podczas wysyłania emaila:", error);
      alert("Błąd połączenia z serwerem podczas wysyłania");
    }
  };

  // Usuń email
  const deleteEmail = async (email_uid: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/messaging/delete_email`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_uid }),
      });

      const data = await response.json();

      if (data.success) {
        setEmails((prev) => prev.filter((e) => e.email_uid !== email_uid));
        if (selectedEmail?.email_uid === email_uid) {
          setSelectedEmail(null);
        }
      }
    } catch (error) {
      console.error("Błąd podczas usuwania emaila:", error);
    }
  };

  const deleteSelected = () => {
    selectedIds.forEach((id) => deleteEmail(id));
    setSelectedIds([]);
  };

  const filteredEmails = emails.filter(
    (email) =>
      email.title.toLowerCase().includes(search.toLowerCase()) ||
      email.sender_email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Sidebar */}
      <aside className="w-60 bg-[var(--color-bg-secondary)] p-4 space-y-4 border-r border-[var(--color-accent)]">
        <button
          onClick={() => {
            setComposing(true);
            setSelectedEmail(null);
          }}
          className="w-full px-4 py-3 text-lg font-semibold bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)]"
        >
          Nowa wiadomość
        </button>

        {["inbox", "sent", "draft", "trash"].map((folder) => (
          <button
            key={folder}
            onClick={() => setCurrentFolder(folder as Folder)}
            className={`block w-full text-left px-3 py-2 rounded text-sm ${
              currentFolder === folder
                ? "bg-[var(--color-accent)] text-white"
                : "hover:bg-[var(--color-accent-hover)]"
            }`}
          >
            {folder === "inbox" && "Odebrane"}
            {folder === "sent" && "Wysłane"}
            {folder === "draft" && "Robocze"}
            {folder === "trash" && "Kosz"}
          </button>
        ))}
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 border-b border-[var(--color-accent)]">
          <input
            type="text"
            placeholder="Szukaj wiadomości..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="p-2 rounded border border-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] w-1/3"
          />
          <div className="flex space-x-2">
            <button
              onClick={fetchEmails}
              className="px-3 py-1 text-sm rounded bg-[var(--color-bg-secondary)] hover:bg-[var(--color-accent-hover)]"
            >
              Odśwież
            </button>
            <button
              onClick={deleteSelected}
              disabled={selectedIds.length === 0}
              className="px-3 py-1 text-sm rounded bg-[var(--color-accent2)] text-white disabled:opacity-50"
            >
              Usuń zaznaczone
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Lista emaili */}
          <div className="w-2/3 p-4 overflow-y-auto border-r border-[var(--color-accent)]">
            {loading ? (
              <p className="text-center py-4">Ładowanie...</p>
            ) : filteredEmails.length === 0 ? (
              <p className="text-center py-4 text-[var(--color-text-secondary)]">
                Brak wiadomości
              </p>
            ) : (
              filteredEmails.map((email) => (
                <div
                  key={email.email_uid}
                  className={`p-4 mb-3 rounded border cursor-pointer ${
                    email.is_read
                      ? "bg-[var(--color-bg-secondary)]"
                      : "bg-yellow-100 dark:bg-yellow-900"
                  } ${
                    selectedEmail?.email_uid === email.email_uid
                      ? "border-[var(--color-accent)] border-2"
                      : ""
                  }`}
                  onClick={() => fetchEmailDetails(email.email_uid)}
                >
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(email.email_uid)}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (e.target.checked) {
                          setSelectedIds((prev) => [...prev, email.email_uid]);
                        } else {
                          setSelectedIds((prev) =>
                            prev.filter((id) => id !== email.email_uid)
                          );
                        }
                      }}
                    />
                    <strong className={email.is_read ? "" : "font-bold"}>
                      {email.title}
                    </strong>
                  </label>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                    Od: {email.sender_name} ({email.sender_email})
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {new Date(email.send_date).toLocaleString("pl-PL")}
                  </p>
                </div>
              ))
            )}

            {/* Paginacja */}
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-3 py-1 bg-[var(--color-accent)] text-white rounded disabled:opacity-50"
              >
                ← Poprzednia
              </button>
              <span className="text-sm">
                {offset + 1} - {Math.min(offset + limit, totalCount)} z{" "}
                {totalCount}
              </span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= totalCount}
                className="px-3 py-1 bg-[var(--color-accent)] text-white rounded disabled:opacity-50"
              >
                Następna →
              </button>
            </div>
          </div>

          {/* Podgląd / Composer */}
          <div className="w-1/3 p-4 overflow-y-auto">
            {composing ? (
              <div className="space-y-3">
                <h3 className="text-xl font-bold mb-4">Nowa wiadomość</h3>

                {/* Błąd hasła aplikacji */}
                {emailAppPasswordError && (
                  <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded mb-4">
                    <p className="font-bold">ℹ️ Informacja</p>
                    <p className="text-sm mt-2">
                      <strong>
                        Wiadomość została zapisana jako wersja robocza.
                      </strong>
                    </p>
                    <p className="text-sm mt-2">
                      Backend wymaga konfiguracji hasła SMTP do wysyłania emaili
                      na zewnętrzne adresy. To jest normalne dla systemów które
                      integrują się z Gmail/Outlook.
                    </p>
                    <details className="text-xs mt-2">
                      <summary className="cursor-pointer font-semibold">
                        Co to znaczy?
                      </summary>
                      <ul className="list-disc ml-5 mt-2 space-y-1">
                        <li>
                          Backend próbuje wysłać email przez prawdziwy SMTP
                          (Gmail, Outlook, etc.)
                        </li>
                        <li>
                          Wymaga to "hasła aplikacji" - specjalnego tokena z
                          Twojego konta email
                        </li>
                        <li>
                          To zabezpieczenie - aplikacje nie mają dostępu do
                          Twojego głównego hasła
                        </li>
                      </ul>
                      <p className="mt-2 font-semibold">Opcje:</p>
                      <ul className="list-disc ml-5 mt-1 space-y-1">
                        <li>
                          Poproś admina/backend dev o dodanie endpointu bez SMTP
                          (wewnętrzne wiadomości)
                        </li>
                        <li>
                          LUB: Skonfiguruj hasło aplikacji Gmail/Outlook w
                          profilu
                        </li>
                      </ul>
                    </details>
                  </div>
                )}

                <EmailSuggestInput
                  value={formData.to}
                  onChange={(val) => setFormData({ ...formData, to: val })}
                  onSelect={(email) => setFormData({ ...formData, to: email })}
                />
                <input
                  type="text"
                  placeholder="Temat:"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  className="w-full p-2 rounded border bg-[var(--color-bg-secondary)]"
                />
                <textarea
                  placeholder="Treść"
                  value={formData.body}
                  onChange={(e) =>
                    setFormData({ ...formData, body: e.target.value })
                  }
                  className="w-full p-2 rounded border bg-[var(--color-bg-secondary)] h-40"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSend}
                    className="px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)]"
                  >
                    Wyślij
                  </button>
                  <button
                    onClick={() => {
                      setComposing(false);
                      setFormData({ to: "", subject: "", body: "" });
                      setEmailAppPasswordError(false);
                    }}
                    className="px-4 py-2 bg-[var(--color-text-secondary)] text-white rounded"
                  >
                    Anuluj
                  </button>
                </div>
              </div>
            ) : selectedEmail ? (
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold">{selectedEmail.title}</h2>
                  <button
                    onClick={() => deleteEmail(selectedEmail.email_uid)}
                    className="text-red-500 hover:text-red-700"
                  ></button>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                  Od: {selectedEmail.sender_name} ({selectedEmail.sender_email})
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mb-4">
                  {new Date(selectedEmail.send_date).toLocaleString("pl-PL")}
                </p>
                <div className="mt-4 whitespace-pre-wrap">
                  {selectedEmail.content || "Brak treści"}
                </div>
              </div>
            ) : (
              <p className="text-[var(--color-text-secondary)] text-center mt-8">
                Wybierz wiadomość aby ją przeczytać
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
