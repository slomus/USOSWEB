"use client";

import { useEffect, useState } from "react";
import { FaFilter, FaSearch } from "react-icons/fa";

type Mark = {
  grade_id: number;
  album_nr: number;
  class_id: number;
  subject_id: number;
  value: string;
  weight: number;
  attempt: number;
  added_by_teaching_staff_id: number;
  comment: string | null;
  created_at: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

export default function AdminMarksManagementPage() {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/api/grades`, {
          credentials: "include",
        });
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(
            `Błąd pobierania ocen: ${res.status} ${res.statusText} ${msg}`
          );
        }
        const data = await res.json();
        setMarks(data.grades ?? []);
      } catch (err: any) {
        setError(
          typeof err === "string"
            ? err
            : err?.message ?? "Nieznany błąd pobierania ocen"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredMarks = marks.filter(
    (m) =>
      m.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.comment ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.grade_id.toString().includes(searchTerm)
  );

  const getGradeColor = (value: string) => {
    if (value === "ZAL") return "bg-green-500 text-white";
    if (value === "NZAL") return "bg-red-500 text-white";
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
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-300 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FaFilter /> Filtruj/wyszukaj oceny
            </h2>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
            >
              {showFilters ? "Ukryj" : "Pokaż"} filtr
            </button>
          </div>
          {showFilters && (
            <div className="max-w-xs">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Wartość, komentarz lub ID..."
                  className="w-full px-3 py-2 pl-10 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                />
                <FaSearch className="absolute left-3 top-3 text-[var(--color-text-secondary)]" />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              Wszystkie oceny
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">
              {marks.length}
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)] col-span-2 flex items-end">
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
              Ładowanie danych...
            </div>
          ) : filteredMarks.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <h3 className="text-xl font-semibold text-[var(--color-accent)] mb-2">
                Brak ocen
              </h3>
              <p className="text-[var(--color-text-secondary)]">
                Nie znaleziono żadnych ocen spełniających kryteria.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-[var(--color-accent)]/10">
                <tr>
                  <th className="text-left py-4 px-4 font-semibold">
                    ID oceny
                  </th>
                  <th className="text-center py-4 px-4 font-semibold">Album</th>
                  <th className="text-center py-4 px-4 font-semibold">Klasa</th>
                  <th className="text-center py-4 px-4 font-semibold">
                    Przedmiot
                  </th>
                  <th className="text-center py-4 px-4 font-semibold">Ocena</th>
                  <th className="text-center py-4 px-4 font-semibold">Waga</th>
                  <th className="text-center py-4 px-4 font-semibold">
                    Podejście
                  </th>
                  <th className="text-center py-4 px-4 font-semibold">
                    ID nauczyciela
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
                    key={mark.grade_id}
                    className="hover:bg-[var(--color-bg)] transition-colors"
                  >
                    <td className="py-4 px-4">{mark.grade_id}</td>
                    <td className="py-4 px-4 text-center">{mark.album_nr}</td>
                    <td className="py-4 px-4 text-center">{mark.class_id}</td>
                    <td className="py-4 px-4 text-center">{mark.subject_id}</td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full font-bold ${getGradeColor(
                          mark.value
                        )}`}
                      >
                        {mark.value}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">{mark.weight}</td>
                    <td className="py-4 px-4 text-center">{mark.attempt}</td>
                    <td className="py-4 px-4 text-center">
                      {mark.added_by_teaching_staff_id}
                    </td>
                    <td className="py-4 px-4">{mark.comment ?? "-"}</td>
                    <td className="py-4 px-4 text-center text-sm text-[var(--color-text-secondary)]">
                      {mark.created_at
                        ? new Date(mark.created_at).toLocaleString("pl-PL")
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
