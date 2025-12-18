import ApplicationManagementPage from "./applicationsView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Admin - Zarządzanie Wnioskami', 
}

export default function ApplicationsPage() {
  return <ApplicationManagementPage />;
}