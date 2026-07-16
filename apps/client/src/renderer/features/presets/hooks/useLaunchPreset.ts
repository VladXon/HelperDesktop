import { useMutation } from '@tanstack/react-query';
import { launch } from '../api';

export function useLaunchPreset() {
  return useMutation<void, Error, number>({ mutationFn: launch });
}
