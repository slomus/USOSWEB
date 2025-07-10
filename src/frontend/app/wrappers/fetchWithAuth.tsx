export async function fetchWithAuth(input: RequestInfo, init?: RequestInit): Promise<Response> {
  let response: Response;

  try {
    response = await fetch(input, { ...init, credentials: 'include' });

    if (response.status === 401) {
      const refreshResponse = await fetch('/api/auth/refresh', { credentials: 'include' });
      if (refreshResponse.ok) {
        response = await fetch(input, { ...init, credentials: 'include' });
      } else {
        window.location.href = '/';
        throw new Error('Unauthorized');
      }
    }
    if (response.status === 403) {
      window.location.href = '/forbidden';
      throw new Error('Forbidden');
    }
    if (response.status === 404) {
      window.location.href = '/not-found';
      throw new Error('Not Found');
    }
    if (response.status >= 500) {
      alert('Wystąpił błąd serwera. Spróbuj ponownie później.');
      throw new Error('Server Error');
    }

    return response;
  } catch (error) {
    alert('Błąd sieci lub serwera. Sprawdź połączenie internetowe.');
    throw error;
  }
}
