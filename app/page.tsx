"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { COINS_PER_PICKUP, DISTRICTS, REWARDS } from "../lib/constants";
import { Bi, bi } from "./components/bi";
import SiteFooter from "./components/site-footer";
import SiteHeader from "./components/site-header";
import WasteScanner, { preloadWasteModel } from "./components/waste-scanner";

const householdSteps = [
  { si: "කසළ වෙන් කරන්න", en: "Sort your waste", textSi: "ප්ලාස්ටික්, කඩදාසි, ලෝහ, වීදුරු වෙන වෙනම තබන්න.", textEn: "Keep plastic, paper, metal and glass apart." },
  { si: "නොමිලේ ඉල්ලන්න", en: "Request for free", textSi: "දිස්ත්‍රික්කය, දිනය සහ වේලාව තෝරන්න.", textEn: "Choose your district, a date and a time." },
  { si: "එකතු කරන්නා පැමිණේ", en: "A collector comes", textSi: "තහවුරු කළ එකතු කරන්නෙක් ඔබේ නිවසට පැමිණේ.", textEn: "A verified collector comes to your home." },
  { si: "ඔබ තහවුරු කරන්න", en: "You confirm", textSi: "එකතු කිරීම සිදු වූ බව එක් click එකකින් තහවුරු කරන්න.", textEn: "Confirm the pickup happened with one tap." },
];

const collectorSteps = [
  { si: "ලියාපදිංචි වන්න", en: "Register", textSi: "නම, දුරකථන අංකය සහ සේවා ප්‍රදේශය දෙන්න.", textEn: "Give your name, phone and service area." },
  { si: "තහවුරු වන්න", en: "Get verified", textSi: "NextGen කණ්ඩායම ඔබව තහවුරු කරයි.", textEn: "The NextGen team verifies you." },
  { si: "ඉල්ලීම් භාරගන්න", en: "Accept jobs", textSi: "ඔබේ දිස්ත්‍රික්කයේ ඉල්ලීම් තෝරා එකතු කරන්න.", textEn: "Pick jobs in your district and collect." },
  { si: "Coins උපයන්න", en: "Earn coins", textSi: `තහවුරු කළ සෑම එකතු කිරීමකටම coins ${COINS_PER_PICKUP}ක්.`, textEn: `${COINS_PER_PICKUP} coins for every confirmed pickup.` },
];

const categories = [
  { image: "/waste-categories/plastic.webp", si: "ප්ලාස්ටික්", en: "Plastic", itemsSi: "බෝතල්, බඳුන්, ඇසුරුම්", itemsEn: "Bottles, containers, packaging" },
  { image: "/waste-categories/paper.webp", si: "කඩදාසි සහ කාඩ්බෝඩ්", en: "Paper & cardboard", itemsSi: "පුවත්පත්, පෙට්ටි, කඩදාසි", itemsEn: "Newspapers, boxes, paper" },
  { image: "/waste-categories/metal.webp", si: "ලෝහ", en: "Metal", itemsSi: "කෑන්, ටින්, ලෝහ භාණ්ඩ", itemsEn: "Cans, tins, metal items" },
  { image: "/waste-categories/glass.webp", si: "වීදුරු", en: "Glass", itemsSi: "වීදුරු බෝතල් සහ බරණි", itemsEn: "Glass bottles and jars" },
  { image: "/waste-categories/organic.webp", si: "කාබනික කසළ", en: "Organic", itemsSi: "ආහාර සහ ගෙවතු කසළ", itemsEn: "Food and garden waste" },
  { image: "/waste-categories/e-waste.webp", si: "ඉලෙක්ට්‍රොනික කසළ", en: "E-waste", itemsSi: "පැරණි ඉලෙක්ට්‍රොනික උපකරණ", itemsEn: "Old electronics and devices" },
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
  "Enter a Sri Lankan location.": "ශ්‍රී ලංකාවේ ස්ථානයක් ඇතුළත් කරන්න.",
};

