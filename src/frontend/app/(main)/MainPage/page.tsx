import MainPage from "./MainPageView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Strona główna', 
}
export default function MainPageMain() {
  return <MainPage />;
}