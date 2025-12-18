import ScheduleLessonAdminPage from "./scheduleLessonView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Admin - Plan zajęć', 
}

export default function ScheduleLessonPage() {
  return <ScheduleLessonAdminPage />;
}