import type * as React from 'react';
import { useState } from 'react';
import { passwordPolicySchema } from '@helper/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useChangePasswordMutation } from '../hooks/useAuth';
import { useAuth } from '../../../providers/AuthProvider';

export function PasswordChangeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }): React.JSX.Element {
  const [current, setCurrent] = useState<string>('');
  const [next, setNext] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useChangePasswordMutation();
  const { refresh } = useAuth();

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError('Пароли не совпадают');
      return;
    }
    const parsed = passwordPolicySchema.safeParse(next);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Пароль не соответствует требованиям');
      return;
    }
    try {
      const res = await mutation.mutateAsync({ current, next });
      await window.api.auth.saveToken((await window.api.auth.getMe())?.login ?? '', {
        token: res.token,
        refreshToken: res.refreshToken,
        expiresIn: res.expiresIn,
        user: (await window.api.auth.getMe())!,
      });
      await refresh();
      onOpenChange(false);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 401) setError('Неверный текущий пароль');
      else setError((e as Error).message ?? 'Ошибка');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Смена пароля</DialogTitle>
          <DialogDescription>Минимум 8 символов, заглавная, строчная и цифра.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="current-pw">Текущий пароль</Label>
            <Input id="current-pw" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-pw">Новый пароль</Label>
            <Input id="new-pw" type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-pw">Подтверждение</Label>
            <Input id="confirm-pw" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          {error ? <div className="text-xs text-red-400">{error}</div> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
