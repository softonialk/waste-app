"use client";

import Link from "next/link";
import { useState } from "react";
import { demoCollections, demoUser } from "../data/platform";

const pointsHistory = [
  { activity: "Plastic Recycling", date: "20 Sep 2026", amount: "+40" },
  { activity: "Reward Redemption", date: "15 Sep 2026", amount: "-500" },
  { activity: "Metal Recycling", date: "11 Sep 2026", amount: "+38" },
];

export default function UserDashboard() {
  const [tab, setTab] = useState("Overview");
  const tabs = ["Overview", "My Collections", "Eco Points", "Recycling History", "Rewards", "Profile"];
  return <main className="portal"><aside className="portal-sidebar"><Link className="portal-logo" href="/">↻ <b>EcoLoop</b></Link><span className="demo-tag">DEMO USER</span><nav>{tabs.map((item) => <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>)}</nav><Link href="/collector">Collector dashboard →</Link><Link href="/">← Back to website</Link></aside><section className="portal-content"><header><div><small>HOUSEHOLD DASHBOARD · SAMPLE DATA</small><h1>{tab}</h1></div><div className="profile-chip"><span>NP</span><div><b>{demoUser.name}</b><small>{demoUser.email}</small></div></div></header>{tab === "Overview" && <><div className="metric-grid"><Metric label="Eco Points" value={demoUser.points.toLocaleString()} icon="🌿"/><Metric label="Waste Recycled" value={`${demoUser.recycledKg} kg`} icon="♻"/><Metric label="Collections Completed" value={String(demoUser.completedCollections)} icon="🚛"/><Metric label="Rewards Redeemed" value={String(demoUser.redeemedRewards)} icon="🎁"/></div><div className="dashboard-grid"><Panel title="Upcoming Collection"><div className="upcoming"><span>28</span><div><b>September 2026 · 9:30 AM</b><p>Plastic pickup · Nugegoda</p><i>Scheduled</i></div></div></Panel><Panel title="Recent Points">{pointsHistory.map((item) => <div className="history-row" key={item.activity}><div><b>{item.activity}</b><small>{item.date}</small></div><strong className={item.amount.startsWith("+") ? "positive" : "negative"}>{item.amount}</strong></div>)}</Panel></div></>}{tab === "My Collections" && <CollectionTable/>}{tab === "Eco Points" && <><div className="metric-grid"><Metric label="Current points" value="1,250" icon="🌿"/><Metric label="Points earned" value="1,750" icon="＋"/><Metric label="Points spent" value="500" icon="−"/></div><Panel title="Points history">{pointsHistory.map((item) => <div className="history-row" key={item.activity}><div><b>{item.activity}</b><small>{item.date}</small></div><strong className={item.amount.startsWith("+") ? "positive" : "negative"}>{item.amount} pts</strong></div>)}</Panel></>}{tab === "Recycling History" && <CollectionTable/>}{tab === "Rewards" && <Panel title="Redemption history"><div className="history-row"><div><b>Home Growing Kit</b><small>15 Sep 2026 · ECO-142905</small></div><strong>-500 pts</strong></div></Panel>}{tab === "Profile" && <Panel title="Profile details"><div className="profile-list"><p><span>Name</span><b>{demoUser.name}</b></p><p><span>Email</span><b>{demoUser.email}</b></p><p><span>Phone</span><b>{demoUser.phone}</b></p><p><span>Address</span><b>{demoUser.address}</b></p><p><span>Preferred language</span><b>{demoUser.language}</b></p></div></Panel>}</section></main>;
}

function Metric({label,value,icon}:{label:string;value:string;icon:string}) { return <article className="metric-card"><span>{icon}</span><small>{label}</small><strong>{value}</strong></article>; }
function Panel({title,children}:{title:string;children:React.ReactNode}) { return <article className="portal-panel"><h2>{title}</h2>{children}</article>; }
function CollectionTable() { return <Panel title="Collections"><div className="responsive-table"><table><thead><tr><th>ID</th><th>Date</th><th>Location</th><th>Waste</th><th>Weight</th><th>Status</th></tr></thead><tbody>{demoCollections.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.date}</td><td>{item.location}</td><td>{item.waste}</td><td>{item.weight}</td><td><span className={`status ${item.status.toLowerCase()}`}>{item.status}</span></td></tr>)}</tbody></table></div></Panel>; }
