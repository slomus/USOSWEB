import UsersPage from "./usersView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Wykładowca - Użytkownicy', 
}
export default function TeacherUsersMainPage() {
  return <UsersPage />;
}