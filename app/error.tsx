"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLanguage } from "./components/language";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { t } = useLanguage();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="status-page">
      <span className="status-page-mark">⚠</span>
      <h1>{t("Something went wrong", "යමක් වැරදුණා")}</h1>
      <p>{t("Please try again. If it keeps happening, come back in a few minutes.", "නැවත උත්සාහ කරන්න. දිගටම සිදු වේ නම්, මිනිත්තු කිහිපයකින් නැවත පැමිණෙන්න.")}</p>
      <div className="status-page-actions">
        <button type="button" className="button" onClick={() => retry()}>
          {t("Try again", "නැවත උත්සාහ කරන්න")}
        </button>
        <Link className="button button-ghost" href="/">
          {t("Home", "මුල් පිටුව")}
        </Link>
      </div>
    </main>
  );
}
