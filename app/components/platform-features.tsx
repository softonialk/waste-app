"use client";

import { useMemo, useState } from "react";
import { demoUser, pointsRules, rewards, type RewardCategory } from "../data/platform";

export function EcoPointsCalculator() {
  const [waste, setWaste] = useState<keyof typeof pointsRules>("Plastic");
  const [weight, setWeight] = useState("2");
  const points = Math.max(0, Number(weight) || 0) * pointsRules[waste];
  return <div className="points-calculator"><div><span className="demo-tag">DEMO CALCULATOR</span><h3>Estimate your Eco Points</h3><p>Points are calculated by verified weight after collection.</p></div><label>Waste type<select value={waste} onChange={(event) => setWaste(event.target.value as keyof typeof pointsRules)}>{Object.keys(pointsRules).map((item) => <option key={item}>{item}</option>)}</select></label><label>Weight (kg)<input type="number" min="0" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} /></label><div className="calculator-result"><small>ESTIMATED REWARD</small><strong>{points.toLocaleString()} Eco Points</strong><span>{pointsRules[waste]} points / kg</span></div></div>;
}

export function RewardsMarketplace() {
  const [category, setCategory] = useState<"All" | RewardCategory>("All");
  const [balance, setBalance] = useState(demoUser.points);
  const [selected, setSelected] = useState<(typeof rewards)[number] | null>(null);
  const [redeemed, setRedeemed] = useState<string | null>(null);
  const filtered = useMemo(() => category === "All" ? rewards : rewards.filter((reward) => reward.category === category), [category]);
  function confirm() { if (!selected || balance < selected.points || !selected.available) return; setBalance((value) => value - selected.points); setRedeemed(`ECO-${Date.now().toString().slice(-6)}`); }
  return <div className="rewards-market"><div className="market-head"><div><span className="demo-tag">DEMO REDEMPTION</span><h3>Browse Rewards</h3></div><div className="balance-pill">🌿 {balance.toLocaleString()} points</div></div><div className="reward-tabs" role="tablist">{(["All","Shopping","Partner Offers","Eco Products","Community"] as const).map((item) => <button className={category === item ? "active" : ""} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div><div className="reward-card-grid">{filtered.map((reward) => { const shortfall = Math.max(0, reward.points - balance); return <article key={reward.id}><span className="reward-art">{reward.icon}</span><small>{reward.category}</small><h4>{reward.name}</h4><p>{reward.description}</p><div><b>{reward.points.toLocaleString()} pts</b><span className={reward.available ? "available" : "unavailable"}>{reward.available ? "Available" : "Coming soon"}</span></div><button disabled={!reward.available} onClick={() => { setSelected(reward); setRedeemed(null); }}>{shortfall ? `Need ${shortfall} more points` : "Redeem"}</button></article>})}</div>{selected && <div className="reward-modal-backdrop" role="presentation"><div className="reward-modal" role="dialog" aria-modal="true" aria-labelledby="reward-dialog-title"><button className="modal-close" onClick={() => setSelected(null)} aria-label="Close">×</button>{redeemed ? <><span className="success-mark">✓</span><h3 id="reward-dialog-title">Reward Redeemed Successfully</h3><p>Your demo redemption reference is:</p><strong className="reference-code">{redeemed}</strong><button onClick={() => setSelected(null)}>Done</button></> : <><span className="reward-art">{selected.icon}</span><h3 id="reward-dialog-title">Redeem {selected.name}?</h3>{balance >= selected.points ? <><p>{selected.points.toLocaleString()} Eco Points will be deducted from your demo account.</p><div className="modal-actions"><button onClick={() => setSelected(null)}>Cancel</button><button onClick={confirm}>Confirm Redemption</button></div></> : <><p>You need {selected.points - balance} more Eco Points to redeem this reward.</p><button onClick={() => setSelected(null)}>Continue recycling</button></>}</>}</div></div>}</div>;
}
