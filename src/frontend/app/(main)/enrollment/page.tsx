import EnrollmentPage from "./enrollmentView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Rejestracja na Przedmioty', 
}

export default function EnrollmentMainPage() {
  return <EnrollmentPage />;
}