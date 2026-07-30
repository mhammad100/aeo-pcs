/** Read a fetch response body safely — avoids opaque JSON.parse errors on HTML error pages. */
export async function readFetchJson<T>(res: Response): Promise<T> {
  const body = await res.text();
  const trimmed = body.trim();

  if (!trimmed) {
    throw new Error(`Empty API response (HTTP ${res.status})`);
  }

  if (trimmed.startsWith("<")) {
    throw new Error(`API returned HTML instead of JSON (HTTP ${res.status})`);
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const preview = trimmed.slice(0, 80).replace(/\s+/g, " ");
    throw new Error(`Invalid JSON from API (HTTP ${res.status}): ${preview}`);
  }
}
