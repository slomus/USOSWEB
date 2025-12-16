"use client";

import { useState, useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
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
  academic_default: { bg: "#475569", border: "#334155" },
};

const getAcademicColor = (eventType: string) => {
  return eventTypeColors[eventType] || eventTypeColors.academic_default;
};

// --- HELPERY ---
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

export default function AcademicCalendar() {
  const calendarRef = useRef<any>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

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

          // FullCalendar wymaga daty końcowej "exclusive" dla wydarzeń całodniowych
          const fcEndObj = new Date(endDateObj);
          fcEndObj.setDate(fcEndObj.getDate() + 1);

          return {
            id: `acad-${item.eventId}`,
            title: item.title,
            start: item.startDate,
            end: fcEndObj.toISOString().split("T")[0],
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
        console.error("Nie udało się pobrać wydarzeń lub błędny format danych.");
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

  const goToToday = () => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.today();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Pasek narzędzi komponentu */}
      <div className="flex justify-end gap-2">
        <button
          onClick={fetchAcademicEvents}
          disabled={loading}
          className="px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded hover:bg-[var(--color-accent)] hover:text-white transition-colors text-sm"
        >
          {loading ? "Odświeżanie..." : "Odśwież dane"}
        </button>
        <button
          onClick={goToToday}
          className="px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)] text-sm transition-colors"
        >
          Idź do dzisiaj
        </button>
      </div>

      {/* KALENDARZ */}
      <div className="bg-[var(--color-bg-secondary)] p-6 rounded-xl shadow-md calendar-wrapper border border-[var(--color-accent)]/20">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={plLocale}
          firstDay={1}
          events={events}
          eventClick={handleEventClick}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,dayGridWeek",
          }}
          buttonText={{
            today: "Dziś",
            month: "Miesiąc",
            week: "Tydzień",
          }}
          height="auto"
          contentHeight="auto"
          dayMaxEvents={true}
          eventDisplay="block"
        />
      </div>

      {/* LEGENDA */}
      <div className="bg-[var(--color-bg-secondary)] p-4 rounded-lg shadow-sm border border-[var(--color-accent)]/20">
        <h3 className="text-sm font-semibold mb-3 uppercase text-[var(--color-text-secondary)]">
          Legenda wydarzeń
        </h3>
        <div className="flex flex-wrap gap-4 text-xs">
          {Object.entries(eventTypeColors).map(([key, colors]) => (
            <div key={key} className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
              ></span>
              <span className="opacity-80">{getEventTypeLabel(key)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL */}
      {showEventModal && selectedEvent && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 text-[var(--color-text)]"
          onClick={() => setShowEventModal(false)}
        >
          <div
            className="bg-[var(--color-bg-secondary)] rounded-xl p-6 max-w-md w-full shadow-2xl border border-[var(--color-accent)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold pr-4">{selectedEvent.title}</h2>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-gray-400 hover:text-white transition-colors text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div
                className="p-3 rounded border text-white font-medium mb-3 flex justify-center text-center"
                style={{
                  backgroundColor: selectedEvent.backgroundColor,
                  borderColor: selectedEvent.borderColor,
                }}
              >
                {getEventTypeLabel(selectedEvent.extendedProps.type)}
              </div>

              <div className="flex items-center gap-3">
                <span className="w-24 text-[var(--color-text-secondary)] font-semibold">Data:</span>
                <span>
                  {new Date(selectedEvent.start).toLocaleDateString("pl-PL", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {selectedEvent.end &&
                    (() => {
                      const start = new Date(selectedEvent.start);
                      const end = new Date(selectedEvent.end);
                      const displayEnd = new Date(end);
                      displayEnd.setDate(displayEnd.getDate() - 1);

                      if (displayEnd.getTime() > start.getTime()) {
                        return ` - ${displayEnd.toLocaleDateString("pl-PL", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}`;
                      }
                      return null;
                    })()}
                </span>
              </div>

              {selectedEvent.extendedProps.academicYear && (
                <div className="flex items-center gap-3">
                  <span className="w-24 text-[var(--color-text-secondary)] font-semibold">
                    Rok akad.:
                  </span>
                  <span>{selectedEvent.extendedProps.academicYear}</span>
                </div>
              )}

              {selectedEvent.extendedProps.appliesTo && (
                <div className="flex items-center gap-3">
                  <span className="w-24 text-[var(--color-text-secondary)] font-semibold">
                    Dotyczy:
                  </span>
                  <span>{selectedEvent.extendedProps.appliesTo}</span>
                </div>
              )}

              {selectedEvent.extendedProps.description && (
                <div className="flex flex-col gap-1 mt-4 pt-4 border-t border-gray-700/50">
                  <span className="text-[var(--color-text-secondary)] font-semibold">Opis:</span>
                  <p className="opacity-90 leading-relaxed text-justify whitespace-pre-line">
                    {selectedEvent.extendedProps.description}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setShowEventModal(false)}
                className="px-6 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global styles for this component */}
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
        .calendar-wrapper .fc-col-header-cell-cushion {
          color: var(--color-text);
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.9rem;
          text-decoration: none;
        }
        .calendar-wrapper .fc-daygrid-day-number {
          color: var(--color-text);
          font-weight: 500;
        }
        .calendar-wrapper .fc-scrollgrid {
          border: 1px solid var(--fc-border-color);
          border-radius: 8px;
          overflow: hidden;
        }
        .calendar-wrapper .fc-event {
          border: none;
          box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
          border-radius: 4px;
          padding: 2px 4px;
          font-size: 0.85rem;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .calendar-wrapper .fc-event:hover {
          transform: scale(1.01);
          filter: brightness(1.1);
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
        .calendar-wrapper .fc-button-active {
          background-color: var(--color-accent-hover) !important;
          border-color: var(--color-accent-hover) !important;
        }
      `}</style>
    </div>
  );
}