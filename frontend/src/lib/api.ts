import { useAuthStore } from './store';

const BASE_URL = 'http://localhost:4000/api';

/**
 * Autoryzowany wrapper na fetch, który:
 * 1. Dodaje bearer token
 * 2. Obsługuje credentials dla ciasteczek (refresh token)
 * 3. Automatycznie odświeża token przy błędzie 401
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const { token, logout, login, user } = useAuthStore.getState();
    
    // 1. Zbuduj nagłówki
    const headers = new Headers(options.headers);
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    if (!(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    const config: RequestInit = {
        ...options,
        headers,
        credentials: 'include' // Bardzo ważne dla ciasteczek
    };

    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    
    // 2. Pierwsza próba
    let response = await fetch(url, config);

    // 3. Jeśli 401 (Unauthorized), spróbuj odświeżyć token
    if (response.status === 401 && !endpoint.includes('/auth/refresh')) {
        try {
            const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
                method: 'POST',
                credentials: 'include'
            });

            if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                const newToken = refreshData.accessToken;
                
                // Zapisz nowy token w storze
                if (user) {
                    login(newToken, user);
                }

                // Ponów pierwotne zapytanie z nowym tokenem
                headers.set('Authorization', `Bearer ${newToken}`);
                response = await fetch(url, { ...config, headers });
            } else {
                // Jeśli odświeżanie się nie powiodło (np. wygasło ciasteczko) -> wyloguj
                logout();
                window.location.href = '/login';
            }
        } catch (err) {
            logout();
            window.location.href = '/login';
        }
    }

    return response;
}
