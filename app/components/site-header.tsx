"use client";

import Link from "next/link";
import { useState } from "react";
import { Bi, bi } from "./bi";

const homeLinks = [
  { href: "/#how", si: "ක්‍රියා කරන ආකාරය", en: "How it works" },
  { href: "/#waste", si: "කසළ වර්ග", en: "Waste types" },
  { href: "/#hubs", si: "එකතු කිරීමේ ස්ථාන", en: "Hubs" },
  { href: "/#collectors", si: "එකතු කරන්නන්ට", en: "For collectors" },
];

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="NextGen — මුල් පිටුව / Home">
      <span className="brand__mark" aria-hidden="true">
        ↻
      </span>
      <span className="brand__name">NextGen</span>
    </Link>
  );
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header" data-open={open}>
      <div className="container site-header__inner">
        <Brand />
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          aria-label={bi("මෙනුව", "Menu")}
          onClick={() => setOpen(!open)}
        >
          <span aria-hidden="true">{open ? "✕" : "☰"}</span>
        </button>
        <nav id="site-nav" className="site-nav" aria-label={bi("ප්‍රධාන මෙනුව", "Main menu")} onClick={() => setOpen(false)}>
          {homeLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Bi si={link.si} en={link.en} stack />
            </Link>
          ))}
          <div className="site-nav__actions">
            <Link className="btn btn--ghost btn--sm" href="/system?role=collector">
              <Bi si="එකතු කරන්නා පිවිසුම" en="Collector login" stack />
            </Link>
            <Link className="btn btn--primary btn--sm" href="/system?role=household">
              <Bi si="එකතු කිරීමක් ඉල්ලන්න" en="Request pickup" stack />
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
