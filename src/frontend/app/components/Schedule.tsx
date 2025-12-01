"use client";

import { useState, useEffect, useMemo } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

// --- TYPY ---

type ScheduleClass = {
  scheduleId: number;
  classId: number;
  subjectName: string;
  classType: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
  building: string;
  instructorName: string;
};

// --- KONFIGURACJA ---

const daysOfWeek: Record<number, string> = {
  1: "Poniedziałek",
  2: "Wtorek",
  3: "Środa",
  4: "Czwartek",
  5: "Piątek",
  6: "Sobota",
  7: "Niedziela",
};

const classTypeColors: Record<string, string> = {
  wykład: "#2563eb",         // Niebieski
  ćwiczenia: "#16a34a",      // Zielony
  laboratorium: "#7c3aed",   // Fioletowy
  seminarium: "#db2777",     // Różowy
  projekt: "#ca8a04",        // Złoty
  egzamin: "#dc2626",        // Czerwony
  default: "#4b5563",        // Szary
};

const getClassColor = (type: string) => {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes("wyk")) return classTypeColors.wykład;
  if (normalizedType.includes("ćw")) return classTypeColors.ćwiczenia;
  if (normalizedType.includes("lab")) return classTypeColors.laboratorium;
  if (normalizedType.includes("sem")) return classTypeColors.seminarium;
  if (normalizedType.includes("proj")) return classTypeColors.projekt;
  if (normalizedType.includes("egz") || normalizedType.includes("zal")) return classTypeColors.egzamin;
  return classTypeColors.default;
};

export default function StudentSchedule() {
  const [schedule, setSchedule] = useState<ScheduleClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append("date", selectedDate);

      const response = await fetch(
        `${API_BASE}/api/student/schedule/week?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await response.json();

      if (data.success) {
        // Sortowanie: najpierw dzień tygodnia, potem godzina rozpoczęcia
        const sorted = (data.schedule || []).sort((a: ScheduleClass, b: ScheduleClass) => {
          if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
          return a.startTime.localeCompare(b.startTime);
        });
        setSchedule(sorted);
      } else {
        console.error(`Błąd: ${data.message || "Nie udało się pobrać planu."}`);
      }
    } catch (error) {
      console.error("Błąd połączenia z serwerem");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    // eslint-disable-next-line
  }, [selectedDate]);

  const groupedSchedule = useMemo(() => {
    const groups: Record<number, ScheduleClass[]> = {};
    schedule.forEach((cls) => {
      if (!groups[cls.dayOfWeek]) groups[cls.dayOfWeek] = [];
      groups[cls.dayOfWeek].push(cls);
    });
    return groups;
  }, [schedule]);

  const formatHour = (timeString: string) => timeString.slice(0, 5);

  const handleSetToday = () => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* PASEK KONTROLNY (DATA I PRZYCISKI) */}
      <div className="flex flex-wrap justify-end gap-3 items-center bg-[var(--color-bg-secondary)] p-3 rounded-lg border border-[var(--color-accent)]/20 shadow-sm">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-accent)]/30 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-accent)] transition-colors"
        />
        <button
          onClick={handleSetToday}
          className="px-4 py-1.5 bg-[var(--color-bg)] border border-[var(--color-accent)]/30 text-[var(--color-text)] rounded hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all text-sm"
        >
          Ten tydzień
        </button>
        <button
          onClick={fetchSchedule}
          disabled={loading}
          className="px-4 py-1.5 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)] transition-colors text-sm shadow-md"
        >
          {loading ? "Ładowanie..." : "Odśwież"}
        </button>
      </div>

      {/* ZAWARTOŚĆ PLANU */}
      <div className="space-y-8">
        {schedule.length === 0 && !loading ? (
          <div className="text-center py-12 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-accent)]/20 text-[var(--color-text-secondary)]">
            <p className="text-lg">Brak zaplanowanych zajęć w tym tygodniu.</p>
          </div>
        ) : (
          [1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
            const dayClasses = groupedSchedule[dayNum];
            if (!dayClasses) return null;

            return (
              <div key={dayNum} className="animate-fade-in">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-3 text-[var(--color-accent)]">
                  <span className="uppercase tracking-wider">{daysOfWeek[dayNum]}</span>
                  <div className="h-[1px] flex-grow bg-gradient-to-r from-[var(--color-accent)]/50 to-transparent"></div>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dayClasses.map((cls) => {
                    const borderColor = getClassColor(cls.classType);
                    
                    return (
                      <div 
                        key={cls.scheduleId}
                        className="group relative bg-[var(--color-bg-secondary)] rounded-lg p-5 border border-[var(--color-accent)]/20 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 overflow-hidden"
                      >
                        {/* Kolorowy pasek boczny */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1.5" 
                          style={{ backgroundColor: borderColor }}
                        ></div>

                        <div className="pl-3 flex flex-col h-full">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold uppercase px-2 py-0.5 rounded text-white bg-opacity-90" style={{ backgroundColor: borderColor }}>
                              {cls.classType}
                            </span>
                            <span className="text-sm font-mono text-[var(--color-text-secondary)]">
                              {formatHour(cls.startTime)} - {formatHour(cls.endTime)}
                            </span>
                          </div>

                          <h4 className="text-lg font-bold leading-tight mb-1 group-hover:text-[var(--color-accent)] transition-colors">
                            {cls.subjectName}
                          </h4>

                          <div className="mt-auto pt-3 space-y-1 text-sm text-[var(--color-text-secondary)]">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                              <span>{cls.building}, Sala <span className="font-semibold text-[var(--color-text)]">{cls.room}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              <span>{cls.instructorName}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.6;
          cursor: pointer;
        }
        input[type="date"]::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}