import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { RPC_URL } from "./tokens";

// Public reads stay independent of the wallet's selected network.
export const client = createPublicClient({
  chain: base,
  transport: http(RPC_URL, { timeout: 12_000, retryCount: 2 }),
});
