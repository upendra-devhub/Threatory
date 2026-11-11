export interface RenderableDetail {
  key: string;
  label: string;
  value: string;
}

export function formatDetailLabel(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();

  if (spaced.length === 0) {
    return key;
  }

  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

export function formatDetailValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? value : null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    const formattedItems = value
      .map((item) => formatDetailValue(item))
      .filter((item): item is string => item !== null);
    return formattedItems.length > 0 ? formattedItems.join(", ") : null;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const parts: string[] = [];

    for (const [nestedKey, nestedVal] of entries) {
      const formatted = formatDetailValue(nestedVal);
      if (formatted !== null) {
        parts.push(`${formatDetailLabel(nestedKey)}: ${formatted}`);
      }
    }

    return parts.length > 0 ? parts.join("; ") : null;
  }

  return null;
}

export function getRenderableDetails(
  details?: Record<string, unknown>
): RenderableDetail[] {
  if (!details) {
    return [];
  }

  const results: RenderableDetail[] = [];

  for (const [key, rawValue] of Object.entries(details)) {
    const formatted = formatDetailValue(rawValue);
    if (formatted !== null) {
      results.push({
        key,
        label: formatDetailLabel(key),
        value: formatted,
      });
    }
  }

  return results;
}
