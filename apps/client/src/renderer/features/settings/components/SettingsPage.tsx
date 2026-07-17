import type * as React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../components/ui/accordion';
import { useAuth } from '../../../providers/AuthProvider';
import { AccountSection } from './AccountSection';
import { TelegramSection } from './TelegramSection';
import { ThemeSection } from './ThemeSection';
import { ServerSection } from './ServerSection';

export function SettingsPage(): React.JSX.Element {
  const { user } = useAuth();

  return (
    <div className="h-full overflow-y-auto p-container_padding">
      <div className="mx-auto space-y-stack_gap max-w-4xl">
        <h1 className="text-headline-lg font-bold text-text-primary mb-8 tracking-tight">Настройки</h1>

        <section className="glass-panel rounded-2xl overflow-hidden relative">
          <div className="inner-edge-highlight" />
          <Accordion type="multiple" defaultValue={['account', 'telegram']}>
            <AccordionItem value="account">
              <AccordionTrigger className="px-8 sm:px-10 py-5 hover:bg-white/5 transition-colors text-headline-md font-bold text-text-primary">
                Аккаунт
              </AccordionTrigger>
              <AccordionContent className="px-8 sm:px-10 pt-6 pb-8">
                <AccountSection />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="telegram">
              <AccordionTrigger className="px-8 sm:px-10 py-5 hover:bg-white/5 transition-colors text-headline-md font-bold text-text-primary">
                Telegram
              </AccordionTrigger>
              <AccordionContent className="px-8 sm:px-10 pt-6 pb-8">
                <TelegramSection />
              </AccordionContent>
            </AccordionItem>
            {user?.isDev ? (
              <>
                <AccordionItem value="theme">
                  <AccordionTrigger className="px-8 sm:px-10 py-5 hover:bg-white/5 transition-colors text-headline-md font-bold text-text-primary">
                    Оформление
                  </AccordionTrigger>
                  <AccordionContent className="px-8 sm:px-10 pt-6 pb-8">
                    <ThemeSection />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="server">
                  <AccordionTrigger className="px-8 sm:px-10 py-5 hover:bg-white/5 transition-colors text-headline-md font-bold text-text-primary">
                    Сервер
                  </AccordionTrigger>
                  <AccordionContent className="px-8 sm:px-10 pt-6 pb-8">
                    <ServerSection />
                  </AccordionContent>
                </AccordionItem>
              </>
            ) : null}
          </Accordion>
        </section>
      </div>
    </div>
  );
}
