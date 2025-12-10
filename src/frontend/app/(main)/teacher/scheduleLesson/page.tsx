"use client";

import { useState, useRef, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";
import plLocale from "@fullcalendar/core/locales/pl";
import { DatesSetArg } from "@fullcalendar/core";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

// --- TYPY ---

type ScheduleClass = {
  scheduleId: number;
  classId: number;
  subjectName: string;
  classType: string;
  dayOfWeek: number; // 1 = Poniedziałek, 7 = Niedziela
  startTime: string; // Format: "HH:MM:SS" lub "YYYY-MM-DDTHH:MM:SS"
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

// Funkcja wyciągająca sam czas "HH:MM:SS" z różnych formatów API
const extractTime = (timeStr: string): string => {
  if (!timeStr) return "00:00:00";
  // Jeśli format to ISO (zawiera 'T'), bierzemy część po 'T'
  if (timeStr.includes("T")) {
    return timeStr.split("T")[1].substring(0, 8); // np. "09:00:00"
  }
  // Jeśli format to po prostu "09:00:00"
  return timeStr.substring(0, 8);
};

export default function StudentSchedule() {
  const calendarRef = useRef<any>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Stan dla modala
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  // Pobieranie planu dla danego tygodnia
  // FullCalendar wywołuje datesSet przy zmianie widoku, co pozwala nam pobrać dane dla konkretnego zakresu
  const fetchSchedule = useCallback(async (startRangeDate: Date) => {
    setLoading(true);
    try {
      // API oczekuje parametru ?date=YYYY-MM-DD
      const dateParam = startRangeDate.toISOString().split("T")[0];
      
      const response = await fetch(
        `${API_BASE}/api/teacher/schedule/week?date=${dateParam}`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await response.json();

      if (data.success && Array.isArray(data.schedule)) {
        const scheduleList: ScheduleClass[] = data.schedule;

        // Obliczamy poniedziałek dla aktualnie wyświetlanego tygodnia w kalendarzu
        // (startRangeDate z FullCalendar zwykle wskazuje na początek widoku, czyli np. Poniedziałek lub Niedzielę)
        // Dla pewności wymuszamy znalezienie poniedziałku w tygodniu wybranej daty.
        const currentMonday = new Date(startRangeDate);
        const day = currentMonday.getDay();
        const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        currentMonday.setDate(diff);
        currentMonday.setHours(0,0,0,0);

        const formattedEvents: CalendarEvent[] = scheduleList.map((item) => {
          const color = getClassColor(item.classType);
          
          // Obliczanie rzeczywistej daty na podstawie dayOfWeek (1=Pon, 7=Niedz)
          // i aktualnie wyświetlanego tygodnia.
          // API zwraca dane generyczne lub z "dummy date", więc musimy je nałożyć na kalendarz.
          const targetDate = new Date(currentMonday);
          // dayOfWeek w API: 1=Pon, w JS Date: 1=Pon (jeśli dodajemy do Poniedziałku, to offset = dayOfWeek - 1)
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
            borderColor: color, // Można lekko przyciemnić funkcją, tu uproszczone
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

  // Handler zmiany dat w kalendarzu (np. kliknięcie "Następny tydzień")
  const handleDatesSet = (arg: DatesSetArg) => {
    // Pobieramy środek widoku, aby mieć pewność, że jesteśmy w dobrym tygodniu
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

  const goToToday = () => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.today();
  };

  const refreshData = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
        // Pobierz datę z obecnego widoku
        const currentDate = calendarApi.getDate();
        fetchSchedule(currentDate);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* PASEK NARZĘDZI */}
      <div className="flex justify-end gap-2">
        <button
          onClick={refreshData}
          disabled={loading}
          className="px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded hover:bg-[var(--color-accent)] hover:text-white transition-colors text-sm"
        >
          {loading ? "Odświeżanie..." : "Odśwież plan"}
        </button>
        <button
          onClick={goToToday}
          className="px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)] text-sm transition-colors"
        >
          Aktualny tydzień
        </button>
      </div>

      {/* KALENDARZ */}
      <div className="bg-[var(--color-bg-secondary)] p-6 rounded-xl shadow-md calendar-wrapper border border-[var(--color-accent)]/20">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={plLocale}
          firstDay={1} // Poniedziałek
          slotMinTime="08:00:00" // Początek dnia w widoku
          slotMaxTime="21:00:00" // Koniec dnia w widoku
          allDaySlot={false} // Ukrycie paska "całodniowe" dla planu lekcji
          weekends={true} // Pokaż weekendy (studia zaoczne)
          events={events}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "timeGridWeek,timeGridDay",
          }}
          buttonText={{
            today: "Dziś",
            week: "Tydzień",
            day: "Dzień",
          }}
          height="auto"
          contentHeight="auto"
          dayMaxEvents={true}
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
        />
      </div>

      {/* MODAL SZCZEGÓŁÓW ZAJĘĆ */}
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
                className="p-3 rounded border text-white font-medium mb-3 flex justify-center text-center uppercase tracking-wide text-xs"
                style={{
                  backgroundColor: selectedEvent.backgroundColor,
                  borderColor: selectedEvent.borderColor,
                }}
              >
                {selectedEvent.extendedProps.classType}
              </div>

              <div className="grid grid-cols-[100px_1fr] gap-3">
                <span className="text-[var(--color-text-secondary)] font-semibold">Data:</span>
                <span>
                  {new Date(selectedEvent.start).toLocaleDateString("pl-PL", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>

                <span className="text-[var(--color-text-secondary)] font-semibold">Godzina:</span>
                <span>
                  {new Date(selectedEvent.start).toLocaleTimeString("pl-PL", { hour: '2-digit', minute: '2-digit' })} - 
                  {new Date(selectedEvent.end).toLocaleTimeString("pl-PL", { hour: '2-digit', minute: '2-digit' })}
                </span>

                <span className="text-[var(--color-text-secondary)] font-semibold">Budynek:</span>
                <span>{selectedEvent.extendedProps.building}</span>

                <span className="text-[var(--color-text-secondary)] font-semibold">Sala:</span>
                <span className="font-bold text-[var(--color-accent)]">{selectedEvent.extendedProps.room}</span>

                <span className="text-[var(--color-text-secondary)] font-semibold">Prowadzący:</span>
                <span>{selectedEvent.extendedProps.instructor}</span>
              </div>
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

      {/* Global styles for FullCalendar overrides (reused from AcademicCalendar) */}
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
        .calendar-wrapper .fc-timegrid-slot-label-cushion {
            color: var(--color-text-secondary);
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
          padding: 2px;
          font-size: 0.85rem;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .calendar-wrapper .fc-event:hover {
          transform: scale(1.01);
          filter: brightness(1.1);
          z-index: 5;
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