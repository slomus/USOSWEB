"use client";

import { useState, useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import plLocale from "@fullcalendar/core/locales/pl";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

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

export default function StudentMainPage() {
  const calendarRef = useRef<any>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentClass, setCurrentClass] = useState<ClassEvent | null>(null);
  const [nextClass, setNextClass] = useState<ClassEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  // Kolory dla różnych typów zajęć
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

  // Funkcja do pobierania zajęć
  const fetchSchedule = async (startDate: Date, endDate: Date) => {
    setLoading(true);
    try {
      const start = startDate.toISOString().split("T")[0];
      const end = endDate.toISOString().split("T")[0];
      
      // Dostosuj endpoint do swojego API
      const response = await fetch(
        `${API_BASE}/api/schedule/range?start_date=${start}&end_date=${end}`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json();

      if (data.success) {
        const calendarEvents = (data.classes || []).map((event: ClassEvent) => ({
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          backgroundColor: classTypeColors[event.type].bg,
          borderColor: classTypeColors[event.type].border,
          extendedProps: {
            type: event.type,
            room: event.room,
            instructor: event.instructor,
            building: event.building,
          },
        }));
        setEvents(calendarEvents);
      } else {
        console.error("Błąd API:", data.message);
        setMockData();
      }
    } catch (error) {
      console.error("Błąd podczas pobierania planu:", error);
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  // Dane przykładowe (usuń gdy będziesz mieć prawdziwe API)
  const setMockData = () => {
    const today = new Date();
    const formatDateTime = (hours: number, minutes: number) => {
      const date = new Date(today);
      date.setHours(hours, minutes, 0, 0);
      return date.toISOString();
    };

    const mockClasses: ClassEvent[] = [
      {
        id: "1",
        title: "Matematyka dyskretna",
        start: formatDateTime(8, 0),
        end: formatDateTime(9, 30),
        type: "lecture",
        room: "A-101",
        instructor: "Dr Jan Kowalski",
        building: "Budynek A",
      },
      {
        id: "2",
        title: "Systemy rozproszone",
        start: formatDateTime(10, 0),
        end: formatDateTime(11, 30),
        type: "lab",
        room: "B-205",
        instructor: "Dr Anna Nowak",
        building: "Budynek B",
      },
      {
        id: "3",
        title: "Bazy danych",
        start: formatDateTime(12, 0),
        end: formatDateTime(13, 30),
        type: "exercise",
        room: "C-301",
        instructor: "Mgr Piotr Wiśniewski",
        building: "Budynek C",
      },
     ];

    const calendarEvents = mockClasses.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      backgroundColor: classTypeColors[event.type].bg,
      borderColor: classTypeColors[event.type].border,
      extendedProps: {
        type: event.type,
        room: event.room,
        instructor: event.instructor,
        building: event.building,
      },
    }));

    setEvents(calendarEvents);
  };

  // Określ aktualne i następne zajęcia
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

  // Załaduj dane przy starcie
  useEffect(() => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Poniedziałek
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Niedziela

    fetchSchedule(weekStart, weekEnd);
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

  // Obsługa zmiany zakresu dat
  const handleDatesSet = (dateInfo: any) => {
    fetchSchedule(dateInfo.start, dateInfo.end);
  };

  const goToToday = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.today();
    }
  };

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
          {/* Oceny */}
          <div>
            <p className="mb-2 text-sm font-semibold">Dodano nowe oceny:</p>
            <div className="flex gap-4">
              <div className="bg-teal-700 text-white px-6 py-2 rounded-lg font-bold text-xl shadow">
                5
              </div>
              <div className="bg-red-700 text-white px-6 py-2 rounded-lg font-bold text-xl shadow">
                2
              </div>
            </div>
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
                {currentClass.room && (
                  <p className="text-xs">Sala: {currentClass.room}</p>
                )}
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
                {nextClass.room && (
                  <p className="text-xs">Sala: {nextClass.room}</p>
                )}
              </div>
            ) : (
              <p className="text-[var(--color-text-secondary)] italic">
                Brak kolejnych zajęć dzisiaj
              </p>
            )}
          </div>

          {/* Statystyki */}
          <div className="border-t border-[#327f7a] pt-4">
            <p className="mb-2 text-sm font-semibold">Dzisiaj:</p>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-[var(--color-bg)] p-3 rounded-lg">
                <p className="text-2xl font-bold text-[var(--color-accent)]">
                  {events.filter((e) => {
                    const eventDate = new Date(e.start).toDateString();
                    const today = new Date().toDateString();
                    return eventDate === today;
                  }).length}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  zajęć
                </p>
              </div>
              <div className="bg-[var(--color-bg)] p-3 rounded-lg">
                <p className="text-2xl font-bold text-[var(--color-accent)]">
                  {events
                    .filter((e) => {
                      const eventDate = new Date(e.start).toDateString();
                      const today = new Date().toDateString();
                      return eventDate === today;
                    })
                    .reduce((total, e) => {
                      const start = new Date(e.start);
                      const end = new Date(e.end);
                      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                      return total + hours;
                    }, 0)
                    .toFixed(1)}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  godzin
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

     {/* Sekcja aktualności */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-center mb-2">Aktualności</h2>
        <div className="border-t-4 border-[#327f7a] w-1/3 mx-auto mb-4"></div>
        <h3 className="text-lg font-bold text-center mb-2">
          Spotkanie informacyjne dla studentów I roku
        </h3>
        <p className="text-sm text-center max-w-3xl mx-auto text-[var(--color-text)]">
          W środę 12 listopada o godz. 16:00 w auli A odbędzie się spotkanie organizacyjne dla studentów pierwszego roku. Tematy: zasady zaliczeń, dostęp do platformy e-learningowej, pomoc materialna.
        </p>
        <div className="border-t-2 border-[#327f7a] w-1/3 mx-auto mb-4 mt-4"></div>
        <h3 className="text-lg font-bold text-center mb-2">
          Targi pracy i praktyk studenckich
        </h3>
        <p className="text-sm text-center max-w-3xl mx-auto text-[var(--color-text)]">
          W dniach 18–19 listopada w holu głównym uczelni odbędą się targi pracy. Obecni będą przedstawiciele firm z branży IT, edukacji, administracji i NGO. Warto zabrać CV!
        </p>
        <div className="border-t-4 border-[#327f7a] w-1/3 mx-auto mb-4"></div>
        <h3 className="text-lg font-bold text-center mb-2">
          Warsztaty „Zarządzanie stresem przed sesją”
        </h3>
        <p className="text-sm text-center max-w-3xl mx-auto text-[var(--color-text)]">
          Centrum Wsparcia Psychologicznego zaprasza na bezpłatne warsztaty 21 listopada o godz. 17:00 w auli A.
        </p>
      </section>

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
                <strong className="text-sm text-[var(--color-text-secondary)]">
                  Typ zajęć:
                </strong>
                <p className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded"
                    style={{ backgroundColor: selectedEvent.backgroundColor }}
                  />
                  {classTypeLabels[selectedEvent.extendedProps.type as keyof typeof classTypeLabels]}
                </p>
              </div>

              <div>
                <strong className="text-sm text-[var(--color-text-secondary)]">
                  Godziny:
                </strong>
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
                  <strong className="text-sm text-[var(--color-text-secondary)]">
                    Sala:
                  </strong>
                  <p>{selectedEvent.extendedProps.room}</p>
                </div>
              )}

              {selectedEvent.extendedProps.building && (
                <div>
                  <strong className="text-sm text-[var(--color-text-secondary)]">
                    Budynek:
                  </strong>
                  <p>{selectedEvent.extendedProps.building}</p>
                </div>
              )}

              {selectedEvent.extendedProps.instructor && (
                <div>
                  <strong className="text-sm text-[var(--color-text-secondary)]">
                    Prowadzący:
                  </strong>
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