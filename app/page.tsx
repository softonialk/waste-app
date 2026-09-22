"use client";

import { FormEvent, useEffect, useState } from "react";

const wasteTypes = [
  { id: "recyclable", icon: "♻", label: "Recyclables", hint: "Plastic, paper & cans" },
  { id: "organic", icon: "◒", label: "Organic", hint: "Food & garden waste" },
  { id: "mixed", icon: "▧", label: "Mixed waste", hint: "Everyday household waste" },
];

export default function Home() {
  const [service, setService] = useState<"scheduled" | "urgent">("scheduled");
  const [waste, setWaste] = useState("recyclable");
  const [bags, setBags] = useState(2);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    type PickupInput = { service: "scheduled" | "urgent"; waste: string; bags: number };
    type ToolContext = { registerTool: (tool: object, options?: { signal?: AbortSignal }) => void | Promise<void> };
    const context = (document as Document & { modelContext?: ToolContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = context.registerTool({
      name: "create_waste_pickup",
      title: "Book a waste pickup",
      description: "Choose a scheduled or urgent pickup and submit it in the visible Aiwa booking form.",
      inputSchema: {
        type: "object",
        properties: {
          service: { type: "string", enum: ["scheduled", "urgent"] },
          waste: { type: "string", enum: ["recyclable", "organic", "mixed"] },
          bags: { type: "integer", minimum: 1, maximum: 10 },
        },
        required: ["service", "waste", "bags"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const value = input as PickupInput;
        if (!["scheduled", "urgent"].includes(value?.service) || !wasteTypes.some((type) => type.id === value?.waste) || !Number.isInteger(value?.bags) || value.bags < 1 || value.bags > 10) {
          throw new Error("Invalid pickup details.");
        }
        setService(value.service);
        setWaste(value.waste);
        setBags(value.bags);
        setSubmitted(true);
        return { status: "requested", service: value.service, waste: value.waste, bags: value.bags };
      },
    }, { signal: lifecycle.signal });
    void Promise.resolve(register).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  function submitRequest(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Aiwa home"><span className="brand-mark">A</span><span>Aiwa</span></a>
        <nav className="main-nav" aria-label="Main navigation"><a className="active" href="#pickup">Book a pickup</a><a href="#activity">My activity</a><a href="#rewards">Rewards</a></nav>
        <div className="user-actions"><div className="coin-pill"><span>●</span> 1,240 <small>coins</small></div><button className="avatar" aria-label="Open profile">SN</button></div>
      </header>

      <section className="workspace" id="pickup">
        <div className="intro-row">
          <div><p className="eyebrow">GOOD MORNING, SANDUNI</p><h1>Let&apos;s clear the clutter.</h1><p>Book a verified collector now, or add your home to tomorrow&apos;s free route.</p></div>
          <div className="impact-card" aria-label="Environmental impact"><div className="impact-icon">↗</div><div><strong>18.4 kg</strong><span>diverted from landfill</span></div><div className="mini-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
        </div>

        <div className="dashboard-grid">
          <form className="booking-card" onSubmit={submitRequest}>
            <div className="card-heading"><div><span className="step-number">01</span><h2>Choose your pickup</h2></div><span className="live"><i></i> 7 collectors nearby</span></div>
            <div className="service-tabs" role="radiogroup" aria-label="Pickup speed">
              <button type="button" className={service === "scheduled" ? "selected" : ""} onClick={() => setService("scheduled")} aria-pressed={service === "scheduled"}><span className="tab-icon">◷</span><span><strong>Schedule free</strong><small>Tomorrow · 8 AM–12 PM</small></span><b>FREE</b></button>
              <button type="button" className={service === "urgent" ? "selected" : ""} onClick={() => setService("urgent")} aria-pressed={service === "urgent"}><span className="tab-icon">ϟ</span><span><strong>Pickup now</strong><small>A collector in 30–45 min</small></span><b>Rs. 390</b></button>
            </div>
            <div className="section-label"><span className="step-number">02</span><h2>What are we collecting?</h2></div>
            <div className="waste-grid">
              {wasteTypes.map((type) => <button key={type.id} type="button" className={waste === type.id ? "waste-option selected" : "waste-option"} onClick={() => setWaste(type.id)} aria-pressed={waste === type.id}><span>{type.icon}</span><strong>{type.label}</strong><small>{type.hint}</small></button>)}
            </div>
            <div className="booking-details">
              <label><span>Pickup address</span><div className="input-wrap"><i>⌖</i><input aria-label="Pickup address" defaultValue="24, Temple Road, Nugegoda" /></div></label>
              <label><span>Number of bags</span><div className="bag-counter"><button type="button" onClick={() => setBags(Math.max(1, bags - 1))} aria-label="Remove a bag">−</button><strong>{bags}</strong><button type="button" onClick={() => setBags(Math.min(10, bags + 1))} aria-label="Add a bag">+</button></div></label>
            </div>
            {submitted ? <div className="success-message" role="status"><span>✓</span><div><strong>Pickup requested!</strong><small>We&apos;ll notify you when a collector accepts.</small></div><button type="button" onClick={() => setSubmitted(false)}>Done</button></div> : <button className="primary-button" type="submit">{service === "scheduled" ? "Schedule free pickup" : "Find a collector now"}<span>→</span></button>}
            <p className="fine-print">No cash needed. Earn 20 coins when recyclable waste is verified.</p>
          </form>

          <aside className="side-column">
            <div className="map-card"><div className="map-top"><span><i></i> LIVE NEAR YOU</span><button aria-label="Centre map">⌖</button></div><div className="map-canvas" aria-label="Map showing nearby collectors"><div className="road road-one"></div><div className="road road-two"></div><div className="road road-three"></div><span className="place p1">NUGEGODA</span><span className="place p2">PAGODA</span><span className="place p3">MIRIHANA</span><span className="collector c1">♻</span><span className="collector c2">♻</span><span className="collector c3">♻</span><span className="home-pin">⌂</span></div><div className="collector-card"><div className="collector-avatar">RK<span></span></div><div><strong>Ruwan K.</strong><span>★ 4.9 · 312 pickups</span></div><div className="eta"><strong>8 min</strong><span>away</span></div></div></div>
            <div className="route-card"><div className="route-date"><strong>24</strong><span>SEP</span></div><div><span className="overline">YOUR NEXT FREE ROUTE</span><strong>Tomorrow morning</strong><small>3 neighbours have already joined</small></div><div className="neighbour-dots"><i>AM</i><i>RK</i><i>+1</i></div></div>
          </aside>
        </div>
      </section>
      <footer><span>© 2026 Aiwa</span><p>Cleaner streets, one pickup at a time.</p><div><a href="#">Help</a><a href="#">Safety</a><a href="#">සිංහල</a></div></footer>
    </main>
  );
}
