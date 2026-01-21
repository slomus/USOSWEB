"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";
import plLocale from "@fullcalendar/core/locales/pl";
import { DatesSetArg } from "@fullcalendar/core";

import { getApiBaseUrl } from "@/app/config/api";

const API_BASE = getApiBaseUrl();

// --- TYPY ---

type ScheduleClass = {
  scheduleId: number;
  classId: number;
  subjectName: string;
  classType: string;
  dayOfWeek: number; // 1 = Poniedziałek, 7 = Niedziela
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
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor?: string;
  extendedProps: {
    classType: string;
    room: string;
    building: string;
    instructor: string;
    fullDate?: string;
  };
};

// --- KOLORY ---

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
  const normalizedType = type?.toLowerCase() || "";
  if (normalizedType.includes("wyk")) return classTypeColors.wykład;
  if (normalizedType.includes("ćw")) return classTypeColors.ćwiczenia;
  if (normalizedType.includes("lab")) return classTypeColors.laboratorium;
  if (normalizedType.includes("sem")) return classTypeColors.seminarium;
  if (normalizedType.includes("proj")) return classTypeColors.projekt;
  if (normalizedType.includes("egz") || normalizedType.includes("zal")) return classTypeColors.egzamin;
  return classTypeColors.default;
};

// --- HELPERY ---

const extractTime = (timeStr: string): string => {
  if (!timeStr) return "00:00:00";
  if (timeStr.includes("T")) {
    return timeStr.split("T")[1].substring(0, 8);
  }
  return timeStr.substring(0, 8);
};

