export async function loadSourceMap(
  scriptUrl: string,
): Promise<unknown | null> {
  try {
    const response = await fetch(scriptUrl);

    if (!response.ok) {
      return null;
    }

    const source = await response.text();

    return extractInlineSourceMap(source);
  } catch {
    return null;
  }
}

function extractInlineSourceMap(source: string): unknown | null {
  const match = source.match(
    /\/\/[#@]\s*sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)\s*$/,
  );

  if (!match) {
    return null;
  }

  try {
    const decoded = atob(match[1]);

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}
