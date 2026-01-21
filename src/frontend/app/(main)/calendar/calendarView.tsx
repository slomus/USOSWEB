"use client";

import { useState, useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list"; // Dodajemy plugin listy dla mobile
import interactionPlugin from "@fullcalendar/interaction";
import plLocale from "@fullcalendar/core/locales/pl";
import { getApiBaseUrl } from "@/app/config/api";

const API_BASE = getApiBaseUrl();

// --- TYPY ---

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
    type: string;
    description?: string;
    academicYear?: string;
    appliesTo?: string;
  };
};

// --- KOLORY ---
const eventTypeColors: Record<string, { bg: string; border: string }> = {
  holiday: { bg: "#dc2626", border: "#991b1b" },
  break: { bg: "#f59e0b", border: "#b45309" },
  exam_session: { bg: "#7c3aed", border: "#5b21b6" },
  rector_day: { bg: "#db2777", border: "#be185d" },
  semester_start: { bg: "#16a34a", border: "#15803d" },
  semester_end: { bg: "#0891b2", border: "#0e7490" },
  registration: { bg: "#2563eb", border: "#1e40af" },
  deadline: { bg: "#ca8a04", border: "#854d0e" },
  other: { bg: "#4b5563", border: "#374151" },
  academic_default: { bg: "#475569", border: "#334155" }
};

const getAcademicColor = (eventType: string) => {
  return eventTypeColors[eventType] || eventTypeColors.academic_default;
};

const getEventTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    holiday: "Święto / Dzień wolny",
    break: "Przerwa w zajęciach",
    exam_session: "Sesja egzaminacyjna",
    rector_day: "Dzień Rektorski",
    semester_start: "Początek semestru",
    semester_end: "Koniec semestru",
    registration: "Rejestracja",
    deadline: "Termin ostateczny",
    other: "Inne",
  };
  return labels[type] || type;
};

