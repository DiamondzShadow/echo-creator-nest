import { ReactNode } from 'react';

// Livepeer provider - client configured via edge function
export const LivepeerProvider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};