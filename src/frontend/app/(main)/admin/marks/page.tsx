import MarkManagementPage from "./marksView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Admin - Zarządzanie Ocenami', 
}
export default function MarksPage() {
  return <MarkManagementPage />;
}