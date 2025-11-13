"use client";

import { useState, useEffect } from "react";

type UserData = {
  user_id: number;
  name: string;
  surname: string;
  email: string;
  phone_nr?: string;
  registration_address?: string;
  postal_address?: string;
  bank_account_nr?: string;
  active: boolean;
  role: string;
};

export default function AccountManagementPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Pobierz dane aktualnie zalogowanego użytkownika
  const fetchUserData = async () => {
    setLoadingUserData(true);
    try {
      const res = await fetch("http://localhost:8083/api/auth/user", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Response status:", res.status);

      const text = await res.text();
      if (!text) {
        throw new Error("Pusta odpowiedź z serwera");
      }

      const data = JSON.parse(text);
      console.log("Otrzymane dane:", data);

      if (!data?.user) throw new Error("Niepoprawny format odpowiedzi API");

      setUser(data.user);
      setError("");
    } catch (err: any) {
      console.error("fetchUserData:", err);
      setError("Nie udało się pobrać danych użytkownika.");
      setUser(null);
    } finally {
      setLoadingUserData(false);
      console.log("Ładowanie danych zakończone");
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const { name, value } = e.target;
    setUser({ ...user, [name]: value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setSuccessMessage("");
    setError("");

    try {
      const response = await fetch(
        `http://localhost:8083/api/auth/edit/${user.user_id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: user.name,
            surname: user.surname,
            email: user.email,
            phone_nr: user.phone_nr,
            registration_address: user.registration_address,
            postal_address: user.postal_address,
            bank_account_nr: user.bank_account_nr,
          }),
        }
      );

      if (!response.ok)
        throw new Error(
          `Nie udało się zapisać zmian (HTTP ${response.status})`
        );
      const result = await response.json();

      setSuccessMessage("Dane użytkownika zostały zaktualizowane.");
      setUser(result.updated_data || user);
    } catch (err: any) {
      setError("Błąd podczas zapisu: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  if (loadingUserData) return <p>Ładowanie danych użytkownika...</p>;
  if (!user) return <p>Nie udało się wczytać danych użytkownika.</p>;
  if (error)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-red-500 p-4">
        <p>{error}</p>
        <button
          onClick={fetchUserData}
          className="mt-3 px-4 py-2 bg-[var(--color-accent)] text-white rounded"
        >
          Spróbuj ponownie
        </button>
      </div>
    );

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-6">
      <h1 className="text-2xl font-bold mb-6 text-[var(--color-accent)]">
        Zarządzanie kontem użytkownika
      </h1>

      <form
        className="max-w-2xl mx-auto bg-[var(--color-bg-secondary)] p-8 rounded shadow border border-[var(--color-accent)]"
        onSubmit={handleSave}
      >
        {successMessage && (
          <div className="mb-4 bg-green-50 border-l-4 border-green-500 text-green-800 p-3 rounded">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Imię</label>
            <input
              type="text"
              name="name"
              value={user?.name ?? ""}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded bg-[var(--color-bg)]"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Nazwisko</label>
            <input
              type="text"
              name="surname"
              value={user?.surname ?? ""}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded bg-[var(--color-bg)]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={user?.email ?? ""}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded bg-[var(--color-bg)]"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Telefon</label>
          <input
            type="text"
            name="phone_nr"
            value={user?.phone_nr ?? ""}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded bg-[var(--color-bg)]"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Adres zamieszkania</label>
          <input
            type="text"
            name="registration_address"
            value={user?.registration_address ?? ""}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded bg-[var(--color-bg)]"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Adres korespondencyjny</label>
          <input
            type="text"
            name="postal_address"
            value={user?.postal_address ?? ""}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded bg-[var(--color-bg)]"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Numer konta bankowego</label>
          <input
            type="text"
            name="bank_account_nr"
            value={user?.bank_account_nr ?? ""}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded bg-[var(--color-bg)]"
          />
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent2)] transition-colors disabled:opacity-50"
          >
            {saving ? "Zapisywanie..." : "Zapisz zmiany"}
          </button>
        </div>
      </form>
    </div>
  );
}
