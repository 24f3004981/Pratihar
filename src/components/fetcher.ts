"use client";

export class Unauthorized extends Error {}

export function toLogin(next = window.location.pathname + window.location.search + window.location.hash) {
  window.location.href = `/login?next=${encodeURIComponent(next)}`;
}

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown; noRedirect?: boolean }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.json !== undefined ? { "content-type": "application/json", ...init?.headers } : init?.headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    // Session expired or never existed: send the owner to log in and come back here.
    if (!init?.noRedirect) toLogin();
    throw new Unauthorized((data as { error?: string }).error ?? "Please log in.");
  }
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  window.location.href = "/";
}
