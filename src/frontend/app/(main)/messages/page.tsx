import MessagesPage from "./messagesView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Wiadomości', 
}
export default function MessagesMainPage() {
  return <MessagesPage />;
}