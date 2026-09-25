import type { ReactNode } from "react";
import { Bi } from "./bi";
import SiteFooter from "./site-footer";
import SiteHeader from "./site-header";

export type LegalSection = { title: string; titleSi: string; body: ReactNode; bodySi: ReactNode };

// Each section shows the Sinhala text first and the English text beneath it.
export default function LegalPage({ title, titleSi, updated, sections }: { title: string; titleSi: string; updated: string; sections: LegalSection[] }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="legal">
        <article className="container legal__body">
          <h1 className="legal__title">
            <Bi stack si={titleSi} en={title} />
          </h1>
          <p className="legal__updated">
            <Bi si="අවසන් යාවත්කාලීනය" en="Last updated" />: {updated}
          </p>
          {sections.map((section) => (
            <section className="legal__section" key={section.title}>
              <h2>
                <Bi stack si={section.titleSi} en={section.title} />
              </h2>
              <div className="legal__si" lang="si">
                {section.bodySi}
              </div>
              <div className="legal__en" lang="en">
                {section.body}
              </div>
            </section>
          ))}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
