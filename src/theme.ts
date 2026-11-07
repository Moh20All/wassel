// src/theme.ts — call once before React renders
const mq = window.matchMedia('(prefers-color-scheme: dark)');
export function applyTheme(pref: 'system' | 'light' | 'dark' = (localStorage.getItem('theme') as any) || 'system') {
  const dark = pref === 'dark' || (pref === 'system' && mq.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#f2f2f7');
}
mq.addEventListener('change', () => applyTheme());
