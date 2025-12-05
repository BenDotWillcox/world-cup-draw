import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function resolvePath(path: string | undefined) {
  if (!path) return undefined;
  const isProd = process.env.NODE_ENV === 'production';
  const repoName = 'world-cup-draw';
  
  if (isProd && path.startsWith('/')) {
    return `/${repoName}${path}`;
  }
  return path;
}
