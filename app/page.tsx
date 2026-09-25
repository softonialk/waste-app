"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, MouseEvent, useEffect, useState } from "react";
import { DISTRICTS } from "../lib/constants";
import { LanguageToggle, useLanguage } from "./components/language";
import SiteFooter from "./components/site-footer";
import WasteScanner, { preloadWasteModel } from "./components/waste-scanner";

const steps = [
  { n: "01", icon: "♻️", title: "Sort Your Waste", titleSi: "කසළ වෙන් කරන්න", text: "Separate your recyclable waste into the correct categories.", textSi: "ප්‍රතිචක්‍රීකරණය කළ හැකි කසළ නිවැරදි කාණ්ඩවලට වෙන් කරන්න." },
  { n: "02", icon: "📅", title: "Request a Pickup", titleSi: "එකතු කිරීමක් ඉල්ලන්න", text: "Choose your district, a date and a time. It is free.", textSi: "ඔබේ දිස්ත්‍රික්කය, දිනය සහ වේලාව තෝරන්න. එය නොමිලේ." },
  { n: "03", icon: "🚛", title: "A Collector Comes", titleSi: "එකතු කරන්නෙක් පැමිණේ", text: "A verified collector accepts the job and collects your sorted waste.", textSi: "තහවුරු කළ එකතු කරන්නෙක් ඉල්ලීම භාරගෙන කසළ එකතු කරයි." },
  { n: "04", icon: "✅", title: "You Confirm", titleSi: "ඔබ තහවුරු කරන්න", text: "Confirm the pickup and the collector earns 100 coins.", textSi: "එකතු කිරීම තහවුරු කළ විට එකතු කරන්නාට coins 100ක් ලැබේ." },
];

const categories = [
  { image: "/waste-categories/plastic.webp", title: "Plastic", titleSi: "ප්ලාස්ටික්", items: "Bottles, containers, packaging", itemsSi: "බෝතල්, බඳුන් සහ ඇසුරුම්", color: "mint" },
  { image: "/waste-categories/paper.webp", title: "Paper & Cardboard", titleSi: "කඩදාසි සහ කාඩ්බෝඩ්", items: "Newspapers, cardboard, paper", itemsSi: "පුවත්පත්, කාඩ්බෝඩ් සහ කඩදාසි", color: "sand" },
  { image: "/waste-categories/metal.webp", title: "Metal", titleSi: "ලෝහ", items: "Cans, tins, metal items", itemsSi: "කෑන්, ටින් සහ ලෝහ භාණ්ඩ", color: "blue" },
  { image: "/waste-categories/glass.webp", title: "Glass", titleSi: "වීදුරු", items: "Glass bottles and jars", itemsSi: "වීදුරු බෝතල් සහ බරණි", color: "aqua" },
  { image: "/waste-categories/organic.webp", title: "Organic", titleSi: "කාබනික කසළ", items: "Food and garden waste", itemsSi: "ආහාර සහ ගෙවතු කසළ", color: "lime" },
  { image: "/waste-categories/e-waste.webp", title: "E-Waste", titleSi: "ඉලෙක්ට්‍රොනික කසළ", items: "Old electronics and devices", itemsSi: "පැරණි ඉලෙක්ට්‍රොනික උපකරණ", color: "coral" },
];

type Coordinates = { latitude: number; longitude: number };
type Hub = (typeof DISTRICTS)[number] & { distanceKm: number };
type Stats = { completedPickups: number; kgRecycled: number; verifiedCollectors: number };

const SRI_LANKA_BOUNDS = "79.45,5.85,82.05,9.9";

