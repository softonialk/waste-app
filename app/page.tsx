"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";

const steps = [
  { n: "01", icon: "♻️", title: "Sort Your Waste", titleSi: "කසළ වෙන් කරන්න", text: "Separate your recyclable waste into the correct categories.", textSi: "ප්‍රතිචක්‍රීකරණය කළ හැකි කසළ නිවැරදි කාණ්ඩවලට වෙන් කරන්න." },
  { n: "02", icon: "📅", title: "Schedule a Collection", titleSi: "එකතු කිරීම සැලසුම් කරන්න", text: "Choose a convenient time for your waste collection.", textSi: "කසළ එකතු කිරීමට ඔබට පහසු වේලාවක් තෝරන්න." },
  { n: "03", icon: "🚛", title: "We Collect", titleSi: "අපි එකතු කරමු", text: "Our collection network collects your sorted recyclable waste.", textSi: "අපගේ ජාලය ඔබ වෙන් කළ කසළ නිවසින්ම එකතු කරයි." },
  { n: "04", icon: "🎁", title: "Earn Eco Points", titleSi: "Eco Points උපයන්න", text: "Get points for recycling and redeem them for rewards.", textSi: "ප්‍රතිචක්‍රීකරණයට ලකුණු ලබාගෙන ත්‍යාග සඳහා භාවිතා කරන්න." },
];