export default function StudentSchedule() {
  const calendarRef = useRef<any>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Stan dla modala
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  // Stan responsywności
  const [isMobile, setIsMobile] = useState(false);

  // Wykrywanie mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize(); // Init check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchSchedule = useCallback(async (startRangeDate: Date) => {
    setLoading(true);
    try {
      const dateParam = startRangeDate.toISOString().split("T")[0];
      
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
        const scheduleList: ScheduleClass[] = data.schedule;

        const currentMonday = new Date(startRangeDate);
        const day = currentMonday.getDay();
        const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
        currentMonday.setDate(diff);
        currentMonday.setHours(0,0,0,0);

        const formattedEvents: CalendarEvent[] = scheduleList.map((item) => {
          const color = getClassColor(item.classType);
          
          const targetDate = new Date(currentMonday);
          targetDate.setDate(currentMonday.getDate() + (item.dayOfWeek - 1));
          
          const dateIso = targetDate.toISOString().split("T")[0];
          const startTime = extractTime(item.startTime);
          const endTime = extractTime(item.endTime);

          return {
            id: `sched-${item.scheduleId}`,
            title: `${item.subjectName} (${item.classType})`,
            start: `${dateIso}T${startTime}`,
            end: `${dateIso}T${endTime}`,
            backgroundColor: color,
            borderColor: color,
            textColor: "#ffffff",
            extendedProps: {
              classType: item.classType,
              room: item.room,
              building: item.building,
              instructor: item.instructorName,
              fullDate: dateIso
            },
          };
        });

        setEvents(formattedEvents);
      } else {
        console.error("Błąd pobierania planu:", data.message);
      }
    } catch (error) {
      console.error("Błąd połączenia z serwerem:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDatesSet = (arg: DatesSetArg) => {
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
      backgroundColor: event.backgroundColor,
      borderColor: event.borderColor,
      extendedProps: event.extendedProps,
    });
    setShowEventModal(true);
  };

  const refreshData = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
        fetchSchedule(calendarApi.getDate());
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* NAGŁÓWEK Z AKCJAMI */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[var(--color-text)]">Mój Plan</h2>
          <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">
             Kliknij na zajęcia, aby zobaczyć szczegóły.
          </p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={refreshData}
            disabled={loading}
            className="flex-1 md:flex-none justify-center px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-text)]/20 text-[var(--color-text)] rounded hover:bg-[var(--color-bg)] transition-colors text-sm"
          >
            {loading ? "Ładowanie..." : "Odśwież"}
          </button>
          <button
            onClick={() => calendarRef.current?.getApi()?.today()}
            className="flex-1 md:flex-none justify-center px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)] text-sm transition-colors"
          >
            Dziś
          </button>
        </div>
      </div>

      {/* KALENDARZ */}
      <div className="bg-[var(--color-bg-secondary)] p-2 md:p-6 rounded-xl shadow-md calendar-wrapper border border-[var(--color-text)]/5">
        <FullCalendar
          // Kluczowe dla poprawnego przełączania widoków przy zmianie orientacji/rozmiaru
          key={isMobile ? "mobile" : "desktop"}
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          
          // Domyślny widok zależny od urządzenia
          initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
          
          locale={plLocale}
          firstDay={1}
          slotMinTime="07:00:00"
          slotMaxTime="21:30:00"
          allDaySlot={false}
          weekends={true}
          events={events}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          
          // Responsywny Toolbar
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
                  right: "timeGridWeek,timeGridDay", // Pełne opcje na desktopie
                }
          }
          
          buttonText={{
            today: "Dziś",
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

      {/* RESPONSYWNY MODAL */}
      {showEventModal && selectedEvent && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 text-[var(--color-text)]"
          onClick={() => setShowEventModal(false)}
        >
          <div
            className="bg-[var(--color-bg-secondary)] rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl border border-[var(--color-text)]/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modala */}
            <div className="p-5 border-b border-[var(--color-text)]/10 flex justify-between items-start bg-[var(--color-bg)] rounded-t-xl">
              <h2 className="text-lg md:text-xl font-bold pr-4 leading-tight">{selectedEvent.title}</h2>
              <button
                onClick={() => setShowEventModal(false)}
                className="p-1 hover:bg-[var(--color-text)]/10 rounded transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-[var(--color-text-secondary)]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content Scrollowany */}
            <div className="p-5 overflow-y-auto custom-scrollbar">
              <div
                className="inline-block px-3 py-1 rounded text-xs font-bold text-white mb-4 uppercase tracking-wider"
                style={{
                  backgroundColor: selectedEvent.backgroundColor,
                  borderColor: selectedEvent.borderColor,
                }}
              >
                {selectedEvent.extendedProps.classType}
              </div>

              <div className="space-y-4 text-sm">
                
                {/* Data i czas */}
                <div className="flex gap-3">
                    <div className="min-w-[24px]"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--color-accent)]"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                    <div>
                        <p className="font-semibold">{new Date(selectedEvent.start).toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}</p>
                        <p className="text-[var(--color-text-secondary)]">
                           {new Date(selectedEvent.start).toLocaleTimeString("pl-PL", { hour: '2-digit', minute: '2-digit' })} - 
                           {new Date(selectedEvent.end).toLocaleTimeString("pl-PL", { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                {/* Lokalizacja */}
                <div className="flex gap-3">
                    <div className="min-w-[24px]"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--color-accent)]"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg></div>
                    <div>
                        <p className="text-xs text-[var(--color-text-secondary)] uppercase">Lokalizacja</p>
                        <p className="font-bold text-[var(--color-accent)] text-lg">{selectedEvent.extendedProps.room}</p>
                        <p className="opacity-80">{selectedEvent.extendedProps.building}</p>
                    </div>
                </div>

                {/* Prowadzący */}
                <div className="flex gap-3">
                    <div className="min-w-[24px]"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--color-accent)]"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg></div>
                    <div>
                        <p className="text-xs text-[var(--color-text-secondary)] uppercase">Prowadzący</p>
                        <p className="font-medium">{selectedEvent.extendedProps.instructor}</p>
                    </div>
                </div>

              </div>
            </div>

            {/* Footer Modala */}
            <div className="p-4 bg-[var(--color-bg)] border-t border-[var(--color-text)]/10 flex justify-end rounded-b-xl">
              <button
                onClick={() => setShowEventModal(false)}
                className="px-6 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-text)]/20 text-[var(--color-text)] rounded hover:bg-[var(--color-text)]/10 transition-colors text-sm"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STYLIZACJA FULLCALENDAR */}
      <style jsx global>{`
        .calendar-wrapper {
            --fc-border-color: rgba(128, 128, 128, 0.2);
            --fc-page-bg-color: transparent;
            --fc-neutral-bg-color: rgba(128, 128, 128, 0.05);
            --fc-today-bg-color: rgba(var(--color-accent-rgb), 0.15) !important;
        }

        /* Tekst w nagłówkach */
        .fc-col-header-cell-cushion {
            color: var(--color-text);
            font-weight: 600;
            padding: 8px 0;
            text-transform: capitalize;
            text-decoration: none !important;
        }
        
        /* Godziny po lewej */
        .fc-timegrid-slot-label-cushion {
            color: var(--color-text-secondary);
            font-size: 0.75rem;
        }

        /* Toolbar Responsywny - Mobile First */
        .fc .fc-toolbar {
            flex-direction: column;
            gap: 10px;
            margin-bottom: 1.5rem !important;
        }
        .fc .fc-toolbar-title {
            font-size: 1.2rem;
            color: var(--color-text);
        }

        /* Toolbar Desktop (md+) */
        @media (min-width: 768px) {
            .fc .fc-toolbar {
                flex-direction: row;
                align-items: center;
            }
            .fc .fc-toolbar-title {
                font-size: 1.5rem;
            }
        }

        /* Przyciski */
        .fc .fc-button {
            background-color: var(--color-bg) !important;
            border-color: rgba(128, 128, 128, 0.3) !important;
            color: var(--color-text) !important;
            font-size: 0.8rem;
            text-transform: capitalize;
            box-shadow: none !important;
            padding: 0.4rem 0.8rem;
        }
        .fc .fc-button:hover {
            background-color: var(--color-bg-secondary) !important;
        }
        .fc .fc-button-active {
            background-color: var(--color-accent) !important;
            border-color: var(--color-accent) !important;
            color: white !important;
        }

        /* Eventy */
        .fc-event {
            border: none;
            border-radius: 4px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            font-size: 0.75rem;
            padding: 1px 2px;
            cursor: pointer;
            transition: transform 0.1s;
        }
        .fc-event:hover {
            transform: scale(1.02);
            filter: brightness(1.1);
            z-index: 10;
        }
      `}</style>
    </div>
  );
}