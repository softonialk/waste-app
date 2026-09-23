"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { EcoPointsCalculator, RewardsMarketplace } from "./components/platform-features";
import { pointsRules } from "./data/platform";

const steps = [
  { n: "01", icon: "♻️", title: "Sort Your Waste", titleSi: "කසළ වෙන් කරන්න", text: "Separate your recyclable waste into the correct categories.", textSi: "ප්‍රතිචක්‍රීකරණය කළ හැකි කසළ නිවැරදි කාණ්ඩවලට වෙන් කරන්න." },
  { n: "02", icon: "📅", title: "Schedule a Collection", titleSi: "එකතු කිරීම සැලසුම් කරන්න", text: "Choose a convenient time for your waste collection.", textSi: "කසළ එකතු කිරීමට ඔබට පහසු වේලාවක් තෝරන්න." },
  { n: "03", icon: "🚛", title: "We Collect", titleSi: "අපි එකතු කරමු", text: "Our collection network collects your sorted recyclable waste.", textSi: "අපගේ ජාලය ඔබ වෙන් කළ කසළ නිවසින්ම එකතු කරයි." },
  { n: "04", icon: "🎁", title: "Earn Eco Points", titleSi: "Eco Points උපයන්න", text: "Get points for recycling and redeem them for rewards.", textSi: "ප්‍රතිචක්‍රීකරණයට ලකුණු ලබාගෙන ත්‍යාග සඳහා භාවිතා කරන්න." },
];

const categories = [
  { image: "/waste-categories/plastic.webp", title: "Plastic", titleSi: "ප්ලාස්ටික්", items: "Bottles, containers, packaging", itemsSi: "බෝතල්, බඳුන් සහ ඇසුරුම්", color: "mint" },
  { image: "/waste-categories/paper.webp", title: "Paper & Cardboard", titleSi: "කඩදාසි සහ කාඩ්බෝඩ්", items: "Newspapers, cardboard, paper", itemsSi: "පුවත්පත්, කාඩ්බෝඩ් සහ කඩදාසි", color: "sand" },
  { image: "/waste-categories/metal.webp", title: "Metal", titleSi: "ලෝහ", items: "Cans, tins, metal items", itemsSi: "කෑන්, ටින් සහ ලෝහ භාණ්ඩ", color: "blue" },
  { image: "/waste-categories/glass.webp", title: "Glass", titleSi: "වීදුරු", items: "Glass bottles and jars", itemsSi: "වීදුරු බෝතල් සහ බරණි", color: "aqua" },
  { image: "/waste-categories/organic.webp", title: "Organic", titleSi: "කාබනික", items: "Food and garden waste", itemsSi: "ආහාර සහ ගෙවතු කසළ", color: "lime" },
  { image: "/waste-categories/e-waste.webp", title: "E-Waste", titleSi: "ඉලෙක්ට්‍රොනික කසළ", items: "Old electronics and devices", itemsSi: "පැරණි ඉලෙක්ට්‍රොනික උපකරණ", color: "coral" },
];

type CollectionPoint = {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: string;
  openingHours: string[];
  phone?: string;
  acceptedWaste: string[];
  verified: boolean;
  markerClass: string;
};

const collectionPoints: CollectionPoint[] = [
  { id: 1, name: "Eco Collection Point — Nugegoda", address: "Sample Address, High Level Road, Nugegoda", latitude: 6.8649, longitude: 79.8997, distance: "1.8 km", openingHours: ["Mon – Sat: 8:00 AM – 6:00 PM", "Sunday: Closed"], phone: "+94 76 000 0001", acceptedWaste: ["Plastic", "Paper & Cardboard", "Metal", "Glass"], verified: true, markerClass: "mp1" },
  { id: 2, name: "Green Point — Kotte", address: "Sample Address, Parliament Road, Kotte", latitude: 6.8905, longitude: 79.9015, distance: "3.2 km", openingHours: ["Mon – Fri: 9:00 AM – 5:30 PM", "Sat: 9:00 AM – 1:00 PM"], acceptedWaste: ["Paper & Cardboard", "Glass", "E-Waste"], verified: true, markerClass: "mp2" },
  { id: 3, name: "Organic Hub — Maharagama", address: "Sample Address, Town Centre, Maharagama", latitude: 6.8480, longitude: 79.9265, distance: "4.6 km", openingHours: ["Tue – Sun: 8:30 AM – 5:00 PM", "Monday: Closed"], phone: "+94 76 000 0003", acceptedWaste: ["Organic Waste"], verified: false, markerClass: "mp3" },
];

function distanceKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const radius = 6371;
  const radians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number) { return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`; }

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location, setLocation] = useState("");
  const [filters, setFilters] = useState(["Plastic", "Paper & Cardboard"]);
  const [distance, setDistance] = useState("5");
  const [searched, setSearched] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [locationError, setLocationError] = useState("");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedPointId, setSelectedPointId] = useState(1);
  const [language, setLanguage] = useState<"en" | "si">("en");
  const isSi = language === "si";
  const t = (english: string, sinhala: string) => isSi ? sinhala : english;
  const rankedCollectionPoints = collectionPoints.map((point) => ({ ...point, actualDistance: userLocation ? distanceKm(userLocation, point) : Number.parseFloat(point.distance) })).sort((a, b) => a.actualDistance - b.actualDistance);
  const visibleCollectionPoints = rankedCollectionPoints.filter((point) => point.actualDistance <= Number(distance) && (filters.length === 0 || filters.some((filter) => point.acceptedWaste.includes(filter))));
  const selectedPoint = visibleCollectionPoints.find((point) => point.id === selectedPointId) ?? visibleCollectionPoints[0] ?? rankedCollectionPoints[0];

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    type ToolContext = { registerTool: (tool: object, options?: { signal?: AbortSignal }) => void | Promise<void> };
    const context = (document as Document & { modelContext?: ToolContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const registration = context.registerTool({
      name: "find_collection_points",
      title: "Find collection points",
      description: "Search EcoLoop collection points by a Sri Lankan location and accepted waste categories.",
      inputSchema: { type: "object", properties: { location: { type: "string" }, categories: { type: "array", items: { type: "string", enum: ["Plastic", "Paper & Cardboard", "Glass", "Metal", "E-Waste", "Organic Waste"] } } }, required: ["location", "categories"], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input: unknown) {
        const value = input as { location?: string; categories?: string[] };
        if (!value.location?.trim() || !Array.isArray(value.categories)) throw new Error("Enter a location and category list.");
        setLocation(value.location);
        setFilters(value.categories);
        setSearched(true);
        const match = collectionPoints.find((point) => value.categories?.some((category) => point.acceptedWaste.includes(category))) ?? collectionPoints[0];
        setSelectedPointId(match.id);
        document.querySelector("#collection-points")?.scrollIntoView({ behavior: "smooth" });
        return { name: match.name, sample: true, verified: match.verified, distance: match.distance, address: match.address, openingHours: match.openingHours, accepts: match.acceptedWaste };
      },
    }, { signal: lifecycle.signal });
    void Promise.resolve(registration).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  function toggleFilter(filter: string) {
    setFilters((current) => current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter]);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setSearched(true);
    if (visibleCollectionPoints.length) setSelectedPointId(visibleCollectionPoints[0].id);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationError(t("Location is not supported by this browser. Please search for your area manually.", "මෙම browser එක location සඳහා සහාය නොදක්වයි. ඔබේ ප්‍රදේශය අතින් සොයන්න."));
      return;
    }
    setLocationStatus("loading");
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const current = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setUserLocation(current);
        setLocation(t("Current browser location", "වත්මන් browser ස්ථානය"));
        setLocationStatus("ready");
        setSearched(true);
        const nearest = [...collectionPoints].sort((a, b) => distanceKm(current, a) - distanceKm(current, b))[0];
        setSelectedPointId(nearest.id);
      },
      (error) => {
        setUserLocation(null);
        setLocationStatus("error");
        if (error.code === error.PERMISSION_DENIED) setLocationError(t("Location access was denied. Please allow location access in your browser settings to find collection points near you.", "ස්ථාන ප්‍රවේශය ප්‍රතික්ෂේප විය. ආසන්න ස්ථාන සොයාගැනීමට browser settings තුළ location access ලබා දෙන්න."));
        else if (error.code === error.TIMEOUT) setLocationError(t("Finding your location timed out. Please try again or search for your area manually.", "ඔබේ ස්ථානය සෙවීමේ කාලය ඉක්මවා ගියේය. නැවත උත්සාහ කරන්න හෝ ප්‍රදේශය අතින් සොයන්න."));
        else setLocationError(t("Unable to determine your location. Please try again or search for your area manually.", "ඔබේ ස්ථානය හඳුනාගත නොහැක. නැවත උත්සාහ කරන්න හෝ ප්‍රදේශය අතින් සොයන්න."));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  return (
    <main>
      <header className="navbar">
        <a className="logo" href="#home"><span className="logo-mark">↻</span><span><b>EcoLoop</b><small>{t("Smart Waste Management", "බුද්ධිමත් කසළ කළමනාකරණය")}</small></span></a>
        <button className="menu-button" aria-label="Toggle menu" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        <nav className={menuOpen ? "nav-links open" : "nav-links"}>
          <a href="#home">{t("Home", "මුල් පිටුව")}</a><a href="#how">{t("How It Works", "ක්‍රියා කරන ආකාරය")}</a><a href="#categories">{t("Waste Categories", "කසළ වර්ග")}</a><a href="#collection-points">{t("Collection Points", "එකතු කිරීමේ ස්ථාන")}</a><a href="#rewards">{t("Rewards", "ත්‍යාග")}</a><a href="#impact">{t("Impact", "බලපෑම")}</a>
        </nav>
        <button className="language-toggle" onClick={() => setLanguage(isSi ? "en" : "si")} aria-label={t("Switch to Sinhala", "ඉංග්‍රීසි භාෂාවට මාරු වන්න")}><span className={!isSi ? "active" : ""}>EN</span><i></i><span className={isSi ? "active" : ""}>සිං</span></button>
        <div className="nav-actions"><Link className="dashboard-link" href="/dashboard">{t("Dashboard", "ඩෑෂ්බෝඩ්")}</Link><a className="button button-small" href="#collection-points"><span>♻</span> {t("Get Started", "ආරම්භ කරන්න")}</a></div>
      </header>

      <section className="hero section" id="home">
        <div className="hero-copy">
          <p className="badge"><span>♻</span> {t("Smart Waste Management for a Cleaner Sri Lanka", "පිරිසිදු ශ්‍රී ලංකාවක් සඳහා බුද්ධිමත් කසළ කළමනාකරණය")}</p>
          <h1>{t("Turn Your Waste Into a", "ඔබේ කසළ")}{" "}<em>{t("Better Tomorrow.", "හොඳ හෙටක් බවට පත් කරන්න.")}</em></h1>
          <p className="hero-text">{t("Sort your waste, find nearby collection points, earn rewards, and make a positive impact on Sri Lanka.", "කසළ වෙන් කරන්න, ආසන්න එකතු කිරීමේ ස්ථාන සොයන්න, ත්‍යාග උපයාගෙන ශ්‍රී ලංකාවට යහපත් බලපෑමක් ඇති කරන්න.")}</p>
          <div className="hero-actions"><a className="button" href="#categories"><span>♻</span> {t("Start Recycling", "ප්‍රතිචක්‍රීකරණය අරඹන්න")}</a><a className="button button-ghost" href="#collection-points"><span>⌖</span> {t("Find Collection Points", "එකතු කිරීමේ ස්ථාන සොයන්න")}</a></div>
          <div className="hero-stats"><div><strong>10K+</strong><span>{t("Households", "නිවාස")}</span></div><div><strong>25K+</strong><span>{t("Items Recycled", "ප්‍රතිචක්‍රීකරණය කළ දෑ")}</span></div><div><strong>50+</strong><span>{t("Collection Points", "එකතු කිරීමේ ස්ථාන")}</span></div></div>
        </div>
        <div className="hero-visual hero-map-visual" aria-label="EcoLoop collection network across Sri Lanka">
          <div className="hero-map-glow"></div>
          <Image className="hero-map-image" src="/sri-lanka-eco-map.png" alt="Green three-dimensional map of Sri Lanka with EcoLoop collection points" width={1024} height={1536} priority />
          <div className="hero-map-chip chip-network"><span>●</span><div><b>{t("50+ active points", "ක්‍රියාකාරී ස්ථාන 50+")}</b><small>{t("Islandwide network", "දිවයින පුරා ජාලය")}</small></div></div>
          <div className="hero-map-chip chip-impact"><span>♻</span><div><b>12,540 kg</b><small>{t("Waste recycled", "ප්‍රතිචක්‍රීකරණය කළ කසළ")}</small></div></div>
        </div>
      </section>

      <section className="trust-strip"><span>{t("BUILT FOR CLEANER COMMUNITIES ACROSS SRI LANKA", "පිරිසිදු ශ්‍රී ලාංකික ප්‍රජාවන් සඳහා")}</span><div><b>⌂</b> {t("Households", "නිවාස")}</div><div><b>♻</b> {t("Collectors", "එකතු කරන්නන්")}</div><div><b>◎</b> {t("Recycling Centers", "ප්‍රතිචක්‍රීකරණ මධ්‍යස්ථාන")}</div><div><b>◉</b> {t("Local Communities", "ප්‍රාදේශීය ප්‍රජාවන්")}</div></section>

      <section className="section centered" id="how">
        <p className="kicker">{t("HOW IT WORKS", "ක්‍රියා කරන ආකාරය")}</p><h2>{t("Waste Management", "කසළ කළමනාකරණය")}{" "}<em>{t("Made Simple.", "සරලව.")}</em></h2><p className="section-intro">{t("From sorting your waste to earning rewards, everything happens in a few simple steps.", "කසළ වෙන් කිරීමේ සිට ත්‍යාග උපයා ගැනීම දක්වා සියල්ල සරල පියවර කිහිපයකින් සිදු වේ.")}</p>
        <div className="steps-grid">{steps.map((step, index) => <article className="step-card" key={step.title}><span className="step-number">{step.n}</span><div className="step-icon">{step.icon}</div><h3>{isSi ? step.titleSi : step.title}</h3><p>{isSi ? step.textSi : step.text}</p>{index < steps.length - 1 && <span className="step-arrow">→</span>}</article>)}</div>
      </section>

      <section className="category-section" id="categories"><div className="section">
        <div className="section-heading-row"><div><p className="kicker">{t("WASTE CATEGORIES", "කසළ වර්ග")}</p><h2>{t("Know Your", "ඔබේ කසළ")}{" "}<em>{t("Waste.", "හඳුනාගන්න.")}</em></h2></div><p>{t("Quickly identify the right category before you request a pickup. Accepted categories may vary by collector or collection point.", "එකතු කිරීමක් ඉල්ලීමට පෙර නිවැරදි කාණ්ඩය හඳුනාගන්න. පිළිගන්නා කාණ්ඩ එකතු කරන්නා හෝ ස්ථානය අනුව වෙනස් විය හැක.")}</p></div>
        <div className="category-grid">{categories.map((category) => <article className={`category-card ${category.color}`} key={category.title}><div className="category-thumb"><Image src={category.image} alt={`${category.title} recyclable waste`} width={240} height={240} /></div><div><h3>{isSi ? category.titleSi : category.title}</h3><p>{isSi ? category.itemsSi : category.items}</p></div></article>)}</div>
        <div className="waste-pathways"><article><span>♻️</span><div><small>{t("RECYCLABLE PATHWAY", "ප්‍රතිචක්‍රීකරණ මාර්ගය")}</small><h3>{t("Recyclable Waste", "ප්‍රතිචක්‍රීකරණ කසළ")}</h3><p>Plastic · Paper & Cardboard · Metal · Glass · E-Waste</p><b>{t("Sort → Collect → Recycle → Eco Points", "වෙන් කරන්න → එකතු කරන්න → ප්‍රතිචක්‍රීකරණය → Eco Points")}</b></div></article><article><span>🌿</span><div><small>{t("SEPARATE ORGANIC PATHWAY", "වෙනම කාබනික මාර්ගය")}</small><h3>{t("Organic Waste", "කාබනික කසළ")}</h3><p>{t("Food waste · Garden waste · Compostable waste", "ආහාර · ගෙවතු · කොම්පෝස්ට් කළ හැකි කසළ")}</p><b>{t("Separate → Composting / Organic Collection → Compost", "වෙන් කරන්න → කොම්පෝස්ට් / කාබනික එකතු කිරීම → කොම්පෝස්ට්")}</b></div></article></div>
        <div className="points-rules"><div><span className="demo-tag">{t("DEMO POINT RULES", "උදාහරණ ලකුණු නීති")}</span><h3>{t("Eco Points per verified kilogram", "තහවුරු කළ කිලෝග්‍රෑමයකට Eco Points")}</h3></div>{Object.entries(pointsRules).map(([name, points]) => <article key={name}><b>{name}</b><strong>{points}</strong><small>Eco Points / kg</small></article>)}</div>
        <EcoPointsCalculator />
        <div className="tip-bar"><span>?</span><div><b>{t("Not sure where your waste belongs?", "ඔබේ කසළ අයත් කාණ්ඩය විශ්වාස නැද්ද?")}</b><p>{t("Use our waste guide to find the correct category.", "නිවැරදි කාණ්ඩය සොයාගැනීමට අපගේ කසළ මාර්ගෝපදේශය භාවිතා කරන්න.")}</p></div><button>{t("Find Waste Category", "කසළ කාණ්ඩය සොයන්න")} <span>→</span></button></div>
      </div></section>

      <section className="map-section" id="collection-points"><div className="section"><div className="map-title"><p className="kicker">{t("COLLECTION POINTS", "එකතු කිරීමේ ස්ථාන")}</p><h2>{t("Find a Collection Point", "ඔබට ආසන්න එකතු කිරීමේ ස්ථානයක්")}{" "}<em>{t("Near You", "සොයාගන්න")}</em></h2><p>{t("Find nearby waste collection points and choose the most convenient place to recycle your waste.", "ආසන්න කසළ එකතු කිරීමේ ස්ථාන සොයා ඔබේ කසළ ප්‍රතිචක්‍රීකරණයට පහසුම ස්ථානය තෝරන්න.")}</p></div>
        <div className="sample-notice"><span>●</span><div><b>{t("Sample Collection Points", "උදාහරණ එකතු කිරීමේ ස්ථාන")}</b><small>{t("Demo locations only — verified point data will be added when the collection network launches.", "මෙය demo ස්ථාන පමණි — ජාලය ආරම්භ වූ පසු තහවුරු කළ ස්ථාන එක් කෙරේ.")}</small></div></div>
        <div className="finder-layout collection-finder"><form className="finder-panel" onSubmit={submitSearch}><h3>🔍 {t("Search your area", "ඔබේ ප්‍රදේශය සොයන්න")}</h3><label><span>{t("LOCATION", "ස්ථානය")}</span><div className="search-input"><i>⌖</i><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("Enter location...", "ස්ථානය ඇතුළත් කරන්න...")} /></div></label><button className={`use-location ${locationStatus === "ready" ? "location-ready" : ""}`} type="button" onClick={useMyLocation} disabled={locationStatus === "loading"}>{locationStatus === "ready" ? "✓" : "📍"} {locationStatus === "loading" ? t("Finding your location...", "ඔබේ ස්ථානය සොයමින්...") : locationStatus === "ready" ? t("Location found", "ස්ථානය හමු විය") : t("Use My Location", "මගේ ස්ථානය භාවිතා කරන්න")}</button>{locationStatus === "error" && <small className="location-error" role="alert">{locationError}</small>}{locationStatus === "ready" && <small className="location-success">{t("Your precise location is used only in this browser session to calculate nearby points.", "ඔබේ නිශ්චිත ස්ථානය මෙම browser session එක තුළ ආසන්න ස්ථාන ගණනය කිරීමට පමණක් භාවිතා වේ.")}</small>}
          <fieldset><legend>{t("WASTE TYPE", "කසළ වර්ගය")}</legend>{["Plastic","Paper & Cardboard","Metal","Glass","E-Waste","Organic Waste"].map((filter) => <label className="check" key={filter}><input type="checkbox" checked={filters.includes(filter)} onChange={() => toggleFilter(filter)} /><span>{isSi ? ({Plastic:"ප්ලාස්ටික්","Paper & Cardboard":"කඩදාසි සහ කාඩ්බෝඩ්",Metal:"ලෝහ",Glass:"වීදුරු","E-Waste":"ඉලෙක්ට්‍රොනික කසළ","Organic Waste":"කාබනික කසළ"} as Record<string,string>)[filter] : filter}</span></label>)}</fieldset>
          <fieldset className="distance-field"><legend>{t("DISTANCE", "දුර")}</legend>{["1","5","10"].map((value) => <label className="check" key={value}><input type="radio" name="distance" value={value} checked={distance === value} onChange={() => setDistance(value)} /><span>{t(`Within ${value} km`, `කි.මී. ${value} ඇතුළත`)}</span></label>)}</fieldset><button className="button search-button" type="submit">{t("Find Nearby", "ආසන්න ස්ථාන සොයන්න")} <span>→</span></button>
          <div className="nearby-heading"><b>📍 {userLocation ? t("Nearest Collection Points", "ළඟම එකතු කිරීමේ ස්ථාන") : t("Nearby Collection Points", "ආසන්න එකතු කිරීමේ ස්ථාන")}</b><small>{t("Sample data", "උදාහරණ දත්ත")}</small></div><div className="result-list">{visibleCollectionPoints.length ? visibleCollectionPoints.map((point, index) => <button className={`result-card compact-result ${selectedPoint.id === point.id ? "revealed selected" : ""}`} type="button" onClick={() => setSelectedPointId(point.id)} key={point.id}><span>{userLocation ? index + 1 : "♻"}</span><span><b>{point.name}</b><small>{formatDistance(point.actualDistance)}{" "}{t("away", "දුරින්")} · {point.acceptedWaste.slice(0,2).join(" · ")}</small></span><i>{point.verified ? "✓" : ""}</i></button>) : <div className="no-results">{t("No sample points match these filters or distance.", "මෙම filters හෝ දුරට ගැළපෙන උදාහරණ ස්ථාන නොමැත.")}</div>}</div>
          </form><div className={`fake-map large-map ${userLocation ? "location-active" : ""}`}><div className="map-road r1"></div><div className="map-road r2"></div><div className="map-road r3"></div><span className="map-label ml1">NUGEGODA</span><span className="map-label ml2">KOTTE</span><span className="map-label ml3">MAHARAGAMA</span>{visibleCollectionPoints.map((point) => <button type="button" aria-label={`${t("Select", "තෝරන්න")} ${point.name}`} className={`map-pin ${point.markerClass} ${selectedPoint.id === point.id ? "active" : ""}`} onClick={() => setSelectedPointId(point.id)} key={point.id}>♻</button>)}{userLocation && <span className="you-pin actual-location">●<small>{t("You are here", "ඔබ මෙහි සිටී")}</small></span>}<aside className="collection-details" aria-live="polite"><div className="details-topline"><span className="sample-data-badge">{t("SAMPLE DATA", "උදාහරණ දත්ත")}</span>{selectedPoint.verified ? <span className="verified-badge">✓ {t("Verified Collection Point", "තහවුරු කළ එකතු කිරීමේ ස්ථානය")}</span> : <span className="unverified-badge">{t("Demo point", "Demo ස්ථානය")}</span>}</div><h3>{selectedPoint.name}</h3><div className="detail-row"><span>📍</span><p>{selectedPoint.address}</p></div><div className="detail-row"><span>📏</span><p><b>{formatDistance(selectedPoint.actualDistance)}</b>{" "}{t("away", "දුරින්")}</p></div><div className="detail-row"><span>🕐</span><p>{selectedPoint.openingHours.map((hours) => <span key={hours}>{hours}</span>)}</p></div>{selectedPoint.phone && <div className="detail-row"><span>☎</span><p>{t("Sample contact", "උදාහරණ සම්බන්ධතාවය")}: {selectedPoint.phone}</p></div>}<div className="accepted-block"><b>♻️ {t("Accepted Waste", "පිළිගන්නා කසළ")}</b><div>{selectedPoint.acceptedWaste.map((waste) => <span key={waste}>{waste}</span>)}</div></div><div className="detail-actions"><a href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPoint.latitude},${selectedPoint.longitude}`} target="_blank" rel="noreferrer">📍 {t("Get Directions", "මාර්ගය බලන්න")}</a>{selectedPoint.phone && <a href={`tel:${selectedPoint.phone.replace(/\s/g, "")}`}>☎ {t("Contact", "අමතන්න")}</a>}</div></aside><div className="map-key"><span><i className="green-dot"></i> {t("Sample point", "උදාහරණ ස්ථානය")}</span>{userLocation && <span><i className="user-dot"></i> {t("Your actual location", "ඔබේ සැබෑ ස්ථානය")}</span>}</div></div></div>
      </div></section>

      <section className="section rewards" id="rewards">
        <div className="rewards-dashboard">
          <div className="dashboard-label"><span>●</span>{t("SAMPLE DASHBOARD", "උදාහරණ ඩෑෂ්බෝඩ්")}</div>
          <div className="dashboard-head"><div><small>{t("YOUR ECO POINTS", "ඔබේ ECO POINTS")}</small><strong>1,250 <i>🌿</i></strong></div><span>♻</span></div>
          <div className="next-reward"><div><b>{t("Next reward", "ඊළඟ ත්‍යාගය")}</b><strong>1,500 pts</strong></div><div className="reward-progress"><i></i></div><div className="progress-meta"><span>83%</span><span>{t("250 points to go", "තවත් ලකුණු 250යි")}</span></div></div>
          <p className="dashboard-note">{t("Illustrative balance — your real points will appear after the rewards system launches.", "මෙය උදාහරණ ශේෂයකි — ත්‍යාග පද්ධතිය ආරම්භ වූ පසු ඔබේ සැබෑ ලකුණු මෙහි පෙන්වයි.")}</p>
        </div>
        <div className="rewards-copy rewards-detail"><p className="kicker">{t("ECO REWARDS", "ECO ත්‍යාග")}</p><h2>{t("Recycle More.", "වැඩිපුර ප්‍රතිචක්‍රීකරණය කරන්න.")}{" "}<em>{t("Earn More.", "වැඩිපුර උපයන්න.")}</em></h2><p>{t("Every time you recycle, you make an impact and earn Eco Points.", "ඔබ ප්‍රතිචක්‍රීකරණය කරන සෑම වාරයකදීම යහපත් බලපෑමක් ඇති කර Eco Points උපයයි.")}</p>
          <div className="reward-flow"><article><span>♻️</span><div><b>{t("Recycle", "ප්‍රතිචක්‍රීකරණය")}</b><p>{t("Drop off or hand over eligible recyclable waste.", "සුදුසු කසළ භාර දෙන්න හෝ එකතු කරන්නාට ලබා දෙන්න.")}</p></div></article><i>→</i><article><span>⭐</span><div><b>{t("Earn Points", "ලකුණු උපයන්න")}</b><p>{t("Receive Eco Points based on your recycling activity.", "ඔබේ ප්‍රතිචක්‍රීකරණ ක්‍රියාකාරකම් අනුව Eco Points ලබාගන්න.")}</p></div></article><i>→</i><article><span>🎁</span><div><b>{t("Redeem", "භාවිතා කරන්න")}</b><p>{t("Use your points to claim available rewards.", "ලබාගත හැකි ත්‍යාග සඳහා ඔබේ ලකුණු භාවිතා කරන්න.")}</p></div></article></div>
          <div className="reward-examples"><div className="reward-examples-head"><b>{t("Example Rewards", "උදාහරණ ත්‍යාග")}</b><small>{t("Preview only", "උදාහරණයක් පමණි")}</small></div><div><span>🌱 {t("Eco Gift", "Eco ත්‍යාගය")}</span><b>500 pts</b></div><div><span>🛍️ {t("Shopping Voucher", "සාප්පු වවුචරය")}</span><b>1,000 pts</b></div><div><span>🎁 {t("Special Reward", "විශේෂ ත්‍යාගය")}</span><b>2,000 pts</b></div><p>{t("Point values are examples and may change when the rewards system is finalized.", "ලකුණු අගයන් උදාහරණ වන අතර ත්‍යාග පද්ධතිය අවසන් කරන විට වෙනස් විය හැක.")}</p></div>
        </div>
      </section>
      <section className="section reward-market-section"><RewardsMarketplace /></section>

      <section className="impact-section" id="impact"><div className="section"><div className="impact-heading"><div><p className="kicker">{t("OUR COLLECTIVE IMPACT", "අපගේ සාමූහික බලපෑම")}</p><h2>{t("Together, We Make", "එක්ව අපි")}{" "}<em>{t("an Impact", "වෙනසක් ඇති කරමු")}</em></h2></div><p>{t("Every recycled item contributes to a cleaner community and a more sustainable Sri Lanka.", "ප්‍රතිචක්‍රීකරණය කරන සෑම ද්‍රව්‍යයක්ම පිරිසිදු ප්‍රජාවකට සහ තිරසර ශ්‍රී ලංකාවකට දායක වේ.")}</p></div>
        <div className="impact-sample-label"><span>●</span><div><b>{t("SAMPLE DATA", "උදාහරණ දත්ත")}</b><small>{t("These figures illustrate the future dashboard and are not live platform statistics.", "මෙම සංඛ්‍යා අනාගත dashboard එක නිරූපණය කරන අතර සජීවී platform දත්ත නොවේ.")}</small></div></div>
        <div className="impact-stat-grid"><article><span>♻️</span><strong>12,500+</strong><p>{t("Items Recycled", "ප්‍රතිචක්‍රීකරණය කළ ද්‍රව්‍ය")}</p></article><article><span>🌱</span><strong>8,400 <small>kg</small></strong><p>{t("Waste Diverted", "වළක්වාගත් කසළ")}</p></article><article><span>👥</span><strong>2,500+</strong><p>{t("Active Users", "ක්‍රියාකාරී පරිශීලකයින්")}</p></article><article><span>📍</span><strong>150+</strong><p>{t("Collection Points", "එකතු කිරීමේ ස්ථාන")}</p></article></div>
        <div className="impact-story"><div className="impact-map-card"><div className="impact-map-copy"><p className="kicker">{t("CIRCULAR IMPACT", "චක්‍රීය බලපෑම")}</p><h3>{t("From Sorted Waste to New Value.", "වෙන් කළ කසළවලින් නව වටිනාකමක්.")}</h3><p>{t("Each verified collection can move recyclable materials through a cleaner, measurable recovery process.", "තහවුරු කළ සෑම එකතු කිරීමක්ම ප්‍රතිචක්‍රීකරණ ද්‍රව්‍ය පිරිසිදු සහ මැනිය හැකි ප්‍රතිසාධන ක්‍රියාවලියකට යොමු කරයි.")}</p><div className="impact-map-legend"><span><i></i>{t("Sorted materials", "වෙන් කළ ද්‍රව්‍ය")}</span><span><i></i>{t("Circular recovery", "චක්‍රීය ප්‍රතිසාධනය")}</span></div></div><div className="impact-process-visual"><Image src="/recycling-impact-process.webp" alt="Sorted recyclable materials moving through a circular recovery process" width={1536} height={1024} /></div></div>
          <div className="impact-measurement"><p className="kicker">{t("FUTURE DATA FLOW", "අනාගත දත්ත ප්‍රවාහය")}</p><h3>{t("From Every Pickup to Measurable Progress", "සෑම එකතු කිරීමකින්ම මැනිය හැකි ප්‍රගතියක්")}</h3><div className="impact-flow"><article><span>01</span><div><b>{t("Waste Collected", "කසළ එකතු කළා")}</b><p>{t("Record verified pickup weight and category.", "තහවුරු කළ බර සහ කසළ වර්ගය සටහන් කරන්න.")}</p></div></article><i>↓</i><article><span>02</span><div><b>{t("Waste Recycled", "ප්‍රතිචක්‍රීකරණය කළා")}</b><p>{t("Confirm what reached a recycling partner.", "ප්‍රතිචක්‍රීකරණ හවුල්කරුට ලැබුණු ප්‍රමාණය තහවුරු කරන්න.")}</p></div></article><i>↓</i><article><span>03</span><div><b>{t("Environmental Impact", "පාරිසරික බලපෑම")}</b><p>{t("Show only source-based conversion metrics.", "මූලාශ්‍ර මත පදනම් වූ මිනුම් පමණක් පෙන්වන්න.")}</p></div></article></div><div className="impact-method-note"><span>✓</span><p><b>{t("Built for credible reporting", "විශ්වාසදායක වාර්තාකරණයක් සඳහා")}</b>{t("CO₂ and other environmental estimates will appear only after a documented scientific method is connected.", "CO₂ සහ වෙනත් පාරිසරික ඇස්තමේන්තු පෙන්වන්නේ ලේඛනගත විද්‍යාත්මක ක්‍රමයක් සම්බන්ධ කළ පසුව පමණි.")}</p></div></div></div>
        <div className="impact-closing"><span>↻</span><p>{t("Your small action contributes to a bigger change.", "ඔබේ කුඩා ක්‍රියාව විශාල වෙනසකට දායක වේ.")}</p></div>
      </div></section>

      <section className="lanka-section" id="made-for-sri-lanka"><div className="section"><div className="lanka-heading"><p className="kicker">{t("MADE FOR SRI LANKA", "ශ්‍රී ලංකාව වෙනුවෙන්")}</p><h2>{t("Built for", "නිර්මාණය කළේ")}{" "}<em>{t("Sri Lanka", "ශ්‍රී ලංකාව වෙනුවෙන්")}</em> 🇱🇰</h2><p>{t("A smarter way to manage recyclable waste, designed around Sri Lankan communities.", "ශ්‍රී ලාංකික ප්‍රජාවන් වටා නිර්මාණය කළ, ප්‍රතිචක්‍රීකරණ කසළ කළමනාකරණයට වඩා බුද්ධිමත් ක්‍රමයක්.")}</p></div>
        <div className="local-feature-grid meaningful-local"><article><span>🇱🇰</span><h3>{t("Sinhala + English", "සිංහල + English")}</h3><p>{t("Switch the interface language for everyday use.", "එදිනෙදා භාවිතය සඳහා අතුරුමුහුණතේ භාෂාව මාරු කරන්න.")}</p></article><article><span>📍</span><h3>{t("Local Collection Points", "දේශීය එකතු කිරීමේ ස්ථාන")}</h3><p>{t("Structure verified locations around Sri Lankan districts.", "ශ්‍රී ලාංකික දිස්ත්‍රික්ක වටා තහවුරු කළ ස්ථාන සංවිධානය කරන්න.")}</p></article><article><span>🗺️</span><h3>{t("Sri Lankan Districts", "ශ්‍රී ලාංකික දිස්ත්‍රික්ක")}</h3><p>{t("Search and plan collection coverage district by district.", "දිස්ත්‍රික්ක අනුව එකතු කිරීමේ ආවරණය සොයා සැලසුම් කරන්න.")}</p></article><article><span>♻️</span><h3>{t("Local Recycling Network", "දේශීය ප්‍රතිචක්‍රීකරණ ජාලය")}</h3><p>{t("Represent verified collectors, centers and organizations.", "තහවුරු කළ එකතු කරන්නන්, මධ්‍යස්ථාන සහ සංවිධාන නිරූපණය කරන්න.")}</p></article><article><span>🎁</span><h3>{t("Local Rewards", "දේශීය ත්‍යාග")}</h3><p>{t("Prepare for future offers from verified local partners.", "තහවුරු කළ දේශීය හවුල්කරුවන්ගේ අනාගත දීමනා සඳහා සූදානම් වෙන්න.")}</p></article></div>
        <div className="lanka-growth"><div className="lanka-growth-copy"><div className="demo-pill"><span>●</span>{t("SAMPLE EXPANSION AREAS", "උදාහරණ ව්‍යාප්ති ප්‍රදේශ")}</div><p className="kicker">{t("GROWING ACROSS THE ISLAND", "දිවයින පුරා ව්‍යාප්ත වෙමින්")}</p><h3>{t("Growing Through Local Communities", "දේශීය ප්‍රජාවන් සමඟ ව්‍යාප්ත වෙමින්")}</h3><p>{t("These cities illustrate a future rollout plan—not currently available collection points.", "මෙම නගර අනාගත ව්‍යාප්ති සැලැස්මක් පෙන්වන අතර දැනට ක්‍රියාත්මක එකතු කිරීමේ ස්ථාන නොවේ.")}</p><div className="sample-city-grid">{["Colombo","Gampaha","Kandy","Galle","Kurunegala","Anuradhapura"].map((city) => <span key={city}>📍 {city}</span>)}</div><div className="local-ready"><span>文</span><div><b>{t("Sinhala + English ready", "සිංහල + English සූදානම්")}</b><small>{t("The interface already supports both languages, with local rules and partners ready to connect later.", "අතුරුමුහුණත දැනටමත් භාෂා දෙකටම සහය දක්වන අතර දේශීය නීති හා හවුල්කරුවන් පසුව සම්බන්ධ කළ හැක.")}</small></div></div></div><div className="community-collection-visual"><Image src="/community-collection.webp" alt="Sri Lankan community handing sorted recyclable waste to a collector" width={1536} height={1024} priority={false}/><div className="map-demo-tag">{t("Community collection concept", "ප්‍රජා එකතු කිරීමේ සංකල්පය")}</div></div></div>
      </div></section>

      <section className="section final-cta final-action" id="get-started"><div><div className="cta-shape shape-one">♻</div><div className="cta-shape shape-two">↻</div><div className="cta-shape shape-three">✦</div><span className="cta-icon">♻</span><p className="kicker">{t("YOUR NEXT STEP", "ඔබේ ඊළඟ පියවර")}</p><h2>{t("Make Your Waste", "ඔබේ කසළට")}{" "}<em>{t("Matter.", "වටිනාකමක් දෙන්න.")}</em> ♻️</h2><p>{t("Start recycling today and be part of a cleaner, greener Sri Lanka.", "අදම ප්‍රතිචක්‍රීකරණය ආරම්භ කර වඩා පිරිසිදු, හරිත ශ්‍රී ලංකාවක කොටසක් වන්න.")}</p><div className="final-action-buttons"><a className="button button-light" href="#categories">♻️ {t("Start Recycling", "ප්‍රතිචක්‍රීකරණය අරඹන්න")}</a><a className="button button-outline-light" href="#collection-points">📍 {t("Find Collection Points", "එකතු කිරීමේ ස්ථාන සොයන්න")}</a><Link className="button button-outline-light" href="/dashboard">▦ {t("Open Demo Dashboard", "Demo Dashboard අරින්න")}</Link></div><small>{t("One small action. One cleaner community.", "එක් කුඩා ක්‍රියාවක්. එක් පිරිසිදු ප්‍රජාවක්.")}</small></div></section>

      <footer className="footer simple-footer" id="footer"><div className="footer-grid"><div className="footer-brand"><a className="logo" href="#home"><span className="logo-mark">↻</span><span><b>EcoLoop</b><small>{t("Smart Waste Management", "බුද්ධිමත් කසළ කළමනාකරණය")}</small></span></a><p>{t("Making recycling easier for Sri Lankan communities.", "ශ්‍රී ලාංකික ප්‍රජාවන්ට ප්‍රතිචක්‍රීකරණය පහසු කරමු.")}</p></div><div className="footer-links"><h4>{t("Quick Links", "ඉක්මන් සබැඳි")}</h4><a href="#home">{t("Home", "මුල් පිටුව")}</a><a href="#how">{t("How It Works", "ක්‍රියා කරන ආකාරය")}</a><a href="#categories">{t("Waste Categories", "කසළ වර්ග")}</a><a href="#collection-points">{t("Collection Points", "එකතු කිරීමේ ස්ථාන")}</a><a href="#rewards">{t("Rewards", "ත්‍යාග")}</a><a href="#impact">{t("Impact", "බලපෑම")}</a></div><div className="footer-contact"><h4>{t("Contact", "සම්බන්ධතා")}</h4><a href="mailto:hello@ecoloop.lk">✉ hello@ecoloop.lk</a><span>☎ {t("Phone support coming soon", "දුරකථන සහාය ළඟදීම")}</span><span>📍 {t("Sri Lanka", "ශ්‍රී ලංකාව")}</span></div><div className="footer-social"><h4>{t("Follow Us", "අපව අනුගමනය කරන්න")}</h4><button type="button" aria-label="Facebook"><span>f</span> Facebook</button><button type="button" aria-label="Instagram"><span>◎</span> Instagram</button><button type="button" aria-label="TikTok"><span>♪</span> TikTok</button><small>{t("Social channels coming soon", "සමාජ මාධ්‍ය සබැඳි ළඟදීම")}</small></div></div><div className="footer-bottom"><span>© 2026 EcoLoop. {t("All rights reserved.", "සියලු හිමිකම් ඇවිරිණි.")}</span><span>{t("Built for a cleaner Sri Lanka", "පිරිසිදු ශ්‍රී ලංකාවක් වෙනුවෙන්")} 🇱🇰</span></div></footer>
    </main>
  );
}
