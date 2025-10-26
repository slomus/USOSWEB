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
  title: "Zaloguj się do USOSWEB",
  keywords: ["USOSWEB", "logowanie", "system uczelniany", "studia"],
  description: "Zaloguj się do systemu USOSWEB, aby uzyskać dostęp do planu zajęć, ocen i innych funkcji.",
  authors: [{ name: "USOSWEB Team ZPI", url: "https://usosweb.example.com" }],
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
