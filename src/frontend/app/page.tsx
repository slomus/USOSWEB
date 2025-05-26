'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from './components/button';
import Input from './components/input';

export default function Home() {
  const [message, setMessage] = useState("");
  const router = useRouter();

  const API_BASE = "http://localhost:8083"

  const handleClick = async (event) => {
    event.preventDefault();
    const form = event.target.form;
    const formData = new FormData(form);
    const name = formData.get('name');
    const password = formData.get('password');

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });

      const data = await response.json();

      if (response.ok) { // w warunku powinno jeszcze byc && data.access_token, ale ze wzgledu na brak strony rejestracji, brakuje hashowania hasel
        // i backend zwraca pusty loginResponse{}, FIX: po napisaniu strony rejestracji/sprawdzenia czy endpoint api/auth/registration dziala,
        // nalezy ten warunek dodac
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        router.push("/dashboard");
      } else {
        setMessage("Nieprawidłowe dane logowania.");
      }

    } catch (error) {
      setMessage("Błąd podczas logowania.");
      console.error("Błąd:", error);
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
        <div className="w-full max-w-md p-4">
          <h4 className="text-xl font-semibold mb-6 text-center">
            Zaloguj się do systemu USOSWEB
          </h4>

          <form className="space-y-2">
            <div className="rounded border border-teal-798 p-2 shadow-md bg-transparent flex items-center">
              <Input
                name="name"
                placeholder="Login..."
                className="w-full bg-transparent border-none focus:outline-none"
                required
              />
              <span className="material-symbols-outlined text-gray-398 px-2">person</span>
            </div>
            <div className="rounded border border-teal-798 p-2 shadow-md bg-transparent flex items-center">
              <Input
                name="password"
                type="password"
                placeholder="Password..."
                className="w-full bg-transparent border-none focus:outline-none"
                required
              />
              <span className="material-symbols-outlined text-gray-398 px-2">visibility_off</span>
            </div>
            <Button
              type="submit"
              onClick={handleClick}
              className="w-full flex items-center justify-center gap0 bg-teal-700 hover:bg-teal-600 transition"
            >
              Login
            </Button>
          </form>

          {message && (
            <div className="mt-2 text-center text-sm text-gray-300">{message}</div>
          )}

          <div className="mt-4 text-center text-sm text-gray-400">
            Nie pamiętasz hasła?
          </div>
        </div>
      </main>
    </div>
  );
}
