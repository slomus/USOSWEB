"use client";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-[var(--color-bg-secondary)] border-t border-[var(--color-text)]/10 text-[var(--color-text)] transition-colors z-40">
      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0 text-sm">
        
        {/* LEWA STRONA: Copyright */}
        <div className="text-[var(--color-text-secondary)] text-center md:text-left order-2 md:order-1">
          <p className="font-medium">© USOSV2 {currentYear}</p>
          <p className="text-xs mt-1 opacity-70">Wszelkie prawa zastrzeżone.</p>
        </div>

        {/* PRAWA STRONA: Linki */}
        <div className="flex flex-col items-center md:items-end gap-3 order-1 md:order-2">
          
          {/* Telefon */}
          <a
            href="tel:+48123456789"
            className="flex items-center gap-2 hover:text-[var(--color-accent)] transition-colors group"
          >
            <span className="group-hover:translate-x-[-2px] transition-transform duration-200">
               +48 123 456 789
            </span>
            <div className="bg-[var(--color-bg)] p-1.5 rounded-full group-hover:bg-[var(--color-text)]/10 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
            </div>
          </a>

          {/* Facebook */}
          <a
            href="https://www.facebook.com/ukwbydgoszcz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-blue-500 transition-colors group"
          >
            <span className="group-hover:translate-x-[-2px] transition-transform duration-200">
               Facebook
            </span>
            <div className="bg-[var(--color-bg)] p-1.5 rounded-full group-hover:bg-blue-500/10 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
            </div>
          </a>

          {/* Strona WWW */}
          <a
            href="/aboutUs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-[var(--color-accent)] transition-colors group"
          >
            <span className="group-hover:translate-x-[-2px] transition-transform duration-200">
               O nas
            </span>
            <div className="bg-[var(--color-bg)] p-1.5 rounded-full group-hover:bg-[var(--color-text)]/10 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S12 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S12 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
            </div>
          </a>

        </div>
      </div>
    </footer>
  );
}