import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShareLens | B20 Dividend Lens + Premium Guard",
  description: "A Base equity console for B20 share conversion, wallet balances and verified Aerodrome quotes. Trading stays locked without trusted geo provenance.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><head><meta name="base:app_id" content="6aa20782fa92e96bd08c5abd" /></head><body>{children}</body></html>;
}
