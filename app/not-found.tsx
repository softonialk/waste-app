"use client";

import Link from "next/link";
import { useLanguage } from "./components/language";

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <main className="status-page">
      <span className="status-page-mark">♻</span>
      <h1>{t("Page not found", "පිටුව හමු නොවීය")}</h1>
      <p>{t("This page may have moved, or the link may be wrong.", "මෙම පිටුව ඉවත් කර තිබිය හැක, නැත්නම් සබැඳිය වැරදි විය හැක.")}</p>
      <div className="status-page-actions">
        <Link className="button" href="/">
          {t("Go to the home page", "මුල් පිටුවට යන්න")}
        </Link>
        <Link className="button button-ghost" href="/system?role=household">
          {t("Request a pickup", "එකතු කිරීමක් ඉල්ලන්න")}
        </Link>
      </div>
    </main>
  );
}