export default function Home() {
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
        description: "Find the nearest NextGen district hub to a town, city or address in Sri Lanka. Hubs accept all recyclable waste types.",
        inputSchema: { type: "object", properties: { location: { type: "string" } }, required: ["location"], additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        async execute(input: unknown) {
          const query = (input as { location?: string }).location?.trim();
          if (!query) throw new Error("Enter a Sri Lankan location.");
          const nearest = nearestHub(await geocode(query));
          setLocation(query);
          setHub(nearest);
          document.querySelector("#hubs")?.scrollIntoView({ behavior: "smooth" });
          return { hub: `NextGen District Hub — ${nearest.value}`, district: nearest.value, distanceKm: Math.round(nearest.distanceKm * 10) / 10, plannedLocation: true };
        },
      },
      { signal: lifecycle.signal },
    );
    void Promise.resolve(registration).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  async function submitSearch(event: FormEvent) {
    event.preventDefault();
    const query = location.trim();
    if (!query) {
      setLocationError("Enter a Sri Lankan location.");
      return;
    }
    setSearching(true);
    setLocationError("");
    try {
      setHub(nearestHub(await geocode(query)));
    } catch (error) {
      setHub(null);
      setLocationError(error instanceof Error ? error.message : "Location not found in Sri Lanka.");
    } finally {
      setSearching(false);
    }
  }

  const statValue = (value: number | undefined) => (stats ? (value ?? 0).toLocaleString("en-LK") : "—");

  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="hero">
          <div className="container hero__grid">
            <div className="hero__copy">
              <Bi as="p" className="eyebrow" si="පිරිසිදු ශ්‍රී ලංකාවක් සඳහා" en="For a cleaner Sri Lanka" />
              <h1 className="hero__title">
                <Bi stack si="ඔබේ කසළ, හොඳ හෙටක් බවට." en="Turn your waste into a better tomorrow." />
              </h1>
              <Bi
                as="p"
                stack
                className="hero__lead"
                si="නිවාසවලට නොමිලේ කසළ එකතු කිරීම, සහ කසළ එකතු කරන්නන්ට ආදායමක්. එකම වේදිකාවකින්."
                en="Free pickups for households and rewards for collectors, on one platform."
              />

              <div className="paths">
                <Link className="path-card" href="/system?role=household">
                  <span className="path-card__icon" aria-hidden="true">
                    🏠
                  </span>
                  <Bi as="span" stack className="path-card__title" si="මට කසළ තියෙනවා" en="I have waste" />
                  <Bi as="span" stack className="path-card__text" si="නොමිලේ එකතු කිරීමක් ඉල්ලන්න." en="Request a free pickup." />
                  <span className="path-card__cta" aria-hidden="true">
                    →
                  </span>
                </Link>
                <Link className="path-card path-card--alt" href="/system?role=collector">
                  <span className="path-card__icon" aria-hidden="true">
                    🚛
                  </span>
                  <Bi as="span" stack className="path-card__title" si="මම කසළ එකතු කරනවා" en="I collect waste" />
                  <Bi as="span" stack className="path-card__text" si="ලියාපදිංචි වී coins උපයන්න." en="Register and earn coins." />
                  <span className="path-card__cta" aria-hidden="true">
                    →
                  </span>
                </Link>
              </div>
            </div>

            <div className="hero__visual">
              <Image
                className="hero__map"
                src="/sri-lanka-eco-map.png"
                alt={bi("ශ්‍රී ලංකාවේ කොළ පැහැති සිතියම", "Green map of Sri Lanka")}
                width={1024}
                height={1536}
                priority
              />
              <dl className="stats" aria-live="polite">
                <div className="stat">
                  <dt>
                    <Bi stack si="සම්පූර්ණ කළ එකතු කිරීම්" en="Pickups completed" />
                  </dt>
                  <dd>{statValue(stats?.completedPickups)}</dd>
                </div>
                <div className="stat">
                  <dt>
                    <Bi stack si="එකතු කළ කසළ" en="Waste collected" />
                  </dt>
                  <dd>
                    {statValue(stats?.kgRecycled)}
                    {stats && <small> kg</small>}
                  </dd>
                </div>
                <div className="stat">
                  <dt>
                    <Bi stack si="තහවුරු කළ එකතු කරන්නන්" en="Verified collectors" />
                  </dt>
                  <dd>{statValue(stats?.verifiedCollectors)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section className="section" id="how" aria-labelledby="how-title">
          <div className="container">
            <header className="section-head">
              <Bi as="p" className="eyebrow" si="ක්‍රියා කරන ආකාරය" en="How it works" />
              <h2 id="how-title">
                <Bi stack si="පියවර හතරයි. දෙපැත්තටම." en="Four steps, for both sides." />
              </h2>
            </header>
            <div className="tracks">
              {[
                { key: "household", icon: "🏠", si: "නිවාස සඳහා", en: "For households", steps: householdSteps, href: "/system?role=household", ctaSi: "එකතු කිරීමක් ඉල්ලන්න", ctaEn: "Request a pickup" },
                { key: "collector", icon: "🚛", si: "එකතු කරන්නන් සඳහා", en: "For collectors", steps: collectorSteps, href: "/system?role=collector", ctaSi: "ලියාපදිංචි වන්න", ctaEn: "Register as a collector" },
              ].map((track) => (
                <article className={`track track--${track.key}`} key={track.key}>
                  <h3 className="track__title">
                    <span aria-hidden="true">{track.icon}</span>
                    <Bi stack si={track.si} en={track.en} />
                  </h3>
                  <ol className="steps">
                    {track.steps.map((step, index) => (
                      <li className="step" key={step.en}>
                        <span className="step__num" aria-hidden="true">
                          {index + 1}
                        </span>
                        <div>
                          <Bi as="h4" stack className="step__title" si={step.si} en={step.en} />
                          <Bi as="p" stack className="step__text" si={step.textSi} en={step.textEn} />
                        </div>
                      </li>
                    ))}
                  </ol>
                  <Link className={track.key === "household" ? "btn btn--primary" : "btn btn--secondary"} href={track.href}>
                    <Bi si={track.ctaSi} en={track.ctaEn} /> <span aria-hidden="true">→</span>
                  </Link>
                </article>
              ))}
            </div>
            <ul className="promises">
              <li>
                <span aria-hidden="true">✓</span>
                <Bi stack si="නිවාසවලට සම්පූර්ණයෙන්ම නොමිලේ" en="Always free for households" />
              </li>
              <li>
                <span aria-hidden="true">✓</span>
                <Bi stack si="තහවුරු කළ එකතු කරන්නන් පමණි" en="Only verified collectors" />
              </li>
              <li>
                <span aria-hidden="true">✓</span>
                <Link href="/privacy">
                  <Bi stack si="ඔබේ තොරතුරු ආරක්ෂිතයි" en="Your details stay private" />
                </Link>
              </li>
            </ul>
          </div>
        </section>

        <section className="section section--tint" id="waste" aria-labelledby="waste-title">
          <div className="container">
            <header className="section-head section-head--split">
              <div>
                <Bi as="p" className="eyebrow" si="කසළ වර්ග" en="Waste types" />
                <h2 id="waste-title">
                  <Bi stack si="ඔබේ කසළ හඳුනාගන්න." en="Know your waste." />
                </h2>
              </div>
              <Bi
                as="p"
                stack
                className="section-head__lead"
                si="ඉල්ලීමක් දැමීමට පෙර නිවැරදි වර්ගය තෝරන්න. විශ්වාස නැත්නම් “මිශ්‍ර ප්‍රතිචක්‍රීකරණ” තෝරන්න."
                en="Pick the right type before you request. Not sure? Choose “Mixed recyclables”."
              />
            </header>
            <ul className="waste-grid">
              {categories.map((category) => (
                <li className="waste-card" key={category.en}>
                  <Image className="waste-card__img" src={category.image} alt={bi(category.si, category.en)} width={240} height={240} />
                  <div>
                    <Bi as="h3" stack className="waste-card__title" si={category.si} en={category.en} />
                    <Bi as="p" stack className="waste-card__text" si={category.itemsSi} en={category.itemsEn} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="scan-cta">
              <span className="scan-cta__icon" aria-hidden="true">
                📷
              </span>
              <div>
                <Bi as="h3" stack si="කුමන වර්ගයද කියා විශ්වාස නැද්ද?" en="Not sure which type it is?" />
                <Bi as="p" stack si="එක භාණ්ඩයක් camera එකට පෙන්වන්න. පින්තූර upload කරන්නේ නැහැ." en="Show one item to your camera. No photos are uploaded." />
              </div>
              <button
                type="button"
                className="btn btn--primary"
                onPointerEnter={() => void preloadWasteModel().catch(() => undefined)}
                onFocus={() => void preloadWasteModel().catch(() => undefined)}
                onClick={() => setScannerOpen(true)}
              >
                <Bi si="කසළ Scan කරන්න" en="Scan waste" />
              </button>
            </div>
          </div>
          {scannerOpen && <WasteScanner onClose={() => setScannerOpen(false)} />}
        </section>

        <section className="section" id="hubs" aria-labelledby="hubs-title">
          <div className="container">
            <header className="section-head">
              <Bi as="p" className="eyebrow" si="එකතු කිරීමේ ස්ථාන" en="Collection hubs" />
              <h2 id="hubs-title">
                <Bi stack si="ඔබට ළඟම hub එක සොයන්න." en="Find your nearest hub." />
              </h2>
              <Bi
                as="p"
                stack
                className="section-head__lead"
                si={`දිස්ත්‍රික්ක ${DISTRICTS.length}ක සැලසුම් කළ hubs. සෑම hub එකක්ම සියලු ප්‍රතිචක්‍රීකරණ කසළ භාරගනී.`}
                en={`Planned hubs in all ${DISTRICTS.length} districts. Every hub accepts all recyclable waste.`}
              />
            </header>
            <div className="finder">
              <form className="finder__panel" onSubmit={submitSearch}>
                <label className="field">
                  <Bi className="field__label" si="ඔබේ නගරය හෝ ප්‍රදේශය" en="Your town or area" />
                  <input
                    className="input"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    maxLength={120}
                    placeholder={bi("උදා: මහනුවර", "e.g. Kandy")}
                  />
                </label>
                {locationError && (
                  <p className="field__error" role="alert">
                    <Bi stack si={geocodeErrorsSi[locationError] ?? locationError} en={locationError} />
                  </p>
                )}
                <button className="btn btn--primary btn--block" type="submit" disabled={searching}>
                  {searching ? <Bi si="සොයමින්..." en="Searching..." /> : <Bi si="ළඟම hub එක සොයන්න" en="Find nearest hub" />}
                </button>

                {hub ? (
                  <div className="hub-card" aria-live="polite">
                    <Bi as="p" className="hub-card__label" si="ළඟම hub එක" en="Nearest hub" />
                    <h3 className="hub-card__name">
                      <Bi stack si={`${hub.si} දිස්ත්‍රික් hub`} en={`${hub.value} district hub`} />
                    </h3>
                    <p className="hub-card__row">
                      <span aria-hidden="true">📏</span>
                      <span>
                        <b>{formatDistance(hub.distanceKm)}</b> <Bi si="ඔබේ ප්‍රදේශයේ සිට" en="from your area" />
                      </span>
                    </p>
                    <p className="hub-card__row">
                      <span aria-hidden="true">🕐</span>
                      <Bi stack si="සඳු – සෙන: පෙ.ව. 8 – ප.ව. 5 · ඉරිදා වසා ඇත" en="Mon – Sat: 8 AM – 5 PM · Closed Sunday" />
                    </p>
                    <div className="hub-card__actions">
                      <a className="btn btn--secondary btn--sm" href={`https://www.google.com/maps/dir/?api=1&destination=${hub.latitude},${hub.longitude}`} target="_blank" rel="noreferrer">
                        <Bi si="මාර්ගය" en="Directions" />
                      </a>
                      <Link className="btn btn--ghost btn--sm" href="/system?role=household">
                        <Bi si="නැත්නම් ගෙදරටම ගෙන්වන්න" en="Or request a pickup" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <Bi as="p" stack className="finder__hint" si="ඔබේ නගරය ලියා බොත්තම ඔබන්න." en="Type your town and press the button." />
                )}
                <p className="finder__note">
                  <Bi stack si="Hub ස්ථාන දැනට සැලසුම් මට්ටමේ ඇත. නිවැරදි ලිපින විවෘත වන විට එක් කෙරේ." en="Hub locations are planned; exact addresses are added as each hub opens." />
                  <small>Map data © OpenStreetMap contributors</small>
                </p>
              </form>
              <div className="finder__map">
                <iframe
                  key={hub?.value ?? "sri-lanka"}
                  title={hub ? bi(`${hub.si} hub සිතියම`, `Map of the ${hub.value} hub`) : bi("ශ්‍රී ලංකා සිතියම", "Map of Sri Lanka")}
                  src={mapUrl(hub)}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="collectors" aria-labelledby="collectors-title">
          <div className="container">
            <div className="collect-band">
              <div className="collect-band__copy">
                <Bi as="p" className="eyebrow" si="එකතු කරන්නන්ට" en="For collectors" />
                <h2 id="collectors-title">
                  <Bi stack si="එකතු කරන්න. Coins උපයන්න." en="Collect waste. Earn coins." />
                </h2>
                <Bi
                  as="p"
                  stack
                  si={`නිවස තහවුරු කරන සෑම එකතු කිරීමකටම coins ${COINS_PER_PICKUP}ක් ලැබේ. Coins ත්‍යාග සඳහා මුදාගන්න.`}
                  en={`Every pickup the household confirms earns ${COINS_PER_PICKUP} coins. Redeem coins for rewards.`}
                />
                <Link className="btn btn--primary" href="/system?role=collector">
                  <Bi si="එකතු කරන්නෙකු ලෙස එක්වන්න" en="Join as a collector" /> <span aria-hidden="true">→</span>
                </Link>
              </div>
              <ul className="reward-list">
                {REWARDS.map((reward) => (
                  <li className="reward-list__item" key={reward.name}>
                    <span className="reward-list__icon" aria-hidden="true">
                      {reward.icon}
                    </span>
                    <Bi stack si={reward.si} en={reward.name} />
                    <span className="reward-list__points">
                      {reward.points.toLocaleString("en-LK")} <small>coins</small>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
