import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Textarea } from '../../../components/ui/input';
import { MarkdownView } from './MarkdownView';

export function MarkdownEditor({ value, onChange }: { value: string; onChange: (v: string) => void }): React.JSX.Element {
  return (
    <Tabs defaultValue="edit" className="w-full">
      <TabsList>
        <TabsTrigger value="edit">Редактор</TabsTrigger>
        <TabsTrigger value="preview">Предпросмотр</TabsTrigger>
      </TabsList>
      <TabsContent value="edit">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Текст заметки (поддерживает Markdown)"
          rows={10}
          className="font-mono text-sm"
        />
      </TabsContent>
      <TabsContent value="preview">
        <div className="min-h-[200px] rounded-md border border-border bg-bg-secondary p-3">
          {value.trim() ? <MarkdownView source={value} /> : <div className="text-sm text-text-muted">Пусто</div>}
        </div>
      </TabsContent>
    </Tabs>
  );
}
