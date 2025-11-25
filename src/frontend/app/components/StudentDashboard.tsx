"use client";

import { useState, useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";
import plLocale from "@fullcalendar/core/locales/pl";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

// --- TYPY ---

type ApiScheduleClass = {
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
    room?: string;
    instructor?: string;
    building?: string;
    description?: string;
    source: "class" | "academic";
  };
};

type Grade = {
  gradeId: number;
  subjectName: string;
  value: string;
  createdAt: string;
  addedByName: string;
};

// --- KONFIGURACJA BLOKOWANIA ---
// Typy wydarzeń akademickich, które ANULUJĄ zajęcia dydaktyczne
const BLOCKING_TYPES = ["holiday", "break", "exam_session", "rector_day"];

// --- KOLORY ---
const classTypeColors: Record<string, { bg: string; border: string }> = {
  lecture: { bg: "#2563eb", border: "#1e40af" },
  lab: { bg: "#9333ea", border: "#6b21a8" },
  exercise: { bg: "#0d9488", border: "#115e59" },
  seminar: { bg: "#ea580c", border: "#9a3412" },
  other: { bg: "#4b5563", border: "#374151" },
  
  holiday: { bg: "#dc2626", border: "#991b1b" },
  break: { bg: "#f59e0b", border: "#b45309" },
  exam_session: { bg: "#7c3aed", border: "#5b21b6" },
  semester_start: { bg: "#16a34a", border: "#15803d" },
  semester_end: { bg: "#db2777", border: "#be185d" },
  registration: { bg: "#0891b2", border: "#0e7490" },
  academic_default: { bg: "#475569", border: "#334155" }
};

// --- HELPERY ---

const mapClassTypeToKey = (type: string): string => {
  const normalized = type.toLowerCase();
  if (normalized.includes("wykład")) return "lecture";
  if (normalized.includes("lab")) return "lab";
  if (normalized.includes("ćwiczenia")) return "exercise";
  if (normalized.includes("seminar")) return "seminar";
  return "other";
};

const getAcademicColor = (eventType: string) => {
  return classTypeColors[eventType] || classTypeColors.academic_default;
};

const formatDateToLocalISO = (date: Date): string => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split("T")[0];
};

