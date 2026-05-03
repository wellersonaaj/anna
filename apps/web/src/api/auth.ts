import { request } from "./client";
import type { SessionBrecho, SessionMembership, SessionUser } from "../store/session.store";

export type LoginResponse = {
  accessToken: string;
  user: SessionUser;
  activeBrecho: SessionBrecho | null;
  memberships: SessionMembership[];
};

export const login = (payload: { telefone: string; password: string }) =>
  request<LoginResponse>("/auth/login", {
    method: "POST",
    body: payload,
    auth: false
  });

export const getMe = () => request<Omit<LoginResponse, "accessToken">>("/me", {});

export const logout = () =>
  request<void>("/auth/logout", {
    method: "POST"
  });
