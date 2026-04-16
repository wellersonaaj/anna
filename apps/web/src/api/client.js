const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
export class ApiError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = "ApiError";
    }
}
export const request = async (path, options) => {
    const response = await fetch(`${apiBaseUrl}${path}`, {
        method: options.method ?? "GET",
        headers: {
            "Content-Type": "application/json",
            "x-brecho-id": options.brechoId
        },
        body: options.body ? JSON.stringify(options.body) : undefined
    });
    if (!response.ok) {
        const payload = (await response.json().catch(() => ({})));
        throw new ApiError(payload.message ?? "Erro inesperado na API.", response.status);
    }
    if (response.status === 204) {
        return undefined;
    }
    return (await response.json());
};
