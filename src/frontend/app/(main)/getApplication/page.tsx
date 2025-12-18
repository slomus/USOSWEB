import GetApplicationPage from "./getApplicationView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Wnioski', 
}
export default function ApplicationPage() {
  return <GetApplicationPage />;
}