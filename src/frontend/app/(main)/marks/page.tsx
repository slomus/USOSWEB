import MarksPage from "./marksView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Oceny', 
}
export default function MarksMainPage() {
  return <MarksPage />;
}