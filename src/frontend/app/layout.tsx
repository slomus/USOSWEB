import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import ToastWrapper from "./ToastWrapper";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: '%s | ASOSWEB',
    default: 'ASOSWEB - Akademicki system obsługi studiów',
  },
  keywords: ["ASOSWEB", "Akademicki system obsługi studiów", "system uczelniany", "studia"],
  description: "ASOSWEB to nowoczesny akademicki system obsługi studiów, który upraszcza zarządzanie danymi studentów, kursami i administracją uczelni.",
  authors: [{ name: "ASOSWEB Team ZPI", url: "https://asos.elmar.pro" }],
  manifest: '/site.webmanifest',
  
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={true}>
          {children}
          <ToastWrapper />
        </ThemeProvider>
      </body>
    </html>
  );
}
