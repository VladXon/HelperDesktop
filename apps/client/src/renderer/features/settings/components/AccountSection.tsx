import * as React from 'react';
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
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Логин</Label>
          <Input value={user?.login ?? ''} disabled />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Email</Label>
          <Input value={user?.email ?? ''} disabled />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Отображаемое имя</Label>
        <Input value={user?.name ?? ''} disabled />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setPwOpen(true)}>Сменить пароль</Button>
        <Button variant="outline" onClick={() => setEmailOpen(true)}>Сменить email</Button>
      </div>
      <PasswordChangeDialog open={pwOpen} onOpenChange={setPwOpen} />
      <EmailChangeDialog open={emailOpen} onOpenChange={setEmailOpen} />
    </div>
  );
}
