import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "../api/client";

export const applyApiFormErrors = <T extends FieldValues>(
  setError: UseFormSetError<T>,
  error: unknown,
  allowedFields?: readonly Path<T>[]
): void => {
  if (!(error instanceof ApiError) || !error.issues?.length) {
    return;
  }

  const allowed = allowedFields ? new Set(allowedFields) : null;

  for (const issue of error.issues) {
    const field = issue.field as Path<T>;
    if (allowed && !allowed.has(field)) {
      continue;
    }
    setError(field, { type: "server", message: issue.message });
  }
};

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof ApiError) {
    return error.displayMessage || error.message || fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};
