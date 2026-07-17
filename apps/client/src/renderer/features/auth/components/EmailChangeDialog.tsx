import type * as React from 'react';
import { useState } from 'react';
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
import { useSetEmailMutation } from '../hooks/useAuth';
import { useAuth } from '../../../providers/AuthProvider';

export function EmailChangeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }): React.JSX.Element {
  const [email, setEmail] = useState<string>('');
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useSetEmailMutation();
  const { refresh } = useAuth();

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (email.length > 256) {
      setError('Слишком длинный email');
      return;
    }
    try {
      await mutation.mutateAsync({ email, currentPassword });
      await refresh();
      onOpenChange(false);
      setEmail('');
      setCurrentPassword('');
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 401) setError('Неверный пароль');
      else setError((e as Error).message ?? 'Ошибка');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Смена email</DialogTitle>
          <DialogDescription>Введите новый email и текущий пароль для подтверждения.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cur-pw">Текущий пароль</Label>
            <Input id="cur-pw" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
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
