import type * as React from 'react';
import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { PasswordForm } from './PasswordForm';
import { RegisterForm } from './RegisterForm';
import { QrLoginPanel } from './QrLoginPanel';
import { AccountSwitcher } from './AccountSwitcher';

export function LoginScreen(): React.JSX.Element {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [registered, setRegistered] = useState(false);
  const title = mode === 'login' ? 'Вход' : 'Регистрация';
  const subtitle = mode === 'login'
    ? 'Введите логин и пароль или используйте Telegram'
    : 'Создайте новый аккаунт';

  return (
    <div className="flex h-screen w-screen bg-bg-primary relative overflow-hidden">
      {/* Atmospheric Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary-container/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary-container/10 blur-[120px]" />
      </div>
      <div className="relative z-10 flex flex-col md:flex-row w-full min-h-screen">
        {/* Left Side: Branding */}
        <div className="flex-1 flex flex-col justify-between p-8 md:p-16 lg:p-24 border-b md:border-b-0 md:border-r border-white/5 bg-surface-container-lowest/30 backdrop-blur-3xl">
          <div className="mt-8 md:mt-0">
            <h1 className="text-headline-lg font-bold text-text-primary mb-3 tracking-tight">HelperDesktop</h1>
            <p className="text-body-md text-text-muted max-w-sm leading-relaxed">
              Личный помощник: заметки, пресеты, Telegram
            </p>
          </div>
          <div className="md:mt-auto">
            <span className="text-mono-label text-outline-variant">v0.1.0</span>
          </div>
        </div>
        {/* Right Side: Auth Form */}
        <div className="flex-1 flex items-center justify-center p-8 md:p-16 bg-surface/50">
          <div className="w-full max-w-[440px] glass-panel rounded-2xl p-8 sm:p-10 relative overflow-hidden">
            {/* Inner edge highlight */}
            <div className="inner-edge-highlight" />
            <div className="mb-8">
              <h2 className="text-headline-lg font-bold text-text-primary mb-2">{title}</h2>
              <p className="text-body-md text-text-muted">{subtitle}</p>
            </div>
            {registered ? (
              <div className="space-y-6 text-center">
                <div className="text-sm text-text-secondary">Аккаунт создан! Теперь войдите.</div>
                <Button
                  className="w-full py-3.5"
                  onClick={() => { setMode('login'); setRegistered(false); }}
                >
                  Войти
                </Button>
              </div>
            ) : mode === 'login' ? (
              <>
                <PasswordForm />
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-text-muted"
                    onClick={() => setMode('register')}
                  >
                    Нет аккаунта? Зарегистрироваться
                  </Button>
                </div>
                <div className="relative flex items-center py-2 mt-4">
                  <div className="flex-grow h-px bg-white/5" />
                  <span className="flex-shrink-0 mx-4 text-mono-label text-outline uppercase tracking-wider">или</span>
                  <div className="flex-grow h-px bg-white/5" />
                </div>
                <QrLoginPanel />
                <AccountSwitcher />
              </>
            ) : (
              <RegisterForm onSuccess={() => setRegistered(true)} onBackToLogin={() => setMode('login')} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
