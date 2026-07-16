import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { devOp, devRestart, devServerInfo } from '../api';

export function useDevCommands() {
  const qc = useQueryClient();
  const info = useQuery({ queryKey: ['dev', 'serverinfo'], queryFn: devServerInfo, retry: 0 });
  const restart = useMutation({ mutationFn: devRestart, onSuccess: () => qc.invalidateQueries() });
  const op = useMutation({ mutationFn: devOp, onSuccess: () => qc.invalidateQueries() });
  return { info, restart, op };
}
