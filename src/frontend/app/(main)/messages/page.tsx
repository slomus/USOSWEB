"use client";
import { useState, useEffect, useRef } from "react";

// Konfiguracja API
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

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

// Debounce hook
function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

// Pole wejściowe z sugestiami e-mail
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
      { method: "GET", credentials: "include" }
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
            <li className="px-3 py-2 italic text-[var(--color-text-secondary)]">
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
            <li className="px-3 py-2 italic text-[var(--color-text-secondary)]">
              Brak sugestii
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

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
  const [composing, setComposing] = useState(false);

  const [formData, setFormData] = useState({
    to: "",
    subject: "",
    body: "",
  });

  // Pobierz listę emaili
  const fetchEmails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/messaging/get_all_emails`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit, offset }),
      });

      const data = await response.json();

      if (data.success && Array.isArray(data.emails)) {
        // Mapa konwertująca klucze camelCase → snake_case
        const mappedEmails = data.emails.map((e: any) => ({
          email_uid: e.emailUid,
          sender_email: e.sender_email,
          sender_name: e.sender_name,
          title: e.title,
          send_date: e.send_date,
          is_read: e.is_read,
        }));

        setEmails(mappedEmails);
        setTotalCount(data.total_count || 0);
      } else {
        alert("Nie udało się pobrać wiadomości");
        console.error("Niepoprawna struktura odpowiedzi API:", data);
      }
    } catch (err) {
      console.error("Błąd podczas pobierania maili:", err);
      alert("Błąd połączenia z serwerem");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [offset]);

  // Pobranie szczegółów wiadomości
  const fetchEmailDetails = async (email_uid: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/messaging/get_email`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_uid: email_uid }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedEmail({
          email_uid: data.email_uid,
          sender_email: data.sender_email,
          sender_name: data.sender_name,
          title: data.title,
          content: data.content,
          send_date: data.send_date,
          is_read: data.is_read,
        });

        if (!data.is_read) markAsRead(email_uid);
      }
    } catch (e) {
      console.error("Błąd pobierania szczegółów emaila", e);
    }
  };

  const markAsRead = async (email_uid: string) => {
    try {
      await fetch(`${API_BASE}/api/messaging/set_email_read`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_uid }),
      });
      setEmails((prev) =>
        prev.map((e) =>
          e.email_uid === email_uid ? { ...e, is_read: true } : e
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  const filteredEmails = emails.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.sender_email.toLowerCase().includes(search.toLowerCase())
  );

  const startReply = () => {
    if (!selectedEmail) return;
    setFormData({
      to: selectedEmail.sender_email,
      subject: "Re: " + selectedEmail.title,
      body: `\n\n--- Oryginalna wiadomość ---\nOd: ${
        selectedEmail.sender_name
      } (${selectedEmail.sender_email})\n${new Date(
        selectedEmail.send_date
      ).toLocaleString("pl-PL")}\n\n${selectedEmail.content || ""}`,
    });
    setComposing(true);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-60 p-4 bg-[var(--color-bg-secondary)] border-r">
        <button
          onClick={() => {
            setComposing(true);
            setSelectedEmail(null);
          }}
          className="w-full bg-[var(--color-accent)] text-white rounded p-2 mb-4"
        >
          Nowa wiadomość
        </button>
        {["inbox", "sent", "draft", "trash"].map((f) => (
          <button
            key={f}
            onClick={() => setCurrentFolder(f as Folder)}
            className={`block w-full text-left px-3 py-2 rounded mb-1 ${
              currentFolder === f
                ? "bg-[var(--color-accent)] text-white"
                : "hover:bg-[var(--color-accent-hover)]"
            }`}
          >
            {f === "inbox" && "Odebrane"}
            {f === "sent" && "Wysłane"}
            {f === "draft" && "Robocze"}
            {f === "trash" && "Kosz"}
          </button>
        ))}
      </aside>

      {/* Lista wiadomości */}
      <main className="flex-1 flex">
        <div className="w-2/3 p-4 overflow-y-auto border-r">
          {loading ? (
            <p>Ładowanie...</p>
          ) : (
            filteredEmails.map((email) => (
              <div
                key={email.email_uid}
                onClick={() => fetchEmailDetails(email.email_uid)}
                className={`p-4 mb-3 rounded cursor-pointer ${
                  email.is_read
                    ? "bg-[var(--color-accent)]"
                    : "bg-[var(--color-bg-secondary)] text-white"
                } ${
                  selectedEmail?.email_uid === email.email_uid
                    ? "border border-[var(--color-accent-hover)]"
                    : ""
                }`}
              >
                <strong>{email.title}</strong>
                <p className="text-sm">
                  Od: {email.sender_name} ({email.sender_email})
                </p>
                <p className="text-xs">
                  {new Date(email.send_date).toLocaleString("pl-PL")}
                </p>
              </div>
            ))
          )}
          <div className="flex justify-between mt-3">
            <button
              disabled={offset === 0}
              onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
              className="px-3 py-1 bg-[var(--color-accent)] text-white rounded disabled:opacity-50"
            >
              ← Poprzednia
            </button>
            <span>
              {offset + 1} - {Math.min(offset + limit, totalCount)} z{" "}
              {totalCount}
            </span>
            <button
              disabled={offset + limit >= totalCount}
              onClick={() => setOffset((prev) => prev + limit)}
              className="px-3 py-1 bg-[var(--color-accent)] text-white rounded disabled:opacity-50"
            >
              Następna →
            </button>
          </div>
        </div>

        {/* Podgląd i odpowiedź */}
        <div className="w-1/3 p-4 overflow-y-auto">
          {composing ? (
            <div>
              <h3 className="text-lg font-semibold mb-3">Nowa wiadomość</h3>
              <EmailSuggestInput
                value={formData.to}
                onChange={(val) => setFormData({ ...formData, to: val })}
                onSelect={(val) => setFormData({ ...formData, to: val })}
              />
              <input
                type="text"
                placeholder="Temat"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                className="w-full p-2 border rounded mt-2"
              />
              <textarea
                placeholder="Treść"
                value={formData.body}
                onChange={(e) =>
                  setFormData({ ...formData, body: e.target.value })
                }
                className="w-full h-40 border rounded p-2 mt-2"
              />
            </div>
          ) : selectedEmail ? (
            <div>
              <h2 className="text-xl font-bold">{selectedEmail.title}</h2>
              <p className="text-sm">
                Od: {selectedEmail.sender_name} ({selectedEmail.sender_email})
              </p>
              <p className="text-xs mb-3">
                {new Date(selectedEmail.send_date).toLocaleString("pl-PL")}
              </p>
              <div className="whitespace-pre-wrap mb-3">
                {selectedEmail.content || "Brak treści"}
              </div>
              <button
                onClick={startReply}
                className="mt-2 px-4 py-2 bg-[var(--color-accent)] text-white rounded"
              >
                Odpowiedz
              </button>
            </div>
          ) : (
            <p className="text-[var(--color-text-secondary)] mt-4">
              Wybierz wiadomość, aby ją wyświetlić
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
