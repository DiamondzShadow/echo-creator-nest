import { ReactNode } from 'react';
import { LivepeerConfig, createReactClient, studioProvider } from '@livepeer/react';

const livepeerClient = createReactClient({
  provider: studioProvider({ apiKey: '' }), // API key not needed for playback/broadcast with stream keys
});

export const LivepeerProvider = ({ children }: { children: ReactNode }) => {
  return (
    <LivepeerConfig client={livepeerClient}>
      {children}
    </LivepeerConfig>
  );
};