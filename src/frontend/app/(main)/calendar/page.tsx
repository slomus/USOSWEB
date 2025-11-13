"use client";

import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import plLocale from "@fullcalendar/core/locales/pl";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

type EventType = "holiday" | "exam_session" | "semester_start" | "semester_end" | "deadline" | "other";

type AcademicEvent = {
  event_id?: number;
  event_type: EventType;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  academic_year: string;
  applies_to: string;
};

type CalendarEvent = {
  id?: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps?: {
    description?: string;
    event_type?: EventType;
    applies_to?: string;
  };
};

type CurrentAcademicYear = {
  year: string;
  current_semester: string;
  current_week: number;
  semester_start: string;
  semester_end: string;
  exam_session_start: string;
  exam_session_end: string;
  holidays: string[];
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentYear, setCurrentYear] = useState<CurrentAcademicYear | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filtry
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    eventType: "" as EventType | "",
    academicYear: "",
  });

  const eventTypeColors: Record<EventType, { bg: string; border: string }> = {
    holiday: { bg: "#dc2626", border: "#991b1b" },
    exam_session: { bg: "#ea580c", border: "#9a3412" },
    semester_start: { bg: "#16a34a", border: "#166534" },
    semester_end: { bg: "#0891b2", border: "#155e75" },
    deadline: { bg: "#ca8a04", border: "#854d0e" },
    other: { bg: "#6366f1", border: "#4338ca" },
  };

  const fetchCalendarEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (filters.startDate) params.append("start_date", filters.startDate);
      if (filters.endDate) params.append("end_date", filters.endDate);
      if (filters.eventType) params.append("event_type", filters.eventType);
      if (filters.academicYear) params.append("academic_year", filters.academicYear);

      const response = await fetch(
        `${API_BASE}/api/calendar/academic?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json();

      if (data.success) {
        const calendarEvents: CalendarEvent[] = (data.events || []).map(
          (event: AcademicEvent) => {
            const colors = eventTypeColors[event.event_type] || eventTypeColors.other;
            
            return {
              id: event.event_id?.toString() || `${event.start_date}-${event.title}`,
              title: event.title,
              start: event.start_date,
              end: event.end_date !== event.start_date 
                ? new Date(new Date(event.end_date).getTime() + 86400000).toISOString().split('T')[0]
                : undefined,
              backgroundColor: colors.bg,
              borderColor: colors.border,
              extendedProps: {
                description: event.description,
                event_type: event.event_type,
                applies_to: event.applies_to,
              },
            };
          }
        );

        setEvents(calendarEvents);
        setCurrentYear(data.current_academic_year);
      } else {
        console.error("Błąd API:", data.message);
        alert(`Błąd: ${data.message || "Nie udało się pobrać wydarzeń"}`);
      }
    } catch (error) {
      console.error("Błąd podczas pobierania wydarzeń:", error);
      alert("Błąd połączenia z serwerem");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarEvents();
  }, []);

  const handleEventClick = (info: any) => {
    const event = info.event;
    const calendarEvent: CalendarEvent = {
      id: event.id,
      title: event.title,
      start: event.startStr,
      end: event.endStr,
      backgroundColor: event.backgroundColor,
      borderColor: event.borderColor,
      extendedProps: event.extendedProps,
    };
    
    setSelectedEvent(calendarEvent);
    setShowEventModal(true);
  };

  const getEventTypeLabel = (type: EventType): string => {
    const labels: Record<EventType, string> = {
      holiday: "Święto",
      exam_session: "Sesja egzaminacyjna",
      semester_start: "Początek semestru",
      semester_end: "Koniec semestru",
      deadline: "Termin",
      other: "Inne",
    };
    return labels[type] || "Nieznany";
  };

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      eventType: "",
      academicYear: "",
    });
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Kalendarz Akademicki</h1>
          {currentYear && (
            <div className="text-sm text-[var(--color-text-secondary)] space-y-1">
              <p>
                <strong>Rok akademicki:</strong> {currentYear.year} | 
                <strong> Semestr:</strong> {currentYear.current_semester} | 
                <strong> Tydzień:</strong> {currentYear.current_week}
              </p>
              <p>
                <strong>Semestr:</strong> {new Date(currentYear.semester_start).toLocaleDateString("pl-PL")} - {new Date(currentYear.semester_end).toLocaleDateString("pl-PL")}
              </p>
              <p>
                <strong>Sesja egzaminacyjna:</strong> {new Date(currentYear.exam_session_start).toLocaleDateString("pl-PL")} - {new Date(currentYear.exam_session_end).toLocaleDateString("pl-PL")}
              </p>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap gap-3 items-center justify-between bg-[var(--color-bg-secondary)] p-4 rounded-lg border border-[var(--color-accent)]">
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)] text-sm"
            >
              {showFilters ? "Ukryj filtry" : "Pokaż filtry"}
            </button>
            <button
              onClick={fetchCalendarEvents}
              disabled={loading}
              className="px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)] text-sm disabled:opacity-50"
            >
              {loading ? "Ładowanie..." : "Odśwież"}
            </button>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-3 text-xs">
            {Object.entries(eventTypeColors).map(([type, colors]) => (
              <div key={type} className="flex items-center gap-1">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: colors.bg }}
                />
                <span>{getEventTypeLabel(type as EventType)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filtry */}
        {showFilters && (
          <div className="mb-4 bg-[var(--color-bg-secondary)] p-4 rounded-lg border border-[var(--color-accent)]">
            <h3 className="font-semibold mb-3">Filtry</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm mb-1">Data początkowa</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value })
                  }
                  className="w-full p-2 rounded border bg-[var(--color-bg)] text-[var(--color-text)]"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Data końcowa</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters({ ...filters, endDate: e.target.value })
                  }
                  className="w-full p-2 rounded border bg-[var(--color-bg)] text-[var(--color-text)]"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Typ wydarzenia</label>
                <select
                  value={filters.eventType}
                  onChange={(e) =>
                    setFilters({ ...filters, eventType: e.target.value as EventType | "" })
                  }
                  className="w-full p-2 rounded border bg-[var(--color-bg)] text-[var(--color-text)]"
                >
                  <option value="">Wszystkie</option>
                  <option value="holiday">Święto</option>
                  <option value="exam_session">Sesja egzaminacyjna</option>
                  <option value="semester_start">Początek semestru</option>
                  <option value="semester_end">Koniec semestru</option>
                  <option value="deadline">Termin</option>
                  <option value="other">Inne</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Rok akademicki</label>
                <input
                  type="text"
                  placeholder="np. 2024/2025"
                  value={filters.academicYear}
                  onChange={(e) =>
                    setFilters({ ...filters, academicYear: e.target.value })
                  }
                  className="w-full p-2 rounded border bg-[var(--color-bg)] text-[var(--color-text)]"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={fetchCalendarEvents}
                className="px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)] text-sm"
              >
                Zastosuj filtry
              </button>
              <button
                onClick={() => {
                  clearFilters();
                  setTimeout(fetchCalendarEvents, 100);
                }}
                className="px-4 py-2 bg-[var(--color-text-secondary)] text-white rounded hover:opacity-80 text-sm"
              >
                Wyczyść filtry
              </button>
            </div>
          </div>
        )}

        {/* Kalendarz */}
        <div className="bg-[var(--color-bg-secondary)] p-4 rounded-lg border border-[var(--color-accent)] calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={plLocale}
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
            eventDisplay="block"
            displayEventTime={false}
          />
        </div>
      </div>

      {/* Modal szczegółów wydarzenia */}
      {showEventModal && selectedEvent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowEventModal(false)}
        >
          <div
            className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-md w-full border border-[var(--color-accent)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">{selectedEvent.title}</h2>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              {selectedEvent.extendedProps?.event_type && (
                <div>
                  <strong className="text-sm text-[var(--color-text-secondary)]">
                    Typ wydarzenia:
                  </strong>
                  <p className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded"
                      style={{
                        backgroundColor: selectedEvent.backgroundColor,
                      }}
                    />
                    {getEventTypeLabel(selectedEvent.extendedProps.event_type)}
                  </p>
                </div>
              )}

              <div>
                <strong className="text-sm text-[var(--color-text-secondary)]">
                  Data:
                </strong>
                <p>
                  {new Date(selectedEvent.start).toLocaleDateString("pl-PL", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {selectedEvent.end && selectedEvent.end !== selectedEvent.start && (
                    <>
                      {" - "}
                      {new Date(selectedEvent.end).toLocaleDateString("pl-PL", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </>
                  )}
                </p>
              </div>

              {selectedEvent.extendedProps?.description && (
                <div>
                  <strong className="text-sm text-[var(--color-text-secondary)]">
                    Opis:
                  </strong>
                  <p className="whitespace-pre-wrap">
                    {selectedEvent.extendedProps.description}
                  </p>
                </div>
              )}

              {selectedEvent.extendedProps?.applies_to && (
                <div>
                  <strong className="text-sm text-[var(--color-text-secondary)]">
                    Dotyczy:
                  </strong>
                  <p>{selectedEvent.extendedProps.applies_to}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowEventModal(false)}
              className="mt-6 w-full px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)]"
            >
              Zamknij
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .calendar-container .fc {
          background: var(--color-bg-secondary);
        }
        
        .calendar-container .fc-theme-standard td,
        .calendar-container .fc-theme-standard th {
          border-color: var(--color-accent);
        }
        
        .calendar-container .fc-col-header-cell {
          background: var(--color-bg);
          color: var(--color-text);
          font-weight: 600;
          padding: 8px;
        }
        
        .calendar-container .fc-daygrid-day {
          background: var(--color-bg);
        }
        
        .calendar-container .fc-daygrid-day:hover {
          background: var(--color-bg-secondary);
        }
        
        .calendar-container .fc-day-today {
          background: var(--color-accent) !important;
          opacity: 0.2;
        }
        
        .calendar-container .fc-button {
          background: var(--color-accent) !important;
          border-color: var(--color-accent) !important;
          color: white !important;
        }
        
        .calendar-container .fc-button:hover {
          background: var(--color-accent-hover) !important;
        }
        
        .calendar-container .fc-button-active {
          background: var(--color-accent-hover) !important;
        }
        
        .calendar-container .fc-daygrid-day-number {
          color: var(--color-text);
          padding: 4px;
        }
        
        .calendar-container .fc-event {
          cursor: pointer;
          margin: 2px;
          padding: 2px 4px;
          border-radius: 3px;
          font-size: 0.85em;
        }
        
        .calendar-container .fc-event:hover {
          opacity: 0.8;
        }
        
        .calendar-container .fc-toolbar-title {
          color: var(--color-text) !important;
          font-size: 1.5em !important;
        }
      `}</style>
    </div>
  );
}