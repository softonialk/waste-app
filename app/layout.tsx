import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.nextgen.mom"),
  title: "EcoLoop — Smart Waste Management",
  description: "Sort waste, schedule collections, earn rewards, and build cleaner communities across Sri Lanka.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
