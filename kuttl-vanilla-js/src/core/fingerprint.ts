const STORAGE_KEY = 'kuttl_fp';

function collect(): string[] {
  const c: string[] = [];

  // Screen geometry
  c.push(`s:${screen.width}x${screen.height}x${screen.colorDepth}`);

  // Timezone
  try {
    c.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  } catch {
    c.push(`tzo:${new Date().getTimezoneOffset()}`);
  }

  // Language
  c.push(`lang:${navigator.language}`);
  if (navigator.languages?.length) c.push(`langs:${navigator.languages.join(',')}`);

  // Platform / hardware
  c.push(`plat:${navigator.platform}`);
  if (navigator.hardwareConcurrency) c.push(`cpu:${navigator.hardwareConcurrency}`);
  if ((navigator as any).deviceMemory)  c.push(`mem:${(navigator as any).deviceMemory}`);

  // Canvas — visually rendered text produces renderer-specific pixel values
  try {
    const cv = document.createElement('canvas');
    const ctx = cv.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(0, 0, 10, 10);
      ctx.fillStyle = '#069';
      ctx.fillText('kuttl', 2, 2);
      // Slice a short section of the data URL — enough to distinguish renderers
      c.push(`cv:${cv.toDataURL().slice(22, 50)}`);
    }
  } catch {
    c.push('cv:err');
  }

  return c;
}

// djb2 hash — fast, deterministic, no async needed
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

let _cached: string | null = null;

export function getFingerprint(): string {
  if (_cached) return _cached;

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) { _cached = stored; return _cached; }
  } catch {}

  _cached = hash(collect().sort().join('|'));

  try { sessionStorage.setItem(STORAGE_KEY, _cached); } catch {}

  return _cached;
}
