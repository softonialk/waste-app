"use client";

import Link from "next/link";
import { useLanguage } from "./language";

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function SiteFooter() {
  const { t } = useLanguage();
  return (
    <footer className="footer simple-footer" id="footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <Link className="logo" href="/">
            <span className="logo-mark">↻</span>
            <span>
              <b>EcoLoop</b>
              <small>{t("Smart Waste Management", "බුද්ධිමත් කසළ කළමනාකරණය")}</small>
            </span>
          </Link>
          <p>{t("Making recycling easier for Sri Lankan communities.", "ශ්‍රී ලාංකික ප්‍රජාවන්ට ප්‍රතිචක්‍රීකරණය පහසු කරමු.")}</p>
        </div>
        <div className="footer-links">
          <h4>{t("Quick Links", "ඉක්මන් සබැඳි")}</h4>
          <Link href="/#how">{t("How It Works", "ක්‍රියා කරන ආකාරය")}</Link>
          <Link href="/#collection-points">{t("Collection Points", "එකතු කිරීමේ ස්ථාන")}</Link>
          <Link href="/system?role=household">{t("Request Pickup", "එකතු කිරීමක් ඉල්ලන්න")}</Link>
          <Link href="/system?role=collector">{t("Collector Portal", "එකතු කරන්නාගේ පිටුව")}</Link>
        </div>
        <div className="footer-links">
          <h4>{t("Legal", "නීතිමය")}</h4>
          <Link href="/privacy">{t("Privacy Notice", "පෞද්ගලිකත්ව නිවේදනය")}</Link>
          <Link href="/terms">{t("Terms of Use", "භාවිත කොන්දේසි")}</Link>
        </div>
        <div className="footer-contact">
          <h4>{t("Contact", "සම්බන්ධතා")}</h4>
          {contactEmail && <a href={`mailto:${contactEmail}`}>✉ {contactEmail}</a>}
          <span>📍 {t("Sri Lanka", "ශ්‍රී ලංකාව")}</span>
        </div>
      </div>
      <div className="footer-bottom">
        <span suppressHydrationWarning>
          © {new Date().getFullYear()} EcoLoop. {t("All rights reserved.", "සියලු හිමිකම් ඇවිරිණි.")}
        </span>
        <span>{t("Built for a cleaner Sri Lanka", "පිරිසිදු ශ්‍රී ලංකාවක් වෙනුවෙන්")} 🇱🇰</span>
      </div>
    </footer>
  );
}
