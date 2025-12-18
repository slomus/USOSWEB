import ScheduleLessonPage from "./scheduleLessonView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Plan zajęć', 
}
export default function ScheduleLessonMainPage() {
  return <ScheduleLessonPage />;
}