export function getApiUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  if (!base) {
    return path;
  }

  return `${base.replace(/\/$/, '')}${path}`;
}
