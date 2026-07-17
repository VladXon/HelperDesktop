export interface ComponentInfo {
  name: string;
  file: string | null;
  line: number | null;
  column: number | null;
  props: Record<string, unknown>;
  state: Record<string, unknown> | null;
  path?: string[];
  element?: string | null;
}

const INTERNAL_PROP_KEYS = new Set([
  'children', '$$typeof', '__self', '__source', 'ref', 'key',
]);

function isReactElement(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    '$$typeof' in value &&
    'type' in value
  );
}

function shouldFilterProp(key: string, value: unknown): boolean {
  if (INTERNAL_PROP_KEYS.has(key)) return true;
  if (isReactElement(value)) return true;
  if (typeof value === 'function') return true;
  return false;
}

function safeReplacer(): (key: string, value: unknown) => unknown {
  const seen = new WeakSet<object>();
  return (_key: string, value: unknown): unknown => {
    if (typeof value === 'object' && value !== null) {
      if (isReactElement(value)) return '[React Element]';
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  };
}

function filterProps(props: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!shouldFilterProp(key, value)) {
      result[key] = value;
    }
  }
  return result;
}

function formatPropsBlock(label: string, props: Record<string, unknown>): string[] {
  const lines: string[] = [];
  const filtered = filterProps(props);
  if (Object.keys(filtered).length > 0) {
    lines.push('');
    lines.push(`${label}:`);
    lines.push('```json');
    lines.push(JSON.stringify(filtered, safeReplacer(), 2));
    lines.push('```');
  }
  return lines;
}

export function formatPrompt(info: ComponentInfo): string {
  const lines: string[] = [];

  if (info.path && info.path.length > 1) {
    lines.push(`Path: ${info.path.join(' > ')}`);
  }
  lines.push(`Component: ${info.name}`);
  if (info.element) {
    lines.push(`Element: ${info.element}`);
  }
  if (info.file) {
    const loc = info.line ? `:${info.line}${info.column ? `:${info.column}` : ''}` : '';
    lines.push(`File: ${info.file}${loc}`);
  }

  lines.push(...formatPropsBlock('Props', info.props));

  if (info.state && Object.keys(info.state).length > 0) {
    const filtered = filterProps(info.state);
    if (Object.keys(filtered).length > 0) {
      lines.push(...formatPropsBlock('State', filtered));
    }
  }

  return lines.join('\n');
}
