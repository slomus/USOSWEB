import CalendarPage from "./calendarView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Wykładowca - Kalendarz', 
}
export default function TeacherCalendarMainPage() {
  return <CalendarPage />;
}