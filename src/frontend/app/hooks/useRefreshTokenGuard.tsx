'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Hook do automatycznego odświeżania access tokena na zabezpieczonych stronach.
 * Przekierowuje na "/" jeśli nie uda się odświeżyć tokena.
 */
export function useRefreshTokenGuard() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAndRefreshToken = async () => {
      const accessToken = localStorage.getItem("access_token");
      const refreshToken = localStorage.getItem("refresh_token");
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

      if (!accessToken) {
        if (refreshToken) {
          try {
            const response = await fetch(`${API_BASE}/api/auth/refresh`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ refreshToken }),
            });
            console.log("Odświeżanie tokena...");

            if (!response.ok) {
              throw new Error("Nie udało się odświeżyć tokena");
            }

            const data = await response.json();

            if (data.accessToken) {
              localStorage.setItem("access_token", data.accessToken);
            }
            if (data.refreshToken) {
              localStorage.setItem("refresh_token", data.refreshToken);
            }
            // Token odświeżony, nie przekierowujemy
            return;
          } catch {
            router.push("/"); // Nie udało się odświeżyć tokena
            console.error("Błąd podczas odświeżania tokena, przekierowanie na stronę logowania.");
          }
        } else {
          router.push("/"); // Brak refresh tokena, przekieruj na login
          console.error("Brak access tokena i refresh tokena, przekierowanie na stronę logowania.");
        }
      }
      // accessToken istnieje, nie robimy nic
      setIsLoading(false);
    }

    checkAndRefreshToken();
  }, [router]);
  return { isLoading };
}
