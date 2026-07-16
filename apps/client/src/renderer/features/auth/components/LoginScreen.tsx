import * as React from 'react';
import { PasswordForm } from './PasswordForm';
import { QrLoginPanel } from './QrLoginPanel';
import { AccountSwitcher } from './AccountSwitcher';

export function LoginScreen(): React.JSX.Element {
  return (
    <div className="flex h-screen w-screen">
      <div className="hidden md:flex md:w-1/2 flex-col justify-between p-12 border-r border-border bg-gradient-to-br from-bg-secondary to-bg-primary">
        <div>
          <div className="text-3xl font-bold text-text-primary">HelperDesktop</div>
          <div className="mt-2 text-sm text-text-muted">Личный помощник: заметки, пресеты, Telegram</div>
        </div>
        <div className="text-xs text-text-muted">v0.1.0</div>
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <div className="text-2xl font-semibold text-text-primary">Вход</div>
            <div className="text-sm text-text-muted">Введите логин и пароль или используйте Telegram</div>
          </div>
          <PasswordForm />
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <div className="flex-1 h-px bg-border" />
            или
            <div className="flex-1 h-px bg-border" />
          </div>
          <QrLoginPanel />
          <AccountSwitcher />
        </div>
      </div>
    </div>
  );
}
