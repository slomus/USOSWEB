"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/app/wrappers/fetchWithAuth";

type ApplicationCategory = {
  categoryId: number;
  name: string;
  applicationStartDate: string;
  applicationEndDate: string;
  description: string;
  active: boolean;
};

export default function ApplicationCategoriesPage() {
  const [categories, setCategories] = useState<ApplicationCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(
        "http://localhost:8083/api/application-categories"
      );

      if (!res.ok) {
        throw new Error(`Błąd: ${res.status}`);
      }

      const data = await res.json();
      setCategories(data.items || []);
    } catch (err: any) {
      setError(err.message || "Nie udało się pobrać kategorii wniosków");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Header */}
      <header className="p-4 border-b border-[var(--color-accent)] bg-[var(--color-bg-secondary)] flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Kategorie wniosków</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Lista dostępnych wniosków w systemie
          </p>
        </div>
        <button
          onClick={fetchCategories}
          className="px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)]"
        >
          Odśwież
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center text-lg text-[var(--color-text-secondary)]">
            Ładowanie kategorii...
          </div>
        ) : error ? (
          <div className="text-center text-red-600">Błąd: {error}</div>
        ) : categories.length === 0 ? (
          <p className="text-center text-[var(--color-text-secondary)]">
            Brak kategorii do wyświetlenia.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <div
                key={cat.categoryId}
                className={`p-5 rounded-2xl shadow border ${
                  cat.active
                    ? "bg-[var(--color-bg-secondary)] border-[var(--color-accent)]"
                    : "bg-gray-200 border-gray-400 opacity-70"
                }`}
              >
                <h2 className="text-xl font-semibold mb-2">{cat.name}</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                  {cat.description}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Start:</span>{" "}
                  {cat.applicationStartDate || "brak"}
                </p>
                <p className="text-sm mb-3">
                  <span className="font-medium">Koniec:</span>{" "}
                  {cat.applicationEndDate || "brak"}
                </p>
                <span
                  className={`inline-block px-3 py-1 rounded text-xs font-semibold ${
                    cat.active
                      ? "bg-green-600 text-white"
                      : "bg-red-600 text-white"
                  }`}
                >
                  {cat.active ? "Aktywna" : "Nieaktywna"}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
