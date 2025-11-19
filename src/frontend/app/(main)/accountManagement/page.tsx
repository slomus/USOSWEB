"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";

type UserData = {
  userId: number;
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
  const [saving, setSaving] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Pobierz dane aktualnie zalogowanego użytkownika
  const fetchUserData = async () => {
    setLoadingUserData(true);
    try {
      const res = await fetch("http://localhost:8083/api/auth/user", {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!data?.user) throw new Error("Niepoprawny format odpowiedzi API");

      setUser(data.user);
    } catch (err: any) {
      toast.error("Nie udało się pobrać danych użytkownika.");
      setUser(null);
    } finally {
      setLoadingUserData(false);
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

    if (password !== confirmPassword) {
      toast.error("Hasła nie są takie same!");
      return;
    }

    setSaving(true);

    try {
      const bodyPayload: any = {
        name: user.name,
        surname: user.surname,
      };

      if (user.email) bodyPayload.email = user.email;
      if (user.phone_nr) bodyPayload.phone_nr = user.phone_nr;
      if (user.registration_address) bodyPayload.registration_address = user.registration_address;
      if (user.postal_address) bodyPayload.postal_address = user.postal_address;
      if (user.bank_account_nr) bodyPayload.bank_account_nr = user.bank_account_nr;
      if (password) bodyPayload.password = password;

      const response = await fetch(
        `http://localhost:8083/api/auth/edit/${user.userId}`, // poprawiony parametr userId
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
        }
      );

      if (!response.ok)
        throw new Error(`Nie udało się zapisać zmian (HTTP ${response.status})`);

      const result = await response.json();
      setUser(result.updated_data || user);
      setPassword("");
      setConfirmPassword("");
      toast.success("Dane użytkownika zostały zaktualizowane.");
    } catch (err: any) {
      toast.error("Błąd podczas zapisu: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loadingUserData) return <p>Ładowanie danych użytkownika...</p>;
  if (!user)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-red-500 p-4">
        <p>Nie udało się wczytać danych użytkownika.</p>
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

        {/* Pola zmiany hasła */}
        <div>
          <label className="block text-sm mb-1">Nowe hasło</label>
          <input
            type="password"
            name="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border px-3 py-2 rounded bg-[var(--color-bg)]"
            placeholder="Nowe hasło"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Potwierdź nowe hasło</label>
          <input
            type="password"
            name="confirmPassword"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full border px-3 py-2 rounded bg-[var(--color-bg)]"
            placeholder="Potwierdź nowe hasło"
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
