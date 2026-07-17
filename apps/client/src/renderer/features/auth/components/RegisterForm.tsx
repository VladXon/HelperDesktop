import type * as React from 'react';
import { useState } from 'react';
import { registerSchema } from '@helper/shared/schemas/auth';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import * as api from '../api';

interface Props {
  onSuccess: () => void;
  onBackToLogin: () => void;
}

export function RegisterForm({ onSuccess, onBackToLogin }: Props): React.JSX.Element {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    const parsed = registerSchema.safeParse({ login, password });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(', '));
      return;
    }
    setPending(true);
    try {
      await api.register(login, password);
      onSuccess();
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 401) setError('Пользователь уже существует');
      else setError((e as Error).message ?? 'Ошибка регистрации');
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="reg-login">Логин</Label>
        <Input
          id="reg-login"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="my-login"
          autoComplete="username"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reg-password">Пароль</Label>
        <Input
          id="reg-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          className="tracking-[0.2em]"
        />
      </div>
      {error ? <div className="text-xs text-red-400">{error}</div> : null}
      <div className="pt-2 space-y-3">
        <Button type="submit" disabled={pending} className="w-full py-3.5">
          {pending ? 'Регистрация...' : 'Зарегистрироваться'}
        </Button>
        <Button type="button" variant="ghost" className="w-full text-text-muted" onClick={onBackToLogin}>
          Уже есть аккаунт? Войти
        </Button>
      </div>
    </form>
  );
}
