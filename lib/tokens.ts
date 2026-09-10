import type { Address } from "viem";

export const USDC: Address = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const REGISTRY: Address = "0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD";
export const RPC_URL = "https://base-rpc.publicnode.com";
export const CHAIN_ID = 8453;

export type Token = {
  symbol: string;
  name: string;
  token: Address;
  feed: Address;
  pool: Address | null;
};

// Discovery snapshot: research/pool-discovery-20260907.md; metadata checked on every read.
export const TOKENS = [
  { symbol: "NVDAc", name: "NVIDIA", token: "0xb20000000000000000000078ee7ce2fE4908108C", feed: "0x04689a41629776563E6822F76f2e57D148d28513", pool: "0x853F5f1B92b16714Fe6CDA67CAad0856B83C7ab9" },
  { symbol: "AAPLc", name: "Apple", token: "0xb200000000000000000000C2e324d24d7eEcd1fb", feed: "0x787f13dEa48Db0897CbCDD985de77809D837F988", pool: "0xA3b1E3f9747065e2073722Ff4c9027d3eA4994F0" },
  { symbol: "METAc", name: "Meta", token: "0xb2000000000000000000008bC8786B856E61707C", feed: "0x6526aE6797A76123638b863AeE4dD27Ba4E4b27D", pool: "0xEAF57753BC382E0324a1D43F72E7027705a2273E" },
  { symbol: "GOOGLc", name: "Alphabet", token: "0xb2000000000000000000002D0BA3164cc74f58B7", feed: "0x5bF49E0ffA937CE2FfF033c739aD7C634c4D34F2", pool: "0xB1987CAD1682841b4b641d50E520777eC5Ab5542" },
] as const satisfies readonly Token[];

export const basescan = (address: Address) => `https://basescan.org/address/${address}`;
