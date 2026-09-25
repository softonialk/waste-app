"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Bi } from "./components/bi";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="status-page">
      <p className="status-page__code" aria-hidden="true">
        !
      </p>
      <h1>
        <Bi stack si="යමක් වැරදුණා" en="Something went wrong" />
      </h1>
      <Bi as="p" stack si="නැවත උත්සාහ කරන්න. දිගටම සිදු වේ නම් මිනිත්තු කිහිපයකින් පැමිණෙන්න." en="Please try again. If it keeps happening, come back in a few minutes." />
      <div className="status-page__actions">
        <button type="button" className="btn btn--primary" onClick={() => retry()}>
          <Bi si="නැවත උත්සාහ කරන්න" en="Try again" />
        </button>
        <Link className="btn btn--ghost" href="/">
          <Bi si="මුල් පිටුවට" en="Go home" />
        </Link>
      </div>
    </main>
  );
}
