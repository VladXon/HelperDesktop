import type * as React from 'react';
import { useState } from 'react';
import { loginBodySchema } from '@helper/shared';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useLoginMutation } from '../hooks/useQrLogin';
import { useAuth } from '../../../providers/AuthProvider';
import type { TokenData } from '@helper/shared';

export function PasswordForm(): React.JSX.Element {
  const [login, setLogin] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { setSession } = useAuth();
  const mutation = useLoginMutation();

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    const parsed = loginBodySchema.safeParse({ login, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Некорректные данные');
      return;
    }
    try {
      const data: TokenData = await mutation.mutateAsync({ login, password });
      await setSession(data);
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 401) setError('Неверный логин или пароль');
      else setError((e as Error).message ?? 'Ошибка входа');
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="login">Логин</Label>
        <Input
          id="login"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="my-login"
          autoComplete="username"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
          className="tracking-[0.2em]"
        />
      </div>
      {error ? <div className="text-xs text-red-400">{error}</div> : null}
      <div className="pt-2">
        <Button type="submit" disabled={mutation.isPending} className="w-full py-3.5">
          {mutation.isPending ? 'Вход...' : 'Войти'}
        </Button>
      </div>
    </form>
  );
}
