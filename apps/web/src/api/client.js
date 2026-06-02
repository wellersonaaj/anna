import { handleSessionExpired, shouldExpireSession } from "../lib/session-expired";
const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
export class ApiError extends Error {
    statusCode;
    code;
    issues;
    displayMessage;
    constructor(message, statusCode, code, issues) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.issues = issues;
        this.name = "ApiError";
        this.displayMessage = buildDisplayMessage(message, issues);
    }
}
const buildDisplayMessage = (message, issues) => {
    const first = issues?.[0];
    if (issues?.length) {
        if (issues.length === 1 && first) {
            return `${first.label}: ${first.message}`;
        }
        return issues.map((issue) => `${issue.label}: ${issue.message}`).join(" · ");
    }
    return message;
};
const parseValidationIssues = (raw) => {
    if (!Array.isArray(raw)) {
        return undefined;
    }
    const parsed = [];
    for (const entry of raw) {
        if (!entry || typeof entry !== "object") {
            continue;
        }
        const issue = entry;
        const message = issue.message?.trim();
        if (!message) {
            continue;
        }
        const field = issue.field?.trim() ||
            (Array.isArray(issue.path) ? issue.path.map(String).join(".") : "") ||
            "campo";
        parsed.push({
            field,
            label: issue.label?.trim() || field,
            message
        });
    }
    return parsed.length > 0 ? parsed : undefined;
};
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
        const issues = parseValidationIssues(payload.issues);
        const message = payload.message?.trim() || "Erro inesperado na API.";
        const auth = options.auth !== false;
        if (shouldExpireSession(response.status, message, path, auth)) {
            handleSessionExpired();
        }
        throw new ApiError(message, response.status, payload.code, issues);
    }
    if (response.status === 204) {
        return undefined;
    }
    return (await response.json());
};
