const BASE = '/api';
const CLAVE = 'copypaste.clave';

export const leerClave = () =>
  typeof window === 'undefined' ? '' : window.localStorage.getItem(CLAVE) || '';

export const guardarClave = (v: string) => window.localStorage.setItem(CLAVE, v);
export const borrarClave = () => window.localStorage.removeItem(CLAVE);

export class ErrorApi extends Error {
  status: number;
  retriable: boolean;
  constructor(message: string, status: number, retriable = false) {
    super(message);
    this.status = status;
    this.retriable = retriable;
  }
}

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${ruta}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-app-key': leerClave(),
        ...(init.headers || {}),
      },
    });
  } catch {
    throw new ErrorApi('Sin conexión. Revisá el wifi y probá de nuevo.', 0, true);
  }

  let body: any = null;
  try { body = await res.json(); } catch { /* respuesta sin cuerpo */ }

  if (!res.ok) {
    throw new ErrorApi(
      body?.error || 'Algo falló del lado del servidor.',
      res.status,
      Boolean(body?.retriable),
    );
  }
  return body as T;
}

export const api = {
  data: (fresh = false) => pedir<any>(`/data${fresh ? '?fresh=1' : ''}`),
  crear: (entidad: string, item: any) =>
    pedir<any>(`/${entidad}`, { method: 'POST', body: JSON.stringify(item) }),
  editar: (entidad: string, item: any) =>
    pedir<any>(`/${entidad}`, { method: 'PUT', body: JSON.stringify(item) }),
  borrar: (entidad: string, item: any) =>
    pedir<any>(`/${entidad}`, { method: 'DELETE', body: JSON.stringify(item) }),
};
