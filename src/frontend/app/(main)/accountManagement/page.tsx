import AccountManagementPage from "./accountManagementView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Zarządzanie kontem', 
}
export default function MainPage() {
  return <AccountManagementPage />;
}