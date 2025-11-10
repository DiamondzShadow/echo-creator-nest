import { ThirdwebProvider as Thirdweb } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";

const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID || "",
});

export const ThirdwebProvider = ({ children }: { children: React.ReactNode }) => {
  return <Thirdweb>{children}</Thirdweb>;
};
