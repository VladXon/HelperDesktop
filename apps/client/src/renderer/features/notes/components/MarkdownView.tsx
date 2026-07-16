import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { cn } from '../../../lib/utils';

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ['className']],
  },
};

export function MarkdownView({ source, truncate, className }: { source: string; truncate?: number; className?: string }): React.JSX.Element {
  const text = truncate && source.length > truncate ? source.slice(0, truncate) + '…' : source;
  return (
    <div className={cn('prose prose-invert prose-sm max-w-none break-words text-text-secondary', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeSanitize, schema]]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
