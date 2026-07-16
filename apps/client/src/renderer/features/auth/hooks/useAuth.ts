import { useMutation, useQueryClient } from '@tanstack/react-query';
import { changePassword, setEmail } from '../api';
import type { User } from '@helper/shared';

export function useChangePasswordMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) => changePassword(current, next),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth', 'me'] }),
  });
}

export function useSetEmailMutation() {
  const qc = useQueryClient();
  return useMutation<{ user: User }, Error, { email: string; currentPassword: string }>({
    mutationFn: ({ email, currentPassword }) => setEmail(email, currentPassword),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth', 'me'] }),
  });
}