export default function CalendarPage() {
  const calendarRef = useRef<any>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  
  // Stan responsywności
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchAcademicEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/calendar/academic`, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (result.success && Array.isArray(result.events)) {
        const academicList: ApiAcademicEvent[] = result.events;

        const formattedEvents = academicList.map((item) => {
          const colors = getAcademicColor(item.eventType);
          
          const startDateObj = new Date(item.startDate);
          startDateObj.setHours(0, 0, 0, 0);

          let endDateObj = new Date(item.startDate);
          if (item.endDate && item.endDate !== "") {
            endDateObj = new Date(item.endDate);
          }
          endDateObj.setHours(0, 0, 0, 0);

          const fcEndObj = new Date(endDateObj);
          fcEndObj.setDate(fcEndObj.getDate() + 1);

          return {
            id: `acad-${item.eventId}`,
            title: item.title,
            start: item.startDate,
            end: fcEndObj.toISOString().split('T')[0],
            allDay: true,
            backgroundColor: colors.bg,
            borderColor: colors.border,
            textColor: "#ffffff",
            extendedProps: {
              type: item.eventType,
              description: item.description,
              academicYear: item.academicYear,
              appliesTo: item.appliesTo,
            },
          };
        });

        setEvents(formattedEvents);
      } else {
        console.error("Nie udało się pobrać wydarzeń.");
      }
    } catch (error) {
      console.error("Błąd połączenia z serwerem:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicEvents();
  }, []);

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
    setShowEventModal(true);
  };

  return (
    <main className="min-h-screen p-4 md:p-6 text-[var(--color-text)] bg-[var(--color-bg)]">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Kalendarz Akademicki</h1>
            <p className="text-sm md:text-base text-[var(--color-text-secondary)] mt-1">
              Wydarzenia, święta i harmonogram roku.
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <button
                onClick={fetchAcademicEvents}
                disabled={loading}
                className="flex-1 md:flex-none justify-center px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-text)]/20 text-[var(--color-text)] rounded hover:bg-[var(--color-bg)] transition-colors text-sm"
              >
                {loading ? "Odświeżanie..." : "Odśwież"}
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
        <div className="bg-[var(--color-bg-secondary)] p-2 md:p-6 rounded-xl shadow-md calendar-wrapper border border-[var(--color-accent)]/20">
          <FullCalendar
            key={isMobile ? "mobile" : "desktop"} // Wymusza re-render przy zmianie widoku
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            
            // Mobile: ListMonth (Lista), Desktop: DayGridMonth (Siatka)
            initialView={isMobile ? "listMonth" : "dayGridMonth"}
            
            locale={plLocale}
            firstDay={1}
            events={events}
            eventClick={handleEventClick}
            
            headerToolbar={
              isMobile
                ? {
                    left: "prev,next",
                    center: "title",
                    right: "today", // Uproszczony header na mobile
                  }
                : {
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,listMonth", // Pełny header na desktop
                  }
            }
            
            buttonText={{
              today: "Dziś",
              month: "Miesiąc",
              list: "Lista",
            }}
            height="auto"
            contentHeight="auto"
            dayMaxEvents={true}
            eventDisplay="block"
            // Brak wydarzeń komunikat
            noEventsContent="Brak wydarzeń w tym miesiącu"
          />
        </div>

        {/* LEGENDA */}
        <div className="mt-6 bg-[var(--color-bg-secondary)] p-4 rounded-lg shadow-sm border border-[var(--color-accent)]/20">
          <h3 className="text-sm font-semibold mb-3 uppercase text-[var(--color-text-secondary)]">Legenda wydarzeń</h3>
          <div className="flex flex-wrap gap-4 text-xs">
            {Object.entries(eventTypeColors).map(([key, colors]) => (
              <div key={key} className="flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
                ></span>
                <span className="opacity-80">{getEventTypeLabel(key)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* MODAL SZCZEGÓŁÓW */}
      {showEventModal && selectedEvent && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 text-[var(--color-text)]"
          onClick={() => setShowEventModal(false)}
        >
          <div
            className="bg-[var(--color-bg-secondary)] rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl border border-[var(--color-accent)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
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
                className="inline-block px-3 py-1 rounded text-xs font-bold text-white mb-4 uppercase tracking-wider text-center" 
                style={{ backgroundColor: selectedEvent.backgroundColor, borderColor: selectedEvent.borderColor }}
              >
                 {getEventTypeLabel(selectedEvent.extendedProps.type)}
              </div>

              <div className="space-y-4 text-sm">
                  {/* Data */}
                  <div className="flex items-center gap-3">
                    <span className="w-20 text-[var(--color-text-secondary)] font-semibold flex-shrink-0">Data:</span>
                    <span>
                        {new Date(selectedEvent.start).toLocaleDateString("pl-PL", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        {selectedEvent.end && (() => {
                            const start = new Date(selectedEvent.start);
                            const end = new Date(selectedEvent.end);
                            const displayEnd = new Date(end);
                            displayEnd.setDate(displayEnd.getDate() - 1);
                            
                            if (displayEnd.getTime() > start.getTime()) {
                                return ` - ${displayEnd.toLocaleDateString("pl-PL", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
                            }
                            return null;
                        })()}
                    </span>
                  </div>

                  {/* Rok akad */}
                  {selectedEvent.extendedProps.academicYear && (
                    <div className="flex items-center gap-3">
                        <span className="w-20 text-[var(--color-text-secondary)] font-semibold flex-shrink-0">Rok:</span>
                        <span>{selectedEvent.extendedProps.academicYear}</span>
                    </div>
                  )}

                  {/* Dotyczy */}
                  {selectedEvent.extendedProps.appliesTo && (
                    <div className="flex items-center gap-3">
                        <span className="w-20 text-[var(--color-text-secondary)] font-semibold flex-shrink-0">Dla:</span>
                        <span>{selectedEvent.extendedProps.appliesTo}</span>
                    </div>
                  )}

                  {/* Opis */}
                  {selectedEvent.extendedProps.description && (
                     <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-[var(--color-text)]/10">
                        <span className="text-[var(--color-text-secondary)] font-semibold">Opis:</span>
                        <div className="p-3 bg-[var(--color-bg)] rounded-lg text-xs md:text-sm opacity-90 leading-relaxed whitespace-pre-line border border-[var(--color-text)]/5">
                          {selectedEvent.extendedProps.description}
                        </div>
                      </div>
                  )}
              </div>
            </div>

            {/* Footer */}
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

      {/* Globalne style dla FullCalendar */}
      <style jsx global>{`
        .calendar-wrapper .fc {
          --fc-border-color: rgba(128, 128, 128, 0.2);
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: rgba(128, 128, 128, 0.05);
          --fc-today-bg-color: rgba(var(--color-accent-rgb), 0.15) !important;
          --fc-list-event-hover-bg-color: rgba(var(--color-accent-rgb), 0.1);
        }

        /* HEADER */
        .fc-col-header-cell-cushion {
          color: var(--color-text);
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.8rem;
          text-decoration: none !important;
          padding: 8px 0;
        }
        .fc-daygrid-day-number {
           color: var(--color-text);
           font-weight: 500;
           text-decoration: none !important;
        }

        /* TOOLBAR RESPONSYWNY */
        .fc .fc-toolbar {
            flex-direction: column;
            gap: 10px;
            margin-bottom: 1.5rem !important;
        }
        .fc .fc-toolbar-title {
            font-size: 1.2rem;
            color: var(--color-text);
        }
        @media (min-width: 768px) {
            .fc .fc-toolbar {
                flex-direction: row;
                align-items: center;
            }
            .fc .fc-toolbar-title {
                font-size: 1.5rem;
            }
        }

        /* BUTTONS */
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

        /* EVENTS - GRID */
        .fc-event {
          border: none;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          border-radius: 4px;
          padding: 1px 3px;
          font-size: 0.8rem;
          cursor: pointer;
        }
        
        /* LIST VIEW STYLING */
        .fc-list {
            border: 1px solid var(--fc-border-color);
        }
        .fc-list-day-cushion {
            background-color: var(--color-bg) !important;
        }
        .fc-list-day-text, .fc-list-day-side-text {
            color: var(--color-text) !important;
            font-weight: bold;
        }
        .fc-list-event:hover td {
            background-color: var(--fc-list-event-hover-bg-color) !important;
            cursor: pointer;
        }
        .fc-list-event-title {
            color: var(--color-text);
        }
        .fc-list-event-time {
            color: var(--color-text-secondary);
        }
        .fc-list-empty {
            background-color: var(--color-bg-secondary);
            color: var(--color-text-secondary);
        }
      `}</style>
    </main>
  );
}