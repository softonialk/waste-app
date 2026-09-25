"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageToggle, useLanguage } from "./language";
import SiteFooter from "./site-footer";

export type LegalSection = { title: string; titleSi: string; body: ReactNode; bodySi: ReactNode };

export default function LegalPage({ title, titleSi, updated, sections }: { title: string; titleSi: string; updated: string; sections: LegalSection[] }) {
  const { t, isSi } = useLanguage();
  return (
    <main className="legal-shell">
      <header className="system-topbar">
        <Link href="/" className="system-logo">
          <span>↻</span>
          <b>EcoLoop</b>
        </Link>
        <div className="system-topbar-actions">
          <LanguageToggle />
          <Link href="/">← {t("Home", "මුල් පිටුව")}</Link>
        </div>
      </header>
      <article className="legal-content">
        <h1>{isSi ? titleSi : title}</h1>
        <p className="legal-updated">
          {t("Last updated", "අවසන් වරට යාවත්කාලීන කළේ")}: {updated}
        </p>
        {sections.map((section) => (
          <section key={section.title}>
            <h2>{isSi ? section.titleSi : section.title}</h2>
            {isSi ? section.bodySi : section.body}
          </section>
        ))}
      </article>
      <SiteFooter />
    </main>
  );
}
