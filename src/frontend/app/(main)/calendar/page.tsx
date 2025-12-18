import CalendarPage from "./calendarView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Kalendarz Akademicki', 
}

export default function MainPage() {
  return <CalendarPage />;
}