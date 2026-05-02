// Sliding buffer of the last 2 user actions. Read by the errors collector
// at the moment an error fires.

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
  if (typeof el.className === 'string' && el.className.trim()) {
    return `${tag}.${el.className.trim().split(/\s+/).join('.')}`;
  }
  return tag;
}

export function attachActionsCollector(): void {
  // clicks
  document.addEventListener('click', (e) => {
    push({ type: 'click', target: selectorOf(e.target as Element) });
  }, true);

  // SPA navigation: hook into history.pushState / popstate.
  let lastPath = window.location.pathname;
  const recordNav = (to: string) => {
    if (to === lastPath) return;
    push({ type: 'navigation', from: lastPath, to });
    lastPath = to;
  };

  const origPush = history.pushState.bind(history);
  history.pushState = function (state, title, url) {
    origPush(state, title, url);
    recordNav(window.location.pathname);
  };
  const origReplace = history.replaceState.bind(history);
  history.replaceState = function (state, title, url) {
    origReplace(state, title, url);
    recordNav(window.location.pathname);
  };
  window.addEventListener('popstate', () => recordNav(window.location.pathname));
}
