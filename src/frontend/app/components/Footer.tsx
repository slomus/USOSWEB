"use client";

export default function Footer() {
  return (
    <footer className="w-full bg-[#202120] text-[#DFD4CA] px-6 py-4 flex items-center justify-between text-sm z-40">
      {/* Lewa strona */}
      <div className="text-[#9C9793]">
        © USOSV2 2025 – wszelkie prawa zastrzeżone
      </div>

      {/* Prawa strona – linki jeden pod drugim */}
      <div className="flex flex-col items-start gap-1 text-right">
        <a
          href="tel:+48123456789"
          className="hover:text-white transition-colors"
        >
          +48 123 456 789
        </a>
        <a
          href="https://facebook.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
        >
          Facebook
        </a>
        <a
          href="https://usosv2.edu.pl"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
        >
          Strona internetowa
        </a>
      </div>
    </footer>
  );
}
