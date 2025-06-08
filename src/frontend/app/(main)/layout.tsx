"use client";
import TopBar from "@/app/components/TopBar";
import Navigation from "@/app/components/Navigation";
import Footer from "../components/Footer";
import { useState } from "react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isNavVisible, setIsNavVisible] = useState(false);

  return (
    <>
      <TopBar isNavVisible={isNavVisible} setIsNavVisible={setIsNavVisible} />
      {isNavVisible && <Navigation />}

      {/* Cała zawartość (main + footer) przesuwana razem jeśli nav widoczne */}
      <div
        className={`pt-[72px] transition-all duration-300 ${
          isNavVisible ? "ml-64" : "ml-0"
        }`}
      >
        {children}
        <Footer />
      </div>
    </>
  );
}
