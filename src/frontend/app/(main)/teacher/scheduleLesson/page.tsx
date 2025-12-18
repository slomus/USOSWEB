import SchedulePage from "./scheduleLessonView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Wykładowca - Plan zajęć', 
}
export default function TeacherScheduleLessonMainPage() {
  return <SchedulePage />;
}