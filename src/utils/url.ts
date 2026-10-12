const isRelativePath = (value: string) => value.startsWith('/') && !value.startsWith('//');

/** 사용자가 입력한 주소 중 http(s) 와 앱 내부 경로만 허용한다 */
export function toSafeUrl(raw?: string | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (isRelativePath(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

const EMBED_SANDBOX = {
  /** 앱과 같은 출처의 콘텐츠: 출처를 분리해 앱의 localStorage(아카이브 데이터)에 접근하지 못하게 한다 */
  isolated: 'allow-scripts allow-pointer-lock',
  /** 다른 출처의 콘텐츠: 이미 브라우저가 격리하므로 자기 출처의 저장소는 쓰게 둔다 */
  external: 'allow-scripts allow-pointer-lock allow-same-origin allow-forms',
} as const;

/** 임베드(iframe)에 줄 sandbox 권한. 최상위 이동과 팝업은 어느 경우에도 허용하지 않는다. */
export function getEmbedSandbox(safeUrl: string): string {
  const sameOrigin = new URL(safeUrl, window.location.href).origin === window.location.origin;
  return sameOrigin ? EMBED_SANDBOX.isolated : EMBED_SANDBOX.external;
}

export function toSafeImageSrc(raw?: string | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (value.startsWith('data:image/')) return value;
  return toSafeUrl(value);
}

export function getHostname(raw?: string | null): string | null {
  const safe = toSafeUrl(raw);
  if (!safe || isRelativePath(safe)) return null;
  return new URL(safe).hostname.replace(/^www\./, '');
}

export function getYouTubeId(raw?: string | null): string | null {
  const safe = toSafeUrl(raw);
  if (!safe || isRelativePath(safe)) return null;
  const url = new URL(safe);
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') return url.pathname.slice(1) || null;
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') return url.searchParams.get('v');
    return url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] ?? null;
  }
  return null;
}