const setTimeOnDate = (baseDate: Date, timeStr: string): Date => {
  const date = new Date(baseDate);
  const [hours, minutes] = timeStr.split(":").map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const getMondayOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

// Funkcja sprawdzająca, czy data zajęć koliduje z dniami wolnymi
const isDateBlocked = (targetDate: Date, blockingRanges: { start: number; end: number }[]) => {
  // Resetujemy targetDate do północy dla pewności porównania
  const checkTime = new Date(targetDate);
  checkTime.setHours(0, 0, 0, 0);
  const checkTimeMs = checkTime.getTime();

  return blockingRanges.some((range) => {
    return checkTimeMs >= range.start && checkTimeMs <= range.end;
  });
};

export default function StudentMainPage() {
  const calendarRef = useRef<any>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentClass, setCurrentClass] = useState<CalendarEvent | null>(null);
  const [nextClass, setNextClass] = useState<CalendarEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [recentGrades, setRecentGrades] = useState<Grade[]>([]);

  const fetchAllEvents = async (startRange: Date, endRange: Date) => {
    setLoading(true);
    const paramDate = formatDateToLocalISO(startRange);
    
    try {
      const [scheduleResult, academicResult] = await Promise.allSettled([
        fetch(`${API_BASE}/api/student/schedule/week?date=${paramDate}`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }).then((res) => res.json()),

        fetch(`${API_BASE}/api/calendar/academic`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }).then((res) => res.json())
      ]);

      let finalEvents: CalendarEvent[] = [];
      const mondayBase = getMondayOfWeek(startRange);
      
      // Lista zakresów czasowych (timestamp ms), które są wolne od zajęć
      const blockingRanges: { start: number; end: number }[] = [];

      // --- 1. PRZETWARZANIE KALENDARZA AKADEMICKIEGO ---
      // Robimy to najpierw, aby zbudować listę blokad
      if (academicResult.status === "fulfilled" && academicResult.value.success && Array.isArray(academicResult.value.events)) {
        const academicList: ApiAcademicEvent[] = academicResult.value.events;
        
        const academicCalendarEvents = academicList.map((item) => {
          const colors = getAcademicColor(item.eventType);
          
          // Parsowanie dat do obiektów Date (ustawionych na północ lokalnego czasu)
          const startDateObj = new Date(item.startDate);
          startDateObj.setHours(0, 0, 0, 0);

          let endDateObj = new Date(item.startDate); // Domyślnie koniec to ten sam dzień
          if (item.endDate && item.endDate !== "") {
            endDateObj = new Date(item.endDate);
          }
          endDateObj.setHours(0, 0, 0, 0);

          // Jeśli typ wydarzenia jest blokujący zajęcia, dodajemy do blockingRanges
          if (BLOCKING_TYPES.includes(item.eventType)) {
            blockingRanges.push({
              start: startDateObj.getTime(),
              end: endDateObj.getTime(),
            });
          }

          // FullCalendar 'end' (wyłączny)
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
              source: "academic",
              type: item.title,
              description: item.description,
            },
          };
        });
        
        // Dodajemy wydarzenia akademickie do głównej listy
        finalEvents = [...finalEvents, ...academicCalendarEvents];
      }

      // --- 2. PRZETWARZANIE PLANU ZAJĘĆ (SCHEDULE) ---
      if (scheduleResult.status === "fulfilled" && scheduleResult.value.success && Array.isArray(scheduleResult.value.schedule)) {
        const scheduleEvents: CalendarEvent[] = [];

        scheduleResult.value.schedule.forEach((item: ApiScheduleClass) => {
          // Obliczamy konkretną datę zajęć w tym tygodniu
          const targetDate = new Date(mondayBase);
          targetDate.setDate(mondayBase.getDate() + (item.dayOfWeek - 1));

          // SPRAWDZENIE KOLIZJI Z DNIAMI WOLNYMI
          // Jeśli data zajęć wpada w zablokowany zakres, pomijamy te zajęcia
          if (isDateBlocked(targetDate, blockingRanges)) {
            return; // continue loop
          }

          const typeKey = mapClassTypeToKey(item.classType);
          const start = setTimeOnDate(targetDate, item.startTime);
          const end = setTimeOnDate(targetDate, item.endTime);

          scheduleEvents.push({
            id: `sched-${item.scheduleId}`,
            title: `${item.subjectName} (${item.classType})`,
            start: start.toISOString(),
            end: end.toISOString(),
            allDay: false,
            backgroundColor: classTypeColors[typeKey].bg,
            borderColor: classTypeColors[typeKey].border,
            extendedProps: {
              source: "class",
              type: item.classType,
              room: item.room,
              instructor: item.instructorName,
              building: item.building,
            },
          });
        });
        
        finalEvents = [...finalEvents, ...scheduleEvents];
      }

      setEvents(finalEvents);

    } catch (error) {
      console.error("Błąd podczas pobierania danych:", error);
    } finally {
      setLoading(false);
    }
  };

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
      console.error("Błąd grades:", error);
    }
  };

  useEffect(() => {
    const updateCurrentClasses = () => {
      const now = new Date();
      let current: CalendarEvent | null = null;
      let next: CalendarEvent | null = null;

      const todaysClasses = events.filter(e => {
        if (e.allDay || e.extendedProps.source !== 'class') return false;
        const eStart = new Date(e.start);
        return eStart.toDateString() === now.toDateString();
      });

      todaysClasses.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

      for (const event of todaysClasses) {
        const start = new Date(event.start);
        const end = event.end ? new Date(event.end) : start;

        if (now >= start && now <= end) {
          current = event;
        } else if (now < start && !next) {
          next = event;
        }
      }

      setCurrentClass(current);
      setNextClass(next);
    };

    updateCurrentClasses();
    const interval = setInterval(updateCurrentClasses, 30000);
    return () => clearInterval(interval);
  }, [events]);

  useEffect(() => {
    fetchRecentGrades();
  }, []);

  const handleDatesSet = (dateInfo: any) => {
    fetchAllEvents(dateInfo.start, dateInfo.end);
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
    setShowEventModal(true);
  };

  const goToToday = () => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.today();
  };

  // Statystyki
  const todayDateString = new Date().toDateString();
  const classesToday = events.filter(
    (e) => !e.allDay && e.extendedProps.source === 'class' && new Date(e.start).toDateString() === todayDateString
  );
  const totalHoursToday = classesToday.reduce((sum, e) => {
    const start = new Date(e.start);
    const end = e.end ? new Date(e.end) : start;
    return sum + (end.getTime() - start.getTime()) / (1000 * 3600);
  }, 0);

  return (
    <main className="min-h-screen px-6 py-6 text-[var(--color-text)] bg-[var(--color-bg)]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        
        {/* KALENDARZ */}
        <div className="lg:col-span-2 bg-[var(--color-bg-secondary)] p-6 rounded-xl shadow-md flex flex-col h-full">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Plan i Wydarzenia</h2>
            <div className="flex gap-2">
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)] text-sm transition-colors"
              >
                Dzisiaj
              </button>
            </div>
          </div>

          <div className="flex-grow calendar-wrapper">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridDay"
              locale={plLocale}
              firstDay={1}
              events={events}
              eventClick={handleEventClick}
              datesSet={handleDatesSet}
              headerToolbar={{
                left: "prev,next",
                center: "title",
                right: "timeGridDay,timeGridWeek,dayGridMonth",
              }}
              buttonText={{
                today: "Dziś",
                day: "Dzień",
                week: "Tydzień",
                month: "Miesiąc"
              }}
              slotMinTime="08:00:00"
              slotMaxTime="20:00:00"
              allDaySlot={true}
              allDayText="Info"
              height="auto"
              contentHeight="auto"
              slotDuration="00:30:00"
              eventTimeFormat={{
                hour: "2-digit",
                minute: "2-digit",
                meridiem: false,
              }}
              nowIndicator={true}
            />
          </div>
          {loading && <p className="text-xs text-center mt-2 opacity-50">Aktualizacja danych...</p>}
        </div>

        {/* INFO */}
        <div className="bg-[var(--color-bg-secondary)] p-6 rounded-xl shadow-md flex flex-col gap-6 h-fit">
          
          {/* Ostatnie Oceny */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Ostatnie oceny
            </h3>
            {recentGrades.length > 0 ? (
              <div className="space-y-3">
                {recentGrades.slice(0, 3).map((grade) => (
                  <div key={grade.gradeId} className="flex justify-between items-center bg-[var(--color-bg)] p-3 rounded-lg border-l-4 border-teal-600">
                    <div>
                      <p className="font-bold text-sm">{grade.subjectName}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{grade.addedByName}</p>
                    </div>
                    <span className="text-xl font-bold text-teal-600">{grade.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic opacity-60">Brak nowych ocen.</p>
            )}
          </div>

          {/* Teraz */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] pt-4 border-t border-[var(--color-accent)]/20">
              Teraz
            </h3>
            {currentClass ? (
              <div className="bg-[var(--color-accent)] text-white p-4 rounded-lg shadow-lg">
                <p className="font-bold text-lg">{currentClass.extendedProps.type}</p>
                <p className="text-sm opacity-90">{currentClass.title}</p>
                <div className="mt-2 flex justify-between text-xs opacity-80">
                  <span>{currentClass.extendedProps.room}</span>
                  <span>
                    {new Date(currentClass.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {currentClass.end ? new Date(currentClass.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm italic opacity-60">Brak zajęć dydaktycznych w tej chwili.</p>
            )}
          </div>

          {/* Następnie */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] pt-4 border-t border-[var(--color-accent)]/20">
              Następnie
            </h3>
            {nextClass ? (
              <div className="bg-[var(--color-bg)] border border-[var(--color-accent)] p-4 rounded-lg">
                <p className="font-bold text-[var(--color-accent)]">{nextClass.title}</p>
                <p className="text-xs mt-1 text-[var(--color-text-secondary)]">
                  {new Date(nextClass.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {nextClass.end ? new Date(nextClass.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                </p>
                <p className="text-xs mt-1">Sala: {nextClass.extendedProps.room}</p>
              </div>
            ) : (
              <p className="text-sm italic opacity-60">To już koniec zajęć na dziś.</p>
            )}
          </div>

          {/* Statystyki */}
          <div className="pt-4 border-t border-[var(--color-accent)]/20">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Dydaktyka dzisiaj
            </h3>
            <div className="flex gap-4 text-center">
              <div className="flex-1 bg-[var(--color-bg)] p-2 rounded">
                <span className="block text-xl font-bold text-[var(--color-accent)]">{classesToday.length}</span>
                <span className="text-xs text-[var(--color-text-secondary)]">Zajęć</span>
              </div>
              <div className="flex-1 bg-[var(--color-bg)] p-2 rounded">
                <span className="block text-xl font-bold text-[var(--color-accent)]">{totalHoursToday}h</span>
                <span className="text-xs text-[var(--color-text-secondary)]">Godzin</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showEventModal && selectedEvent && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={() => setShowEventModal(false)}
        >
          <div
            className="bg-[var(--color-bg-secondary)] rounded-xl p-6 max-w-md w-full shadow-2xl border border-[var(--color-accent)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold pr-4">{selectedEvent.title}</h2>
              <button onClick={() => setShowEventModal(false)} className="text-gray-400 hover:text-white transition-colors">✕</button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Modal class */}
              {selectedEvent.extendedProps.source === 'class' && (
                <>
                  <div className="flex items-center gap-3">
                    <span className="w-24 text-[var(--color-text-secondary)]">Typ:</span>
                    <span className="px-2 py-1 rounded text-white text-xs font-semibold" style={{ backgroundColor: selectedEvent.backgroundColor }}>
                      {selectedEvent.extendedProps.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-24 text-[var(--color-text-secondary)]">Czas:</span>
                    <span>
                      {new Date(selectedEvent.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {selectedEvent.end ? new Date(selectedEvent.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-24 text-[var(--color-text-secondary)]">Sala:</span>
                    <span>{selectedEvent.extendedProps.room || "-"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-24 text-[var(--color-text-secondary)]">Prowadzący:</span>
                    <span>{selectedEvent.extendedProps.instructor || "-"}</span>
                  </div>
                </>
              )}

              {/* Modal academic */}
              {selectedEvent.extendedProps.source === 'academic' && (
                <>
                  <div className="p-3 rounded border text-white font-medium mb-3" style={{ backgroundColor: selectedEvent.backgroundColor, borderColor: selectedEvent.borderColor }}>
                    Wydarzenie Akademickie
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-24 text-[var(--color-text-secondary)]">Data:</span>
                    <span>{new Date(selectedEvent.start).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    <span className="text-[var(--color-text-secondary)] font-semibold">Opis:</span>
                    <p className="opacity-90 leading-relaxed bg-[var(--color-bg)] p-2 rounded border border-gray-700/30">
                      {selectedEvent.extendedProps.description}
                    </p>
                  </div>
                </>
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
        .calendar-wrapper .fc-timegrid-axis-cushion {
           color: var(--color-text-secondary);
           font-size: 0.75rem;
           text-transform: uppercase;
        }
        .calendar-wrapper .fc-timegrid-slot-label {
          background-color: var(--color-bg-secondary);
        }
        .calendar-wrapper .fc-timegrid-slot-label-cushion {
          color: var(--color-text-secondary);
          font-weight: 600;
        }
        .calendar-wrapper .fc-scrollgrid {
          border: 1px solid var(--fc-border-color);
          border-radius: 8px;
          overflow: hidden;
        }
        .calendar-wrapper .fc-event {
          border: none;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border-radius: 4px;
        }
        .calendar-wrapper .fc-timegrid-now-indicator-line {
          border-color: red;
          border-width: 2px;
        }
      `}</style>
    </main>
  );
}