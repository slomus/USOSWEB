"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { getApiBaseUrl } from "@/app/config/api";

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

  // Stan dla obsługi zdjęcia
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Nowe stany do wyświetlania zdjęcia
  const [photoTimestamp, setPhotoTimestamp] = useState(Date.now()); // Służy do odświeżania cache obrazka
  const [photoError, setPhotoError] = useState(false); // Czy wystąpił błąd ładowania (np. brak zdjęcia 404)

  // Helper: Konwersja pliku do Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Zwracamy tylko część Base64 po przecinku
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const API_BASE = getApiBaseUrl();

  // Pobierz dane aktualnie zalogowanego użytkownika
  const fetchUserData = async () => {
    setLoadingUserData(true);
    try {
      const res = await fetch(`http://${API_BASE}/api/auth/user`, {
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

  // Obsługa wyboru pliku
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFile(e.target.files[0]);
    }
  };

  // Obsługa wysyłania zdjęcia
  const uploadPhoto = async () => {
    if (!photoFile) {
      toast.warning("Wybierz plik przed wysłaniem.");
      return;
    }

    setUploadingPhoto(true);
    try {
      const base64 = await fileToBase64(photoFile);

      const response = await fetch(`http://${API_BASE}/api/users/photo`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo_data: base64,
          mime_type: photoFile.type,
        }),
      });

      if (!response.ok) {
        throw new Error(`Błąd wysyłania zdjęcia (HTTP ${response.status})`);
      }

      toast.success("Zdjęcie profilowe zostało przesłane pomyślnie.");
      
      // Reset formularza
      setPhotoFile(null);
      const fileInput = document.getElementById("photoInput") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Odświeżenie widoku zdjęcia
      setPhotoError(false); // Zakładamy, że teraz zdjęcie już jest
      setPhotoTimestamp(Date.now()); // Wymuszenie przeładowania URL

    } catch (err: any) {
      console.error(err);
      toast.error("Wystąpił błąd podczas wysyłania zdjęcia.");
    } finally {
      setUploadingPhoto(false);
    }
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
        `http://${API_BASE}/api/auth/edit/${user.userId}`,
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

      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* --- SEKCJA 1: Zdjęcie profilowe --- */}
        <div className="bg-[var(--color-bg-secondary)] p-8 rounded shadow border border-[var(--color-accent)]">
          <h2 className="text-xl font-semibold mb-4 text-[var(--color-accent)]">Zdjęcie profilowe</h2>
          
          <div className="flex flex-col md:flex-row gap-8 items-start">
            
            {/* Wyświetlanie aktualnego zdjęcia */}
            <div className="flex-shrink-0">
              <p className="text-sm font-medium mb-2">Aktualne zdjęcie:</p>
              {user && !photoError ? (
                <img 
                  src={`http://${API_BASE}/api/users/${user.userId}/photo?t=${photoTimestamp}`} 
                  alt="Zdjęcie użytkownika"
                  className="w-32 h-32 rounded-full object-cover border-2 border-[var(--color-accent)] shadow-sm"
                  onError={() => setPhotoError(true)}
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300 text-gray-500 text-center text-xs p-2">
                  Brak zdjęcia profilowego
                </div>
              )}
            </div>

            {/* Formularz uploadu */}
            <div className="flex-grow w-full">
              <p className="text-sm font-medium mb-2">Zmień zdjęcie:</p>
              <div className="flex flex-col gap-3">
                <input 
                  type="file" 
                  id="photoInput" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  className="block w-full text-sm text-[var(--color-text)]
                    file:mr-4 file:py-2 file:px-4
                    file:rounded file:border-0
                    file:text-sm file:font-semibold
                    file:bg-[var(--color-accent)] file:text-white
                    hover:file:bg-[var(--color-accent2)]
                    cursor-pointer"
                />
                <div>
                  <button 
                    onClick={uploadPhoto}
                    disabled={uploadingPhoto || !photoFile}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm"
                  >
                    {uploadingPhoto ? "Wysyłanie..." : "Wyślij zdjęcie"}
                  </button>
                  {photoFile && (
                    <span className="ml-2 text-xs text-gray-500">
                      Wybrano: {photoFile.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- SEKCJA 2: Formularz danych (BEZ ZMIAN) --- */}
        <form
          className="bg-[var(--color-bg-secondary)] p-8 rounded shadow border border-[var(--color-accent)]"
          onSubmit={handleSave}
        >
          <h2 className="text-xl font-semibold mb-4 text-[var(--color-accent)]">Dane osobowe</h2>
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

          <div className="mt-4">
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={user?.email ?? ""}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded bg-[var(--color-bg)]"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm mb-1">Telefon</label>
            <input
              type="text"
              name="phone_nr"
              value={user?.phone_nr ?? ""}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded bg-[var(--color-bg)]"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm mb-1">Adres zamieszkania</label>
            <input
              type="text"
              name="registration_address"
              value={user?.registration_address ?? ""}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded bg-[var(--color-bg)]"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm mb-1">Adres korespondencyjny</label>
            <input
              type="text"
              name="postal_address"
              value={user?.postal_address ?? ""}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded bg-[var(--color-bg)]"
            />
          </div>

          <div className="mt-4">
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
          <div className="mt-4">
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

          <div className="mt-4">
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
    </div>
  );
}