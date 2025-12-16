"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import plLocale from "@fullcalendar/core/locales/pl";
import { DatesSetArg } from "@fullcalendar/core";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

// --- TYPY DANYCH ---

type ApiAcademicEvent = {
  eventId: string;
  eventType: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  academicYear: string;
  appliesTo: string;
};

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

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  backgroundColor: string;
  borderColor: string;
  textColor?: string;
  extendedProps: {
    category: "academic" | "class";
    classType?: string;
    room?: string;
    building?: string;
    instructor?: string;
    type?: string;
    description?: string;
    appliesTo?: string;
  };
};

// --- KOLORY I STYLE ---

const academicColors: Record<string, { bg: string; border: string }> = {
  holiday: { bg: "#dc2626", border: "#991b1b" },
  break: { bg: "#f59e0b", border: "#b45309" },
  exam_session: { bg: "#7c3aed", border: "#5b21b6" },
  rector_day: { bg: "#db2777", border: "#be185d" },
  other: { bg: "#4b5563", border: "#374151" },
  default: { bg: "#475569", border: "#334155" },
};

const classColors: Record<string, string> = {
  wykład: "#2563eb",
  ćwiczenia: "#16a34a",
  laboratorium: "#7c3aed",
  seminarium: "#db2777",
  projekt: "#ca8a04",
  egzamin: "#dc2626",
  default: "#4b5563",
};

const getAcademicColor = (type: string) => academicColors[type] || academicColors.default;

const getClassColor = (type: string) => {
  const normalized = type?.toLowerCase() || "";
  if (normalized.includes("wyk")) return classColors.wykład;
  if (normalized.includes("ćw")) return classColors.ćwiczenia;
  if (normalized.includes("lab")) return classColors.laboratorium;
  if (normalized.includes("sem")) return classColors.seminarium;
  if (normalized.includes("proj")) return classColors.projekt;
  return classColors.default;
};

const getEventTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    holiday: "Święto / Wolne",
    break: "Przerwa",
    exam_session: "Sesja egzaminacyjna",
    rector_day: "Dzień Rektorski",
    other: "Inne",
  };
  return labels[type] || type;
};

// --- HELPERY ---
const extractTime = (timeStr: string): string => {
  if (!timeStr) return "00:00:00";
  return timeStr.includes("T") ? timeStr.split("T")[1].substring(0, 8) : timeStr.substring(0, 8);
};

