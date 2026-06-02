import { ApiError } from "../api/client";
export const applyApiFormErrors = (setError, error, allowedFields) => {
    if (!(error instanceof ApiError) || !error.issues?.length) {
        return;
    }
    const allowed = allowedFields ? new Set(allowedFields) : null;
    for (const issue of error.issues) {
        const field = issue.field;
        if (allowed && !allowed.has(field)) {
            continue;
        }
        setError(field, { type: "server", message: issue.message });
    }
};
export const getApiErrorMessage = (error, fallback) => {
    if (error instanceof ApiError) {
        return error.displayMessage || error.message || fallback;
    }
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
};
