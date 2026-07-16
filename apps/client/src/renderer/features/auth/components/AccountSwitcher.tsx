import * as React from 'react';
import { CaretDown, SignOut, Trash } from '@phosphor-icons/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { Button } from '../../../components/ui/button';
import { useAccounts } from '../hooks/useAccounts';
import { switchAccount, removeAccount } from '../api';
import { useAuth } from '../../../providers/AuthProvider';

export function AccountSwitcher(): React.JSX.Element {
  const { data: accounts = [] } = useAccounts();
  const { user, refresh, logout } = useAuth();
  const [loading, setLoading] = React.useState<boolean>(false);

  if (accounts.length === 0) return <></>;

  const onSwitch = async (login: string): Promise<void> => {
    setLoading(true);
    try {
      const session = await switchAccount(login);
      if (session) {
        await window.api.auth.saveToken(login, session);
        await refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const onRemove = async (login: string, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    await removeAccount(login);
    if (user?.login === login) {
      await logout();
    } else {
      window.location.reload();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="truncate">{user?.login ?? 'Аккаунт'}</span>
          <CaretDown size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Сохранённые аккаунты</DropdownMenuLabel>
        {accounts.map((a) => (
          <div key={a.login} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-sm hover:bg-bg-primary">
            <button
              type="button"
              onClick={() => { void onSwitch(a.login); }}
              className="flex-1 text-left text-sm"
              disabled={loading}
            >
              <div className="font-medium">{a.login}</div>
              {a.login === user?.login ? <div className="text-[10px] text-accent">Активный</div> : null}
            </button>
            <button
              type="button"
              onClick={(e) => { void onRemove(a.login, e); }}
              className="text-text-muted hover:text-red-400"
              title="Удалить"
            >
              <Trash size={14} />
            </button>
          </div>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => { void logout(); }}>
          <SignOut size={14} /> Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
