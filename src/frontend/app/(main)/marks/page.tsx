"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/app/wrappers/fetchWithAuth";

type Mark = {
  gradeId: number;
  albumNr: number;
  subjectId: number;
  classId: number;
  subjectName: string;
  classType: string;
  value: string;
  weight: number;
  attempt: number;
  addedBy: string;
  comment: string;
  createdAt: string;
};

export default function MarksPage() {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMarks = async () => {
      try {
        const res = await fetchWithAuth("http://localhost:8083/api/marks");
        if (!res.ok) {
          throw new Error(`Błąd: ${res.status}`);
        }

        const data = await res.json();
        setMarks(data.marks || []);
      } catch (err: any) {
        setError(err.message || "Nie udało się pobrać ocen");
      } finally {
        setLoading(false);
      }
    };

    fetchMarks();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center text-lg text-[var(--color-text-secondary)]">
        Ładowanie ocen...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">Wystąpił błąd: {error}</div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="p-4 border-b border-[var(--color-accent)] bg-[var(--color-bg-secondary)]">
        <h1 className="text-2xl font-bold">Moje oceny</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Lista ocen pobranych z systemu USOS
        </p>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {marks.length === 0 ? (
          <p className="text-center text-[var(--color-text-secondary)]">
            Brak ocen do wyświetlenia.
          </p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[var(--color-accent)] text-white">
                <th className="px-4 py-2 text-left">Przedmiot</th>
                <th className="px-4 py-2 text-left">Rodzaj zajęć</th>
                <th className="px-4 py-2">Ocena</th>
                <th className="px-4 py-2">Waga</th>
                <th className="px-4 py-2">Podejście</th>
                <th className="px-4 py-2 text-left">Komentarz</th>
                <th className="px-4 py-2 text-left">Wystawił</th>
                <th className="px-4 py-2">Data</th>
              </tr>
            </thead>
            <tbody>
              {marks.map((mark) => (
                <tr
                  key={mark.gradeId}
                  className="border-b border-[var(--color-accent)] hover:bg-[var(--color-bg-secondary)]"
                >
                  <td className="px-4 py-2">{mark.subjectName}</td>
                  <td className="px-4 py-2">{mark.classType}</td>
                  <td className="px-4 py-2 text-center font-semibold">
                    {mark.value}
                  </td>
                  <td className="px-4 py-2 text-center">{mark.weight}</td>
                  <td className="px-4 py-2 text-center">{mark.attempt}</td>
                  <td className="px-4 py-2">{mark.comment}</td>
                  <td className="px-4 py-2">{mark.addedBy}</td>
                  <td className="px-4 py-2 text-sm text-[var(--color-text-secondary)]">
                    {new Date(mark.createdAt).toLocaleString("pl-PL")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
