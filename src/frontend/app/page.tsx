'use client';

import { useState } from "react";
import Button from "../app/components/button";

export default function Home() {
  const [message, setMessage] = useState("");

  const handleClick = async () => {
    try {
      const response = await fetch("http://localhost:8083/api/hello");
      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      console.error("Błąd podczas komunikacji:", error);
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <Button onClick={handleClick}>
        Zaloguj
      </Button>
      {message && <div className="mt-4 text-xl">{message}</div>}
    </div>
  );
}
