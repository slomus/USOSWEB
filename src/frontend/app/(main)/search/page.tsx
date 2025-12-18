import SearchPage from "./searchView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Wyszukiwanie', 
}
export default function SearchMainPage() {
  return <SearchPage />;
}