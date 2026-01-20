"use client";

import { useState, useEffect } from "react";
import StudentCalendar, { CalendarEvent } from "@/app/components/ScheduleCalendar";
import { getApiBaseUrl } from "@/app/config/api";

const API_BASE = getApiBaseUrl();

// --- TYPY ---

type Grade = {
  gradeId: number;
  subjectName: string;
  value: string;
  createdAt: string;
  addedByName: string;
};

type ScheduleItem = {
  scheduleId: number;
  subjectName: string;
  classType: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
  building?: string;
};

type DashboardClassInfo = {
  title: string;
  type: string;
  room: string;
  start: Date;
  end: Date;
  building?: string;
};

export default function StudentMainPage() {
  // Stan danych
  const [recentGrades, setRecentGrades] = useState<Grade[]>([]);
  const [todayStats, setTodayStats] = useState({ count: 0, hours: 0 });
  const [currentClass, setCurrentClass] = useState<DashboardClassInfo | null>(null);
  const [nextClass, setNextClass] = useState<DashboardClassInfo | null>(null);
  const [todaysScheduleRaw, setTodaysScheduleRaw] = useState<ScheduleItem[]>([]);
  
  // Stan UI
  const [isLoading, setIsLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setDashboardEvents] = useState<CalendarEvent[]>([]); // Placeholder na eventy z kalendarza

  // --- HELPERY CZASOWE ---

  const getWarsawDate = () => {
    // Tworzy obiekt daty przesunięty do strefy Europe/Warsaw
    const now = new Date();
    const plString = now.toLocaleString("en-US", { timeZone: "Europe/Warsaw" });
    return new Date(plString);
  };

  const parseTimeToday = (timeStr: string, todayDate: Date): Date => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date(todayDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // --- LOGIKA API ---

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const nowPL = getWarsawDate();
      
      // 1. Oceny
      const gradesRes = await fetch(`${API_BASE}/api/student/grades/recent`, {
        credentials: "include",
      });
      const gradesData = await gradesRes.json();
      if (gradesData.grades) setRecentGrades(gradesData.grades);

      // 2. Plan zajęć (na tydzień -> filtrujemy na dziś)
      const year = nowPL.getFullYear();
      const month = String(nowPL.getMonth() + 1).padStart(2, "0");
      const day = String(nowPL.getDate()).padStart(2, "0");
      
      const scheduleRes = await fetch(
        `${API_BASE}/api/student/schedule/week?date=${year}-${month}-${day}`,
        { credentials: "include" }
      );
      const scheduleData = await scheduleRes.json();

      if (scheduleData.success && Array.isArray(scheduleData.schedule)) {
        const scheduleList: ScheduleItem[] = scheduleData.schedule;
        
        // Dzień tygodnia (1=Pon ... 7=Niedz)
        const currentDayJS = nowPL.getDay();
        const currentDayAPI = currentDayJS === 0 ? 7 : currentDayJS;

        const todaysClasses = scheduleList.filter(
          (item) => item.dayOfWeek === currentDayAPI
        );
        todaysClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));

        setTodaysScheduleRaw(todaysClasses);

        // Statystyki
        let totalMinutes = 0;
        todaysClasses.forEach((item) => {
          const start = parseTimeToday(item.startTime, nowPL);
          const end = parseTimeToday(item.endTime, nowPL);
          totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
        });

        setTodayStats({
          count: todaysClasses.length,
          hours: parseFloat((totalMinutes / 60).toFixed(1)),
        });

        updateCurrentAndNext(todaysClasses);
      }
    } catch (error) {
      console.error("Błąd pobierania danych:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCurrentAndNext = (todaysClasses: ScheduleItem[]) => {
    const now = getWarsawDate();
    let foundCurrent: DashboardClassInfo | null = null;
    let foundNext: DashboardClassInfo | null = null;

    for (const item of todaysClasses) {
      const start = parseTimeToday(item.startTime, now);
      const end = parseTimeToday(item.endTime, now);

      if (now >= start && now < end) {
        foundCurrent = {
          title: item.subjectName,
          type: item.classType,
          room: item.room,
          building: item.building,
          start, end
        };
      } else if (now < start) {
        if (!foundNext) {
          foundNext = {
            title: item.subjectName,
            type: item.classType,
            room: item.room,
            building: item.building,
            start, end
          };
        }
      }
    }
    setCurrentClass(foundCurrent);
    setNextClass(foundNext);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Odświeżanie statusu co minutę
  useEffect(() => {
    const interval = setInterval(() => {
      if (todaysScheduleRaw.length > 0) updateCurrentAndNext(todaysScheduleRaw);
    }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todaysScheduleRaw]);

  // --- WIDOK ---

  return (
    <main className="min-h-screen p-4 md:p-6 text-[var(--color-text)] bg-[var(--color-bg)]">
      
      {/* Grid Layout: 
          Mobile: Flex Column (Sidebar first logic via order classes is tricky with 2 cols, so we duplicate or stack nicely).
          Desktop: 3 Columns (Calendar 2, Sidebar 1). 
      */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 mb-10 relative">
        
        {/* === KOLUMNA LEWA (KALENDARZ) === 
            Na mobile: order-2 (pod spodem), Desktop: domyślnie po lewej
        */}
        <div className="order-2 lg:order-1 lg:col-span-2 flex flex-col gap-6">
           <h2 className="text-xl font-bold text-[var(--color-text)] hidden lg:block">Plan zajęć</h2>
           <div className="bg-[var(--color-bg-secondary)] rounded-xl shadow-sm border border-[var(--color-text)]/5 overflow-hidden">
             {/* Przekazujemy setDashboardEvents jeśli chcesz wyciągać dane z kalendarza, 
                 ale tutaj dashboard ma swoje dane. */}
             <StudentCalendar onEventsLoaded={setDashboardEvents} />
           </div>
        </div>

        {/* === KOLUMNA PRAWA (SIDEBAR) === 
            Na mobile: order-1 (na górze), Desktop: order-2 (po prawej)
        */}
        <div className="order-1 lg:order-2 flex flex-col gap-6">
          
          {/* Kontener Sticky - działa tylko na desktopie (lg) */}
          <div className="lg:sticky lg:top-[90px] flex flex-col gap-5">

            {/* SKELETON LOADING */}
            {isLoading ? (
               <div className="space-y-4 animate-pulse">
                  <div className="h-32 bg-[var(--color-bg-secondary)] rounded-xl"></div>
                  <div className="h-24 bg-[var(--color-bg-secondary)] rounded-xl"></div>
                  <div className="h-40 bg-[var(--color-bg-secondary)] rounded-xl"></div>
               </div>
            ) : (
              <>
                {/* 1. KARTA: TERAZ */}
                <div className="bg-[var(--color-bg-secondary)] p-5 rounded-xl shadow-md border-l-4 border-[var(--color-accent)] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>

                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)] mb-2">Teraz</h3>
                  {currentClass ? (
                    <div>
                      <h4 className="text-xl md:text-2xl font-bold leading-tight mb-1">{currentClass.title}</h4>
                      <p className="text-sm font-medium text-[var(--color-text-secondary)] uppercase">{currentClass.type}</p>
                      
                      <div className="mt-4 flex flex-wrap gap-3 text-sm">
                         <div className="flex items-center gap-1 bg-[var(--color-bg)] px-2 py-1 rounded">
                           <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m8-2a2 2 0 00-2-2H9a2 2 0 00-2 2v2m7-2a2 2 0 01-2-2h-5a2 2 0 01-2 2" /></svg>
                           <span>{currentClass.room}</span>
                         </div>
                         <div className="flex items-center gap-1 bg-[var(--color-bg)] px-2 py-1 rounded">
                           <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                           <span>
                             {currentClass.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {currentClass.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                           </span>
                         </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-sm text-[var(--color-text-secondary)] italic">Brak zajęć w tej chwili.</p>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1 opacity-70">Jesteś wolny!</p>
                    </div>
                  )}
                </div>

                {/* 2. KARTA: NASTĘPNIE */}
                <div className="bg-[var(--color-bg-secondary)] p-5 rounded-xl shadow-sm border border-[var(--color-text)]/5">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-secondary)] mb-3">Następnie</h3>
                   {nextClass ? (
                     <div className="flex items-start gap-3">
                       <div className="bg-[var(--color-bg)] p-2 rounded-lg text-center min-w-[60px]">
                          <span className="block text-sm font-bold">{nextClass.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          <span className="block text-[10px] text-[var(--color-text-secondary)]">Start</span>
                       </div>
                       <div>
                          <p className="font-bold text-sm line-clamp-1">{nextClass.title}</p>
                          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{nextClass.type}</p>
                          <p className="text-xs mt-1 font-medium">Sala: {nextClass.room}</p>
                       </div>
                     </div>
                   ) : (
                     <p className="text-sm italic text-[var(--color-text-secondary)]">Koniec zajęć na dzisiaj.</p>
                   )}
                </div>

                {/* 3. KARTA: STATYSTYKI DZISIAJ */}
                <div className="bg-[var(--color-bg-secondary)] p-4 rounded-xl shadow-sm flex items-center justify-between">
                   <div className="text-center flex-1 border-r border-[var(--color-text)]/10">
                      <span className="block text-2xl font-bold text-[var(--color-accent)]">{todayStats.count}</span>
                      <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-secondary)]">Zajęć</span>
                   </div>
                   <div className="text-center flex-1">
                      <span className="block text-2xl font-bold text-[var(--color-accent)]">{todayStats.hours}h</span>
                      <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-secondary)]">Godzin</span>
                   </div>
                </div>

                {/* 4. OSTATNIE OCENY */}
                <div className="bg-[var(--color-bg-secondary)] p-5 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">Ostatnie oceny</h3>
                    {recentGrades.length > 0 && <span className="text-[10px] bg-[var(--color-accent)] text-[var(--color-text)] px-1.5 py-0.5 rounded">Nowe</span>}
                  </div>
                  
                  {recentGrades.length > 0 ? (
                    <div className="space-y-3">
                      {recentGrades.slice(0, 3).map((grade) => (
                        <div
                          key={grade.gradeId}
                          className="flex justify-between items-center bg-[var(--color-bg)] hover:bg-[var(--color-bg)]/80 p-3 rounded-lg transition-colors cursor-default border-l-[3px] border-teal-500"
                        >
                          <div className="overflow-hidden mr-2">
                            <p className="font-semibold text-xs truncate">{grade.subjectName}</p>
                            <p className="text-[10px] text-[var(--color-text-secondary)] truncate">{grade.addedByName}</p>
                          </div>
                          <span className="text-lg font-bold text-teal-500">{grade.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic text-[var(--color-text-secondary)] text-center py-2">Brak nowych ocen.</p>
                  )}
                </div>

              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}