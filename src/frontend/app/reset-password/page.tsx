"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ThemeToggleButton from "@/app/components/ThemeToggleButton";
import { FaEye, FaEyeSlash, FaArrowLeft, FaCheck } from "react-icons/fa";
import { getApiBaseUrl } from "@/app/config/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const API_BASE = getApiBaseUrl();

  const passwordRequirements = {
    minLength: newPassword.length >= 8,
    hasUppercase: /[A-Z]/.test(newPassword),
    hasLowercase: /[a-z]/.test(newPassword),
    hasDigit: /\d/.test(newPassword),
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    if (!token) {
      setMessage("Brak tokenu resetowania hasła. Użyj linku z wiadomości email.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");

    if (!token) {
      setMessage("Brak tokenu resetowania hasła.");
      return;
    }

    if (!isPasswordValid) {
      setMessage("Hasło nie spełnia wszystkich wymagań.");
      return;
    }

    if (!passwordsMatch) {
      setMessage("Hasła nie są identyczne.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setMessage("Hasło zostało zmienione pomyślnie!");
        setTimeout(() => {
          router.push("/");
        }, 3000);
      } else {
        setMessage(data.message || "Wystąpił błąd podczas resetowania hasła.");
      }
    } catch (error) {
      setMessage("Błąd połączenia z serwerem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] relative">
      {/* Górny pasek */}
      <header className="flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-3">
          <Image
            src="/logouniwersytet.png"
            alt="Logo"
            width={100}
            height={100}
          />
        </div>
        <nav className="hidden md:flex gap-6 text-sm text-[var(--color-text)]">
          <a href="#">o aplikacji</a>
          <a href="#">dokumentacja</a>
          <ThemeToggleButton />
        </nav>
        <div className="md:hidden text-[var(--color-accent)] text-3xl">☰</div>
      </header>

      {/* Formularz */}
      <main className="flex justify-center items-center mt-10">
        <div className="w-full max-w-md p-4">
          <h4 className="text-xl font-semibold mb-2 text-center">
            Ustaw nowe hasło
          </h4>
          <p className="text-center text-sm text-[var(--color-text-secondary)] mb-6">
            Wprowadź nowe hasło dla swojego konta.
          </p>

          {success ? (
            <div className="text-center">
              <div className="bg-green-500/20 text-green-400 p-4 rounded mb-6 text-sm flex items-center justify-center gap-2">
                <FaCheck />
                {message}
              </div>
              <p className="text-[var(--color-text-secondary)] text-sm mb-4">
                Za chwilę zostaniesz przekierowany do strony logowania...
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-[var(--color-accent)] hover:underline text-sm"
              >
                <FaArrowLeft />
                Przejdź do logowania
              </Link>
            </div>
          ) : !token ? (
            <div className="text-center">
              <div className="bg-red-500/20 text-red-400 p-4 rounded mb-6 text-sm">
                {message}
              </div>
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-2 text-[var(--color-accent)] hover:underline text-sm"
              >
                <FaArrowLeft />
                Wróć do formularza resetowania
              </Link>
            </div>
          ) : (
            <form className="space-y-2" onSubmit={handleSubmit}>
              {/* Nowe hasło */}
              <div className="rounded border border-teal-798 p-2 shadow-md bg-transparent flex items-center">
                <input
                  name="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Nowe hasło..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-transparent border-none focus:outline-none text-[var(--color-text)]"
                  required
                />
                <span
                  className="px-2 text-2xl cursor-pointer text-[var(--color-text)]"
                  onClick={() => setShowPassword((v) => !v)}
                  role="button"
                >
                  {showPassword ? <FaEye /> : <FaEyeSlash />}
                </span>
              </div>

              {/* Wymagania hasła */}
              <div className="p-3 rounded border border-teal-798/30 text-xs space-y-1">
                <p className="font-medium mb-2">Wymagania hasła:</p>
                <p className={passwordRequirements.minLength ? "text-green-400" : "text-[var(--color-text-secondary)]"}>
                  {passwordRequirements.minLength ? "✓" : "○"} Minimum 8 znaków
                </p>
                <p className={passwordRequirements.hasUppercase ? "text-green-400" : "text-[var(--color-text-secondary)]"}>
                  {passwordRequirements.hasUppercase ? "✓" : "○"} Wielka litera (A-Z)
                </p>
                <p className={passwordRequirements.hasLowercase ? "text-green-400" : "text-[var(--color-text-secondary)]"}>
                  {passwordRequirements.hasLowercase ? "✓" : "○"} Mała litera (a-z)
                </p>
                <p className={passwordRequirements.hasDigit ? "text-green-400" : "text-[var(--color-text-secondary)]"}>
                  {passwordRequirements.hasDigit ? "✓" : "○"} Cyfra (0-9)
                </p>
              </div>

              {/* Potwierdź hasło */}
              <div className={`rounded border p-2 shadow-md bg-transparent flex items-center ${
                confirmPassword && !passwordsMatch ? "border-red-500" : "border-teal-798"
              }`}>
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Potwierdź hasło..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent border-none focus:outline-none text-[var(--color-text)]"
                  required
                />
                <span
                  className="px-2 text-2xl cursor-pointer text-[var(--color-text)]"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  role="button"
                >
                  {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
                </span>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-red-400 text-xs">Hasła nie są identyczne</p>
              )}

              {message && (
                <div className="text-center text-sm text-[var(--color-accent2)]">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !isPasswordValid || !passwordsMatch}
                className="w-full flex items-center justify-center py-2 px-4 rounded bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition disabled:opacity-50 text-white font-medium"
              >
                {loading ? "Zapisywanie..." : "Zmień hasło"}
              </button>

              <div className="mt-4 text-center text-sm text-[var(--color-text)]">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 hover:text-[var(--color-accent)] hover:underline transition-colors"
                >
                  <FaArrowLeft />
                  Wróć do logowania
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--color-bg)] flex justify-center items-center">
        <div className="text-[var(--color-text)]">Ładowanie...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}