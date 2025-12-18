import SubjectsPage from "./subjectsView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Wykładowca - Przedmioty', 
}
export default function TeacherSubjectsMainPage() {
  return <SubjectsPage />;
}