import Link from "next/link";
import { Bi } from "./bi";
import { Brand } from "./site-header";

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div className="site-footer__about">
          <Brand />
          <Bi as="p" stack si="ශ්‍රී ලාංකික ප්‍රජාවන්ට ප්‍රතිචක්‍රීකරණය පහසු කරමු." en="Making recycling easier for Sri Lankan communities." />
          {contactEmail && (
            <a className="site-footer__email" href={`mailto:${contactEmail}`}>
              ✉ {contactEmail}
            </a>
          )}
        </div>
        <nav className="site-footer__links" aria-label="Footer">
          <Link href="/system?role=household">
            <Bi si="එකතු කිරීමක් ඉල්ලන්න" en="Request a pickup" />
          </Link>
          <Link href="/system?role=collector">
            <Bi si="එකතු කරන්නාගේ පිටුව" en="Collector portal" />
          </Link>
          <Link href="/#hubs">
            <Bi si="එකතු කිරීමේ ස්ථාන" en="Collection hubs" />
          </Link>
          <Link href="/privacy">
            <Bi si="පෞද්ගලිකත්ව නිවේදනය" en="Privacy notice" />
          </Link>
          <Link href="/terms">
            <Bi si="භාවිත කොන්දේසි" en="Terms of use" />
          </Link>
        </nav>
      </div>
      <div className="container site-footer__bottom">
        <span suppressHydrationWarning>© {new Date().getFullYear()} NextGen</span>
        <Bi si="පිරිසිදු ශ්‍රී ලංකාවක් වෙනුවෙන්" en="Built for a cleaner Sri Lanka" />
      </div>
    </footer>
  );
}
