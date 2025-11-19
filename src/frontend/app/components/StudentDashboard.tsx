"use client";

import { useState, useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import plLocale from "@fullcalendar/core/locales/pl";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

type ApiScheduleClass = {
  scheduleId: number;
  classId: number;
  subjectName: string;
  classType: "wykład" | "laboratorium" | "ćwiczenia" | "seminarium";
  dayOfWeek: number;
  startTime: string; // ISO czas ale stała data 0000-01-01
  endTime: string;
  room: string;
  building: string;
  instructorName: string;
};

type ClassEvent = {
  id: string;
  title: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  type: "lecture" | "lab" | "exercise" | "seminar";
  room?: string;
  instructor?: string;
  building?: string;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    type: string;
    room?: string;
    instructor?: string;
    building?: string;
  };
};

type Grade = {
  gradeId: number;
  subjectName: string;
  value: string;
  createdAt: string;
  addedByName: string;
};

const classTypeMap: Record<string, ClassEvent["type"]> = {
  wykład: "lecture",
  laboratorium: "lab",
  ćwiczenia: "exercise",
  seminarium: "seminar",
};

const classTypeColors = {
  lecture: { bg: "#2563eb", border: "#1e40af" },
  lab: { bg: "#9333ea", border: "#6b21a8" },
  exercise: { bg: "#0d9488", border: "#115e59" },
  seminar: { bg: "#ea580c", border: "#9a3412" },
};

const classTypeLabels = {
  lecture: "Wykład",
  lab: "Laboratorium",
  exercise: "Ćwiczenia",
  seminar: "Seminarium",
};

