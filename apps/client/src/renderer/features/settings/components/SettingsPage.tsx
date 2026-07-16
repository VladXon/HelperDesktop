import * as React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../components/ui/accordion';
import { useAuth } from '../../../providers/AuthProvider';
import { AccountSection } from './AccountSection';
import { TelegramSection } from './TelegramSection';
import { ThemeSection } from './ThemeSection';
import { ServerSection } from './ServerSection';

export function SettingsPage(): React.JSX.Element {
  const { user } = useAuth();

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="mb-4 text-xl font-semibold">Настройки</h1>
      <Accordion type="multiple" defaultValue={['account', 'telegram']} className="max-w-2xl">
        <AccordionItem value="account">
          <AccordionTrigger>Аккаунт</AccordionTrigger>
          <AccordionContent>
            <AccountSection />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="telegram">
          <AccordionTrigger>Telegram</AccordionTrigger>
          <AccordionContent>
            <TelegramSection />
          </AccordionContent>
        </AccordionItem>
        {user?.isDev ? (
          <>
            <AccordionItem value="theme">
              <AccordionTrigger>Оформление</AccordionTrigger>
              <AccordionContent>
                <ThemeSection />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="server">
              <AccordionTrigger>Сервер</AccordionTrigger>
              <AccordionContent>
                <ServerSection />
              </AccordionContent>
            </AccordionItem>
          </>
        ) : null}
      </Accordion>
    </div>
  );
}
