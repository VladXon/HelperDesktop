import type * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { CurrencyExchangePanel } from './CurrencyExchangePanel';
import { ItemPriceChecker } from './ItemPriceChecker';
import { SessionPanel, CharacterViewer } from './SessionPanel';

type PoeTab = 'currency' | 'prices' | 'characters';

export function PoeAssistantPage(): React.JSX.Element {
  return (
    <div className="flex flex-col h-full">
      <SessionPanel />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs defaultValue="characters" className="flex flex-col h-full">
          <div className="px-6 pt-3 border-b border-white/5">
            <TabsList className="bg-transparent gap-1">
              <TabsTrigger value="currency" className="data-[state=active]:bg-white/10 data-[state=active]:text-accent text-text-muted">
                Currency
              </TabsTrigger>
              <TabsTrigger value="prices" className="data-[state=active]:bg-white/10 data-[state=active]:text-accent text-text-muted">
                Price Check
              </TabsTrigger>
              <TabsTrigger value="characters" className="data-[state=active]:bg-white/10 data-[state=active]:text-accent text-text-muted">
                Characters
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="currency" className="flex-1 overflow-hidden m-0">
            <CurrencyExchangePanel />
          </TabsContent>
          <TabsContent value="prices" className="flex-1 overflow-hidden m-0">
            <ItemPriceChecker />
          </TabsContent>
          <TabsContent value="characters" className="flex-1 overflow-auto m-0">
            <CharacterViewer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