export default function StudentMainPage() {
  const calendarRef = useRef<any>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentClass, setCurrentClass] = useState<ClassEvent | null>(null);
  const [nextClass, setNextClass] = useState<ClassEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [recentGrades, setRecentGrades] = useState<Grade[]>([]);

  // Pobierz plan tygodnia na podstawie daty (mon-sun)
  const fetchSchedule = async (startDate: Date, endDate: Date) => {
    setLoading(true);
    try {
      // Aby wyznaczyć zakres start i end do ISO, potrzebujemy prawdziwe daty,
      // ale endpoint bierze tylko opcjonalny date (dowolny dzień w tygodniu), więc przekazujemy startDate:
      const paramDate = startDate.toISOString().split("T")[0];

      // Pobieramy plan całego tygodnia dla paramDate
      const response = await fetch(
        `${API_BASE}/api/student/schedule/week?date=${paramDate}`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json();

      if (data.success) {
        // Mapujemy dane ApiScheduleClass na format dla FullCalendar,
        // zamieniając dzień tygodnia i godziny na pełne daty z rzeczywistym rokiem/miesiącem/dniem

        const weekStart = new Date(startDate);
        // Mapowanie eventów w tygodniu na pełne daty (dla FullCalendar)
        const calendarEvents = (data.schedule || []).map((item: ApiScheduleClass) => {
          const classType = classTypeMap[item.classType.toLowerCase()] || "lecture";

          // Obliczamy datę zajęć na podstawie dnia tygodnia (1=Poniedziałek, ... 7=Niedziela)
          const eventDate = new Date(weekStart);
          eventDate.setDate(weekStart.getDate() + (item.dayOfWeek - 1));

          // Parsujemy start i end time (godziny) - format ISO '0000-01-01T09:00:00Z'
          const startHour = new Date(item.startTime);
          const endHour = new Date(item.endTime);

          // Ustawiamy start i end z faktyczną datą eventDate plus godziny
          const start = new Date(eventDate);
          start.setHours(startHour.getUTCHours(), startHour.getUTCMinutes(), 0, 0);

          const end = new Date(eventDate);
          end.setHours(endHour.getUTCHours(), endHour.getUTCMinutes(), 0, 0);

          return {
            id: item.scheduleId.toString(),
            title: item.subjectName,
            start: start.toISOString(),
            end: end.toISOString(),
            backgroundColor: classTypeColors[classType].bg,
            borderColor: classTypeColors[classType].border,
            extendedProps: {
              type: classType,
              room: item.room,
              instructor: item.instructorName,
              building: item.building,
            },
          };
        });

        setEvents(calendarEvents);
      } else {
        console.error("Błąd API:", data.message);
        setEvents([]);
      }
    } catch (error) {
      console.error("Błąd podczas pobierania planu:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Pobierz ostatnio dodane oceny
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
      console.error("Błąd podczas pobierania ocen:", error);
      setRecentGrades([]);
    }
  };

  // Ustaw aktualne i następne zajęcia
  useEffect(() => {
    const updateCurrentClasses = () => {
      const now = new Date();

      let current: ClassEvent | null = null;
      let next: ClassEvent | null = null;

      const classEvents: ClassEvent[] = events.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
        type: e.extendedProps.type as any,
        room: e.extendedProps.room,
        instructor: e.extendedProps.instructor,
        building: e.extendedProps.building,
      }));

      // Sortuj po czasie rozpoczęcia
      const sortedClasses = classEvents.sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );

      for (const classEvent of sortedClasses) {
        const start = new Date(classEvent.start);
        const end = new Date(classEvent.end);

        if (start <= now && end >= now) {
          current = classEvent;
        } else if (start > now && !next) {
          next = classEvent;
        }
      }

      setCurrentClass(current);
      setNextClass(next);
    };

    updateCurrentClasses();
    const interval = setInterval(updateCurrentClasses, 60000); // Co minutę
    return () => clearInterval(interval);
  }, [events]);

  // Pobierz plan przy starcie: tydzień bieżący wg dzisiejszej daty
  useEffect(() => {
    const today = new Date();
    const day = today.getDay();
    // wylicz poniedziałek (dzień tygodnia 1)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - day + (day === 0 ? -6 : 1)); // jeśli niedziela (0) to cofamy 6 dni
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // niedziela
    fetchSchedule(weekStart, weekEnd);
    fetchRecentGrades();
  }, []);

  // Obsługa kliknięcia w wydarzenie
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

  // Obsługa zmiany zakresu widoku kalendarza (np. zmiana tygodnia)
  const handleDatesSet = (dateInfo: any) => {
    fetchSchedule(dateInfo.start, dateInfo.end);
  };

  // Przejście do dziś
  const goToToday = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.today();
    }
  };

  // Liczenie zajęć i sumy godzin dzisiaj
  const todayDateString = new Date().toDateString();
  const eventsToday = events.filter(
    (e) => new Date(e.start).toDateString() === todayDateString
  );
  const totalHoursToday = eventsToday.reduce((sum, e) => {
    const start = new Date(e.start);
    const end = new Date(e.end);
    return sum + (end.getTime() - start.getTime()) / (1000 * 3600);
  }, 0);

  return (
    <main className="min-h-screen px-6 py-6 text-[var(--color-text)] bg-[var(--color-bg)]">
      {/* Główna siatka */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Lewa kolumna – plan zajęć dzienny (FullCalendar) */}
        <div className="lg:col-span-2 bg-[var(--color-bg-secondary)] p-6 rounded-xl shadow-md">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Plan zajęć</h2>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)] text-sm"
            >
              Dzisiaj
            </button>
          </div>

          {/* Legenda */}
          <div className="mb-4 flex flex-wrap gap-3 text-xs">
            {Object.entries(classTypeColors).map(([type, colors]) => (
              <div key={type} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: colors.bg }}
                />
                <span>{classTypeLabels[type as keyof typeof classTypeLabels]}</span>
              </div>
            ))}
          </div>

          {/* Kalendarz */}
          <div className="calendar-container">
            {loading && (
              <p className="text-center py-4 text-[var(--color-text-secondary)]">
                Ładowanie...
              </p>
            )}
            <FullCalendar
              ref={calendarRef}
              plugins={[timeGridPlugin, interactionPlugin]}
              initialView="timeGridDay"
              locale={plLocale}
              events={events}
              eventClick={handleEventClick}
              datesSet={handleDatesSet}
              headerToolbar={{
                left: "prev,next",
                center: "title",
                right: "timeGridDay,timeGridWeek",
              }}
              buttonText={{
                today: "Dziś",
                day: "Dzień",
                week: "Tydzień",
              }}
              slotMinTime="07:00:00"
              slotMaxTime="20:00:00"
              allDaySlot={false}
              height="600px"
              slotDuration="00:30:00"
              slotLabelFormat={{
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }}
              eventTimeFormat={{
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }}
              nowIndicator={true}
              scrollTime="08:00:00"
            />
          </div>
        </div>

        {/* Prawa kolumna – informacje */}
        <div className="bg-[var(--color-bg-secondary)] p-6 rounded-xl shadow-md flex flex-col gap-6">
          {/* Oceny - najnowsze */}
          <div>
            <p className="mb-2 text-sm font-semibold">Dodano nowe oceny:</p>
            {recentGrades.length === 0 && (
              <p className="text-[var(--color-text-secondary)] italic">Brak nowych ocen</p>
            )}
            {recentGrades.length > 0 && (
              <div className="flex gap-4">
                {recentGrades.slice(0, 2).map((grade) => (
                  <div
                    key={grade.gradeId}
                    className="bg-teal-700 text-white px-6 py-2 rounded-lg font-bold text-xl shadow"
                    title={`Przedmiot: ${grade.subjectName}\nDodano przez: ${grade.addedByName}\nData: ${grade.createdAt}`}
                  >
                    {grade.value}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Aktualne zajęcia */}
          <div>
            <p className="mb-2 text-sm font-semibold border-t border-[#327f7a] pt-4">
              Aktualne zajęcia:
            </p>
            {currentClass ? (
              <div className="bg-teal-700 text-white px-4 py-3 rounded-lg shadow">
                <p className="font-bold">{currentClass.title}</p>
                <p className="text-xs mt-1">
                  {new Date(currentClass.start).toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(currentClass.end).toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {currentClass.room && <p className="text-xs">Sala: {currentClass.room}</p>}
              </div>
            ) : (
              <p className="text-[var(--color-text-secondary)] italic">
                Brak zajęć w tym momencie
              </p>
            )}
          </div>

          {/* Następne zajęcia */}
          <div>
            <p className="mb-2 text-sm font-semibold border-t border-[#327f7a] pt-4">
              Następne zajęcia:
            </p>
            {nextClass ? (
              <div className="bg-teal-700 text-white px-4 py-3 rounded-lg shadow">
                <p className="font-bold">{nextClass.title}</p>
                <p className="text-xs mt-1">
                  {new Date(nextClass.start).toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(nextClass.end).toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {nextClass.room && <p className="text-xs">Sala: {nextClass.room}</p>}
              </div>
            ) : (
              <p className="text-[var(--color-text-secondary)] italic">Brak kolejnych zajęć dzisiaj</p>
            )}
          </div>

          {/* Dzisiaj - liczba zajęć i liczba godzin */}
          <div className="border-t border-[#327f7a] pt-4">
            <p className="mb-2 text-sm font-semibold">Dzisiaj:</p>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-[var(--color-bg)] p-3 rounded-lg">
                <p className="text-2xl font-bold text-[var(--color-accent)]">{eventsToday.length}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">zajęć</p>
              </div>
              <div className="bg-[var(--color-bg)] p-3 rounded-lg">
                <p className="text-2xl font-bold text-[var(--color-accent)]">{totalHoursToday.toFixed(1)}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">godzin</p>
              </div>
            </div>
          </div>
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
              <div>
                <strong className="text-sm text-[var(--color-text-secondary)]">Typ zajęć:</strong>
                <p className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded"
                    style={{ backgroundColor: selectedEvent.backgroundColor }}
                  />
                  {classTypeLabels[selectedEvent.extendedProps.type as keyof typeof classTypeLabels]}
                </p>
              </div>

              <div>
                <strong className="text-sm text-[var(--color-text-secondary)]">Godziny:</strong>
                <p>
                  {new Date(selectedEvent.start).toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(selectedEvent.end).toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              {selectedEvent.extendedProps.room && (
                <div>
                  <strong className="text-sm text-[var(--color-text-secondary)]">Sala:</strong>
                  <p>{selectedEvent.extendedProps.room}</p>
                </div>
              )}

              {selectedEvent.extendedProps.building && (
                <div>
                  <strong className="text-sm text-[var(--color-text-secondary)]">Budynek:</strong>
                  <p>{selectedEvent.extendedProps.building}</p>
                </div>
              )}

              {selectedEvent.extendedProps.instructor && (
                <div>
                  <strong className="text-sm text-[var(--color-text-secondary)]">Prowadzący:</strong>
                  <p>{selectedEvent.extendedProps.instructor}</p>
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
          background: var(--color-bg);
        }

        .calendar-container .fc-theme-standard td,
        .calendar-container .fc-theme-standard th {
          border-color: var(--color-accent);
        }

        .calendar-container .fc-col-header-cell {
          background: var(--color-bg-secondary);
          color: var(--color-text);
          font-weight: 600;
          padding: 8px;
        }

        .calendar-container .fc-timegrid-slot {
          height: 3em;
        }

        .calendar-container .fc-timegrid-slot-label {
          color: var(--color-text);
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

        .calendar-container .fc-toolbar-title {
          color: var(--color-text) !important;
          font-size: 1.5em !important;
        }

        .calendar-container .fc-timegrid-now-indicator-line {
          border-color: #ef4444 !important;
          border-width: 2px !important;
        }

        .calendar-container .fc-timegrid-now-indicator-arrow {
          border-color: #ef4444 !important;
        }

        .calendar-container .fc-event {
          cursor: pointer;
          border-radius: 4px;
        }

        .calendar-container .fc-event:hover {
          opacity: 0.85;
        }

        .calendar-container .fc-event-title {
          font-weight: 600;
        }

        .calendar-container .fc-daygrid-day-frame {
          background: var(--color-bg);
        }
      `}</style>
    </main>
  );
}
