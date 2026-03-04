export function asString(value: unknown): string {
  if (Array.isArray(value)) {
    const [first] = value;
    return typeof first === 'string' ? first : '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

export function asOptionalString(value: unknown): string | undefined {
  const normalized = asString(value).trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function asNumber(value: unknown, fallback: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number.parseInt(raw, 10)
        : Number(raw);

  return Number.isFinite(parsed) ? parsed : fallback;
}
