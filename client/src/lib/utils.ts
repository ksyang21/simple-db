import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCellValue(value: unknown, maxLength = 80): string {
  if (value === null || value === undefined) return "NULL";
  const text = String(value);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}

export function isTruncated(value: unknown, maxLength = 80): boolean {
  if (value === null || value === undefined) return false;
  return String(value).length > maxLength;
}
