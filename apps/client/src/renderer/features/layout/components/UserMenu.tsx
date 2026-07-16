import * as React from 'react';
import { CaretDown, User as UserIcon, SignOut, Key, EnvelopeSimple, ArrowsLeftRight } from '@phosphor-icons/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { Button } from '../../../components/ui/button';
import { useAuth } from '../../../providers/AuthProvider';
import { useAccounts } from '../../auth/hooks/useAccounts';
import { switchAccount } from '../../auth/api';
import { PasswordChangeDialog } from '../../auth/components/PasswordChangeDialog';
import { EmailChangeDialog } from '../../auth/components/EmailChangeDialog';

export function UserMenu(): React.JSX.Element {
  const { user, logout, refresh } = useAuth();
  const { data: accounts = [] } = useAccounts();
  const [pwOpen, setPwOpen] = React.useState<boolean>(false);
  const [emailOpen, setEmailOpen] = React.useState<boolean>(false);

  const onSwitch = async (login: string): Promise<void> => {
    const session = await switchAccount(login);
    if (session) {
      await window.api.auth.saveToken(login, session);
      await refresh();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <UserIcon size={16} />
            <span className="hidden sm:inline">{user?.login ?? 'Гость'}</span>
            <CaretDown size={12} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{user?.name || user?.login}</DropdownMenuLabel>
          {user?.isDev ? <DropdownMenuLabel className="text-accent">Разработчик</DropdownMenuLabel> : null}
          <DropdownMenuSeparator />
          {accounts.length > 1 ? (
            <>
              <DropdownMenuLabel>Сменить аккаунт</DropdownMenuLabel>
              {accounts.filter((a) => a.login !== user?.login).map((a) => (
                <DropdownMenuItem key={a.login} onSelect={() => { void onSwitch(a.login); }}>
                  <ArrowsLeftRight size={14} /> {a.login}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem onSelect={() => setPwOpen(true)}>
            <Key size={14} /> Сменить пароль
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEmailOpen(true)}>
            <EnvelopeSimple size={14} /> Сменить email
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => { void logout(); }} className="text-red-400">
            <SignOut size={14} /> Выйти
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PasswordChangeDialog open={pwOpen} onOpenChange={setPwOpen} />
      <EmailChangeDialog open={emailOpen} onOpenChange={setEmailOpen} />
    </>
  );
}
