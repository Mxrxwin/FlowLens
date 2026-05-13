export type PrecedingAction =
  | { type: 'click'; target: string }
  | { type: 'navigation'; from: string; to: string };

const buffer: PrecedingAction[] = [];

export function getRecentActions(): PrecedingAction[] {
  return buffer.slice();
}

function push(a: PrecedingAction): void {
  buffer.push(a);
  if (buffer.length > 2) buffer.shift();
}

function selectorOf(el: Element | null): string {
  if (!el) return '';
  const tag = el.tagName.toLowerCase();
  if (el.id) return `${tag}#${el.id}`;
  if (typeof el.className === 'string' && el.className.trim())
    return `${tag}.${el.className.trim().split(/\s+/).join('.')}`;
  return tag;
}

export function attachActionsCollector(): void {
  document.addEventListener('click', (e) => {
    push({ type: 'click', target: selectorOf(e.target as Element) });
  }, true);

  let lastPath = window.location.pathname;
  const recordNav = (to: string) => {
    if (to === lastPath) return;
    push({ type: 'navigation', from: lastPath, to });
    lastPath = to;
  };

  const origPush = history.pushState.bind(history);
  history.pushState = function (s, t, url) { origPush(s, t, url); recordNav(window.location.pathname); };
  const origReplace = history.replaceState.bind(history);
  history.replaceState = function (s, t, url) { origReplace(s, t, url); recordNav(window.location.pathname); };
  window.addEventListener('popstate', () => recordNav(window.location.pathname));
}
