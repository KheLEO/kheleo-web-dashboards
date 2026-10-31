"use client";
import { getApi } from "@/lib/api/browser-client";
import { envelope } from "@/lib/api/response-decoders";
import { userSchema } from "@/contracts/users";
export const getUser = (id: string, signal?: AbortSignal) =>
  getApi(`users/${id}`, envelope(userSchema), undefined, signal);
