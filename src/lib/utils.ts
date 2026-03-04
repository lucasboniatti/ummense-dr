import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes intelligently
 * Prevents conflicting class names and ensures proper precedence
 * @param inputs - Class names to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get CSS variable value from design tokens
 * Usage: getCSSVariable('--color-primary-600')
 */
export function getCSSVariable(variable: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

/**
 * Check if dark mode is enabled
 */
export function isDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return document.documentElement.getAttribute('data-theme') === 'dark' ||
    document.documentElement.classList.contains('dark');
}

/**
 * Toggle dark mode
 */
export function toggleDarkMode() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';

  if (isDark) {
    html.removeAttribute('data-theme');
    html.classList.remove('dark');
  } else {
    html.setAttribute('data-theme', 'dark');
    html.classList.add('dark');
  }
}

/**
 * Set dark mode explicitly
 */
export function setDarkMode(enabled: boolean) {
  const html = document.documentElement;

  if (enabled) {
    html.setAttribute('data-theme', 'dark');
    html.classList.add('dark');
  } else {
    html.removeAttribute('data-theme');
    html.classList.remove('dark');
  }
}

/**
 * Debounce function utility
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function utility
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Get contrasting text color (light or dark) based on background
 */
export function getContrastColor(bgColor: string): 'light' | 'dark' {
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155 ? 'dark' : 'light';
}
