import AboutPage from "./aboutView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'O nas', 
}
export default function AboutMainPage() {
  return <AboutPage />;
}