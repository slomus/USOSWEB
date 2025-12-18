import MarksPage from "./marksView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Wykładowca - Oceny', 
}
export default function TeacherMarksMainPage() {
  return <MarksPage />;
}