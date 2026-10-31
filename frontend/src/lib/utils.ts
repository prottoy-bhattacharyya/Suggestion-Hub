import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import api from "@/lib/api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function getCSRFToken(): Promise<string> {
    // CSRF token request (if your Django backend uses CSRF protection)
    const csrfResponse = await api.get("/accounts/csrf/");

    if (csrfResponse.status !== 200) {
      return "";
    }
    return csrfResponse.data.csrfToken;
  }