function distanceKm(from: Coordinates, to: Coordinates) {
  const radius = 6371;
  const radians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const nearestHub = (place: Coordinates): Hub =>
  DISTRICTS.map((district) => ({ ...district, distanceKm: distanceKm(place, district) })).sort((a, b) => a.distanceKm - b.distanceKm)[0];

const formatDistance = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

function mapUrl(hub: Hub | null) {
  if (!hub) return `https://www.openstreetmap.org/export/embed.html?bbox=${SRI_LANKA_BOUNDS}&layer=mapnik`;
  const bbox = [hub.longitude - 0.12, hub.latitude - 0.08, hub.longitude + 0.12, hub.latitude + 0.08].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${hub.latitude},${hub.longitude}`;
}

async function geocode(query: string) {
  const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { cache: "no-store" });
  const result = (await response.json()) as { latitude?: number; longitude?: number; error?: string };
  if (!response.ok || !Number.isFinite(result.latitude) || !Number.isFinite(result.longitude)) throw new Error(result.error || "Location not found in Sri Lanka.");
  return { latitude: Number(result.latitude), longitude: Number(result.longitude) };
}

const geocodeErrorsSi: Record<string, string> = {
  "Location not found in Sri Lanka.": "ශ්‍රී ලංකාව තුළ ස්ථානය හමු නොවීය.",
  "Location search is temporarily unavailable.": "ස්ථාන සෙවීම තාවකාලිකව ලබාගත නොහැක.",
  "Location search is busy. Please try again in a moment.": "ස්ථාන සෙවීම කාර්යබහුලයි. මොහොතකින් නැවත උත්සාහ කරන්න.",
  "Too many attempts. Please wait and try again.": "උත්සාහයන් වැඩියි. ටික වේලාවකින් නැවත උත්සාහ කරන්න.",
};

export default function Home() {
  const { t, isSi, language } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [location, setLocation] = useState("");
  const [searching, setSearching] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [hub, setHub] = useState<Hub | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/stats")
      .then((response) => (response.ok ? (response.json() as Promise<Stats>) : null))
      .then((json) => {
        if (active && json) setStats(json);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // Lets browser AI agents that support WebMCP look up the nearest district hub.
  useEffect(() => {
    type ToolContext = { registerTool: (tool: object, options?: { signal?: AbortSignal }) => void | Promise<void> };
    const context = (document as Document & { modelContext?: ToolContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const registration = context.registerTool(
      {
        name: "find_collection_point",
        title: "Find the nearest collection point",
        description: "Find the nearest EcoLoop district hub to a town, city or address in Sri Lanka. Hubs accept all recyclable waste types.",
        inputSchema: { type: "object", properties: { location: { type: "string" } }, required: ["location"], additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        async execute(input: unknown) {
          const query = (input as { location?: string }).location?.trim();
          if (!query) throw new Error("Enter a Sri Lankan location.");
          const nearest = nearestHub(await geocode(query));
          setLocation(query);
          setHub(nearest);
          document.querySelector("#collection-points")?.scrollIntoView({ behavior: "smooth" });
          return { hub: `EcoLoop District Hub — ${nearest.value}`, district: nearest.value, distanceKm: Math.round(nearest.distanceKm * 10) / 10, sampleLocation: true };
        },
      },
      { signal: lifecycle.signal },
    );
    void Promise.resolve(registration).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  function goHome(event: MouseEvent<HTMLAnchorElement>) {
    if (window.location.pathname !== "/") return;
    event.preventDefault();
    window.history.replaceState(null, "", "/");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMenuOpen(false);
  }

  async function submitSearch(event: FormEvent) {
    event.preventDefault();
    const query = location.trim();
    if (!query) {
      setLocationError(t("Enter a Sri Lankan town, city, or address.", "ශ්‍රී ලංකාවේ නගරයක්, ප්‍රදේශයක් හෝ ලිපිනයක් ඇතුළත් කරන්න."));
      return;
    }
    setSearching(true);
    setLocationError("");
    try {
      setHub(nearestHub(await geocode(query)));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Location not found in Sri Lanka.";
      setHub(null);
      setLocationError(isSi ? geocodeErrorsSi[message] ?? message : message);
    } finally {
      setSearching(false);
    }
  }

  const statValue = (value: number | undefined) => (stats ? (value ?? 0).toLocaleString() : "—");

  return (
    <main>
      <header className="navbar">
        <Link className="logo" href="/" onClick={goHome}>
          <span className="logo-mark">↻</span>
          <span>
            <b>EcoLoop</b>
            <small>{t("Smart Waste Management", "බුද්ධිමත් කසළ කළමනාකරණය")}</small>
          </span>
        </Link>
        <button className="menu-button" aria-label={t("Toggle menu", "මෙනුව")} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </button>
        <nav className={menuOpen ? "nav-links open" : "nav-links"} onClick={() => setMenuOpen(false)}>
          <Link href="/" onClick={goHome}>
            {t("Home", "මුල් පිටුව")}
          </Link>
          <a href="#how">{t("How It Works", "ක්‍රියා කරන ආකාරය")}</a>
          <a href="#collection-points">{t("Collection Points", "එකතු කිරීමේ ස්ථාන")}</a>
          <Link href="/system?role=household">{t("My Requests", "මගේ ඉල්ලීම්")}</Link>
        </nav>
        <LanguageToggle />
        <div className="nav-actions">
          <Link className="dashboard-link" href="/system?role=collector">
            🚛 {t("Collector", "එකතු කරන්නා")}
          </Link>
          <Link className="button button-small" href="/system?role=household">
            <span>♻</span> {t("Request Pickup", "එකතු කිරීමක් ඉල්ලන්න")}
          </Link>
        </div>
      </header>

      <section className="hero section" id="home">
        <div className="hero-copy">
          <p className="badge">
            <span>♻</span> {t("Smart Waste Management for a Cleaner Sri Lanka", "පිරිසිදු ශ්‍රී ලංකාවක් සඳහා බුද්ධිමත් කසළ කළමනාකරණය")}
          </p>
          <h1>
            {t("Turn Your Waste Into a", "ඔබේ කසළ")} <em>{t("Better Tomorrow.", "හොඳ හෙටක් බවට පත් කරන්න.")}</em>
          </h1>
          <p className="hero-text">
            {t(
              "Sort your waste, request a free pickup from a verified collector, and find your nearest collection point.",
              "කසළ වෙන් කරන්න, තහවුරු කළ එකතු කරන්නෙකුගෙන් නොමිලේ එකතු කිරීමක් ඉල්ලන්න, ළඟම එකතු කිරීමේ ස්ථානය සොයන්න.",
            )}
          </p>
          <div className="hero-actions">
            <Link className="button" href="/system?role=household">
              <span>♻</span> {t("Request a Pickup", "එකතු කිරීමක් ඉල්ලන්න")}
            </Link>
            <Link className="button button-ghost" href="/system?role=collector">
              <span>🚛</span> {t("Collector Portal", "එකතු කරන්නාගේ පිටුව")}
            </Link>
          </div>
          <div className="hero-stats" aria-live="polite">
            <div>
              <strong>{statValue(stats?.completedPickups)}</strong>
              <span>{t("Pickups completed", "සම්පූර්ණ කළ එකතු කිරීම්")}</span>
            </div>
            <div>
              <strong>{stats ? `${statValue(stats.kgRecycled)} kg` : "—"}</strong>
              <span>{t("Waste collected", "එකතු කළ කසළ")}</span>
            </div>
            <div>
              <strong>{statValue(stats?.verifiedCollectors)}</strong>
              <span>{t("Verified collectors", "තහවුරු කළ එකතු කරන්නන්")}</span>
            </div>
          </div>
        </div>
        <div className="hero-visual hero-map-visual" aria-label={t("EcoLoop district hubs across Sri Lanka", "ශ්‍රී ලංකාව පුරා EcoLoop දිස්ත්‍රික් hubs")}>
          <div className="hero-map-glow"></div>
          <Image
            className="hero-map-image"
            src="/sri-lanka-eco-map.png"
            alt={t("Green map of Sri Lanka", "ශ්‍රී ලංකාවේ කොළ පැහැති සිතියම")}
            width={1024}
            height={1536}
            priority
          />
          <div className="hero-map-chip chip-network">
            <span>●</span>
            <div>
              <b>{t(`${DISTRICTS.length} district hubs`, `දිස්ත්‍රික් hubs ${DISTRICTS.length}`)}</b>
              <small>{t("Islandwide network", "දිවයින පුරා ජාලය")}</small>
            </div>
          </div>
          <div className="hero-map-chip chip-impact">
            <span>♻</span>
            <div>
              <b>{t("Free pickups", "නොමිලේ එකතු කිරීම්")}</b>
              <small>{t("For every household", "සෑම නිවසකටම")}</small>
            </div>
          </div>
        </div>
      </section>

      <section className="section centered" id="how">
        <p className="kicker">{t("HOW IT WORKS", "ක්‍රියා කරන ආකාරය")}</p>
        <h2>
          {t("Waste Management", "කසළ කළමනාකරණය")} <em>{t("Made Simple.", "සරලව.")}</em>
        </h2>
        <p className="section-intro">
          {t("From sorting your waste to a confirmed pickup, everything happens in four simple steps.", "කසළ වෙන් කිරීමේ සිට තහවුරු කළ එකතු කිරීම දක්වා සියල්ල සරල පියවර හතරකින්.")}
        </p>
        <div className="steps-grid">
          {steps.map((step, index) => (
            <article className="step-card" key={step.title}>
              <span className="step-number">{step.n}</span>
              <div className="step-icon">{step.icon}</div>
              <h3>{isSi ? step.titleSi : step.title}</h3>
              <p>{isSi ? step.textSi : step.text}</p>
              {index < steps.length - 1 && <span className="step-arrow">→</span>}
            </article>
          ))}
        </div>
        <div className="how-tools">
          <a href="#categories">
            <span>📷</span>
            <b>{t("Scan & identify waste", "කසළ Scan කර හඳුනාගන්න")}</b>
            <small>{t("Waste categories", "කසළ වර්ග")}</small>
          </a>
          <a href="#collection-points">
            <span>📍</span>
            <b>{t("Find your nearest hub", "ළඟම hub එක සොයන්න")}</b>
            <small>{t("Collection points", "එකතු කිරීමේ ස්ථාන")}</small>
          </a>
          <Link href="/system?role=household">
            <span>🏠</span>
            <b>{t("Request a pickup", "එකතු කිරීමක් ඉල්ලන්න")}</b>
            <small>{t("Household portal", "නිවාස පිටුව")}</small>
          </Link>
          <Link href="/system?role=household">
            <span>📋</span>
            <b>{t("Track my requests", "මගේ ඉල්ලීම් බලන්න")}</b>
            <small>{t("Confirm completed pickups", "එකතු කිරීම් තහවුරු කරන්න")}</small>
          </Link>
        </div>
      </section>

      <section className="category-section" id="categories">
        <div className="section">
          <div className="section-heading-row">
            <div>
              <p className="kicker">{t("WASTE CATEGORIES", "කසළ වර්ග")}</p>
              <h2>
                {t("Know Your", "ඔබේ කසළ")} <em>{t("Waste.", "හඳුනාගන්න.")}</em>
              </h2>
            </div>
            <p>
              {t(
                "Identify the right category before you request a pickup. You can also choose “Mixed Recyclables”.",
                "එකතු කිරීමක් ඉල්ලීමට පෙර නිවැරදි කාණ්ඩය හඳුනාගන්න. “මිශ්‍ර ප්‍රතිචක්‍රීකරණ” ලෙසද තේරිය හැක.",
              )}
            </p>
          </div>
          <div className="category-grid">
            {categories.map((category) => (
              <article className={`category-card ${category.color}`} key={category.title}>
                <div className="category-thumb">
                  <Image src={category.image} alt={isSi ? category.titleSi : `${category.title} recyclable waste`} width={240} height={240} />
                </div>
                <div>
                  <h3>{isSi ? category.titleSi : category.title}</h3>
                  <p>{isSi ? category.itemsSi : category.items}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="tip-bar">
            <span>📷</span>
            <div>
              <b>{t("Not sure where your waste belongs?", "ඔබේ කසළ අයත් කාණ්ඩය විශ්වාස නැද්ද?")}</b>
              <p>{t("Show one item to your camera and scan it automatically.", "එක භාණ්ඩයක් camera එකට පෙන්වා automatically scan කරන්න.")}</p>
            </div>
            <button
              type="button"
              onPointerEnter={() => void preloadWasteModel().catch(() => undefined)}
              onFocus={() => void preloadWasteModel().catch(() => undefined)}
              onClick={() => setScannerOpen(true)}
            >
              {t("Scan Waste", "කසළ Scan කරන්න")} <span>→</span>
            </button>
          </div>
          {scannerOpen && <WasteScanner language={language} onClose={() => setScannerOpen(false)} />}
        </div>
      </section>

      <section className="map-section" id="collection-points">
        <div className="section">
          <div className="map-title">
            <p className="kicker">{t("COLLECTION POINTS", "එකතු කිරීමේ ස්ථාන")}</p>
            <h2>
              {t("Find a Collection Point", "ඔබට ආසන්න එකතු කිරීමේ ස්ථානයක්")} <em>{t("Near You", "සොයාගන්න")}</em>
            </h2>
            <p>
              {t("Type your town to see the nearest EcoLoop district hub. Every hub accepts all recyclable waste types.", "ළඟම EcoLoop දිස්ත්‍රික් hub එක බැලීමට ඔබේ නගරය ලියන්න. සෑම hub එකක්ම සියලු ප්‍රතිචක්‍රීකරණ කසළ භාරගනී.")}
            </p>
          </div>
          <div className="sample-notice">
            <span>●</span>
            <div>
              <b>{t("Planned district hubs", "සැලසුම් කළ දිස්ත්‍රික් hubs")}</b>
              <small>
                {t("Hubs are shown at each district's main town. Exact addresses will be added as each hub opens.", "Hubs පෙන්වා ඇත්තේ එක් එක් දිස්ත්‍රික්කයේ ප්‍රධාන නගරයේය. Hub එක විවෘත වන විට නිවැරදි ලිපිනය එක් කෙරේ.")}
              </small>
            </div>
          </div>
          <div className="finder-layout collection-finder">
            <form className="finder-panel simple-finder" onSubmit={submitSearch}>
              <h3>🔍 {t("Find the nearest collection point", "ළඟම එකතු කිරීමේ ස්ථානය සොයන්න")}</h3>
              <p className="finder-help">{t("Type your town or area below.", "ඔබේ නගරය හෝ ප්‍රදේශය පහළින් ලියන්න.")}</p>
              <label>
                <span>{t("YOUR AREA", "ඔබේ ප්‍රදේශය")}</span>
                <div className="search-input">
                  <i>⌖</i>
                  <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} placeholder={t("Example: Kandy", "උදාහරණය: මහනුවර")} />
                </div>
              </label>
              {locationError && (
                <small className="location-error" role="alert">
                  {locationError}
                </small>
              )}
              <button className="button search-button" type="submit" disabled={searching}>
                {searching ? t("Searching...", "සොයමින්...") : t("Find Nearest Hub", "ළඟම hub එක සොයන්න")} {!searching && <span>→</span>}
              </button>
              <small className="location-attribution">{t("Location data © OpenStreetMap contributors.", "ස්ථාන දත්ත © OpenStreetMap දායකයින්.")}</small>
              {hub ? (
                <div className="collection-details" aria-live="polite">
                  <div className="details-topline">
                    <span className="sample-data-badge">{t("NEAREST HUB", "ළඟම HUB එක")}</span>
                  </div>
                  <h3>
                    {t("EcoLoop District Hub", "EcoLoop දිස්ත්‍රික් hub")} — {isSi ? hub.si : hub.value}
                  </h3>
                  <div className="detail-row">
                    <span>📏</span>
                    <p>
                      <b>{formatDistance(hub.distanceKm)}</b> {t("from your area", "ඔබේ ප්‍රදේශයේ සිට")}
                    </p>
                  </div>
                  <div className="detail-row">
                    <span>🕐</span>
                    <p>{t("Mon – Sat: 8:00 AM – 5:00 PM · Sunday: Closed", "සඳුදා – සෙනසුරාදා: පෙ.ව. 8:00 – ප.ව. 5:00 · ඉරිදා: වසා ඇත")}</p>
                  </div>
                  <div className="detail-actions">
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${hub.latitude},${hub.longitude}`} target="_blank" rel="noreferrer">
                      📍 {t("Get Directions", "මාර්ගය බලන්න")}
                    </a>
                    <Link href="/system?role=household">♻ {t("Or request a pickup", "නැත්නම් එකතු කිරීමක් ඉල්ලන්න")}</Link>
                  </div>
                </div>
              ) : (
                <div className="no-results" role="status">
                  {t("Enter your area and press the green button.", "ඔබේ ප්‍රදේශය ලියා කොළ පැහැති button එක ඔබන්න.")}
                </div>
              )}
            </form>
            <div className="map-panel">
              <iframe
                key={hub?.value ?? "sri-lanka"}
                title={hub ? t(`Map of the ${hub.value} district hub`, `${hub.si} hub සිතියම`) : t("Map of Sri Lanka", "ශ්‍රී ලංකා සිතියම")}
                src={mapUrl(hub)}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
