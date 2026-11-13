// KLIPY GIF API — Tenor-compatible endpoint.
// Docs: https://docs.klipy.com/migrate-from-tenor
// کلید رایگان از: https://partner.klipy.com/api-keys
//
// در .env.local یکی از این‌ها را بگذارید (هر دو پشتیبانی می‌شوند):
//   NEXT_PUBLIC_KLIPY_API_KEY=...
//   NEXT_PUBLIC_TENOR_API_KEY=...   ← fallback برای سازگاری با پروژه قدیمی

export type GifItem = {
  id: string;
  title: string;
  /** Media formats */
  preview: string; // کوچک، برای grid
  full: string; // سایز اصلی، برای ارسال
  width: number;
  height: number;
};

const API_KEY =
  process.env.NEXT_PUBLIC_KLIPY_API_KEY ??
  process.env.NEXT_PUBLIC_TENOR_API_KEY ??
  "";

const BASE = "https://api.klipy.com/v2";
// client_key باید یکتا باشد تا Klipy بتواند trafficِ ما را از دیگر اپ‌ها جدا کند.
const CLIENT_KEY = "masanger_messenger";

type MediaFormat = {
  url: string;
  dims: [number, number];
  size: number;
  preview?: string;
  duration?: number;
};

type KlipyResult = {
  id: string;
  title?: string;
  content_description?: string;
  itemurl?: string;
  url?: string;
  media_formats: {
    tinygif?: MediaFormat;
    nanogif?: MediaFormat;
    gif?: MediaFormat;
    mediumgif?: MediaFormat;
  };
};

function toGifItem(r: KlipyResult): GifItem | null {
  const preview =
    r.media_formats.tinygif ??
    r.media_formats.nanogif ??
    r.media_formats.gif ??
    r.media_formats.mediumgif;
  const full =
    r.media_formats.mediumgif ??
    r.media_formats.gif ??
    r.media_formats.tinygif;
  if (!preview?.url || !full?.url) return null;
  return {
    id: r.id,
    title: r.title ?? r.content_description ?? "",
    preview: preview.url,
    full: full.url,
    width: full.dims?.[0] ?? 0,
    height: full.dims?.[1] ?? 0,
  };
}

export function hasKlipy(): boolean {
  return API_KEY.length > 0;
}

/** سازگاری با کد قدیمی که از `hasTenor()` استفاده می‌کرد. */
export const hasTenor = hasKlipy;

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Klipy ${res.status}`);
  return (await res.json()) as T;
}

/** گیف‌های ترند (featured). */
export async function klipyTrending(
  limit = 24,
  signal?: AbortSignal
): Promise<GifItem[]> {
  if (!API_KEY) return [];
  const url =
    `${BASE}/featured?key=${API_KEY}&client_key=${CLIENT_KEY}` +
    `&limit=${limit}&media_filter=tinygif,nanogif,gif,mediumgif` +
    `&contentfilter=high`;
  const data = await fetchJson<{ results: KlipyResult[] }>(url, signal);
  return (data.results ?? [])
    .map(toGifItem)
    .filter((g): g is GifItem => g !== null);
}

/** جستجوی گیف. */
export async function klipySearch(
  query: string,
  limit = 24,
  signal?: AbortSignal
): Promise<GifItem[]> {
  if (!API_KEY) return [];
  const q = query.trim();
  if (!q) return klipyTrending(limit, signal);
  const url =
    `${BASE}/search?key=${API_KEY}&client_key=${CLIENT_KEY}` +
    `&q=${encodeURIComponent(q)}&limit=${limit}` +
    `&media_filter=tinygif,nanogif,gif,mediumgif` +
    `&contentfilter=high`;
  const data = await fetchJson<{ results: KlipyResult[] }>(url, signal);
  return (data.results ?? [])
    .map(toGifItem)
    .filter((g): g is GifItem => g !== null);
}

/** Aliases برای سازگاری با کد قدیمی (tenorTrending/tenorSearch). */
export const tenorTrending = klipyTrending;
export const tenorSearch = klipySearch;