export default function ScheduleCalendar() {
  const calendarRef = useRef<any>(null);
  
  const [academicEvents, setAcademicEvents] = useState<CalendarEvent[]>([]);
  const [scheduleEvents, setScheduleEvents] = useState<CalendarEvent[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showModal, setShowModal] = useState(false);

  // --- LOGIKA FILTROWANIA I ŁĄCZENIA ---
  const allEvents = useMemo(() => {
    // 1. Zidentyfikuj wydarzenia blokujące zajęcia (święta, przerwy, sesje, dni rektorskie)
    const blockingEvents = academicEvents.filter((evt) => {
        const type = evt.extendedProps.type || "";
        return ["holiday", "break", "rector_day", "exam_session"].includes(type);
    });

    // 2. Przefiltruj zajęcia z planu
    const visibleScheduleEvents = scheduleEvents.filter((classEvent) => {
        const classDateStr = classEvent.start.split("T")[0]; // YYYY-MM-DD

        // Sprawdź, czy data zajęć zawiera się w zakresie jakiegoś wydarzenia blokującego
        const isBlocked = blockingEvents.some((blockEvt) => {
            const blockStart = blockEvt.start; // YYYY-MM-DD
            // blockEvt.end jest "exclusive" (dzień + 1) dla FullCalendar, więc używamy < zamiast <=
            const blockEnd = blockEvt.end || blockEvt.start; 
            
            return classDateStr >= blockStart && classDateStr < blockEnd;
        });

        // Jeśli dzień jest zablokowany, nie pokazuj zajęć
        return !isBlocked;
    });

    // 3. Połącz listy: Wydarzenia akademickie zawsze widoczne + przefiltrowane zajęcia
    return [...academicEvents, ...visibleScheduleEvents];
  }, [academicEvents, scheduleEvents]);

  // --- POBIERANIE DANYCH ---

  // 1. Wydarzenia akademickie (statyczne)
  const fetchAcademicEvents = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/calendar/academic`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();

      if (result.success && Array.isArray(result.events)) {
        const formatted: CalendarEvent[] = result.events.map((item: ApiAcademicEvent) => {
          const colors = getAcademicColor(item.eventType);
          
          let endDateObj = new Date(item.endDate || item.startDate);
          endDateObj.setHours(0, 0, 0, 0);
          const fcEndObj = new Date(endDateObj);
          fcEndObj.setDate(fcEndObj.getDate() + 1); // Exclusive end date

          return {
            id: `acad-${item.eventId}`,
            title: `[${getEventTypeLabel(item.eventType)}] ${item.title}`,
            start: item.startDate,
            end: fcEndObj.toISOString().split("T")[0],
            allDay: true,
            backgroundColor: colors.bg,
            borderColor: colors.border,
            textColor: "#ffffff",
            extendedProps: {
              category: "academic",
              type: item.eventType,
              description: item.description,
              appliesTo: item.appliesTo,
            },
          };
        });
        setAcademicEvents(formatted);
      }
    } catch (error) {
      console.error("Błąd pobierania kalendarza akademickiego:", error);
    }
  };

  // 2. Plan zajęć (dynamiczny na podstawie widoku)
  const fetchSchedule = useCallback(async (viewDate: Date) => {
    setLoading(true);
    try {
      const dateParam = viewDate.toISOString().split("T")[0];
      const response = await fetch(`${API_BASE}/api/student/schedule/week?date=${dateParam}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await response.json();

      if (data.success && Array.isArray(data.schedule)) {
        // Znajdź poniedziałek dla danego tygodnia (nawet jeśli widok to 'timeGridDay')
        const currentMonday = new Date(viewDate);
        const day = currentMonday.getDay();
        const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
        currentMonday.setDate(diff);
        currentMonday.setHours(0,0,0,0);

        const formatted: CalendarEvent[] = data.schedule.map((item: ScheduleClass) => {
          const color = getClassColor(item.classType);
          
          const targetDate = new Date(currentMonday);
          targetDate.setDate(currentMonday.getDate() + (item.dayOfWeek - 1));
          const dateIso = targetDate.toISOString().split("T")[0];

          return {
            id: `sched-${item.scheduleId}`,
            title: `${item.subjectName} (${item.classType})`,
            start: `${dateIso}T${extractTime(item.startTime)}`,
            end: `${dateIso}T${extractTime(item.endTime)}`,
            allDay: false,
            backgroundColor: color,
            borderColor: color,
            textColor: "#ffffff",
            extendedProps: {
              category: "class",
              classType: item.classType,
              room: item.room,
              building: item.building,
              instructor: item.instructorName,
            },
          };
        });
        setScheduleEvents(formatted);
      }
    } catch (error) {
      console.error("Błąd pobierania planu:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAcademicEvents();
  }, []);

  const handleDatesSet = (arg: DatesSetArg) => {
    // Pobieramy środek zakresu widoku, aby określić tydzień
    const midDate = new Date((arg.start.getTime() + arg.end.getTime()) / 2);
    fetchSchedule(midDate);
  };

  const handleEventClick = (info: any) => {
    const event = info.event;
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.startStr,
      end: event.endStr,
      allDay: event.allDay,
      backgroundColor: event.backgroundColor,
      borderColor: event.borderColor,
      extendedProps: event.extendedProps,
    });
    setShowModal(true);
  };

  const refreshData = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      fetchSchedule(api.getDate());
      fetchAcademicEvents();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header i Narzędzia */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text)]">Mój Plan i Kalendarz</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Plan zajęć (dni wolne są uwzględniane automatycznie).
          </p>
        </div>
        <div className="flex gap-2">
            <button
            onClick={refreshData}
            disabled={loading}
            className="px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded hover:bg-[var(--color-accent)] hover:text-white transition-colors text-sm"
            >
            {loading ? "Ładowanie..." : "Odśwież"}
            </button>
            <button
            onClick={() => calendarRef.current?.getApi()?.today()}
            className="px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)] text-sm transition-colors"
            >
            Dziś
            </button>
        </div>
      </div>

      {/* KALENDARZ */}
      <div className="bg-[var(--color-bg-secondary)] p-4 md:p-6 rounded-xl shadow-md calendar-wrapper border border-[var(--color-accent)]/20">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridDay" // Domyślny widok: Dzień
          locale={plLocale}
          firstDay={1}
          slotMinTime="08:00:00"
          slotMaxTime="21:00:00"
          allDayText="Info"
          weekends={true}
          events={allEvents}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          headerToolbar={{
            left: "prev,next today", // Nawigacja po lewej
            center: "title",
            right: "timeGridDay,timeGridWeek", // Przełącznik Dzień/Tydzień po prawej
          }}
          buttonText={{
            today: "Dziś",
            day: "Dzień",
            week: "Tydzień",
          }}
          height="auto"
          dayMaxEvents={true}
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        />
      </div>

      {/* LEGENDA */}
      <div className="flex flex-wrap gap-4 text-xs p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-accent)]/20">
        <span className="font-bold text-[var(--color-text-secondary)] uppercase">Legenda:</span>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{background: classColors.wykład}}></span> Wykład
        </div>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{background: classColors.ćwiczenia}}></span> Ćwiczenia
        </div>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{background: academicColors.holiday.bg}}></span> Święto / Wolne
        </div>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{background: academicColors.exam_session.bg}}></span> Sesja
        </div>
      </div>

      {/* MODAL SZCZEGÓŁÓW */}
      {showModal && selectedEvent && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 text-[var(--color-text)]"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-[var(--color-bg-secondary)] rounded-xl p-6 max-w-md w-full shadow-2xl border border-[var(--color-accent)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold pr-4 break-words">{selectedEvent.title}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>

            <div className="space-y-4 text-sm">
                
              {/* Typ wydarzenia */}
              <div
                className="p-2 rounded border text-white font-medium mb-3 text-center uppercase text-xs tracking-wider"
                style={{
                  backgroundColor: selectedEvent.backgroundColor,
                  borderColor: selectedEvent.borderColor,
                }}
              >
                {selectedEvent.extendedProps.category === "class" 
                    ? selectedEvent.extendedProps.classType 
                    : getEventTypeLabel(selectedEvent.extendedProps.type || "")}
              </div>

              {/* Data i czas */}
              <div className="flex items-center gap-3 border-b border-gray-700/50 pb-3">
                <span className="w-20 text-[var(--color-text-secondary)] font-semibold">Kiedy:</span>
                <div>
                  <div className="font-medium">
                    {new Date(selectedEvent.start).toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}
                  </div>
                  {!selectedEvent.allDay && selectedEvent.end && (
                    <div className="text-[var(--color-accent)]">
                      {new Date(selectedEvent.start).toLocaleTimeString("pl-PL", { hour: '2-digit', minute: '2-digit' })} - 
                      {new Date(selectedEvent.end).toLocaleTimeString("pl-PL", { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>

              {/* DETALE ZAJĘĆ */}
              {selectedEvent.extendedProps.category === "class" && (
                <>
                  <div className="grid grid-cols-[80px_1fr] gap-2">
                    <span className="text-[var(--color-text-secondary)]">Budynek:</span>
                    <span>{selectedEvent.extendedProps.building}</span>
                    
                    <span className="text-[var(--color-text-secondary)]">Sala:</span>
                    <span className="font-bold text-[var(--color-accent)]">{selectedEvent.extendedProps.room}</span>
                    
                    <span className="text-[var(--color-text-secondary)]">Prowadzący:</span>
                    <span>{selectedEvent.extendedProps.instructor}</span>
                  </div>
                </>
              )}

              {/* DETALE AKADEMICKIE */}
              {selectedEvent.extendedProps.category === "academic" && (
                <>
                   {selectedEvent.extendedProps.appliesTo && (
                    <div className="flex gap-2">
                        <span className="text-[var(--color-text-secondary)] font-semibold">Dotyczy:</span>
                        <span>{selectedEvent.extendedProps.appliesTo}</span>
                    </div>
                   )}
                   {selectedEvent.extendedProps.description && (
                    <div className="mt-2 pt-2 border-t border-gray-700/50">
                        <p className="opacity-90 leading-relaxed italic text-justify">
                            {selectedEvent.extendedProps.description}
                        </p>
                    </div>
                   )}
                </>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .calendar-wrapper .fc {
          --fc-border-color: rgba(128, 128, 128, 0.3);
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: rgba(128, 128, 128, 0.1);
          --fc-today-bg-color: rgba(var(--color-accent-rgb), 0.1) !important;
        }
        .calendar-wrapper .fc-col-header-cell {
          background-color: var(--color-bg);
          color: var(--color-text);
          padding: 8px 0;
          border-bottom: 2px solid var(--color-accent);
        }
        .calendar-wrapper .fc-timegrid-slot-label-cushion,
        .calendar-wrapper .fc-daygrid-day-number {
            color: var(--color-text-secondary);
        }
        .calendar-wrapper .fc-event {
          border: none;
          box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
          border-radius: 4px;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .calendar-wrapper .fc-event:hover {
          transform: scale(1.01);
          filter: brightness(1.1);
          z-index: 10;
        }
        .calendar-wrapper .fc-button {
          background-color: var(--color-accent) !important;
          border-color: var(--color-accent) !important;
          text-transform: capitalize;
        }
        .calendar-wrapper .fc-button:hover {
          background-color: var(--color-accent-hover) !important;
          border-color: var(--color-accent-hover) !important;
        }
      `}</style>
    </div>
  );
}