import ExamsPassesPage from "./examsPassesView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Zaliczenia i Egzaminy', 
}
export default function ExamsPassesMainPage() {
  return <ExamsPassesPage />;
}