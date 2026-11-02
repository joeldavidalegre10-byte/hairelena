const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api/v1' : 'http://localhost:4000/api/v1');

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// El token vive en sessionStorage: se borra al cerrar la pestaña o el navegador,
// por lo que al volver a abrir el sistema se pide usuario y contraseña de nuevo.
// (Recargar la página con F5 mantiene la sesión.)
const TOKEN_KEY = 'elite_token';

// Limpia tokens viejos guardados en localStorage por versiones anteriores,
// para que quien ya tenía sesión abierta tampoco quede "pegado".
try {
  localStorage.removeItem(TOKEN_KEY);
} catch {
  /* ignorar */
}

export const getToken = (): string | null => {
  return sessionStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  sessionStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  sessionStorage.removeItem(TOKEN_KEY);
};

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...rest } = options;

  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined) searchParams.append(key, String(val));
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const token = getToken();
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...rest,
      headers: {
        ...defaultHeaders,
        ...(headers as Record<string, string>),
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new ApiError(data.message || `Error del servidor (${res.status})`, res.status, data);
    }

    return data;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error.message || 'Error de red o conexión al servidor', 500);
  }
}

export const api = {
  get: <T>(url: string, params?: Record<string, string | number | undefined>) =>
    request<T>(url, { method: 'GET', params }),
  post: <T>(url: string, body?: any) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body?: any) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(url: string, body?: any) =>
    request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(url: string, body?: any) =>
    request<T>(url, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
};