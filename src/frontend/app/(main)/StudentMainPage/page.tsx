// app/(main)/StudentMainPage/page.tsx
"use client";
import { useUserRole } from "@/app/hooks/useUserRole";
import AdminDashboard from "@/app/components/AdminDashboard";
import StudentDashboard from "@/app/components/StudentDashboard";

export default function MainPage() {
  const { role, userData, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-accent)] mb-4 mx-auto"></div>
          <p className="text-[var(--color-text-secondary)]">Ładowanie...</p>
        </div>
      </div>
    );
  }

  // Renderuj odpowiedni dashboard w zależności od roli
  if (role === "admin") {
    return <AdminDashboard userData={userData} />;
  } else if (role === "teacher") {
    return <div className="p-6">Dashboard wykładowcy - TODO</div>;
  } else {
    return <StudentDashboard />;
  }
}