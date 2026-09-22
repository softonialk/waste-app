import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aiwa — Waste pickup, when you need it",
  description: "Schedule a free community waste pickup or find a verified collector nearby.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en"><body>{children}</body></html>;
}