const categories = [
  { image: "/waste-categories/plastic.webp", title: "Plastic", titleSi: "ප්ලාස්ටික්", items: "Bottles, containers, packaging", itemsSi: "බෝතල්, බඳුන් සහ ඇසුරුම්", color: "mint" },
  { image: "/waste-categories/paper.webp", title: "Paper", titleSi: "කඩදාසි", items: "Newspapers, cardboard, paper", itemsSi: "පුවත්පත්, කාඩ්බෝඩ් සහ කඩදාසි", color: "sand" },
  { image: "/waste-categories/metal.webp", title: "Metal", titleSi: "ලෝහ", items: "Cans, tins, metal items", itemsSi: "කෑන්, ටින් සහ ලෝහ භාණ්ඩ", color: "blue" },
  { image: "/waste-categories/glass.webp", title: "Glass", titleSi: "වීදුරු", items: "Glass bottles and jars", itemsSi: "වීදුරු බෝතල් සහ බරණි", color: "aqua" },
  { image: "/waste-categories/organic.webp", title: "Organic", titleSi: "කාබනික", items: "Food and garden waste", itemsSi: "ආහාර සහ ගෙවතු කසළ", color: "lime" },
  { image: "/waste-categories/e-waste.webp", title: "E-Waste", titleSi: "ඉලෙක්ට්‍රොනික කසළ", items: "Old electronics and devices", itemsSi: "පැරණි ඉලෙක්ට්‍රොනික උපකරණ", color: "coral" },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location, setLocation] = useState("");
  const [filters, setFilters] = useState(["Plastic", "Paper"]);
  const [distance, setDistance] = useState("5");
  const [searched, setSearched] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [selectedPoint, setSelectedPoint] = useState(1);
  const [language, setLanguage] = useState<"en" | "si">("en");
  const isSi = language === "si";
  const t = (english: string, sinhala: string) => isSi ? sinhala : english;

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
      inputSchema: { type: "object", properties: { location: { type: "string" }, categories: { type: "array", items: { type: "string", enum: ["Plastic", "Paper", "Glass", "Metal", "E-Waste"] } } }, required: ["location", "categories"], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input: unknown) {
        const value = input as { location?: string; categories?: string[] };
        if (!value.location?.trim() || !Array.isArray(value.categories)) throw new Error("Enter a location and category list.");
        setLocation(value.location);
        setFilters(value.categories);
        setSearched(true);
        document.querySelector("#collection-points")?.scrollIntoView({ behavior: "smooth" });
        return { name: "Sample Green Point", sample: true, distance: "2.4 km", open: true, accepts: value.categories };
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
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocation(t("My current area", "මගේ වත්මන් ප්‍රදේශය"));
        setLocationStatus("ready");
        setSearched(true);
      },
      () => setLocationStatus("error"),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  return (
    <main>
      <header className="navbar">
        <a className="logo" href="#home"><span className="logo-mark">↻</span><span><b>EcoLoop</b><small>{t("Smart Waste Management", "බුද්ධිමත් කසළ කළමනාකරණය")}</small></span></a>
        <button className="menu-button" aria-label="Toggle menu" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        <nav className={menuOpen ? "nav-links open" : "nav-links"}>
          <a href="#home">{t("Home", "මුල් පිටුව")}</a><a href="#how">{t("How It Works", "ක්‍රියා කරන ආකාරය")}</a><a href="#categories">{t("Waste Categories", "කසළ වර්ග")}</a><a href="#rewards">{t("Rewards", "ත්‍යාග")}</a><a href="#collection-points">{t("Collection Points", "එකතු කිරීමේ ස්ථාන")}</a><a href="#impact">{t("Impact", "බලපෑම")}</a>
        </nav>
        <button className="language-toggle" onClick={() => setLanguage(isSi ? "en" : "si")} aria-label={t("Switch to Sinhala", "ඉංග්‍රීසි භාෂාවට මාරු වන්න")}><span className={!isSi ? "active" : ""}>EN</span><i></i><span className={isSi ? "active" : ""}>සිං</span></button>
        <div className="nav-actions"><a className="button button-small" href="#collection-points"><span>♻</span> {t("Get Started", "ආරම්භ කරන්න")}</a></div>
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
        <div className="tip-bar"><span>?</span><div><b>{t("Not sure where your waste belongs?", "ඔබේ කසළ අයත් කාණ්ඩය විශ්වාස නැද්ද?")}</b><p>{t("Use our waste guide to find the correct category.", "නිවැරදි කාණ්ඩය සොයාගැනීමට අපගේ කසළ මාර්ගෝපදේශය භාවිතා කරන්න.")}</p></div><button>{t("Find Waste Category", "කසළ කාණ්ඩය සොයන්න")} <span>→</span></button></div>
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

      <section className="map-section" id="collection-points"><div className="section"><div className="map-title"><p className="kicker">{t("COLLECTION POINTS", "එකතු කිරීමේ ස්ථාන")}</p><h2>{t("Find a Collection Point", "ඔබට ආසන්න එකතු කිරීමේ ස්ථානයක්")}{" "}<em>{t("Near You", "සොයාගන්න")}</em></h2><p>{t("Find nearby waste collection points and choose the most convenient place to recycle your waste.", "ආසන්න කසළ එකතු කිරීමේ ස්ථාන සොයා ඔබේ කසළ ප්‍රතිචක්‍රීකරණයට පහසුම ස්ථානය තෝරන්න.")}</p></div>
        <div className="sample-notice"><span>●</span><div><b>{t("Sample Collection Points", "උදාහරණ එකතු කිරීමේ ස්ථාන")}</b><small>{t("Demo locations only — verified point data will be added when the collection network launches.", "මෙය demo ස්ථාන පමණි — ජාලය ආරම්භ වූ පසු තහවුරු කළ ස්ථාන එක් කෙරේ.")}</small></div></div>
        <div className="finder-layout collection-finder"><form className="finder-panel" onSubmit={submitSearch}><h3>🔍 {t("Search your area", "ඔබේ ප්‍රදේශය සොයන්න")}</h3><label><span>{t("LOCATION", "ස්ථානය")}</span><div className="search-input"><i>⌖</i><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("Enter location...", "ස්ථානය ඇතුළත් කරන්න...")} /></div></label><button className="use-location" type="button" onClick={useMyLocation} disabled={locationStatus === "loading"}>📍 {locationStatus === "loading" ? t("Locating...", "ස්ථානය සොයමින්...") : t("Use My Location", "මගේ ස්ථානය භාවිතා කරන්න")}</button>{locationStatus === "error" && <small className="location-error">{t("Location access was unavailable. Search your area instead.", "ස්ථාන ප්‍රවේශය නොලැබුණි. ඔබේ ප්‍රදේශය සොයන්න.")}</small>}
          <fieldset><legend>{t("WASTE TYPE", "කසළ වර්ගය")}</legend>{["Plastic","Paper","Metal","Glass","E-Waste"].map((filter) => <label className="check" key={filter}><input type="checkbox" checked={filters.includes(filter)} onChange={() => toggleFilter(filter)} /><span>{isSi ? ({Plastic:"ප්ලාස්ටික්",Paper:"කඩදාසි",Metal:"ලෝහ",Glass:"වීදුරු","E-Waste":"ඉලෙක්ට්‍රොනික කසළ"} as Record<string,string>)[filter] : filter}</span></label>)}</fieldset>
          <fieldset className="distance-field"><legend>{t("DISTANCE", "දුර")}</legend>{["1","5","10"].map((value) => <label className="check" key={value}><input type="radio" name="distance" value={value} checked={distance === value} onChange={() => setDistance(value)} /><span>{t(`Within ${value} km`, `කි.මී. ${value} ඇතුළත`)}</span></label>)}</fieldset><button className="button search-button" type="submit">{t("Find Nearby", "ආසන්න ස්ථාන සොයන්න")} <span>→</span></button>
          <div className="nearby-heading"><b>📍 {t("Nearby Collection Points", "ආසන්න එකතු කිරීමේ ස්ථාන")}</b><small>{t("Sample result", "උදාහරණ ප්‍රතිඵලය")}</small></div><div className={searched ? "result-card revealed" : "result-card"}><div className="result-head"><span>♻</span><div><b>{t("Sample Green Point", "උදාහරණ Green Point")}</b><small>2.4 km {t("away", "දුරින්")}</small></div><i>{t("OPEN", "විවෘතයි")}</i></div><p>{t("Plastic · Paper · Metal", "ප්ලාස්ටික් · කඩදාසි · ලෝහ")}</p><button type="button" onClick={() => setSelectedPoint(1)}>{t("Show on map", "සිතියමේ පෙන්වන්න")} <span>↗</span></button></div>
          </form><div className="fake-map large-map"><div className="map-road r1"></div><div className="map-road r2"></div><div className="map-road r3"></div><span className="map-label ml1">DEMO ZONE A</span><span className="map-label ml2">DEMO ZONE B</span><span className="map-label ml3">DEMO ZONE C</span>{[1,2,3].map((point) => <button type="button" aria-label={`${t("Sample collection point", "උදාහරණ එකතු කිරීමේ ස්ථානය")} ${point}`} className={`map-pin mp${point} ${selectedPoint === point ? "active" : ""}`} onClick={() => setSelectedPoint(point)} key={point}>♻</button>)}<span className="you-pin">📍<small>{t("You", "ඔබ")}</small></span><div className={`map-popup point-${selectedPoint}`}><div><span>♻</span><small>{t("SAMPLE POINT", "උදාහරණ ස්ථානය")}</small></div><b>{t("Green Collection Point", "Green එකතු කිරීමේ ස්ථානය")}</b><p>{t("Plastic • Paper • Metal", "ප්ලාස්ටික් • කඩදාසි • ලෝහ")}</p><strong>{selectedPoint === 1 ? "1.8" : selectedPoint === 2 ? "3.2" : "4.6"} km {t("away", "දුරින්")}</strong><div><button type="button">{t("View Details", "විස්තර")}</button><button type="button">{t("Get Directions", "මාර්ගය බලන්න")} ↗</button></div></div><div className="map-key"><span><i className="green-dot"></i> {t("Sample point", "උදාහරණ ස්ථානය")}</span><span><i className="dark-dot"></i> {t("You", "ඔබ")}</span></div></div></div>
      </div></section>

      <section className="impact-section" id="impact"><div className="section"><div className="impact-heading"><div><p className="kicker">{t("OUR COLLECTIVE IMPACT", "අපගේ සාමූහික බලපෑම")}</p><h2>{t("Together, We Make", "එක්ව අපි")}{" "}<em>{t("an Impact", "වෙනසක් ඇති කරමු")}</em></h2></div><p>{t("Every recycled item contributes to a cleaner community and a more sustainable Sri Lanka.", "ප්‍රතිචක්‍රීකරණය කරන සෑම ද්‍රව්‍යයක්ම පිරිසිදු ප්‍රජාවකට සහ තිරසර ශ්‍රී ලංකාවකට දායක වේ.")}</p></div>
        <div className="impact-sample-label"><span>●</span><div><b>{t("SAMPLE DATA", "උදාහරණ දත්ත")}</b><small>{t("These figures illustrate the future dashboard and are not live platform statistics.", "මෙම සංඛ්‍යා අනාගත dashboard එක නිරූපණය කරන අතර සජීවී platform දත්ත නොවේ.")}</small></div></div>
        <div className="impact-stat-grid"><article><span>♻️</span><strong>12,500+</strong><p>{t("Items Recycled", "ප්‍රතිචක්‍රීකරණය කළ ද්‍රව්‍ය")}</p></article><article><span>🌱</span><strong>8,400 <small>kg</small></strong><p>{t("Waste Diverted", "වළක්වාගත් කසළ")}</p></article><article><span>👥</span><strong>2,500+</strong><p>{t("Active Users", "ක්‍රියාකාරී පරිශීලකයින්")}</p></article><article><span>📍</span><strong>150+</strong><p>{t("Collection Points", "එකතු කිරීමේ ස්ථාන")}</p></article></div>
        <div className="impact-story"><div className="impact-map-card"><div className="impact-map-copy"><p className="kicker">{t("MADE FOR SRI LANKA", "ශ්‍රී ලංකාව වෙනුවෙන්")}</p><h3>{t("Making Sri Lanka Cleaner, One Collection at a Time.", "එක් වරකට එක් එකතු කිරීමකින් ශ්‍රී ලංකාව පිරිසිදු කරමු.")}</h3><p>{t("Each verified collection can become part of a transparent, islandwide picture of progress.", "තහවුරු කළ සෑම එකතු කිරීමක්ම දිවයින පුරා ප්‍රගතියේ පැහැදිලි දර්ශනයක කොටසක් විය හැක.")}</p><div className="impact-map-legend"><span><i></i>{t("Sample impact indicator", "උදාහරණ බලපෑම් දර්ශකය")}</span><span><i></i>{t("Future verified point", "අනාගත තහවුරු කළ ස්ථානය")}</span></div></div><div className="impact-island"><div className="impact-pulse pulse-one"></div><div className="impact-pulse pulse-two"></div><div className="impact-pulse pulse-three"></div><Image src="/sri-lanka-eco-map.png" alt="Sri Lanka environmental impact illustration" width={1024} height={1536} /></div></div>
          <div className="impact-measurement"><p className="kicker">{t("FUTURE DATA FLOW", "අනාගත දත්ත ප්‍රවාහය")}</p><h3>{t("From Every Pickup to Measurable Progress", "සෑම එකතු කිරීමකින්ම මැනිය හැකි ප්‍රගතියක්")}</h3><div className="impact-flow"><article><span>01</span><div><b>{t("Waste Collected", "කසළ එකතු කළා")}</b><p>{t("Record verified pickup weight and category.", "තහවුරු කළ බර සහ කසළ වර්ගය සටහන් කරන්න.")}</p></div></article><i>↓</i><article><span>02</span><div><b>{t("Waste Recycled", "ප්‍රතිචක්‍රීකරණය කළා")}</b><p>{t("Confirm what reached a recycling partner.", "ප්‍රතිචක්‍රීකරණ හවුල්කරුට ලැබුණු ප්‍රමාණය තහවුරු කරන්න.")}</p></div></article><i>↓</i><article><span>03</span><div><b>{t("Environmental Impact", "පාරිසරික බලපෑම")}</b><p>{t("Show only source-based conversion metrics.", "මූලාශ්‍ර මත පදනම් වූ මිනුම් පමණක් පෙන්වන්න.")}</p></div></article></div><div className="impact-method-note"><span>✓</span><p><b>{t("Built for credible reporting", "විශ්වාසදායක වාර්තාකරණයක් සඳහා")}</b>{t("CO₂ and other environmental estimates will appear only after a documented scientific method is connected.", "CO₂ සහ වෙනත් පාරිසරික ඇස්තමේන්තු පෙන්වන්නේ ලේඛනගත විද්‍යාත්මක ක්‍රමයක් සම්බන්ධ කළ පසුව පමණි.")}</p></div></div></div>
        <div className="impact-closing"><span>↻</span><p>{t("Your small action contributes to a bigger change.", "ඔබේ කුඩා ක්‍රියාව විශාල වෙනසකට දායක වේ.")}</p></div>
      </div></section>

      <section className="lanka-section" id="made-for-sri-lanka"><div className="section"><div className="lanka-heading"><p className="kicker">{t("MADE FOR SRI LANKA", "ශ්‍රී ලංකාව වෙනුවෙන්")}</p><h2>{t("Built for", "නිර්මාණය කළේ")}{" "}<em>{t("Sri Lanka", "ශ්‍රී ලංකාව වෙනුවෙන්")}</em> 🇱🇰</h2><p>{t("A smarter way to manage recyclable waste, designed around Sri Lankan communities.", "ශ්‍රී ලාංකික ප්‍රජාවන් වටා නිර්මාණය කළ, ප්‍රතිචක්‍රීකරණ කසළ කළමනාකරණයට වඩා බුද්ධිමත් ක්‍රමයක්.")}</p></div>
        <div className="local-feature-grid"><article><span>🇱🇰</span><h3>{t("Local Communities", "දේශීය ප්‍රජාවන්")}</h3><p>{t("Connect people with nearby recycling and collection points.", "ජනතාව ආසන්න ප්‍රතිචක්‍රීකරණ සහ එකතු කිරීමේ ස්ථාන සමඟ සම්බන්ධ කරන්න.")}</p></article><article><span>📍</span><h3>{t("Local Collection Network", "දේශීය එකතු කිරීමේ ජාලය")}</h3><p>{t("Discover available collection points based on your location.", "ඔබේ ස්ථානය අනුව ලබාගත හැකි එකතු කිරීමේ ස්ථාන සොයාගන්න.")}</p></article><article><span>🎁</span><h3>{t("Local Rewards", "දේශීය ත්‍යාග")}</h3><p>{t("Earn rewards through responsible recycling.", "වගකීම් සහිත ප්‍රතිචක්‍රීකරණය තුළින් ත්‍යාග උපයන්න.")}</p></article></div>
        <div className="lanka-growth"><div className="lanka-growth-copy"><div className="demo-pill"><span>●</span>{t("SAMPLE EXPANSION AREAS", "උදාහරණ ව්‍යාප්ති ප්‍රදේශ")}</div><p className="kicker">{t("GROWING ACROSS THE ISLAND", "දිවයින පුරා ව්‍යාප්ත වෙමින්")}</p><h3>{t("Growing Across Sri Lanka", "ශ්‍රී ලංකාව පුරා ව්‍යාප්ත වෙමින්")}</h3><p>{t("These cities illustrate a future rollout plan—not currently available collection points.", "මෙම නගර අනාගත ව්‍යාප්ති සැලැස්මක් පෙන්වන අතර දැනට ක්‍රියාත්මක එකතු කිරීමේ ස්ථාන නොවේ.")}</p><div className="sample-city-grid">{["Colombo","Gampaha","Kandy","Galle","Kurunegala","Anuradhapura"].map((city) => <span key={city}>📍 {city}</span>)}</div><div className="local-ready"><span>文</span><div><b>{t("Sinhala + English ready", "සිංහල + English සූදානම්")}</b><small>{t("The interface already supports both languages, with local rules and partners ready to connect later.", "අතුරුමුහුණත දැනටමත් භාෂා දෙකටම සහය දක්වන අතර දේශීය නීති හා හවුල්කරුවන් පසුව සම්බන්ධ කළ හැක.")}</small></div></div></div><div className="lanka-map-visual"><div className="map-orbit orbit-one"></div><div className="map-orbit orbit-two"></div><Image src="/sri-lanka-eco-map.png" alt="Sample EcoLoop expansion areas across Sri Lanka" width={1024} height={1536} priority={false}/><span className="lanka-marker lm-one">●</span><span className="lanka-marker lm-two">●</span><span className="lanka-marker lm-three">●</span><span className="lanka-marker lm-four">●</span><div className="map-demo-tag">{t("Concept visual", "සංකල්ප දර්ශනය")}</div></div></div>
      </div></section>

      <section className="section final-cta"><div><span className="cta-icon">↻</span><h2>{t("Ready to Make Your", "ඔබේ කසළට")}{" "}<em>{t("Waste Count?", "වටිනාකමක් දෙන්න සූදානම්ද?")}</em></h2><p>{t("Start recycling smarter today and become part of a cleaner, more responsible community.", "අදම බුද්ධිමත්ව ප්‍රතිචක්‍රීකරණය ආරම්භ කර පිරිසිදු, වගකිවයුතු ප්‍රජාවක කොටසක් වන්න.")}</p><div><a className="button button-light" href="#collection-points">{t("Get Started", "ආරම්භ කරන්න")} <span>→</span></a><a className="button button-outline-light" href="#collection-points">{t("Explore Collection Points", "එකතු කිරීමේ ස්ථාන බලන්න")}</a></div><small>♻ {t("Sort better. Recycle smarter. Live cleaner.", "හොඳින් වෙන් කරන්න. බුද්ධිමත්ව ප්‍රතිචක්‍රීකරණය කරන්න. පිරිසිදුව ජීවත් වන්න.")}</small></div></section>

      <footer className="footer"><div className="footer-grid"><div className="footer-brand"><a className="logo" href="#home"><span className="logo-mark">↻</span><span><b>EcoLoop</b><small>{t("Smart Waste Management", "බුද්ධිමත් කසළ කළමනාකරණය")}</small></span></a><p>{t("Smart waste management for a cleaner tomorrow.", "පිරිසිදු හෙටක් සඳහා බුද්ධිමත් කසළ කළමනාකරණය.")}</p><div className="socials"><button>f</button><button>◎</button><button>in</button></div></div><div><h4>{t("Platform", "වේදිකාව")}</h4><a href="#home">{t("Home", "මුල් පිටුව")}</a><a href="#how">{t("How It Works", "ක්‍රියා කරන ආකාරය")}</a><a href="#categories">{t("Waste Categories", "කසළ වර්ග")}</a><a href="#rewards">{t("Rewards", "ත්‍යාග")}</a><a href="#collection-points">{t("Collection Points", "එකතු කිරීමේ ස්ථාන")}</a></div><div><h4>{t("Resources", "සම්පත්")}</h4><a href="#categories">{t("Recycling Guide", "ප්‍රතිචක්‍රීකරණ මාර්ගෝපදේශය")}</a><a href="#">{t("FAQ", "නිතර අසන ප්‍රශ්න")}</a><a href="#">{t("Community", "ප්‍රජාව")}</a><a href="#">{t("Help Center", "උපකාර මධ්‍යස්ථානය")}</a></div><div><h4>{t("Company", "සමාගම")}</h4><a href="#">{t("About Us", "අප ගැන")}</a><a href="#">{t("Contact", "සම්බන්ධ වන්න")}</a><a href="#">{t("Privacy Policy", "රහස්‍යතා ප්‍රතිපත්තිය")}</a><a href="#">{t("Terms", "කොන්දේසි")}</a></div><div><h4>{t("Contact", "සම්බන්ධතා")}</h4><span>✉ hello@ecoloop.lk</span><span>⌖ {t("Sri Lanka", "ශ්‍රී ලංකාව")}</span></div></div><div className="footer-bottom"><span>© 2026 EcoLoop. {t("All rights reserved.", "සියලු හිමිකම් ඇවිරිණි.")}</span><span>{t("Built for a cleaner Sri Lanka", "පිරිසිදු ශ්‍රී ලංකාවක් වෙනුවෙන්")} 🇱🇰</span></div></footer>
    </main>
  );
}
