'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from './components/button';
import Input from './components/input';

export default function Home() {
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleClick = async (event) => { 
    event.preventDefault();

    const form = event.target.form;
    const formData = new FormData(form);
    const email = formData.get('email');
    const haslo = formData.get('haslo');

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, haslo }),
      });

      if (!response.ok) {
        throw new Error(`Błąd HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Przekierowanie na dashboard
        router.push("/dashboard");
      } else {
        setMessage(data.message || "Nieprawidłowe dane logowania.");
      }
    } catch (error) {
      setMessage("Błąd podczas logowania.");
      console.error("Błąd podczas komunikacji:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-[#DFD4CA] relative">
      {/* Górny pasek */}
      <header className="flex justify-between items-center px-6 py-4">
        {/* Logo + tekst */}
        <div className="flex items-center gap-3">
        <img src="/logouniwersytet.png" alt="Logo" width={100} height={100} /> 
        </div>
        {/* Linki */}
        <nav className="hidden md:flex gap-6 text-sm text-white/80">
          <a href="#">o aplikacji</a>
          <a href="#">dokumentacja</a>
          <a href="#">zmień motyw</a>
        </nav>
        {/* Hamburger (opcjonalnie) */}
        <div className="md:hidden text-teal-600 text-3xl">☰</div>
      </header>

      {/* Formularz */}
      <main className="flex justify-center items-center mt-10">
        <div className="w-full max-w-md p-6">
          <h2 className="text-xl font-semibold mb-6 text-center">
            Zaloguj się do systemu USOSWEB
          </h2>

          <form className="space-y-4">
            <div className="rounded border border-teal-800 p-2 shadow-md bg-transparent flex items-center">
              <Input
                name="email"
                placeholder="Login..."
                className="w-full bg-transparent border-none focus:outline-none"
                required
              />
              <span className="material-symbols-outlined text-gray-400 px-2">person</span>
            </div>
            <div className="rounded border border-teal-800 p-2 shadow-md bg-transparent flex items-center">
              <Input
                name="haslo"
                type="password"
                placeholder="Password..."
                className="w-full bg-transparent border-none focus:outline-none"
                required
              />
              <span className="material-symbols-outlined text-gray-400 px-2">visibility_off</span>
            </div>
            <Button
              type="submit"
              onClick={handleClick}
              className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-600 transition"
            >
              Login
            </Button>
          </form>

          {message && (
            <div className="mt-4 text-center text-sm text-gray-300">{message}</div>
          )}

          <div className="mt-6 text-center text-sm text-gray-400">
            Nie pamiętasz hasła?
          </div>
        </div>
      </main>
    </div>
  );
}