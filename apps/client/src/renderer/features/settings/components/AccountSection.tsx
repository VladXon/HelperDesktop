import type * as React from 'react';
import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useAuth } from '../../../providers/AuthProvider';
import { PasswordChangeDialog } from '../../auth/components/PasswordChangeDialog';
import { EmailChangeDialog } from '../../auth/components/EmailChangeDialog';

export function AccountSection(): React.JSX.Element {
  const { user } = useAuth();
  const [pwOpen, setPwOpen] = useState<boolean>(false);
  const [emailOpen, setEmailOpen] = useState<boolean>(false);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-gutter">
        <div className="space-y-2">
          <Label>Логин</Label>
          <Input value={user?.login ?? ''} disabled className="bg-surface-container-low/50" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email ?? ''} disabled className="bg-surface-container-low/50" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Отображаемое имя</Label>
        <Input value={user?.name ?? ''} disabled className="bg-surface-container-low/50" />
      </div>
      <div className="flex gap-4 pt-2">
        <Button variant="secondary" onClick={() => setPwOpen(true)}>Сменить пароль</Button>
        <Button variant="secondary" onClick={() => setEmailOpen(true)}>Сменить email</Button>
      </div>
      <PasswordChangeDialog open={pwOpen} onOpenChange={setPwOpen} />
      <EmailChangeDialog open={emailOpen} onOpenChange={setEmailOpen} />
    </div>
  );
}
