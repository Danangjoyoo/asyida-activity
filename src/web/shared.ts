export const OVERVIEW_FILENAME = "overview.html";

export interface TripManifestItem {
  slug: string;
  title: string;
  aiFiles: string[];
}

export interface TripHydratedData extends TripManifestItem {
  overviewPath: string;
}

export function parseJsonScript<T>(scriptId: string): T | null {
  const script = document.getElementById(scriptId);
  if (!script) {
    console.warn(`parseJsonScript: script element with id "${scriptId}" not found.`);
    return null;
  }

  const text = script.textContent?.trim();
  if (!text) {
    console.warn(`parseJsonScript: script element with id "${scriptId}" is empty.`);
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error(`parseJsonScript: failed to parse JSON in script #${scriptId}.`, error);
    return null;
  }
}

export function formatAiLabel(filename: string): string {
  const base = filename.replace(/\.html$/i, "");
  return base
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function setTextContent(target: Element | null, value: string): void {
  if (target) {
    target.textContent = value;
  }
}
