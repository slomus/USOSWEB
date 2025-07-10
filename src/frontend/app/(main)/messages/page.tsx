"use client";

import { useState, useEffect } from "react";

type Message = {
  id: number;
  from: string;
  to: string;
  subject: string;
  body: string;
  folder: string;
  read: boolean;
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [formData, setFormData] = useState({ to: "", subject: "", body: "" });
  const [currentFolder, setCurrentFolder] = useState("Odebrane");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);

  const folders = ["Odebrane", "Wysłane", "Wersje robocze", "Kosz", "Spam"];

  const filteredMessages = messages
    .filter((msg) => msg.folder === currentFolder)
    .filter(
      (msg) =>
        msg.subject.toLowerCase().includes(search.toLowerCase()) ||
        msg.body.toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, visibleCount);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom =
      e.currentTarget.scrollHeight - e.currentTarget.scrollTop ===
      e.currentTarget.clientHeight;
    if (bottom) setVisibleCount((prev) => prev + 10);
  };

  const handleSend = () => {
    const newMessage: Message = {
      id: Date.now(),
      from: "ja@uczelnia.pl",
      to: formData.to,
      subject: formData.subject,
      body: formData.body,
      folder: "Wysłane",
      read: true,
    };
    setMessages((prev) => [newMessage, ...prev]);
    setFormData({ to: "", subject: "", body: "" });
    setSelectedMessage(null);
  };

  const toggleRead = (ids: number[]) => {
    setMessages((prev) =>
      prev.map((msg) =>
        ids.includes(msg.id) ? { ...msg, read: !msg.read } : msg
      )
    );
  };

  const deleteSelected = () => {
    setMessages((prev) => prev.filter((msg) => !selectedIds.includes(msg.id)));
    setSelectedIds([]);
  };

  useEffect(() => {
    setCurrentFolder("Odebrane");
  }, []);

  return (
    <div className="flex h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Sidebar left with folders */}
      <aside className="w-60 bg-[var(--color-bg-secondary)] p-4 space-y-4 border-r border-[var(--color-accent)]">
        <button
          onClick={() =>
            setSelectedMessage({
              id: -1,
              from: "ja@uczelnia.pl",
              to: "",
              subject: "",
              body: "",
              folder: "Nowa",
              read: true,
            })
          }
          className="w-full px-4 py-3 text-lg font-semibold bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)]"
        >
          Utwórz wiadomość
        </button>
        {folders.map((folder) => (
          <button
            key={folder}
            onClick={() => {
              setCurrentFolder(folder);
              setSelectedMessage(null);
              setSelectedIds([]);
            }}
            className={`block w-full text-left px-3 py-2 rounded text-sm ${
              currentFolder === folder
                ? "bg-[var(--color-accent)] text-white"
                : "hover:bg-[var(--color-accent-hover)]"
            }`}
          >
            {folder}
          </button>
        ))}
      </aside>

      {/* Right area */}
      <main className="flex-1 flex flex-col" onScroll={handleScroll}>
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
              onClick={() => {
                const sorted = [...messages].sort((a, b) =>
                  a.subject.localeCompare(b.subject)
                );
                setMessages(sorted);
              }}
              className="px-3 py-1 text-sm rounded bg-[var(--color-bg-secondary)] hover:bg-[var(--color-accent-hover)]"
            >
              Sortuj A/Z
            </button>
            <button
              onClick={() => setMessages([...messages])}
              className="px-3 py-1 text-sm rounded bg-[var(--color-bg-secondary)] hover:bg-[var(--color-accent-hover)]"
            >
              Odśwież
            </button>
            <button
              onClick={() => toggleRead(selectedIds)}
              className="px-3 py-1 text-sm rounded bg-[var(--color-accent)] text-white"
            >
              Oznacz jako przeczytane / nieprzeczytane
            </button>
            <button
              onClick={deleteSelected}
              className="px-3 py-1 text-sm rounded bg-[var(--color-accent2)] text-white"
            >
              Usuń zaznaczone
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Message list */}
          <div className="w-2/3 p-4 overflow-y-auto">
            {filteredMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-4 mb-3 rounded border cursor-pointer ${
                  msg.read ? "bg-[var(--color-bg-secondary)]" : "bg-yellow-100"
                }`}
                onClick={() => {
                  setSelectedMessage(msg);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === msg.id ? { ...m, read: true } : m
                    )
                  );
                }}
              >
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(msg.id)}
                    onChange={(e) =>
                      e.target.checked
                        ? setSelectedIds((prev) => [...prev, msg.id])
                        : setSelectedIds((prev) =>
                            prev.filter((id) => id !== msg.id)
                          )
                    }
                  />
                  <strong>{msg.subject}</strong>
                </label>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  od: {msg.from} | do: {msg.to}
                </p>
                <p className="truncate">{msg.body}</p>
              </div>
            ))}
          </div>

          {/* Composer / Reader */}
          <div className="w-1/3 p-4 border-l border-[var(--color-accent)] overflow-y-auto">
            {selectedMessage ? (
              selectedMessage.id === -1 ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Do:"
                    value={formData.to}
                    onChange={(e) =>
                      setFormData({ ...formData, to: e.target.value })
                    }
                    className="w-full p-2 rounded border bg-[var(--color-bg-secondary)]"
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
                      className="px-4 py-2 bg-[var(--color-accent)] text-white rounded"
                    >
                      Wyślij
                    </button>
                    <button
                      onClick={() => {
                        setMessages((prev) => [
                          {
                            id: Date.now(),
                            from: "ja@uczelnia.pl",
                            to: formData.to,
                            subject: formData.subject,
                            body: formData.body,
                            folder: "Wersje robocze",
                            read: false,
                          },
                          ...prev,
                        ]);
                        setFormData({ to: "", subject: "", body: "" });
                        setSelectedMessage(null);
                      }}
                      className="px-4 py-2 bg-yellow-600 text-white rounded"
                    >
                      Zapisz jako roboczą
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-bold">{selectedMessage.subject}</h2>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    od: {selectedMessage.from} | do: {selectedMessage.to}
                  </p>
                  <p className="mt-4 whitespace-pre-wrap">{selectedMessage.body}</p>
                </div>
              )
            ) : (
              <p className="text-[var(--color-text-secondary)]">
                Brak wybranej wiadomości
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
