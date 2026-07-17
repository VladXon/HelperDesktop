import * as React from 'react';
import { type ComponentInfo, formatPrompt } from './prompt-formatter';

const FIBER_KEY_RE = /^__reactFiber\$/;

type FiberLike = {
  type?: unknown;
  memoizedProps?: unknown;
  memoizedState?: unknown;
  _debugSource?: { fileName?: string; lineNumber?: number; columnNumber?: number };
  stateNode?: unknown;
};

export interface UseAiInspectorReturn {
  enabled: boolean;
  hovered: HTMLElement | null;
  hoveredInfo: ComponentInfo | null;
  pinnedInfo: ComponentInfo | null;
  mousePos: { x: number; y: number } | null;
  setEnabled: (v: boolean) => void;
  clearPinned: () => void;
  pinParent: () => void;
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

function extractStateFromFiber(fiber: FiberLike): Record<string, unknown> | null {
  const stateRaw = fiber.memoizedState;
  if (!stateRaw || typeof stateRaw !== 'object') return null;

  const obj = stateRaw as Record<string, unknown>;

  if ('next' in obj || 'queue' in obj) {
    const hooks: Record<string, unknown> = {};
    let hook: unknown = stateRaw;
    let i = 0;
    while (hook && typeof hook === 'object') {
      const h = hook as { memoizedState?: unknown; next?: unknown };
      const val = h.memoizedState;
      if (val !== null && val !== undefined) {
        if (typeof val === 'object' && val !== null) {
          const objVal = val as Record<string, unknown>;
          if ('create' in objVal && 'destroy' in objVal) {
            hooks[`hook_${i}`] = '[Effect]';
          } else {
            hooks[`hook_${i}`] = val;
          }
        } else {
          hooks[`hook_${i}`] = val;
        }
      }
      hook = h.next;
      i++;
    }
    return Object.keys(hooks).length > 0 ? hooks : null;
  }

  return obj;
}

function extractInfoFromFiber(fiber: FiberLike): ComponentInfo | null {
  const name = getComponentName(fiber);
  const props = (fiber.memoizedProps && typeof fiber.memoizedProps === 'object'
    ? (fiber.memoizedProps as Record<string, unknown>)
    : {}) ?? {};
  const state = extractStateFromFiber(fiber);
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

function hasReadableName(fiber: FiberLike): boolean {
  const t = fiber.type;
  if (typeof t === 'function') return true;
  if (typeof t === 'object' && t !== null) {
    if ((t as { displayName?: string }).displayName) return true;
    const inner = (t as { type?: { displayName?: string; name?: string } }).type;
    if (inner?.displayName || inner?.name) return true;
  }
  return false;
}

function getNearestComponentFiber(fiber: FiberLike): FiberLike | null {
  let current: FiberLike | null = fiber;
  while (current && !hasReadableName(current)) {
    current = (current as { return?: FiberLike }).return ?? null;
  }
  return current;
}

function isInfrastructureName(name: string): boolean {
  return name.endsWith('Provider') || (name.endsWith('Shell') && name !== 'Shell') || name === 'MainApp';
}

function getMeaningfulAncestor(fiber: FiberLike): FiberLike | null {
  let current: FiberLike | null = fiber;
  while (current) {
    if (hasReadableName(current)) {
      const name = getComponentName(current);
      if (name && name !== 'Unknown' && !isInfrastructureName(name)) return current;
    }
    current = (current as { return?: FiberLike }).return ?? null;
  }
  return null;
}

function getParentFiber(fiber: FiberLike): FiberLike | null {
  const parent = (fiber as { return?: FiberLike }).return ?? null;
  if (!parent) return null;
  return getMeaningfulAncestor(parent);
}

function buildComponentPath(fiber: FiberLike): string[] {
  const path: string[] = [];
  let current: FiberLike | null = fiber;
  while (current) {
    if (hasReadableName(current)) {
      const name = getComponentName(current);
      if (name && name !== 'Unknown' && !isInfrastructureName(name)) path.unshift(name);
    }
    current = (current as { return?: FiberLike }).return ?? null;
  }
  return path;
}

function getElementDescriptor(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  let cls = '';
  if (el.className && typeof el.className === 'string') {
    cls = el.className.split(/\s+/).filter(Boolean).slice(0, 3).join('.');
  }
  return cls ? `${tag}.${cls}` : tag;
}

function buildFullComponentInfo(fiber: FiberLike, domEl?: HTMLElement | null): ComponentInfo {
  const name = getComponentName(fiber);
  const props = (fiber.memoizedProps && typeof fiber.memoizedProps === 'object'
    ? (fiber.memoizedProps as Record<string, unknown>)
    : {}) ?? {};
  const state = extractStateFromFiber(fiber);
  const src = fiber._debugSource;
  return {
    name,
    file: src?.fileName ?? null,
    line: src?.lineNumber ?? null,
    column: src?.columnNumber ?? null,
    props: { ...props },
    state,
    path: buildComponentPath(fiber),
    element: domEl ? getElementDescriptor(domEl) : null,
  };
}

export function AiInspectorProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [enabled, setEnabledState] = React.useState<boolean>(false);
  const [hovered, setHovered] = React.useState<HTMLElement | null>(null);
  const [hoveredInfo, setHoveredInfo] = React.useState<ComponentInfo | null>(null);
  const [pinnedInfo, setPinnedInfo] = React.useState<ComponentInfo | null>(null);
  const [mousePos, setMousePos] = React.useState<{ x: number; y: number } | null>(null);

  const lastPinnedFiber = React.useRef<FiberLike | null>(null);

  const setEnabled = (v: boolean): void => {
    setEnabledState(v);
    if (!v) {
      setPinnedInfo(null);
      lastPinnedFiber.current = null;
    }
  };

  const clearPinned = (): void => {
    setPinnedInfo(null);
    lastPinnedFiber.current = null;
  };

  const pinParent = React.useCallback((): void => {
    const fiber = lastPinnedFiber.current;
    if (!fiber) return;
    const parent = getParentFiber(fiber);
    if (!parent) return;
    const info = buildFullComponentInfo(parent);
    lastPinnedFiber.current = parent;
    setPinnedInfo(info);
    const prompt = formatPrompt(info);
    void navigator.clipboard.writeText(prompt).catch(() => undefined);
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'F3') {
        e.preventDefault();
        setEnabledState((prev) => !prev);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  React.useEffect(() => {
    if (!enabled) {
      setHovered(null);
      setHoveredInfo(null);
      setPinnedInfo(null);
      setMousePos(null);
      lastPinnedFiber.current = null;
      return;
    }

    let rafId: number | null = null;

    const onOver = (e: MouseEvent): void => {
      setMousePos({ x: e.clientX, y: e.clientY });
      const el = e.target as HTMLElement | null;
      if (!el || el.closest('[data-ai-inspector-ignore]')) {
        if (rafId != null) cancelAnimationFrame(rafId);
        rafId = null;
        setHovered(null);
        setHoveredInfo(null);
        return;
      }
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const fiber = getFiberFromElement(el);
        if (!fiber) {
          setHovered(null);
          setHoveredInfo(null);
          return;
        }
        const info = extractInfoFromFiber(fiber);
        setHovered(el);
        setHoveredInfo(info);
      });
    };

    const onOut = (e: MouseEvent): void => {
      if (!e.relatedTarget) {
        setHovered(null);
        setHoveredInfo(null);
        setMousePos(null);
      }
    };

    const onClick = (e: MouseEvent): void => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest('[data-ai-inspector-ignore]')) return;

      const fiber = getFiberFromElement(el);
      if (!fiber) return;

      let targetFiber: FiberLike = fiber;

      const nearest = getNearestComponentFiber(fiber);
      if (nearest) targetFiber = nearest;

      if (e.altKey) {
        const src = lastPinnedFiber.current ?? targetFiber;
        const parent = getParentFiber(src);
        if (!parent) return;
        targetFiber = parent;
      }

      lastPinnedFiber.current = targetFiber;
      const info = buildFullComponentInfo(targetFiber, el);
      e.preventDefault();
      e.stopPropagation();

      const prompt = formatPrompt(info);
      void navigator.clipboard.writeText(prompt).catch(() => undefined);
      setPinnedInfo(info);
    };

    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('mouseout', onOut, true);
    document.addEventListener('click', onClick, true);
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      document.removeEventListener('mouseover', onOver, true);
      document.removeEventListener('mouseout', onOut, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [enabled]);

  const value = React.useMemo<InspectorContextValue>(
    () => ({
      enabled, hovered, hoveredInfo, pinnedInfo, mousePos,
      setEnabled, clearPinned, pinParent,
    }),
    [enabled, hovered, hoveredInfo, pinnedInfo, mousePos, setEnabled, clearPinned, pinParent],
  );

  return <InspectorContext.Provider value={value}>{children}</InspectorContext.Provider>;
}

export function useAiInspector(): InspectorContextValue {
  const ctx = React.useContext(InspectorContext);
  if (!ctx) throw new Error('useAiInspector must be used within AiInspectorProvider');
  return ctx;
}
