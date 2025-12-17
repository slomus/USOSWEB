"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/app/config/api";

type UserRole = "student" | "teacher" | "admin";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const API_BASE = getApiBaseUrl();
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const response = await fetch(`http://${API_BASE}/api/auth/role`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          const userRole = data.role;
          
          setRole(userRole);

          // Jeśli użytkownik NIE jest adminem, przekieruj
          if (userRole !== "admin") {
            router.push("/forbidden");
          }
        } else {
          // Brak autoryzacji - przekieruj do logowania
          router.push("/");
        }
      } catch (error) {
        console.error("Błąd sprawdzania roli:", error);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  // Ekran ładowania podczas weryfikacji
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-accent)] mb-4 mx-auto"></div>
          <p className="text-[var(--color-text-secondary)]">Weryfikacja uprawnień...</p>
        </div>
      </div>
    );
  }

  // Jeśli nie jest adminem, nic nie renderuj (przekierowanie już się wykonało)
  if (role !== "admin") {
    return null;
  }

  // Renderuj zawartość tylko dla adminów
  return <>{children}</>;
}