"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ThemeToggleButton from "@/app/components/ThemeToggleButton";
import { FaEnvelope, FaArrowLeft } from "react-icons/fa";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    if (!email.trim()) {
      setMessage("Wprowadź adres email.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setMessage("Jeśli podany email istnieje w systemie, wysłaliśmy link do resetowania hasła.");
      } else {
        setMessage(data.message || "Wystąpił błąd. Spróbuj ponownie.");
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
            Nie pamiętasz hasła?
          </h4>
          <p className="text-center text-sm text-[var(--color-text-secondary)] mb-6">
            Wprowadź swój adres email, a wyślemy Ci link do zresetowania hasła.
          </p>

          {success ? (
            <div className="text-center">
              <div className="bg-green-500/20 text-green-400 p-4 rounded mb-6 text-sm">
                {message}
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-[var(--color-accent)] hover:underline text-sm"
              >
                <FaArrowLeft />
                Wróć do logowania
              </Link>
            </div>
          ) : (
            <form className="space-y-2" onSubmit={handleSubmit}>
              <div className="rounded border border-teal-798 p-2 shadow-md bg-transparent flex items-center">
                <input
                  name="email"
                  type="email"
                  placeholder="Email..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-none focus:outline-none text-[var(--color-text)]"
                  required
                />
                <span className="text-[var(--color-text)] text-2xl px-2">
                  <FaEnvelope />
                </span>
              </div>

              {message && !success && (
                <div className="text-center text-sm text-[var(--color-accent2)]">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-2 px-4 rounded bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition disabled:opacity-50 text-white font-medium"
              >
                {loading ? "Wysyłanie..." : "Wyślij link resetujący"}
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