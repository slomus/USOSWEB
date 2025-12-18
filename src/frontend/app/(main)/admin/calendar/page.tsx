import CalendarPage from "../calendar/calendarView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Admin - Kalendarz', 
}
export default function AdminCalendarPage() {
  return <CalendarPage />;
}