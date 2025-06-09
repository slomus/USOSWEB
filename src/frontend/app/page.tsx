"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Button from "@/app/components/button";
import Input from "@/app/components/input";
import ThemeToggleButton from "@/app/components/ThemeToggleButton";
import { FaUser, FaEye, FaEyeSlash } from "react-icons/fa";

export default function Home() {
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

  const handleClick = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = formData.get("name");
    const password = formData.get("password");

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        router.push("/StudentMainPage");
      } else {
        setMessage("Nieprawidłowe dane logowania.");
      }
    } catch (error) {
      setMessage("Błąd podczas logowania.");
      console.error("Błąd:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] relative">
      {/* Górny pasek */}
      <header className="flex justify-between items-center px-6 py-4">
        {/* Logo + tekst */}
        <div className="flex items-center gap-3">
          <Image
            src="/logouniwersytet.png"
            alt="Logo"
            width={100}
            height={100}
          />
        </div>
        {/* Linki */}
        <nav className="hidden md:flex gap-6 text-sm text-[var(--color-text)]">
          <a href="#">o aplikacji</a>
          <a href="#">dokumentacja</a>
          <ThemeToggleButton />
        </nav>
        {/* Hamburger (opcjonalnie) */}
        <div className="md:hidden text-[var(--color-accent)] text-3xl">☰</div>
      </header>

      {/* Formularz */}
      <main className="flex justify-center items-center mt-10">
        <div className="w-full max-w-md p-4">
          <h4 className="text-xl font-semibold mb-6 text-center">
            Zaloguj się do systemu USOSWEB
          </h4>

          <form className="space-y-2" onSubmit={handleClick}>
            <div className="rounded border border-teal-798 p-2 shadow-md bg-transparent flex items-center">
              <Input
                name="name"
                placeholder="Login..."
                className="w-full bg-transparent border-none focus:outline-none"
                required
              />
              <span className="text-(var[--text-color]) text-2xl px-2">
                <FaUser />
              </span>
            </div>
            <div className="rounded border border-teal-798 p-2 shadow-md bg-transparent flex items-center">
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password..."
                className="w-full bg-transparent border-none focus:outline-none"
                required
              />
              <span
                className="px-2 text-2xl cursor-pointer"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
                tabIndex={0}
                role="button"
              >
                {showPassword ? <FaEye /> : <FaEyeSlash />}
              </span>
            </div>

            <Button
              type="submit"
              className="w-full flex items-center justify-center gap0 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition"
            >
              Login
            </Button>
          </form>

          {message && (
            <div className="mt-2 text-center text-sm text-[var(--color-accent2)]">
              {message}
            </div>
          )}

          <div className="mt-4 text-center text-sm text-[var(--color-text)]">
            Nie pamiętasz hasła?
          </div>
        </div>
      </main>
    </div>
  );
}
