import { ThirdwebProvider as Thirdweb } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";

const client = createThirdwebClient({
  clientId: "b1c4d85a2601e8268c98039ccb1de1db",
});

export const ThirdwebProvider = ({ children }: { children: React.ReactNode }) => {
  return <Thirdweb>{children}</Thirdweb>;
};
