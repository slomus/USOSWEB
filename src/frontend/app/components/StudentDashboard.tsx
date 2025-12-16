"use client";

import { useState, useEffect } from "react";
import StudentCalendar, { CalendarEvent } from "@/app/components/ScheduleCalendar";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

// --- TYPY ---

type Grade = {
  gradeId: number;
  subjectName: string;
  value: string;
  createdAt: string;
  addedByName: string;
};

// Struktura danych z API (Schedule)
type ScheduleItem = {
  scheduleId: number;
  subjectName: string;
  classType: string;
  dayOfWeek: number; // 1 = Poniedziałek, 7 = Niedziela
  startTime: string; // "HH:MM:SS"
  endTime: string;   // "HH:MM:SS"
  room: string;
  building?: string;
};

// Uproszczony typ do wyświetlania w panelu bocznym
type DashboardClassInfo = {
  title: string;
  type: string;
  room: string;
  start: Date;
  end: Date;
};

export default function StudentMainPage() {
  const [dashboardEvents, setDashboardEvents] = useState<CalendarEvent[]>([]); // Tylko dla wizualnego kalendarza
  const [recentGrades, setRecentGrades] = useState<Grade[]>([]);
  
  // Stan dla panelu bocznego (niezależny od kalendarza)
  const [todayStats, setTodayStats] = useState({ count: 0, hours: 0 });
  const [currentClass, setCurrentClass] = useState<DashboardClassInfo | null>(null);
  const [nextClass, setNextClass] = useState<DashboardClassInfo | null>(null);
  const [todaysScheduleRaw, setTodaysScheduleRaw] = useState<ScheduleItem[]>([]);

  // --- HELPERY CZASOWE ---

  // Zwraca obiekt Date ustawiony na "Teraz" w strefie czasowej Warszawy/Polski
  const getWarsawNow = () => {
    const now = new Date();
    // Hack: konwersja do stringa w strefie PL, potem powrót do obiektu Date
    // Zapobiega problemom, gdy serwer/przeglądarka jest w UTC a w Polsce zmienił się już dzień
    const plDateString = now.toLocaleString("en-US", { timeZone: "Europe/Warsaw" });
    return new Date(plDateString);
  };

  // Konwertuje godzinę "HH:MM:SS" z API na obiekt Date dzisiejszego dnia
  const parseTimeToday = (timeStr: string, todayDate: Date): Date => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date(todayDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // --- LOGIKA API ---

  // 1. Pobieranie ocen
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

  // 2. Pobieranie planu na ten tydzień i przetwarzanie danych na DZIŚ
  const fetchDashboardData = async () => {
    try {
      const nowPL = getWarsawNow();
      
      // Format YYYY-MM-DD dla API
      const year = nowPL.getFullYear();
      const month = String(nowPL.getMonth() + 1).padStart(2, "0");
      const day = String(nowPL.getDate()).padStart(2, "0");
      const dateParam = `${year}-${month}-${day}`;

      const response = await fetch(
        `${API_BASE}/api/student/schedule/week?date=${dateParam}`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await response.json();

      if (data.success && Array.isArray(data.schedule)) {
        const scheduleList: ScheduleItem[] = data.schedule;

        // Wyznaczamy dzisiejszy dzień tygodnia (1-7)
        const currentDayJS = nowPL.getDay();
        const currentDayAPI = currentDayJS === 0 ? 7 : currentDayJS;

        // Filtrujemy zajęcia tylko na DZIŚ
        const todaysClasses = scheduleList.filter(
          (item) => item.dayOfWeek === currentDayAPI
        );

        // Sortujemy chronologicznie
        todaysClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));

        // Zapisujemy surowe dane do stanu (użyjemy ich do odświeżania "Teraz/Następnie")
        setTodaysScheduleRaw(todaysClasses);

        // --- OBLICZANIE STATYSTYK (LICZBA I GODZINY) ---
        let totalMinutes = 0;
        todaysClasses.forEach((item) => {
          const start = parseTimeToday(item.startTime, nowPL);
          const end = parseTimeToday(item.endTime, nowPL);
          const diffMs = end.getTime() - start.getTime();
          totalMinutes += diffMs / (1000 * 60);
        });

        setTodayStats({
          count: todaysClasses.length,
          hours: parseFloat((totalMinutes / 60).toFixed(1)),
        });

        // Wywołujemy od razu aktualizację statusu Teraz/Następnie
        updateCurrentAndNext(todaysClasses);
      }
    } catch (error) {
      console.error("Błąd pobierania danych dashboardu:", error);
    }
  };

  // 3. Funkcja wyznaczająca "Teraz" i "Następnie" (uruchamiana cyklicznie)
  const updateCurrentAndNext = (todaysClasses: ScheduleItem[]) => {
    const now = getWarsawNow();
    let foundCurrent: DashboardClassInfo | null = null;
    let foundNext: DashboardClassInfo | null = null;

    for (const item of todaysClasses) {
      const start = parseTimeToday(item.startTime, now);
      const end = parseTimeToday(item.endTime, now);

      // Jeśli aktualny czas mieści się w przedziale zajęć
      if (now >= start && now < end) {
        foundCurrent = {
          title: item.subjectName,
          type: item.classType,
          room: item.room,
          start: start,
          end: end
        };
      }
      // Jeśli zajęcia dopiero będą (i nie mamy jeszcze znalezionego "następnego")
      else if (now < start) {
        if (!foundNext) {
          foundNext = {
            title: item.subjectName,
            type: item.classType,
            room: item.room,
            start: start,
            end: end
          };
        }
      }
    }

    setCurrentClass(foundCurrent);
    setNextClass(foundNext);
  };

  // --- EFEKTY ---

  useEffect(() => {
    fetchRecentGrades();
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Odświeżanie statusu "Teraz/Następnie" co minutę (bez ponownego pytania API)
  useEffect(() => {
    const interval = setInterval(() => {
      if (todaysScheduleRaw.length > 0) {
        updateCurrentAndNext(todaysScheduleRaw);
      }
    }, 60000); // co 60 sekund

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todaysScheduleRaw]);

  return (
    <main className="min-h-screen px-6 py-6 text-[var(--color-text)] bg-[var(--color-bg)]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        
        {/* KOLUMNA LEWA: KALENDARZ */}
        <div className="lg:col-span-2">
          {/* Kalendarz nadal działa wizualnie, przekazuje eventy, ale panel boczny jest niezależny */}
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

          {/* Teraz - obliczane niezależnie */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] pt-4 border-t border-[var(--color-accent)]/20">
              Teraz
            </h3>
            {currentClass ? (
              <div className="bg-[var(--color-accent)] text-white p-4 rounded-lg shadow-lg">
                <p className="font-bold text-lg">{currentClass.type}</p>
                <p className="text-sm opacity-90">{currentClass.title}</p>
                <div className="mt-2 flex justify-between text-xs opacity-80">
                  <span>{currentClass.room}</span>
                  <span>
                    {currentClass.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" - "}
                    {currentClass.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm italic opacity-60">Brak zajęć dydaktycznych w tej chwili.</p>
            )}
          </div>

          {/* Następnie - obliczane niezależnie */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] pt-4 border-t border-[var(--color-accent)]/20">
              Następnie
            </h3>
            {nextClass ? (
              <div className="bg-[var(--color-bg)] border border-[var(--color-accent)] p-4 rounded-lg">
                <p className="font-bold text-[var(--color-accent)]">{nextClass.title}</p>
                <p className="text-xs mt-1 text-[var(--color-text-secondary)]">
                  {nextClass.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {" - "}
                  {nextClass.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="text-xs mt-1">Sala: {nextClass.room}</p>
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
                  {todayStats.count}
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">Zajęć</span>
              </div>
              <div className="flex-1 bg-[var(--color-bg)] p-2 rounded">
                <span className="block text-xl font-bold text-[var(--color-accent)]">
                  {todayStats.hours}h
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