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
  const [searched, setSearched] = useState(false);
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
      inputSchema: { type: "object", properties: { location: { type: "string" }, categories: { type: "array", items: { type: "string", enum: ["Plastic", "Paper", "Glass", "Metal"] } } }, required: ["location", "categories"], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input: unknown) {
        const value = input as { location?: string; categories?: string[] };
        if (!value.location?.trim() || !Array.isArray(value.categories)) throw new Error("Enter a location and category list.");
        setLocation(value.location);
        setFilters(value.categories);
        setSearched(true);
        document.querySelector("#collection-points")?.scrollIntoView({ behavior: "smooth" });
        return { name: "Eco Collection Point", distance: "2.4 km", open: true, accepts: value.categories };
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
          <h1>{t("Turn Your Waste Into a ", "ඔබේ කසළ ")}<em>{t("Better Tomorrow.", "හොඳ හෙටක් බවට පත් කරන්න.")}</em></h1>
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
        <p className="kicker">{t("HOW IT WORKS", "ක්‍රියා කරන ආකාරය")}</p><h2>{t("Waste Management ", "කසළ කළමනාකරණය ")}<em>{t("Made Simple.", "සරලව.")}</em></h2><p className="section-intro">{t("From sorting your waste to earning rewards, everything happens in a few simple steps.", "කසළ වෙන් කිරීමේ සිට ත්‍යාග උපයා ගැනීම දක්වා සියල්ල සරල පියවර කිහිපයකින් සිදු වේ.")}</p>
        <div className="steps-grid">{steps.map((step, index) => <article className="step-card" key={step.title}><span className="step-number">{step.n}</span><div className="step-icon">{step.icon}</div><h3>{isSi ? step.titleSi : step.title}</h3><p>{isSi ? step.textSi : step.text}</p>{index < steps.length - 1 && <span className="step-arrow">→</span>}</article>)}</div>
      </section>

      <section className="category-section" id="categories"><div className="section">
        <div className="section-heading-row"><div><p className="kicker">{t("WASTE CATEGORIES", "කසළ වර්ග")}</p><h2>{t("Know Your ", "ඔබේ කසළ ")}<em>{t("Waste.", "හඳුනාගන්න.")}</em></h2></div><p>{t("Quickly identify the right category before you request a pickup. Accepted categories may vary by collector or collection point.", "එකතු කිරීමක් ඉල්ලීමට පෙර නිවැරදි කාණ්ඩය හඳුනාගන්න. පිළිගන්නා කාණ්ඩ එකතු කරන්නා හෝ ස්ථානය අනුව වෙනස් විය හැක.")}</p></div>
        <div className="category-grid">{categories.map((category) => <article className={`category-card ${category.color}`} key={category.title}><div className="category-thumb"><Image src={category.image} alt={`${category.title} recyclable waste`} width={240} height={240} /></div><div><h3>{isSi ? category.titleSi : category.title}</h3><p>{isSi ? category.itemsSi : category.items}</p></div></article>)}</div>
        <div className="tip-bar"><span>?</span><div><b>{t("Not sure where your waste belongs?", "ඔබේ කසළ අයත් කාණ්ඩය විශ්වාස නැද්ද?")}</b><p>{t("Use our waste guide to find the correct category.", "නිවැරදි කාණ්ඩය සොයාගැනීමට අපගේ කසළ මාර්ගෝපදේශය භාවිතා කරන්න.")}</p></div><button>{t("Find Waste Category", "කසළ කාණ්ඩය සොයන්න")} <span>→</span></button></div>
      </div></section>

      <section className="section rewards" id="rewards">
        <div className="rewards-copy"><p className="kicker">{t("ECO REWARDS", "ECO ත්‍යාග")}</p><h2>{t("Your Waste Has ", "ඔබේ කසළට ")}<em>{t("Value.", "වටිනාකමක් ඇත.")}</em></h2><p>{t("Recycle more, earn Eco Points, and turn responsible waste management into meaningful rewards.", "වැඩිපුර ප්‍රතිචක්‍රීකරණය කර Eco Points උපයා ප්‍රයෝජනවත් ත්‍යාග ලබාගන්න.")}</p><div className="point-rules"><div><span>♻</span><p>{t("Recycle plastic", "ප්ලාස්ටික් ප්‍රතිචක්‍රීකරණය")}</p><b>+20</b></div><div><span>▦</span><p>{t("Recycle cardboard", "කාඩ්බෝඩ් ප්‍රතිචක්‍රීකරණය")}</p><b>+15</b></div><div><span>◉</span><p>{t("Recycle metal", "ලෝහ ප්‍රතිචක්‍රීකරණය")}</p><b>+25</b></div><div><span>◇</span><p>{t("Recycle glass", "වීදුරු ප්‍රතිචක්‍රීකරණය")}</p><b>+20</b></div></div></div>
        <div className="rewards-visual"><div className="eco-card"><span className="eco-leaf">❧</span><small>ECO POINTS</small><strong>2,480</strong><p>↗ +120 {t("this week", "මේ සතියේ")}</p><button>{t("View rewards", "ත්‍යාග බලන්න")} <span>→</span></button><i className="ring-one"></i><i className="ring-two"></i></div><div className="reward-chips"><span>🎟️ {t("Vouchers", "වවුචර්")}</span><span>🛍️ {t("Partner offers", "හවුල්කරු දීමනා")}</span><span>🌱 {t("Eco products", "පරිසර හිතකාමී නිෂ්පාදන")}</span><span>🎁 {t("Community rewards", "ප්‍රජා ත්‍යාග")}</span></div></div>
      </section>

      <section className="map-section" id="collection-points"><div className="section"><div className="map-title"><p className="kicker">{t("COLLECTION NETWORK", "එකතු කිරීමේ ජාලය")}</p><h2>{t("Find Your Nearest ", "ඔබට ආසන්න ")}<em>{t("Collection Point.", "එකතු කිරීමේ ස්ථානය සොයන්න.")}</em></h2><p>{t("Discover nearby recycling centers and drop-off points around your community.", "ඔබේ ප්‍රදේශයේ ආසන්න ප්‍රතිචක්‍රීකරණ මධ්‍යස්ථාන සහ භාරදීමේ ස්ථාන සොයාගන්න.")}</p></div>
        <div className="finder-layout"><div className="fake-map"><div className="map-road r1"></div><div className="map-road r2"></div><div className="map-road r3"></div><span className="map-label ml1">NUGEGODA</span><span className="map-label ml2">KOTTE</span><span className="map-label ml3">MAHARAGAMA</span><span className="map-pin mp1">♻</span><span className="map-pin mp2">♻</span><span className="map-pin mp3">♻</span><span className="you-pin">⌂</span><div className="map-key"><span><i className="green-dot"></i> {t("Collection point", "එකතු කිරීමේ ස්ථානය")}</span><span><i className="dark-dot"></i> {t("You are here", "ඔබ මෙහි")}</span></div></div>
          <form className="finder-panel" onSubmit={submitSearch}><h3>{t("Find a collection point", "එකතු කිරීමේ ස්ථානයක් සොයන්න")}</h3><label><span>{t("YOUR LOCATION", "ඔබේ ස්ථානය")}</span><div className="search-input"><i>⌖</i><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("Search suburb or city...", "නගරය හෝ ප්‍රදේශය සොයන්න...")} /></div></label><fieldset><legend>{t("ACCEPTED WASTE", "පිළිගන්නා කසළ")}</legend>{["Plastic","Paper","Glass","Metal"].map((filter) => <label className="check" key={filter}><input type="checkbox" checked={filters.includes(filter)} onChange={() => toggleFilter(filter)} /><span>{isSi ? ({Plastic:"ප්ලාස්ටික්",Paper:"කඩදාසි",Glass:"වීදුරු",Metal:"ලෝහ"} as Record<string,string>)[filter] : filter}</span></label>)}</fieldset><button className="button search-button" type="submit">{t("Find Nearby", "ආසන්න ස්ථාන සොයන්න")} <span>→</span></button>
            <div className={searched ? "result-card revealed" : "result-card"}><div className="result-head"><span>♻</span><div><b>{t("Eco Collection Point", "Eco එකතු කිරීමේ ස්ථානය")}</b><small>2.4 km {t("away", "දුරින්")}</small></div><i>{t("OPEN TODAY", "අද විවෘතයි")}</i></div><p>{t("Accepts", "පිළිගනී")}: {filters.length ? filters.join(" · ") : t("General recyclables", "සාමාන්‍ය ප්‍රතිචක්‍රීකරණ ද්‍රව්‍ය")}</p><button type="button">{t("View Details", "විස්තර බලන්න")} <span>↗</span></button></div>
          </form></div>
      </div></section>

      <section className="section impact" id="impact"><div className="impact-copy"><p className="kicker">{t("OUR COLLECTIVE IMPACT", "අපගේ සාමූහික බලපෑම")}</p><h2>{t("Every Small Action Creates an ", "සෑම කුඩා ක්‍රියාවක්ම ")}<em>{t("Impact.", "බලපෑමක් ඇති කරයි.")}</em></h2><p>{t("When households, collectors and communities work together, everyday habits become measurable progress.", "නිවාස, එකතු කරන්නන් සහ ප්‍රජාවන් එක්ව කටයුතු කළ විට දෛනික පුරුදු මැනිය හැකි ප්‍රගතියක් බවට පත්වේ.")}</p><div className="impact-stats"><div><strong>12,540 <small>kg</small></strong><span>{t("Waste recycled", "ප්‍රතිචක්‍රීකරණය කළ කසළ")}</span></div><div><strong>8,230</strong><span>{t("Households participating", "සහභාගී වන නිවාස")}</span></div><div><strong>4,850 <small>kg</small></strong><span>{t("Plastic diverted", "ඉවත් කළ ප්ලාස්ටික්")}</span></div><div><strong>1,240</strong><span>{t("Collections completed", "සම්පූර්ණ කළ එකතු කිරීම්")}</span></div></div></div><div className="impact-circle"><div className="outer-ring"><div><span>♻</span><strong>12,540</strong><small>{t("KG RECYCLED", "KG ප්‍රතිචක්‍රීකරණය කළා")}<br/>{t("THIS MONTH", "මේ මාසයේ")}</small></div></div><span className="ring-note one">72% {t("monthly goal", "මාසික ඉලක්කය")}</span><span className="ring-note two">↗ 18% {t("vs last month", "පසුගිය මාසයට වඩා")}</span></div></section>

      <section className="community"><div className="section community-grid"><div><p className="kicker">{t("MADE FOR SRI LANKA", "ශ්‍රී ලංකාව වෙනුවෙන්")}</p><h2>{t("Cleaner Communities ", "පිරිසිදු ප්‍රජාවන් ")}<em>{t("Start With Us.", "අපෙන් ආරම්භ වේ.")}</em> 🇱🇰</h2><p>{t("Connect households, collectors, recycling centers and local communities through one smarter waste-management platform.", "නිවාස, එකතු කරන්නන්, ප්‍රතිචක්‍රීකරණ මධ්‍යස්ථාන සහ ප්‍රජාවන් එකම බුද්ධිමත් වේදිකාවකින් සම්බන්ධ කරමු.")}</p><div className="province-list"><span><i></i>{t("Western Province", "බස්නාහිර පළාත")}</span><span><i></i>{t("Central Province", "මධ්‍යම පළාත")}</span><span><i></i>{t("Southern Province", "දකුණු පළාත")}</span><span><i></i>{t("North Western Province", "වයඹ පළාත")}</span></div><a className="button button-light" href="#collection-points">{t("Join Your Community", "ඔබේ ප්‍රජාවට එක්වන්න")} <span>→</span></a></div><div className="island-visual"><Image src="/sri-lanka-eco-map.png" alt="EcoLoop collection network across Sri Lanka" width={1024} height={1536} priority={false}/></div></div></section>

      <section className="section final-cta"><div><span className="cta-icon">↻</span><h2>{t("Ready to Make Your ", "ඔබේ කසළට ")}<em>{t("Waste Count?", "වටිනාකමක් දෙන්න සූදානම්ද?")}</em></h2><p>{t("Start recycling smarter today and become part of a cleaner, more responsible community.", "අදම බුද්ධිමත්ව ප්‍රතිචක්‍රීකරණය ආරම්භ කර පිරිසිදු, වගකිවයුතු ප්‍රජාවක කොටසක් වන්න.")}</p><div><a className="button button-light" href="#collection-points">{t("Get Started", "ආරම්භ කරන්න")} <span>→</span></a><a className="button button-outline-light" href="#collection-points">{t("Explore Collection Points", "එකතු කිරීමේ ස්ථාන බලන්න")}</a></div><small>♻ {t("Sort better. Recycle smarter. Live cleaner.", "හොඳින් වෙන් කරන්න. බුද්ධිමත්ව ප්‍රතිචක්‍රීකරණය කරන්න. පිරිසිදුව ජීවත් වන්න.")}</small></div></section>

      <footer className="footer"><div className="footer-grid"><div className="footer-brand"><a className="logo" href="#home"><span className="logo-mark">↻</span><span><b>EcoLoop</b><small>{t("Smart Waste Management", "බුද්ධිමත් කසළ කළමනාකරණය")}</small></span></a><p>{t("Smart waste management for a cleaner tomorrow.", "පිරිසිදු හෙටක් සඳහා බුද්ධිමත් කසළ කළමනාකරණය.")}</p><div className="socials"><button>f</button><button>◎</button><button>in</button></div></div><div><h4>{t("Platform", "වේදිකාව")}</h4><a href="#home">{t("Home", "මුල් පිටුව")}</a><a href="#how">{t("How It Works", "ක්‍රියා කරන ආකාරය")}</a><a href="#categories">{t("Waste Categories", "කසළ වර්ග")}</a><a href="#rewards">{t("Rewards", "ත්‍යාග")}</a><a href="#collection-points">{t("Collection Points", "එකතු කිරීමේ ස්ථාන")}</a></div><div><h4>{t("Resources", "සම්පත්")}</h4><a href="#categories">{t("Recycling Guide", "ප්‍රතිචක්‍රීකරණ මාර්ගෝපදේශය")}</a><a href="#">{t("FAQ", "නිතර අසන ප්‍රශ්න")}</a><a href="#">{t("Community", "ප්‍රජාව")}</a><a href="#">{t("Help Center", "උපකාර මධ්‍යස්ථානය")}</a></div><div><h4>{t("Company", "සමාගම")}</h4><a href="#">{t("About Us", "අප ගැන")}</a><a href="#">{t("Contact", "සම්බන්ධ වන්න")}</a><a href="#">{t("Privacy Policy", "රහස්‍යතා ප්‍රතිපත්තිය")}</a><a href="#">{t("Terms", "කොන්දේසි")}</a></div><div><h4>{t("Contact", "සම්බන්ධතා")}</h4><span>✉ hello@ecoloop.lk</span><span>⌖ {t("Sri Lanka", "ශ්‍රී ලංකාව")}</span></div></div><div className="footer-bottom"><span>© 2026 EcoLoop. {t("All rights reserved.", "සියලු හිමිකම් ඇවිරිණි.")}</span><span>{t("Built for a cleaner Sri Lanka", "පිරිසිදු ශ්‍රී ලංකාවක් වෙනුවෙන්")} 🇱🇰</span></div></footer>
    </main>
  );
}
