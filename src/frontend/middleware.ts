import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Pobierz token z ciasteczek
  const token = request.cookies.get('access_token')?.value;

  // 2. Zdefiniuj ścieżki publiczne (dostępne bez logowania)
  const publicPaths = ['/', '/about', '/forgot-password'];
  
  // Sprawdź, czy aktualna ścieżka jest publiczna
  const isPublicPath = publicPaths.includes(pathname);

  // --- LOGIKA PRZEKIEROWAŃ ---

  // SCENARIUSZ 1: Użytkownik JEST zalogowany
  if (token) {
    // Jeśli próbuje wejść na stronę logowania ('/') lub odzyskiwania hasła,
    // przekieruj go do aplikacji (/MainPage).
    // (Pozwalamy mu wejść na /about, bo to strona informacyjna)
    if (pathname === '/' || pathname === '/forgot-password') {
      return NextResponse.redirect(new URL('/MainPage', request.url));
    }
  }

  // SCENARIUSZ 2: Użytkownik NIE JEST zalogowany
  if (!token) {
    // Jeśli próbuje wejść na stronę chronioną (czyli taką, która NIE jest na liście publicPaths),
    // przekieruj go na stronę logowania ('/')
    if (!isPublicPath) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Jeśli żaden z powyższych warunków nie został spełniony, pozwól na wyświetlenie strony
  return NextResponse.next();
}

// Konfiguracja Matchera - określa, na których ścieżkach middleware ma działać
export const config = {
  matcher: [
    /*
     * Uruchom middleware na wszystkich ścieżkach Z WYJĄTKIEM:
     * - /api (endpointy API)
     * - /_next/static (pliki statyczne JS/CSS)
     * - /_next/image (optymalizacja obrazów)
     * - favicon.ico, oraz pliki obrazków (png, jpg, svg itp.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp)).*)',
  ],
};