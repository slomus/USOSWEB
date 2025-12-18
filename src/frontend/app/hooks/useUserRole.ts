// app/hooks/useUserRole.ts
"use client";
import { useState, useEffect } from "react";
import { getApiBaseUrl } from "@/app/config/api";
export type UserRole = "student" | "teacher" | "admin" | null;

export interface UserData {
  user_id: number;
  name: string;
  surname: string;
  email: string;
  active: boolean;
  role: UserRole;
}

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const API_BASE = getApiBaseUrl();
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/user`, {
          credentials: "include",
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }

        const data = await response.json();
        
        if (data.success && data.user) {
          setRole(data.user.role);
          setUserData(data.user);
        } else {
          throw new Error("Invalid response structure");
        }
        
      } catch (error) {
        console.error("Error fetching role:", error);
        setRole("student");
      } finally {
        setLoading(false);
      }
    };
    
    fetchRole();
  }, []);

  return { role, userData, loading };
}