import SubjectManagementPage from "./subjectsView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Admin - Zarządzanie Przedmiotami', 
}
export default function SubjectsPage() {
  return <SubjectManagementPage />;
}