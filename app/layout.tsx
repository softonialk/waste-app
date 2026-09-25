import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LanguageProvider } from "./components/language";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.nextgen.mom"),
  title: { default: "EcoLoop — Smart Waste Management", template: "%s · EcoLoop" },
  description: "Request free pickups of sorted recyclable waste and find collection points across Sri Lanka.",
  openGraph: {
    title: "EcoLoop — Smart Waste Management",
    description: "Request free pickups of sorted recyclable waste and find collection points across Sri Lanka.",
    url: "/",
    siteName: "EcoLoop",
    locale: "en_LK",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
