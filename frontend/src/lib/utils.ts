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

export type DeleteNoteResponse = {
  status: string;
  message?: string;
  note_id?: number;
  file_deleted?: boolean;
  error?: string;
};

export async function deleteNote(noteId: number): Promise<DeleteNoteResponse> {
  const csrfToken = await getCSRFToken();

  const { data } = await api.post<DeleteNoteResponse>(
    `/notes/${noteId}/delete/`,
    {},
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      },
    },
  );

  if (data.status !== "success") {
    throw new Error(data.error ?? "Could not delete the note.");
  }

  return data;
}

export type UpdateNoteResponse = {
  status: string;
  message?: string;
  note_id?: number;
  file_replaced?: boolean;
  error?: string;
};

export async function updateNote(noteId: number, payload: FormData): Promise<UpdateNoteResponse> {
  const csrfToken = await getCSRFToken();

  const { data } = await api.post<UpdateNoteResponse>(`/notes/${noteId}/update/`, payload, {
    headers: {
      Accept: "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
  });

  if (data.status !== "success") {
    throw new Error(data.error ?? "Could not update the note.");
  }

  return data;
}
