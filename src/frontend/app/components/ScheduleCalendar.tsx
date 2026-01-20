"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import plLocale from "@fullcalendar/core/locales/pl";
import { DatesSetArg } from "@fullcalendar/core";
import { getApiBaseUrl } from "@/app/config/api";

const API_BASE = getApiBaseUrl();

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

export type CalendarEvent = {
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

// --- KOLORY ---

const academicColors: Record<string, { bg: string; border: string }> = {
  holiday: { bg: "#dc2626", border: "#991b1b" },
  break: { bg: "#d97706", border: "#b45309" },
  exam_session: { bg: "#7c3aed", border: "#5b21b6" },
  rector_day: { bg: "#db2777", border: "#be185d" },
  other: { bg: "#4b5563", border: "#374151" },
  default: { bg: "#475569", border: "#334155" },
};

const classColors: Record<string, string> = {
  wykład: "#2563eb",
  ćwiczenia: "#16a34a",
  laboratorium: "#9333ea",
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

const extractTime = (timeStr: string): string => {
  if (!timeStr) return "00:00:00";
  return timeStr.includes("T") ? timeStr.split("T")[1].substring(0, 8) : timeStr.substring(0, 8);
};

interface CalendarProps {
  onEventsLoaded?: (events: CalendarEvent[]) => void;
}

export default function ScheduleCalendar({ onEventsLoaded }: CalendarProps) {
  const calendarRef = useRef<any>(null);
  
  const [academicEvents, setAcademicEvents] = useState<CalendarEvent[]>([]);
  const [scheduleEvents, setScheduleEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  // Stan do wykrywania wersji mobilnej
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Inicjalizacja
    handleResize();
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- LOGIKA DANYCH ---
  
  const allEvents = useMemo(() => {
    const blockingEvents = academicEvents.filter((evt) => {
        const type = evt.extendedProps.type || "";
        return ["holiday", "break", "rector_day", "exam_session"].includes(type);
    });

    const visibleScheduleEvents = scheduleEvents.filter((classEvent) => {
        const classDateStr = classEvent.start.split("T")[0];
        const isBlocked = blockingEvents.some((blockEvt) => {
            const blockStart = blockEvt.start;
            const blockEnd = blockEvt.end || blockEvt.start; 
            return classDateStr >= blockStart && classDateStr < blockEnd;
        });
        return !isBlocked;
    });

    const merged = [...academicEvents, ...visibleScheduleEvents];
    
    if(onEventsLoaded) {
       setTimeout(() => onEventsLoaded(merged), 0);
    }
    return merged;
  }, [academicEvents, scheduleEvents, onEventsLoaded]);

  // --- API CALLS ---

  const fetchAcademicEvents = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/calendar/academic`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const result = await response.json();

      if (result.success && Array.isArray(result.events)) {
        const formatted: CalendarEvent[] = result.events.map((item: ApiAcademicEvent) => {
          const colors = getAcademicColor(item.eventType);
          let endDateObj = new Date(item.endDate || item.startDate);
          endDateObj.setHours(0, 0, 0, 0);
          const fcEndObj = new Date(endDateObj);
          fcEndObj.setDate(fcEndObj.getDate() + 1); 

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
      console.error("Błąd akademickie:", error);
    }
  };

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
      console.error("Błąd planu:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAcademicEvents();
  }, []);

  const handleDatesSet = (arg: DatesSetArg) => {
    const midDate = new Date((arg.start.getTime() + arg.end.getTime()) / 2);
    fetchSchedule(midDate);
  };

  const handleEventClick = (info: any) => {
    setSelectedEvent({
      id: info.event.id,
      title: info.event.title,
      start: info.event.startStr,
      end: info.event.endStr,
      allDay: info.event.allDay,
      backgroundColor: info.event.backgroundColor,
      borderColor: info.event.borderColor,
      extendedProps: info.event.extendedProps,
    });
    setShowModal(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* NAGŁÓWEK */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[var(--color-text)]">Kalendarz zajęć</h2>
          <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">
             Automatycznie ukrywa zajęcia w dni wolne.
          </p>
        </div>
        
        {/* Kontrolki - uproszczone */}
        <div className="flex items-center gap-2">
             {loading && <span className="text-xs text-[var(--color-accent)] animate-pulse mr-2">Ładowanie...</span>}
             <button
                onClick={() => {
                    fetchAcademicEvents();
                    if(calendarRef.current) fetchSchedule(calendarRef.current.getApi().getDate());
                }}
                className="px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-text)]/20 rounded hover:bg-[var(--color-bg-secondary)] text-xs md:text-sm transition-colors"
             >
                Odśwież
             </button>
        </div>
      </div>

      {/* KONTENER KALENDARZA */}
      <div className="bg-[var(--color-bg-secondary)] p-2 md:p-4 rounded-xl shadow-sm border border-[var(--color-text)]/5 calendar-wrapper">
        <FullCalendar
          // Kluczowe: zmiana klucza wymusza przerysowanie przy zmianie urządzenia
          key={isMobile ? "mobile" : "desktop"}
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          
          // Domyślny widok: Dzień na mobile, Tydzień na desktop
          initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
          
          // Konfiguracja toolbara zależna od urządzenia
          headerToolbar={
            isMobile
              ? {
                  left: "prev,next",
                  center: "title",
                  right: "today", // Tylko "Dziś" na mobile
                }
              : {
                  left: "prev,next today",
                  center: "title",
                  right: "timeGridDay,timeGridWeek,dayGridMonth", // Pełna opcja na desktop
                }
          }
          
          locale={plLocale}
          firstDay={1}
          slotMinTime="07:00:00"
          slotMaxTime="21:30:00"
          allDayText="Cały dzień"
          weekends={true}
          events={allEvents}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          buttonText={{
            today: "Dziś",
            month: "Miesiąc",
            week: "Tydzień",
            day: "Dzień",
          }}
          height="auto"
          contentHeight="auto"
          dayMaxEvents={true}
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          nowIndicator={true}
        />
      </div>

      {/* MODAL I LEGENDA (Bez zmian w logice, tylko kod) */}
      <div className="bg-[var(--color-bg-secondary)] p-4 rounded-xl border border-[var(--color-text)]/5">
        <span className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-3">Legenda</span>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
           <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{background: classColors.wykład}}></span> Wykład
           </div>
           <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{background: classColors.ćwiczenia}}></span> Ćwiczenia/Lab
           </div>
           <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{background: academicColors.holiday.bg}}></span> Dni wolne
           </div>
           <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{background: academicColors.exam_session.bg}}></span> Sesja
           </div>
        </div>
      </div>

      {showModal && selectedEvent && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-[var(--color-bg-secondary)] rounded-xl shadow-2xl border border-[var(--color-text)]/10 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-[var(--color-text)]/10 flex justify-between items-start bg-[var(--color-bg)]">
               <div>
                  <h2 className="text-lg md:text-xl font-bold leading-tight pr-2">{selectedEvent.title}</h2>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 uppercase tracking-wide">Szczegóły</p>
               </div>
               <button onClick={() => setShowModal(false)} className="p-1 hover:bg-[var(--color-text)]/10 rounded">✕</button>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar space-y-4">
                <div 
                    className="inline-block px-3 py-1 rounded text-xs font-bold text-white mb-2 uppercase tracking-wider"
                    style={{ backgroundColor: selectedEvent.backgroundColor }}
                >
                    {selectedEvent.extendedProps.category === "class" 
                        ? selectedEvent.extendedProps.classType 
                        : getEventTypeLabel(selectedEvent.extendedProps.type || "")}
                </div>
                
                <div className="flex gap-3 text-sm">
                    <span className="font-semibold w-16 text-[var(--color-text-secondary)]">Kiedy:</span>
                    <div>
                        <p>{new Date(selectedEvent.start).toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}</p>
                        {!selectedEvent.allDay && selectedEvent.end && (
                            <p className="text-[var(--color-accent)] font-medium">
                                {new Date(selectedEvent.start).toLocaleTimeString("pl-PL", { hour: '2-digit', minute: '2-digit' })} - 
                                {new Date(selectedEvent.end).toLocaleTimeString("pl-PL", { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        )}
                    </div>
                </div>

                {selectedEvent.extendedProps.category === "class" && (
                    <>
                       <div className="flex gap-3 text-sm">
                            <span className="font-semibold w-16 text-[var(--color-text-secondary)]">Gdzie:</span>
                            <div>
                                <p className="font-bold">{selectedEvent.extendedProps.room}</p>
                                <p className="text-xs opacity-80">{selectedEvent.extendedProps.building}</p>
                            </div>
                       </div>
                       <div className="flex gap-3 text-sm">
                            <span className="font-semibold w-16 text-[var(--color-text-secondary)]">Kto:</span>
                            <p>{selectedEvent.extendedProps.instructor}</p>
                       </div>
                    </>
                )}
            </div>

            <div className="p-4 bg-[var(--color-bg)] border-t border-[var(--color-text)]/10 flex justify-end">
                 <button onClick={() => setShowModal(false)} className="px-5 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-text)]/20 rounded text-sm">Zamknij</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .calendar-wrapper {
            --fc-border-color: rgba(128, 128, 128, 0.2);
            --fc-page-bg-color: transparent;
            --fc-neutral-bg-color: rgba(128, 128, 128, 0.05);
            --fc-today-bg-color: rgba(var(--color-accent-rgb), 0.15) !important;
        }
        .fc-col-header-cell-cushion { color: var(--color-text); font-weight: 600; padding: 8px 0; }
        .fc-timegrid-slot-label-cushion { color: var(--color-text-secondary); font-size: 0.75rem; }
        
        .fc .fc-toolbar { flex-direction: column; gap: 10px; margin-bottom: 1.5rem !important; }
        @media (min-width: 768px) {
            .fc .fc-toolbar { flex-direction: row; }
        }
        
        .fc .fc-button {
            background-color: var(--color-bg) !important;
            border-color: rgba(128, 128, 128, 0.3) !important;
            color: var(--color-text) !important;
            font-size: 0.8rem;
            text-transform: capitalize;
            box-shadow: none !important;
        }
        .fc .fc-button-active {
            background-color: var(--color-accent) !important;
            border-color: var(--color-accent) !important;
            color: white !important;
        }
        .fc-event { border: none; border-radius: 4px; padding: 1px 2px; font-size: 0.75rem; }
      `}</style>
    </div>
  );
}