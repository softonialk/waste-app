import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoLoop — Smart Waste Management",
  description: "Sort waste, schedule collections, earn rewards, and build cleaner communities across Sri Lanka.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en"><body>{children}</body></html>;
}
