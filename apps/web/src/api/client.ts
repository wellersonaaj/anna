const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

export class ApiError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  brechoId: string;
};

export const request = async <T>(path: string, options: RequestOptions): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "x-brecho-id": options.brechoId
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new ApiError(payload.message ?? "Erro inesperado na API.", response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};
