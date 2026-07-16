import * as React from 'react';
import { type ComponentInfo, formatPrompt } from './prompt-formatter';

const FIBER_KEY_RE = /^__reactFiber\$/;

type FiberLike = {
  type?: unknown;
  memoizedProps?: unknown;
  memoizedState?: unknown;
  _debugSource?: { fileName?: string; lineNumber?: number; columnNumber?: number };
};

export interface UseAiInspectorReturn {
  enabled: boolean;
  hovered: HTMLElement | null;
  hoveredInfo: ComponentInfo | null;
  pinnedInfo: ComponentInfo | null;
  setEnabled: (v: boolean) => void;
  clearPinned: () => void;
}

interface InspectorContextValue extends UseAiInspectorReturn {}

const InspectorContext = React.createContext<InspectorContextValue | null>(null);

function getFiberKey(el: HTMLElement): string | null {
  for (const key of Object.keys(el)) {
    if (FIBER_KEY_RE.test(key)) return key;
  }
  return null;
}

function getFiberFromElement(el: HTMLElement): FiberLike | null {
  const key = getFiberKey(el);
  if (!key) return null;
  const fiber = (el as unknown as Record<string, unknown>)[key];
  if (!fiber || typeof fiber !== 'object') return null;
  return fiber as FiberLike;
}

function getComponentName(fiber: FiberLike): string {
  const t = fiber.type;
  if (typeof t === 'string') return t;
  if (typeof t === 'function') {
    const named = (t as { displayName?: string; name?: string }).displayName;
    if (named) return named;
    return (t as { name?: string }).name ?? 'Anonymous';
  }
  if (typeof t === 'object' && t !== null) {
    const named = (t as { displayName?: string; name?: string }).displayName;
    if (named) return named;
    const inner = (t as { type?: { displayName?: string; name?: string } }).type;
    if (inner) {
      return inner.displayName ?? inner.name ?? 'ForwardRef';
    }
  }
  return 'Unknown';
}

function extractInfo(el: HTMLElement): ComponentInfo | null {
  const fiber = getFiberFromElement(el);
  if (!fiber) return null;
  const name = getComponentName(fiber);
  const props = (fiber.memoizedProps && typeof fiber.memoizedProps === 'object'
    ? (fiber.memoizedProps as Record<string, unknown>)
    : {}) ?? {};
  const stateRaw = fiber.memoizedState;
  let state: Record<string, unknown> | null = null;
  if (stateRaw && typeof stateRaw === 'object' && !Array.isArray(stateRaw)) {
    state = stateRaw as Record<string, unknown>;
  } else if (Array.isArray(stateRaw)) {
    const obj: Record<string, unknown> = {};
    stateRaw.forEach((v, i) => { obj[`hook_${i}`] = v; });
    state = obj;
  }
  const src = fiber._debugSource;
  return {
    name,
    file: src?.fileName ?? null,
    line: src?.lineNumber ?? null,
    column: src?.columnNumber ?? null,
    props: { ...props },
    state,
  };
}

export function AiInspectorProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [enabled, setEnabledState] = React.useState<boolean>(false);
  const [hovered, setHovered] = React.useState<HTMLElement | null>(null);
  const [hoveredInfo, setHoveredInfo] = React.useState<ComponentInfo | null>(null);
  const [pinnedInfo, setPinnedInfo] = React.useState<ComponentInfo | null>(null);

  const setEnabled = (v: boolean): void => {
    setEnabledState(v);
    if (!v) setPinnedInfo(null);
  };

  const clearPinned = (): void => setPinnedInfo(null);

  React.useEffect(() => {
    if (!enabled) {
      setHovered(null);
      setHoveredInfo(null);
      setPinnedInfo(null);
      return;
    }

    const onOver = (e: MouseEvent): void => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      setHovered(el);
      setHoveredInfo(extractInfo(el));
    };
    const onOut = (e: MouseEvent): void => {
      const related = e.relatedTarget as HTMLElement | null;
      if (related instanceof HTMLElement) {
        setHovered(related);
        setHoveredInfo(extractInfo(related));
        return;
      }
      setHovered(null);
      setHoveredInfo(null);
    };
    const onClick = (e: MouseEvent): void => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest('[data-ai-inspector-ignore]')) return;
      const info = extractInfo(el);
      if (!info) return;
      e.preventDefault();
      e.stopPropagation();
      const prompt = formatPrompt(info);
      try {
        void navigator.clipboard.writeText(prompt).catch(() => undefined);
      } catch {
        /* ignore */
      }
      setPinnedInfo(info);
    };
    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('mouseout', onOut, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('mouseover', onOver, true);
      document.removeEventListener('mouseout', onOut, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [enabled]);

  const value = React.useMemo<InspectorContextValue>(
    () => ({ enabled, hovered, hoveredInfo, pinnedInfo, setEnabled, clearPinned }),
    [enabled, hovered, hoveredInfo, pinnedInfo, setEnabled, clearPinned],
  );

  return <InspectorContext.Provider value={value}>{children}</InspectorContext.Provider>;
}

export function useAiInspector(): InspectorContextValue {
  const ctx = React.useContext(InspectorContext);
  if (!ctx) throw new Error('useAiInspector must be used within AiInspectorProvider');
  return ctx;
}
