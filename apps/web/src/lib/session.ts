"use client";

const USER_ID_STORAGE_KEY = "kshetra.userId";

export function getStoredUserId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(USER_ID_STORAGE_KEY);
}

export function setStoredUserId(userId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(USER_ID_STORAGE_KEY, userId);
}

