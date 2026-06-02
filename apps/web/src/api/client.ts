import { handleSessionExpired, shouldExpireSession } from "../lib/session-expired";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

export type ApiValidationIssue = {
  field: string;
  label: string;
  message: string;
};

export class ApiError extends Error {
  public readonly displayMessage: string;

  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly issues?: ApiValidationIssue[]
  ) {
    super(message);
    this.name = "ApiError";
    this.displayMessage = buildDisplayMessage(message, issues);
  }
}

const buildDisplayMessage = (message: string, issues?: ApiValidationIssue[]): string => {
  const first = issues?.[0];
  if (issues?.length) {
    if (issues.length === 1 && first) {
      return `${first.label}: ${first.message}`;
    }
    return issues.map((issue) => `${issue.label}: ${issue.message}`).join(" · ");
  }
  return message;
};

const parseValidationIssues = (
  raw: unknown
): ApiValidationIssue[] | undefined => {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const parsed: ApiValidationIssue[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const issue = entry as {
      field?: string;
      label?: string;
      message?: string;
      path?: Array<string | number>;
    };

    const message = issue.message?.trim();
    if (!message) {
      continue;
    }

    const field =
      issue.field?.trim() ||
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

type RequestOptions = {
  method?: string;
  body?: unknown;
  brechoId?: string;
  auth?: boolean;
};

export const request = async <T>(path: string, options: RequestOptions): Promise<T> => {
  const headers: Record<string, string> = {};
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
    const payload = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      issues?: unknown;
    };
    const issues = parseValidationIssues(payload.issues);
    const message = payload.message?.trim() || "Erro inesperado na API.";
    const auth = options.auth !== false;
    if (shouldExpireSession(response.status, message, path, auth)) {
      handleSessionExpired();
    }
    throw new ApiError(message, response.status, payload.code, issues);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};
