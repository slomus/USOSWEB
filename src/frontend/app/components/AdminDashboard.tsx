// app/components/AdminDashboard.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { UserData } from "@/app/hooks/useUserRole";
import { 
  FaUsers, 
  FaUserGraduate, 
  FaChalkboardTeacher, 
  FaUserShield,
  FaFileAlt,
  FaBook,
  FaCheckCircle,
  FaClipboardList
} from "react-icons/fa";

type SystemStats = {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  totalApplications: number;
  pendingApplications: number;
};

interface AdminDashboardProps {
  userData: UserData | null;
}

export default function AdminDashboard({ userData }: AdminDashboardProps) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Pobierz WSZYSTKICH użytkowników
        const usersRes = await fetch("http://localhost:8083/api/auth/users", {
          credentials: "include",
        });
        
        if (!usersRes.ok) {
          throw new Error("Failed to fetch users");
        }

        const usersData = await usersRes.json();
        const users = usersData.users || [];
        
        // Policz użytkowników po rolach
        const students = users.filter((u: any) => u.role === "student");
        const teachers = users.filter((u: any) => u.role === "teacher");
        const admins = users.filter((u: any) => u.role === "admin");

        // Pobierz wszystkie wnioski
        let totalApplications = 0;
        let pendingApplications = 0;
        
        try {
          const appsRes = await fetch("http://localhost:8083/api/applications", {
            credentials: "include",
          });
          const appsData = await appsRes.json();
          const applications = appsData.items || [];
          
          totalApplications = applications.length;
          // Policz wnioski ze statusem "pending"
          pendingApplications = applications.filter(
            (app: any) => app.status === "submitted"
          ).length;
        } catch (error) {
          console.log("Could not fetch applications:", error);
        }

        setStats({
          totalUsers: users.length,
          totalStudents: students.length,
          totalTeachers: teachers.length,
          totalAdmins: admins.length,
          totalApplications,
          pendingApplications,
        });

      } catch (error) {
        console.error("Error fetching dashboard:", error);
        setStats({
          totalUsers: 0,
          totalStudents: 0,
          totalTeachers: 0,
          totalAdmins: 0,
          totalApplications: 0,
          pendingApplications: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userData]);

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-6 bg-[var(--color-bg)]">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-accent)] mx-auto mb-4"></div>
          <p className="text-[var(--color-text-secondary)]">Ładowanie danych...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-6 text-[var(--color-text)] bg-[var(--color-bg)]">
      {/* Nagłówek */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-accent)]">
          Panel Administratora IT
        </h1>
        <p className="text-[var(--color-text-secondary)] mt-2">
          Witaj, {userData?.name}! Zarządzaj systemem USOSWEB
        </p>
      </div>

      {/* Statystyki użytkowników */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Statystyki użytkowników</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            icon={<FaUsers />}
            title="Wszyscy użytkownicy"
            value={stats?.totalUsers || 0}
            subtitle="w systemie"
            color="bg-blue-600"
          />
          <StatCard
            icon={<FaUserGraduate />}
            title="Studenci"
            value={stats?.totalStudents || 0}
            subtitle="aktywnych"
            color="bg-green-600"
          />
          <StatCard
            icon={<FaChalkboardTeacher />}
            title="Wykładowcy"
            value={stats?.totalTeachers || 0}
            subtitle="aktywnych"
            color="bg-purple-600"
          />
          <StatCard
            icon={<FaUserShield />}
            title="Administratorzy"
            value={stats?.totalAdmins || 0}
            subtitle="IT i dziekanat"
            color="bg-red-600"
          />
        </div>
      </section>

      {/* Statystyki wniosków */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Statystyki wniosków</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[var(--color-bg-secondary)] p-6 rounded-xl shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <FaFileAlt className="text-blue-500 text-3xl" />
              <div>
                <h3 className="text-sm text-[var(--color-text-secondary)]">Wszystkie wnioski</h3>
                <p className="text-4xl font-bold text-[var(--color-text)]">
                  {stats?.totalApplications || 0}
                </p>
              </div>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              W systemie
            </p>
          </div>

          <div className="bg-[var(--color-bg-secondary)] p-6 rounded-xl shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <FaCheckCircle className="text-yellow-500 text-3xl" />
              <div>
                <h3 className="text-sm text-[var(--color-text-secondary)]">Oczekujące</h3>
                <p className="text-4xl font-bold text-[var(--color-text)]">
                  {stats?.pendingApplications || 0}
                </p>
              </div>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Do rozpatrzenia
            </p>
          </div>

          <div className="bg-[var(--color-bg-secondary)] p-6 rounded-xl shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <FaCheckCircle className="text-green-500 text-3xl" />
              <div>
                <h3 className="text-sm text-[var(--color-text-secondary)]">Rozpatrzone</h3>
                <p className="text-4xl font-bold text-[var(--color-text)]">
                  {(stats?.totalApplications || 0) - (stats?.pendingApplications || 0)}
                </p>
              </div>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Zaakceptowane lub odrzucone
            </p>
          </div>
        </div>
      </section>

      {/* Szybkie akcje - Panel zarządzania */}
      <section className="bg-[var(--color-bg-secondary)] p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-4">Panel zarządzania systemem</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ActionButton
            href="/admin/users"
            icon={<FaUsers />}
            label="Użytkownicy"
            description="Zarządzaj użytkownikami"
          />
          <ActionButton
            href="/admin/marks"
            icon={<FaClipboardList />}
            label="Oceny"
            description="Zarządzaj ocenami"
          />
          <ActionButton
            href="/admin/applications"
            icon={<FaFileAlt />}
            label="Wnioski"
            description="Zarządzaj wnioskami"
          />
          <ActionButton
            href="/admin/subjects"
            icon={<FaBook />}
            label="Przedmioty"
            description="Zarządzaj przedmiotami"
          />
        </div>
      </section>
    </main>
  );
}

// Komponenty pomocnicze
function StatCard({ 
  icon, 
  title, 
  value, 
  subtitle, 
  color 
}: { 
  icon: React.ReactNode; 
  title: string; 
  value: number | string; 
  subtitle: string; 
  color: string;
}) {
  return (
    <div className="bg-[var(--color-bg-secondary)] p-6 rounded-xl shadow-md">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${color} p-3 rounded-lg text-white text-2xl`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-sm text-[var(--color-text-secondary)]">{title}</h3>
          <p className="text-3xl font-bold text-[var(--color-text)]">{value}</p>
        </div>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]">{subtitle}</p>
    </div>
  );
}

function ActionButton({ 
  href, 
  icon, 
  label, 
  description 
}: { 
  href: string; 
  icon: React.ReactNode; 
  label: string; 
  description: string;
}) {
  return (
    <Link href={href}>
      <div className="block p-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-lg transition-all cursor-pointer group">
        <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <h3 className="font-semibold mb-1">{label}</h3>
        <p className="text-xs opacity-90">{description}</p>
      </div>
    </Link>
  );
}