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
    const headers = {};
    if (options.brechoId) {
        headers["x-brecho-id"] = options.brechoId;
    }
    if (options.auth !== false) {
        const token = window.localStorage.getItem("anna.accessToken");
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
    }
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);
    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`${apiBaseUrl}${path}`, {
        method: options.method ?? "GET",
        headers,
        body
    });
    if (!response.ok) {
        const payload = (await response.json().catch(() => ({})));
        const issueLine = payload.issues
            ?.map((i) => i.message)
            .filter(Boolean)
            .join(" ");
        const message = [payload.message, issueLine].filter(Boolean).join(" ").trim();
        throw new ApiError(message || "Erro inesperado na API.", response.status);
    }
    if (response.status === 204) {
        return undefined;
    }
    return (await response.json());
};
