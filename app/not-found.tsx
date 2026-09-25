import Link from "next/link";
import { Bi } from "./components/bi";
import SiteFooter from "./components/site-footer";
import SiteHeader from "./components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="status-page">
        <p className="status-page__code">404</p>
        <h1>
          <Bi stack si="පිටුව හමු නොවීය" en="Page not found" />
        </h1>
        <Bi as="p" stack si="මෙම පිටුව ඉවත් කර තිබිය හැක, නැත්නම් සබැඳිය වැරදියි." en="This page may have moved, or the link may be wrong." />
        <div className="status-page__actions">
          <Link className="btn btn--primary" href="/">
            <Bi si="මුල් පිටුවට" en="Go home" />
          </Link>
          <Link className="btn btn--ghost" href="/system?role=household">
            <Bi si="එකතු කිරීමක් ඉල්ලන්න" en="Request a pickup" />
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
