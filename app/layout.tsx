import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const description = "නොමිලේ ප්‍රතිචක්‍රීකරණ කසළ එකතු කිරීම · Free pickups of sorted recyclable waste across Sri Lanka.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.nextgen.mom"),
  title: { default: "NextGen — කසළ කළමනාකරණය · Smart Waste Management", template: "%s · NextGen" },
  description,
  openGraph: {
    title: "NextGen — Smart Waste Management",
    description,
    url: "/",
    siteName: "NextGen",
    locale: "si_LK",
    alternateLocale: ["en_LK"],
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#0b1512" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="si">
      <body>
        <a className="skip-link" href="#main">
          ප්‍රධාන අන්තර්ගතයට යන්න · Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
