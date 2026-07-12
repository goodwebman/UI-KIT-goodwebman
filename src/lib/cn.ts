import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Склеивает классы (clsx) и схлопывает конфликтующие Tailwind-утилиты (tailwind-merge). */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
