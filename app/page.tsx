"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";

const steps = [
  { n: "01", icon: "⌘", title: "Sort", text: "Separate recyclable waste according to its category." },
  { n: "02", icon: "◷", title: "Schedule", text: "Choose a convenient collection date and location." },
  { n: "03", icon: "▣", title: "Collect", text: "Hand it to a verified collector or collection point." },
  { n: "04", icon: "✦", title: "Earn", text: "Receive Eco Points and unlock useful rewards." },
];

const categories = [
  { icon: "♻", title: "Plastic", items: "Bottles · Containers · Packaging", color: "mint" },
  { icon: "▦", title: "Paper & Cardboard", items: "Newspapers · Boxes · Office paper", color: "sand" },
  { icon: "◉", title: "Metal", items: "Cans · Aluminium · Metal containers", color: "blue" },
  { icon: "◇", title: "Glass", items: "Glass bottles · Jars · Containers", color: "aqua" },
  { icon: "❧", title: "Organic", items: "Food · Garden · Biodegradable waste", color: "lime" },
  { icon: "⚡", title: "E-Waste", items: "Batteries · Phones · Small electronics", color: "coral" },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location, setLocation] = useState("");
  const [filters, setFilters] = useState(["Plastic", "Paper"]);
  const [searched, setSearched] = useState(false);

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
        <a className="logo" href="#home"><span className="logo-mark">↻</span><span><b>EcoLoop</b><small>Smart Waste Management</small></span></a>
        <button className="menu-button" aria-label="Toggle menu" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        <nav className={menuOpen ? "nav-links open" : "nav-links"}>
          <a href="#home">Home</a><a href="#how">How It Works</a><a href="#categories">Waste Categories</a><a href="#rewards">Rewards</a><a href="#impact">Impact</a>
        </nav>
        <div className="nav-actions"><button className="text-button">Log in</button><a className="button button-small" href="#collection-points">Get Started <span>↗</span></a></div>
      </header>

      <section className="hero section" id="home">
        <div className="hero-copy">
          <p className="badge"><span>♻</span> Smart Waste Management for a Cleaner Sri Lanka</p>
          <h1>Turn Your Waste Into a <em>Better Tomorrow.</em></h1>
          <p className="hero-text">Sort your waste, schedule collections, earn rewards, and help build cleaner communities — all from one simple platform.</p>
          <div className="hero-actions"><a className="button" href="#collection-points">Start Recycling <span>→</span></a><a className="button button-ghost" href="#how">Explore How It Works</a></div>
          <div className="hero-stats"><div><strong>10K+</strong><span>Households</span></div><div><strong>25K+</strong><span>Items Recycled</span></div><div><strong>50+</strong><span>Collection Points</span></div></div>
        </div>
        <div className="hero-visual hero-map-visual" aria-label="EcoLoop collection network across Sri Lanka">
          <div className="hero-map-glow"></div>
          <Image className="hero-map-image" src="/sri-lanka-eco-map.png" alt="Green three-dimensional map of Sri Lanka with EcoLoop collection points" width={1024} height={1536} priority />
          <div className="hero-map-chip chip-network"><span>●</span><div><b>50+ active points</b><small>Islandwide network</small></div></div>
          <div className="hero-map-chip chip-impact"><span>♻</span><div><b>12,540 kg</b><small>Waste recycled</small></div></div>
        </div>
      </section>

      <section className="trust-strip"><span>BUILT FOR CLEANER COMMUNITIES ACROSS SRI LANKA</span><div><b>⌂</b> Households</div><div><b>♻</b> Collectors</div><div><b>◎</b> Recycling Centers</div><div><b>◉</b> Local Communities</div></section>

      <section className="section centered" id="how">
        <p className="kicker">HOW IT WORKS</p><h2>Waste Management <em>Made Simple.</em></h2><p className="section-intro">From sorting your waste to earning rewards, everything happens in a few simple steps.</p>
        <div className="steps-grid">{steps.map((step, index) => <article className="step-card" key={step.title}><span className="step-number">{step.n}</span><div className="step-icon">{step.icon}</div><h3>{step.title}</h3><p>{step.text}</p>{index < steps.length - 1 && <span className="step-arrow">→</span>}</article>)}</div>
      </section>

      <section className="category-section" id="categories"><div className="section">
        <div className="section-heading-row"><div><p className="kicker">WASTE CATEGORIES</p><h2>Know Your <em>Waste.</em></h2></div><p>Not all waste belongs in the same bin. Learn how to identify and separate recyclable materials correctly.</p></div>
        <div className="category-grid">{categories.map((category) => <article className={`category-card ${category.color}`} key={category.title}><span className="category-icon">{category.icon}</span><div><h3>{category.title}</h3><p>{category.items}</p></div><button aria-label={`Learn about ${category.title}`}>↗</button></article>)}</div>
        <div className="tip-bar"><span>◎</span><div><b>Not sure where it belongs?</b><p>Our smart waste guide can help you identify the right category.</p></div><button>Try Waste Guide <span>→</span></button></div>
      </div></section>

      <section className="section rewards" id="rewards">
        <div className="rewards-copy"><p className="kicker">ECO REWARDS</p><h2>Your Waste Has <em>Value.</em></h2><p>Recycle more, earn Eco Points, and turn responsible waste management into meaningful rewards.</p><div className="point-rules"><div><span>♻</span><p>Recycle plastic</p><b>+20</b></div><div><span>▦</span><p>Recycle cardboard</p><b>+15</b></div><div><span>◉</span><p>Recycle metal</p><b>+25</b></div><div><span>◇</span><p>Recycle glass</p><b>+20</b></div></div></div>
        <div className="rewards-visual"><div className="eco-card"><span className="eco-leaf">❧</span><small>ECO POINTS</small><strong>2,480</strong><p>↗ +120 this week</p><button>View rewards <span>→</span></button><i className="ring-one"></i><i className="ring-two"></i></div><div className="reward-chips"><span>🎟️ Vouchers</span><span>🛍️ Partner offers</span><span>🌱 Eco products</span><span>🎁 Community rewards</span></div></div>
      </section>

      <section className="map-section" id="collection-points"><div className="section"><div className="map-title"><p className="kicker">COLLECTION NETWORK</p><h2>Find Your Nearest <em>Collection Point.</em></h2><p>Discover nearby recycling centers and drop-off points around your community.</p></div>
        <div className="finder-layout"><div className="fake-map"><div className="map-road r1"></div><div className="map-road r2"></div><div className="map-road r3"></div><span className="map-label ml1">NUGEGODA</span><span className="map-label ml2">KOTTE</span><span className="map-label ml3">MAHARAGAMA</span><span className="map-pin mp1">♻</span><span className="map-pin mp2">♻</span><span className="map-pin mp3">♻</span><span className="you-pin">⌂</span><div className="map-key"><span><i className="green-dot"></i> Collection point</span><span><i className="dark-dot"></i> You are here</span></div></div>
          <form className="finder-panel" onSubmit={submitSearch}><h3>Find a collection point</h3><label><span>YOUR LOCATION</span><div className="search-input"><i>⌖</i><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Search suburb or city..." /></div></label><fieldset><legend>ACCEPTED WASTE</legend>{["Plastic","Paper","Glass","Metal"].map((filter) => <label className="check" key={filter}><input type="checkbox" checked={filters.includes(filter)} onChange={() => toggleFilter(filter)} /><span>{filter}</span></label>)}</fieldset><button className="button search-button" type="submit">Find Nearby <span>→</span></button>
            <div className={searched ? "result-card revealed" : "result-card"}><div className="result-head"><span>♻</span><div><b>Eco Collection Point</b><small>2.4 km away</small></div><i>OPEN TODAY</i></div><p>Accepts: {filters.length ? filters.join(" · ") : "General recyclables"}</p><button type="button">View Details <span>↗</span></button></div>
          </form></div>
      </div></section>

      <section className="section impact" id="impact"><div className="impact-copy"><p className="kicker">OUR COLLECTIVE IMPACT</p><h2>Every Small Action Creates an <em>Impact.</em></h2><p>When households, collectors and communities work together, everyday habits become measurable progress.</p><div className="impact-stats"><div><strong>12,540 <small>kg</small></strong><span>Waste recycled</span></div><div><strong>8,230</strong><span>Households participating</span></div><div><strong>4,850 <small>kg</small></strong><span>Plastic diverted</span></div><div><strong>1,240</strong><span>Collections completed</span></div></div></div><div className="impact-circle"><div className="outer-ring"><div><span>♻</span><strong>12,540</strong><small>KG RECYCLED<br/>THIS MONTH</small></div></div><span className="ring-note one">72% monthly goal</span><span className="ring-note two">↗ 18% vs last month</span></div></section>

      <section className="community"><div className="section community-grid"><div><p className="kicker">MADE FOR SRI LANKA</p><h2>Cleaner Communities <em>Start With Us.</em> 🇱🇰</h2><p>Connect households, collectors, recycling centers and local communities through one smarter waste-management platform.</p><div className="province-list"><span><i></i>Western Province</span><span><i></i>Central Province</span><span><i></i>Southern Province</span><span><i></i>North Western Province</span></div><a className="button button-light" href="#collection-points">Join Your Community <span>→</span></a></div><div className="island-visual"><Image src="/sri-lanka-eco-map.png" alt="EcoLoop collection network across Sri Lanka" width={1024} height={1536} priority={false}/></div></div></section>

      <section className="section final-cta"><div><span className="cta-icon">↻</span><h2>Ready to Make Your <em>Waste Count?</em></h2><p>Start recycling smarter today and become part of a cleaner, more responsible community.</p><div><a className="button button-light" href="#collection-points">Get Started <span>→</span></a><a className="button button-outline-light" href="#collection-points">Explore Collection Points</a></div><small>♻ Sort better. Recycle smarter. Live cleaner.</small></div></section>

      <footer className="footer"><div className="footer-grid"><div className="footer-brand"><a className="logo" href="#home"><span className="logo-mark">↻</span><span><b>EcoLoop</b><small>Smart Waste Management</small></span></a><p>Smart waste management for a cleaner tomorrow.</p><div className="socials"><button>f</button><button>◎</button><button>in</button></div></div><div><h4>Platform</h4><a href="#home">Home</a><a href="#how">How It Works</a><a href="#categories">Waste Categories</a><a href="#rewards">Rewards</a><a href="#collection-points">Collection Points</a></div><div><h4>Resources</h4><a href="#categories">Recycling Guide</a><a href="#">FAQ</a><a href="#">Community</a><a href="#">Help Center</a></div><div><h4>Company</h4><a href="#">About Us</a><a href="#">Contact</a><a href="#">Privacy Policy</a><a href="#">Terms</a></div><div><h4>Contact</h4><span>✉ hello@ecoloop.lk</span><span>⌖ Sri Lanka</span></div></div><div className="footer-bottom"><span>© 2026 EcoLoop. All rights reserved.</span><span>Built for a cleaner Sri Lanka 🇱🇰</span></div></footer>
    </main>
  );
}
