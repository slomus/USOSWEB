"use client";

import TopBar from "@/app/components/TopBar";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import { useState } from "react";

export default function KierunekPage() {
  const [isNavVisible, setIsNavVisible] = useState(true);

  return (
    <div className="flex min-h-screen bg-[#202120] text-[#DFD4CA]">
      {/* Sidebar */}
      {isNavVisible && <Navigation />}

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <TopBar isNavVisible={isNavVisible} setIsNavVisible={setIsNavVisible} />

        {/* Page content */}
        <main className="p-6 max-w-6xl mx-auto w-full pt-24">
          <h1 className="text-4xl font-bold mb-8 border-b border-[#3A6A68] pb-4">
            🎓 Informacje o kierunku
          </h1>

          {/* Informacje o kierunku */}
          <section className="bg-[#403E3C] p-6 rounded-2xl shadow-lg mb-10">
            <div className="grid md:grid-cols-2 gap-6">
              <InfoRow label="Uniwersytet" value="Uniwersytet Michała Wielkiego" />
              <InfoRow label="Kolegium" value="Kolegium II" />
              <InfoRow label="Wydział" value="Informatyki" />
              <InfoRow label="Adres wydziału" value="ul. Urzędnicza 2, Toruń" />
              <InfoRow label="Kierunek" value="Informatyka" />
              <InfoRow label="Rok" value="3" />
              <InfoRow label="Semestr" value="Letni (6)" />
              <InfoRow label="Tryb studiów" value="Stacjonarne" />
              <InfoRow label="Moduł" value="Sieci i systemy rozproszone" />
              <InfoRow label="Opiekun kierunku" value="dr inż. Karol Kudłaty" />
            </div>

            <div className="mt-6">
              <a
                href="/plan-zajec"
                className="inline-block text-sm px-4 py-2 bg-[#3A6A68] text-white rounded-lg shadow hover:bg-[#295c5b] transition"
              >
                Zobacz plan zajęć
              </a>
            </div>
          </section>

          {/* Filtry wyszukiwania */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">🔍 Wyszukaj innego kierunku</h2>
            <div className="grid md:grid-cols-3 gap-4 bg-[#403E3C] p-6 rounded-2xl shadow-md mb-6">
              <input
                type="text"
                placeholder="Szukaj po nazwie kierunku"
                className="p-2 rounded-md bg-[#6B6160] text-white placeholder-[#DFD4CA] border border-[#9C9793]"
              />
              <select className="p-2 rounded-md bg-[#6B6160] text-white border border-[#9C9793]">
                <option>Wybierz kolegium</option>
                <option>Kolegium I</option>
                <option>Kolegium II</option>
              </select>
              <select className="p-2 rounded-md bg-[#6B6160] text-white border border-[#9C9793]">
                <option>Wybierz wydział</option>
                <option>Wydział Informatyki</option>
              </select>
              <select className="p-2 rounded-md bg-[#6B6160] text-white border border-[#9C9793]">
                <option>Tryb studiów</option>
                <option>Stacjonarne</option>
                <option>Niestacjonarne</option>
              </select>
              <input
                type="text"
                placeholder="Moduł / specjalność"
                className="p-2 rounded-md bg-[#6B6160] text-white placeholder-[#DFD4CA] border border-[#9C9793]"
              />
            </div>

            <div className="mt-2">
              <a
                href="/plan-zajec?filter=on"
                className="inline-block px-4 py-2 bg-[#3A6A68] text-white rounded-lg hover:bg-[#295c5b] transition"
              >
                Wyszukaj
              </a>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#9C9793] uppercase tracking-wide">{label}</p>
      <p className="text-base font-semibold text-[#DFD4CA]">{value}</p>
    </div>
  );
}
