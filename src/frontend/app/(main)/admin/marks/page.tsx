"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { FaFilter, FaSearch, FaRedo } from "react-icons/fa";

// Zaktualizowany typ Mark
type Mark = {
  gradeld: number;
  albumNr: number;
  classId: number;
  subjectId: number;
  value: string;
  weight: number;
  attempt: number;
  addedByTeachingStaffId: number;
  comment: string | null;
  createdAt: string;
  subjectName: string;
  addedByName: string;
};

type GradesResponse = {
  grades: Mark[];
  message: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

// Funkcja pobierająca WSZYSTKIE dane
async function fetchAllMarks(): Promise<Mark[]> {
  // ⚠️ KLUCZOWA ZMIANA: Używamy parametru WSPOMNIANEGO W BŁĘDZIE,
  // aby API zrozumiało, że Admin żąda wszystkich danych.
  const url = `${API_BASE}/api/grades?all_students=true`;

  const res = await fetch(url, {
    credentials: "include",
  });

  if (!res.ok) {
    let msg = `Błąd pobierania ocen: ${res.status} ${res.statusText}`;
    try {
      const errorData = await res.json();
      // Jeśli API zwraca błąd 403 (Brak uprawnień) lub 400 (nadal), to jest to problem z konfiguracją serwera.
      msg += ` - ${
        errorData.message || "Brak uprawnień do pobrania wszystkich ocen."
      }`;
    } catch {}
    throw new Error(msg);
  }

  const data: GradesResponse = await res.json();
  return data.grades || [];
}

export default function AdminMarksManagementPage() {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(true);

  const loadAllMarks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchAllMarks();
      setMarks(data);
      if (data.length === 0) {
        setError("Pobrano 0 ocen. Sprawdź, czy dane są w bazie.");
      }
    } catch (err: any) {
      // Jeśli błąd nadal występuje, oznacza to, że Admin nie ma uprawnień lub API jest źle skonfigurowane.
      setError(err.message ?? "Nieznany błąd pobierania ocen");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllMarks();
  }, [loadAllMarks]);

  const filteredMarks = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();

    return marks.filter(
      (m) =>
        m.value.toLowerCase().includes(lowerSearch) ||
        m.subjectName.toLowerCase().includes(lowerSearch) ||
        m.addedByName.toLowerCase().includes(lowerSearch) ||
        (m.comment ?? "").toLowerCase().includes(lowerSearch) ||
        m.gradeld.toString().includes(searchTerm) ||
        m.albumNr.toString().includes(searchTerm)
    );
  }, [marks, searchTerm]);

  const getGradeColor = (value: string) => {
    if (value.toUpperCase() === "ZAL") return "bg-green-500 text-white";
    if (value.toUpperCase() === "NZAL") return "bg-red-500 text-white";
    const numValue = parseFloat(value.replace(",", "."));
    if (isNaN(numValue)) return "bg-gray-500 text-white";
    if (numValue >= 4.5) return "bg-green-500 text-white";
    if (numValue >= 3.0) return "bg-yellow-500 text-white";
    return "bg-red-500 text-white";
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Header */}
      <div className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-accent)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-accent)] mb-2">
              Zarządzanie Ocenami
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Panel administratora – wszystkie oceny z bazy danych
            </p>
          </div>
          {/* Przycisk odświeżania */}
          <button
            onClick={loadAllMarks}
            disabled={loading}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${
              loading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
            }`}
          >
            <FaRedo className={loading ? "animate-spin" : ""} />
            {loading ? "Ładowanie..." : "Odśwież Listę"}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900 border border-red-300 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FaFilter /> Filtruj/wyszukaj oceny (Lokalnie)
            </h2>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
            >
              {showFilters ? "Ukryj" : "Pokaż"} filtr
            </button>
          </div>
          {showFilters && (
            <div className="max-w-sm">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ID oceny, Album, Przedmiot, Wartość, Komentarz..."
                  className="w-full px-3 py-2 pl-10 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
                />
                <FaSearch className="absolute left-3 top-3 text-[var(--color-text-secondary)]" />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              Wszystkie oceny (załadowane)
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">
              {marks.length}
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              Pasujące do filtra
            </h3>
            <p className="text-3xl font-bold text-green-500">
              {filteredMarks.length}
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)] col-span-1 flex items-end">
            <span className="text-[var(--color-text-secondary)]">
              Ostatnia aktualizacja: {new Date().toLocaleString("pl-PL")}
            </span>
          </div>
        </div>

        {/* Tabela ocen */}
        <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-lg overflow-x-auto">
          <div className="bg-[var(--color-accent)] text-white px-6 py-4">
            <h2 className="text-xl font-semibold">Lista wszystkich ocen</h2>
          </div>
          {loading ? (
            <div className="px-6 py-12 text-center text-[var(--color-accent)]">
              Ładowanie wszystkich danych...
            </div>
          ) : filteredMarks.length === 0 && marks.length > 0 ? (
            <div className="px-6 py-12 text-center">
              <h3 className="text-xl font-semibold text-[var(--color-accent)] mb-2">
                Brak wyników
              </h3>
              <p className="text-[var(--color-text-secondary)]">
                Brak ocen pasujących do lokalnego filtra: **{searchTerm}**.
              </p>
            </div>
          ) : filteredMarks.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <h3 className="text-xl font-semibold text-[var(--color-accent)] mb-2">
                Brak ocen w bazie
              </h3>
              <p className="text-[var(--color-text-secondary)]">
                Jeśli jesteś administratorem, a ten błąd nadal występuje,
                oznacza to, że konfiguracja API uniemożliwia pobranie wszystkich
                danych na raz.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-accent)]/10 border-b border-[var(--color-accent)]/20">
                <tr>
                  <th className="text-left py-4 px-4 font-semibold whitespace-nowrap">
                    ID oceny
                  </th>
                  <th className="text-center py-4 px-4 font-semibold">Album</th>
                  <th className="text-left py-4 px-4 font-semibold">
                    Przedmiot (ID)
                  </th>
                  <th className="text-center py-4 px-4 font-semibold">Ocena</th>
                  <th className="text-center py-4 px-4 font-semibold">Waga</th>
                  <th className="text-center py-4 px-4 font-semibold">
                    Podejście
                  </th>
                  <th className="text-left py-4 px-4 font-semibold whitespace-nowrap">
                    Dodał (ID)
                  </th>
                  <th className="text-left py-4 px-4 font-semibold">
                    Komentarz
                  </th>
                  <th className="text-center py-4 px-4 font-semibold">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-accent)]/20">
                {filteredMarks.map((mark) => (
                  <tr
                    key={mark.gradeld}
                    className="hover:bg-[var(--color-bg)] transition-colors"
                  >
                    <td className="py-4 px-4 font-mono">{mark.gradeld}</td>
                    <td className="py-4 px-4 text-center font-bold text-[var(--color-accent)]">
                      {mark.albumNr}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {mark.subjectName}
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {" "}
                        (ID: {mark.subjectId})
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold shadow ${getGradeColor(
                          mark.value
                        )}`}
                      >
                        {mark.value}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">{mark.weight}</td>
                    <td className="py-4 px-4 text-center">{mark.attempt}</td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {mark.addedByName}
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {" "}
                        (ID: {mark.addedByTeachingStaffId})
                      </span>
                    </td>
                    <td className="py-4 px-4 italic text-[var(--color-text-secondary)] max-w-xs truncate">
                      {mark.comment ?? "-"}
                    </td>
                    <td className="py-4 px-4 text-center text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
                      {mark.createdAt
                        ? new Date(mark.createdAt).toLocaleString("pl-PL")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
