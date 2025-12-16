// app/components/AdminDashboard.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { UserData } from "@/app/hooks/useUserRole";
import ScheduleCalendar, { CalendarEvent } from "@/app/components/ScheduleCalendar";
import { 
  FaUsers, 
  FaUserGraduate, 
  FaChalkboardTeacher, 
  FaUserShield,
  FaFileAlt,
  FaBook,
  FaCheckCircle,
  FaClipboardList,
  FaCalendarAlt
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

  // Calendar State
  const [dashboardEvents, setDashboardEvents] = useState<CalendarEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<CalendarEvent | null>(null);

  // Fetch Logic
  useEffect(() => {
    // Funkcja pobierająca wszystkie wnioski z paginacją
    const fetchAllApplications = async () => {
      let page = 1;
      const pageSize = 20;
      let allItems: any[] = [];
      let total = 0;

      while (true) {
        const res = await fetch(
          `http://localhost:8083/api/applications?page=${page}&pageSize=${pageSize}`,
          { credentials: "include" }
        );

        if (!res.ok) break;

        const data = await res.json();
        allItems = [...allItems, ...(data.items || [])];
        total = data.total;

        // Jeśli mamy już wszystkie — kończymy
        if (allItems.length >= total) break;
        page++;
      }

      return allItems;
    };

    const fetchDashboardData = async () => {
      try {
        const usersRes = await fetch("http://localhost:8083/api/auth/users", { credentials: "include" });
        if (!usersRes.ok) throw new Error("Failed to fetch users");

        const usersData = await usersRes.json();
        const users = usersData.users || [];
        
        const students = users.filter((u: any) => u.role === "student");
        const teachers = users.filter((u: any) => u.role === "teacher");
        const admins = users.filter((u: any) => u.role === "admin");

        let totalApplications = 0;
        let pendingApplications = 0;
        
        try {
          // Używamy funkcji z paginacją zamiast pojedynczego fetcha
          const applications = await fetchAllApplications();
          totalApplications = applications.length;
          pendingApplications = applications.filter((app: any) => app.status === "submitted").length;
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
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userData]);

  // Calendar Logic (Simplified for Admin - showing active events)
  useEffect(() => {
    const updateCurrentEvent = () => {
      const now = new Date();
      const active = dashboardEvents.find(e => {
        const start = new Date(e.start);
        const end = e.end ? new Date(e.end) : start;
        return now >= start && now <= end && !e.allDay;
      });
      setCurrentEvent(active || null);
    };
    updateCurrentEvent();
    const interval = setInterval(updateCurrentEvent, 30000);
    return () => clearInterval(interval);
  }, [dashboardEvents]);

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
          <StatCard icon={<FaUsers />} title="Wszyscy użytkownicy" value={stats?.totalUsers || 0} subtitle="w systemie" color="bg-blue-600" />
          <StatCard icon={<FaUserGraduate />} title="Studenci" value={stats?.totalStudents || 0} subtitle="aktywnych" color="bg-green-600" />
          <StatCard icon={<FaChalkboardTeacher />} title="Wykładowcy" value={stats?.totalTeachers || 0} subtitle="aktywnych" color="bg-purple-600" />
          <StatCard icon={<FaUserShield />} title="Administratorzy" value={stats?.totalAdmins || 0} subtitle="IT i dziekanat" color="bg-red-600" />
        </div>
      </section>

      {/* NEW SECTION: Calendar Integration */}
      <section className="mb-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
             <h2 className="text-xl font-semibold mb-4">Harmonogram Systemowy</h2>
             <div className="bg-[var(--color-bg-secondary)] rounded-xl shadow-md p-4 min-h-[500px]">
               <ScheduleCalendar onEventsLoaded={setDashboardEvents} />
             </div>
          </div>
          
          <div className="flex flex-col gap-6 pt-11">
             {/* Admin Status Panel */}
             <div className="bg-[var(--color-bg-secondary)] p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <FaCalendarAlt className="text-[var(--color-accent)] text-2xl" />
                  <h3 className="font-semibold">Status Kalendarza</h3>
                </div>
                
                <div className="mb-4">
                  <p className="text-xs text-[var(--color-text-secondary)] uppercase font-bold mb-2">Teraz</p>
                  {currentEvent ? (
                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded border-l-4 border-blue-500">
                      <p className="font-bold text-sm">{currentEvent.title}</p>
                      <p className="text-xs">{currentEvent.extendedProps?.room}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-text-secondary)] italic">Brak aktywnych wydarzeń systemowych.</p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-[var(--color-text-secondary)] uppercase font-bold mb-2">Dzisiaj w systemie</p>
                  <p className="text-3xl font-bold text-[var(--color-text)]">
                    {dashboardEvents.filter(e => new Date(e.start).toDateString() === new Date().toDateString()).length}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">zaplanowanych wydarzeń</p>
                </div>
             </div>

             {/* Quick Actions for Applications */}
             <div className="bg-[var(--color-bg-secondary)] p-6 rounded-xl shadow-md flex-1">
                <h3 className="font-semibold mb-3">Wnioski oczekujące</h3>
                <div className="flex items-center justify-between">
                   <div>
                      <p className="text-4xl font-bold text-[var(--color-accent)]">
                        {stats?.pendingApplications || 0}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">wymaga akcji</p>
                   </div>
                   <Link href="/admin/applications" className="px-4 py-2 bg-[var(--color-accent)] text-white text-sm rounded hover:bg-[var(--color-accent-hover)] transition">
                     Przejdź
                   </Link>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Statystyki wniosków (Existing) */}
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
            <p className="text-sm text-[var(--color-text-secondary)]">W systemie</p>
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
            <p className="text-sm text-[var(--color-text-secondary)]">Do rozpatrzenia</p>
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
            <p className="text-sm text-[var(--color-text-secondary)]">Zaakceptowane lub odrzucone</p>
          </div>
        </div>
      </section>

      {/* Szybkie akcje - Panel zarządzania */}
      <section className="bg-[var(--color-bg-secondary)] p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-4">Panel zarządzania systemem</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ActionButton href="/admin/users" icon={<FaUsers />} label="Użytkownicy" description="Zarządzaj użytkownikami" />
          <ActionButton href="/admin/marks" icon={<FaClipboardList />} label="Oceny" description="Zarządzaj ocenami" />
          <ActionButton href="/admin/applications" icon={<FaFileAlt />} label="Wnioski" description="Zarządzaj wnioskami" />
          <ActionButton href="/admin/subjects" icon={<FaBook />} label="Przedmioty" description="Zarządzaj przedmiotami" />
        </div>
      </section>
    </main>
  );
}

// Komponenty pomocnicze
function StatCard({ icon, title, value, subtitle, color }: { icon: React.ReactNode; title: string; value: number | string; subtitle: string; color: string; }) {
  return (
    <div className="bg-[var(--color-bg-secondary)] p-6 rounded-xl shadow-md">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${color} p-3 rounded-lg text-white text-2xl`}>{icon}</div>
        <div className="flex-1">
          <h3 className="text-sm text-[var(--color-text-secondary)]">{title}</h3>
          <p className="text-3xl font-bold text-[var(--color-text)]">{value}</p>
        </div>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]">{subtitle}</p>
    </div>
  );
}

function ActionButton({ href, icon, label, description }: { href: string; icon: React.ReactNode; label: string; description: string; }) {
  return (
    <Link href={href}>
      <div className="block p-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-lg transition-all cursor-pointer group">
        <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{icon}</div>
        <h3 className="font-semibold mb-1">{label}</h3>
        <p className="text-xs opacity-90">{description}</p>
      </div>
    </Link>
  );
}