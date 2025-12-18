import UserManagementPage from "./usersView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Admin - Zarządzanie Użytkownikami', 
}

export default function UsersPage() {
  return <UserManagementPage />;
}