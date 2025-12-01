// app/components/TeacherDashboard.tsx
"use client";

import { useState, useEffect } from "react";
import ScheduleCalendar, { CalendarEvent } from "@/app/components/ScheduleCalendar";

export default function LecturerDashboard() {
  const [dashboardEvents, setDashboardEvents] = useState<CalendarEvent[]>([]);
  const [currentClass, setCurrentClass] = useState<CalendarEvent | null>(null);
  const [nextClass, setNextClass] = useState<CalendarEvent | null>(null);

  // Logic to calculate "Now" and "Next" based on calendar events
  useEffect(() => {
    const updateCurrentClasses = () => {
      const now = new Date();
      let current: CalendarEvent | null = null;
      let next: CalendarEvent | null = null;

      // Filter for today's classes
      const todaysClasses = dashboardEvents.filter((e) => {
        if (e.allDay || e.extendedProps.source !== "class") return false;
        const eStart = new Date(e.start);
        return eStart.toDateString() === now.toDateString();
      });

      // Sort by time
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
    const interval = setInterval(updateCurrentClasses, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [dashboardEvents]);

  // Statistics for the side panel
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
      
      {/* Grid Layout: Calendar + Info Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        
        {/* Left Column: Calendar Component */}
        <div className="lg:col-span-2 bg-[var(--color-bg)] rounded-xl shadow-md border border-[#327f7a] overflow-hidden">
          <div className="p-4">
             {/* Reusing the ScheduleCalendar component */}
            <ScheduleCalendar onEventsLoaded={setDashboardEvents} />
          </div>
        </div>

        {/* Right Column: Dynamic Class Info */}
        <div className="bg-[var(--color-bg)] p-6 rounded-xl shadow-md flex flex-col gap-6 border border-[#327f7a] h-fit">
          
          <div className="pb-2 border-b border-[#327f7a]">
            <h2 className="text-xl font-semibold text-[#327f7a]">Panel Dydaktyczny</h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>

          {/* Current Class */}
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
              Aktualnie trwają:
            </p>
            {currentClass ? (
              <div className="bg-teal-700 text-white p-4 rounded-lg shadow-lg">
                <p className="font-bold text-lg">{currentClass.extendedProps.type}</p>
                <p className="text-sm opacity-90">{currentClass.title}</p>
                <div className="mt-2 flex justify-between text-xs opacity-80 border-t border-teal-600 pt-2">
                  <span>Sala: {currentClass.extendedProps.room}</span>
                  <span>
                    {new Date(currentClass.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" - "}
                    {currentClass.end
                      ? new Date(currentClass.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : ""}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-[rgba(50,127,122,0.1)] p-4 rounded-lg border border-dashed border-[#327f7a]">
                <p className="text-sm italic text-center opacity-80">Brak zajęć w tej chwili.</p>
              </div>
            )}
          </div>

          {/* Next Class */}
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
              Następne zajęcia:
            </p>
            {nextClass ? (
              <div className="bg-[var(--color-bg)] border-l-4 border-[#327f7a] p-4 rounded-r-lg shadow-sm">
                <p className="font-bold text-[#327f7a]">{nextClass.title}</p>
                <p className="text-xs mt-1 text-[var(--color-text-secondary)]">
                  {new Date(nextClass.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {" - "}
                  {nextClass.end
                    ? new Date(nextClass.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : ""}
                </p>
                <p className="text-xs mt-1 font-semibold">Sala: {nextClass.extendedProps.room}</p>
              </div>
            ) : (
              <p className="text-sm italic opacity-60">Brak zaplanowanych zajęć na resztę dnia.</p>
            )}
          </div>

          {/* Daily Stats */}
          <div className="pt-4 border-t border-[#327f7a]/30">
            <h3 className="mb-3 text-sm font-semibold text-center text-[var(--color-text-secondary)]">
              Podsumowanie dnia
            </h3>
            <div className="flex gap-4 text-center">
              <div className="flex-1 bg-[rgba(50,127,122,0.1)] p-2 rounded border border-[#327f7a]/20">
                <span className="block text-xl font-bold text-[#327f7a]">
                  {classesToday.length}
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">Grup</span>
              </div>
              <div className="flex-1 bg-[rgba(50,127,122,0.1)] p-2 rounded border border-[#327f7a]/20">
                <span className="block text-xl font-bold text-[#327f7a]">
                  {totalHoursToday}h
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">Godzin</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sekcja aktualności (Preserved from original file) */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-center mb-2">Aktualności</h2>
        <div className="border-t-4 border-[#327f7a] w-1/3 mx-auto mb-4"></div>

        <h3 className="text-lg font-bold text-center mb-2">
          Spotkanie informacyjne dla wykładowców
        </h3>
        <p className="text-sm text-center max-w-3xl mx-auto text-[var(--color-text)]">
          W czwartek 14 listopada o godz. 14:00 w sali konferencyjnej odbędzie się spotkanie informacyjne dotyczące nowych zasad wprowadzania ocen i obsługi systemu USOSWEB.
        </p>

        <div className="border-t-2 border-[#327f7a] w-1/3 mx-auto mb-4 mt-4"></div>

        <h3 className="text-lg font-bold text-center mb-2">
          Szkolenie z obsługi platformy e-learningowej
        </h3>
        <p className="text-sm text-center max-w-3xl mx-auto text-[var(--color-text)]">
          W dniu 20 listopada o godz. 10:00 w laboratorium 204 odbędzie się szkolenie z nowej wersji systemu e-learningowego. Zainteresowanych wykładowców prosimy o wcześniejszą rejestrację.
        </p>

        <div className="border-t-4 border-[#327f7a] w-1/3 mx-auto mb-4"></div>

        <h3 className="text-lg font-bold text-center mb-2">
          Aktualizacja zasad prowadzenia zaliczeń
        </h3>
        <p className="text-sm text-center max-w-3xl mx-auto text-[var(--color-text)]">
          Od przyszłego semestru obowiązują zmodyfikowane zasady zaliczeń. Prosimy o zapoznanie się z dokumentem dostępnym w sekcji „Materiały dla wykładowców”.
        </p>
      </section>
    </main>
  );
}