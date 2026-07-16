export interface ComponentInfo {
  name: string;
  file: string | null;
  line: number | null;
  column: number | null;
  props: Record<string, unknown>;
  state: Record<string, unknown> | null;
}

export function formatPrompt(info: ComponentInfo): string {
  const lines: string[] = [];
  lines.push(`Component: ${info.name}`);
  if (info.file) {
    const loc = info.line ? `:${info.line}${info.column ? `:${info.column}` : ''}` : '';
    lines.push(`File: ${info.file}${loc}`);
  }
  if (Object.keys(info.props).length > 0) {
    lines.push('Props:');
    lines.push('```json');
    lines.push(JSON.stringify(info.props, null, 2));
    lines.push('```');
  }
  if (info.state && Object.keys(info.state).length > 0) {
    lines.push('State:');
    lines.push('```json');
    lines.push(JSON.stringify(info.state, null, 2));
    lines.push('```');
  }
  lines.push('');
  lines.push('Issue:');
  return lines.join('\n');
}
