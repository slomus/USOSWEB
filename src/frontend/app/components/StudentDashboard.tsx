"use client";

import { useState, useEffect } from "react";
import StudentCalendar, { CalendarEvent } from "@/app/components/ScheduleCalendar";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

type Grade = {
  gradeId: number;
  subjectName: string;
  value: string;
  createdAt: string;
  addedByName: string;
};

export default function StudentMainPage() {
  const [dashboardEvents, setDashboardEvents] = useState<CalendarEvent[]>([]);
  const [currentClass, setCurrentClass] = useState<CalendarEvent | null>(null);
  const [nextClass, setNextClass] = useState<CalendarEvent | null>(null);
  const [recentGrades, setRecentGrades] = useState<Grade[]>([]);

  // Pobieranie ocen (niezależne od kalendarza)
  const fetchRecentGrades = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/student/grades/recent`, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.grades) {
        setRecentGrades(data.grades);
      }
    } catch (error) {
      console.error("Błąd grades:", error);
    }
  };

  useEffect(() => {
    fetchRecentGrades();
  }, []);

  // Obliczanie statusu "Teraz" i "Następnie" na podstawie eventów z kalendarza
  useEffect(() => {
    const updateCurrentClasses = () => {
      const now = new Date();
      let current: CalendarEvent | null = null;
      let next: CalendarEvent | null = null;

      const todaysClasses = dashboardEvents.filter((e) => {
        if (e.allDay || e.extendedProps.source !== "class") return false;
        const eStart = new Date(e.start);
        return eStart.toDateString() === now.toDateString();
      });

      todaysClasses.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

      for (const event of todaysClasses) {
        const start = new Date(event.start);
        const end = event.end ? new Date(event.end) : start;

        if (now >= start && now <= end) {
          current = event;
        } else if (now < start && !next) {
          next = event;
        }
      }

      setCurrentClass(current);
      setNextClass(next);
    };

    updateCurrentClasses();
    const interval = setInterval(updateCurrentClasses, 30000);
    return () => clearInterval(interval);
  }, [dashboardEvents]);

  // Statystyki do panelu bocznego
  const todayDateString = new Date().toDateString();
  const classesToday = dashboardEvents.filter(
    (e) =>
      !e.allDay &&
      e.extendedProps.source === "class" &&
      new Date(e.start).toDateString() === todayDateString
  );
  const totalHoursToday = classesToday.reduce((sum, e) => {
    const start = new Date(e.start);
    const end = e.end ? new Date(e.end) : start;
    return sum + (end.getTime() - start.getTime()) / (1000 * 3600);
  }, 0);

  return (
    <main className="min-h-screen px-6 py-6 text-[var(--color-text)] bg-[var(--color-bg)]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        
        {/* KOLUMNA LEWA: KALENDARZ */}
        <div className="lg:col-span-2">
          {/* Przekazujemy funkcję setDashboardEvents, aby otrzymać dane z kalendarza */}
          <StudentCalendar onEventsLoaded={setDashboardEvents} />
        </div>

        {/* KOLUMNA PRAWA: PANEL BOCZNY */}
        <div className="bg-[var(--color-bg-secondary)] p-6 rounded-xl shadow-md flex flex-col gap-6 h-fit">
          
          {/* Ostatnie Oceny */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Ostatnie oceny
            </h3>
            {recentGrades.length > 0 ? (
              <div className="space-y-3">
                {recentGrades.slice(0, 3).map((grade) => (
                  <div
                    key={grade.gradeId}
                    className="flex justify-between items-center bg-[var(--color-bg)] p-3 rounded-lg border-l-4 border-teal-600"
                  >
                    <div>
                      <p className="font-bold text-sm">{grade.subjectName}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{grade.addedByName}</p>
                    </div>
                    <span className="text-xl font-bold text-teal-600">{grade.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic opacity-60">Brak nowych ocen.</p>
            )}
          </div>

          {/* Teraz */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] pt-4 border-t border-[var(--color-accent)]/20">
              Teraz
            </h3>
            {currentClass ? (
              <div className="bg-[var(--color-accent)] text-white p-4 rounded-lg shadow-lg">
                <p className="font-bold text-lg">{currentClass.extendedProps.type}</p>
                <p className="text-sm opacity-90">{currentClass.title}</p>
                <div className="mt-2 flex justify-between text-xs opacity-80">
                  <span>{currentClass.extendedProps.room}</span>
                  <span>
                    {new Date(currentClass.start).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" - "}
                    {currentClass.end
                      ? new Date(currentClass.end).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm italic opacity-60">Brak zajęć dydaktycznych w tej chwili.</p>
            )}
          </div>

          {/* Następnie */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] pt-4 border-t border-[var(--color-accent)]/20">
              Następnie
            </h3>
            {nextClass ? (
              <div className="bg-[var(--color-bg)] border border-[var(--color-accent)] p-4 rounded-lg">
                <p className="font-bold text-[var(--color-accent)]">{nextClass.title}</p>
                <p className="text-xs mt-1 text-[var(--color-text-secondary)]">
                  {new Date(nextClass.start).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" - "}
                  {nextClass.end
                    ? new Date(nextClass.end).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </p>
                <p className="text-xs mt-1">Sala: {nextClass.extendedProps.room}</p>
              </div>
            ) : (
              <p className="text-sm italic opacity-60">To już koniec zajęć na dziś.</p>
            )}
          </div>

          {/* Statystyki */}
          <div className="pt-4 border-t border-[var(--color-accent)]/20">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Dydaktyka dzisiaj
            </h3>
            <div className="flex gap-4 text-center">
              <div className="flex-1 bg-[var(--color-bg)] p-2 rounded">
                <span className="block text-xl font-bold text-[var(--color-accent)]">
                  {classesToday.length}
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">Zajęć</span>
              </div>
              <div className="flex-1 bg-[var(--color-bg)] p-2 rounded">
                <span className="block text-xl font-bold text-[var(--color-accent)]">
                  {totalHoursToday}h
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">Godzin</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}