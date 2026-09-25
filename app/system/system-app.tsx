"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { DISTRICTS, MAX_PICKUP_DAYS_AHEAD, REWARDS, WASTE_TYPES, addDays, colomboToday } from "../../lib/constants";
import { LanguageToggle, useLanguage } from "../components/language";
import { sinhalaMessages } from "./messages";

export type Role = "household" | "collector" | "admin";

type Pickup = {
  id: string;
  household_name?: string;
  phone?: string;
  address: string;
  district?: string;
  waste_type: string;
  quantity: string;
  pickup_date: string;
  pickup_time: string;
  notes?: string;
  status: string;
  status_note?: string;
  collector_id?: string | null;
  collector_name?: string | null;
  collector_phone?: string | null;
  recorded_weight?: number | null;
  coins_awarded?: number;
  created_at?: string;
};
type Collector = {
  id: string;
  name: string;
  phone: string;
  service_area: string;
  district?: string;
  organization: string;
  verification_status: string;
  has_access_key?: number;
};
type Redemption = {
  id: string;
  collector_name?: string;
  reward_name: string;
  points: number;
  reference: string;
  status?: string;
  created_at: string;
};
type CollectorState = { profile: Collector; openJobs: Pickup[]; jobs: Pickup[]; redemptions: Redemption[]; earned: number; balance: number };
type AdminState = { requests: Pickup[]; collectors: Collector[]; redemptions: Redemption[]; counts: Record<string, number> };
type Data = {
  adminAuthenticated: boolean;
  adminEnabled: boolean;
  household: { requests: Pickup[] };
  collector: CollectorState | null;
  admin: AdminState | null;
};
type ApiResponse = Data & { error?: string; accessKey?: string; reference?: string };
type Act = (payload: Record<string, unknown>, success: string) => Promise<ApiResponse | null>;
type T = (english: string, sinhala: string) => string;

const emptyData: Data = { adminAuthenticated: false, adminEnabled: true, household: { requests: [] }, collector: null, admin: null };

const statusLabels: Record<string, string> = {
  Pending: "බලාපොරොත්තුවෙන්",
  Scheduled: "පවරා ඇත",
  "Awaiting Confirmation": "තහවුරු කිරීමට ඇත",
  Disputed: "විවාදාත්මක",
  Completed: "සම්පූර්ණයි",
  Cancelled: "අවලංගුයි",
  "Verification Pending": "තහවුරු කිරීමට ඇත",
  Verified: "තහවුරුයි",
  Suspended: "අත්හිටුවා ඇත",
  Requested: "ඉල්ලා ඇත",
  Delivered: "ලබා දුන්නා",
};
const statusClass = (status: string) => status.toLowerCase().replace(/\s+/g, "-");

function validateNameInput(event: FormEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  const value = input.value.trim();
  input.setCustomValidity(
    !value || (/^[\p{L}\p{M}.' -]+$/u.test(value) && /\p{L}/u.test(value)) ? "" : "Use letters, spaces, apostrophes and full stops only.",
  );
}

const formPayload = (form: HTMLFormElement) => Object.fromEntries(new FormData(form));

export default function SystemApp({ initialRole }: { initialRole: Role }) {
  const { t, isSi } = useLanguage();
  const [role, setRole] = useState<Role>(initialRole);
  const [data, setData] = useState<Data>(emptyData);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const translateError = (text: string) => (isSi ? sinhalaMessages[text] ?? text : text);

  useEffect(() => {
    let active = true;
    fetch("/api/system", { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as ApiResponse;
        if (!response.ok) throw new Error(json.error);
        return json;
      })
      .then((json) => {
        if (active) setData(json);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error && e.message ? e.message : "System data is temporarily unavailable.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const act: Act = async (payload, success) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(json.error);
      setData(json);
      setMessage(success);
      return json;
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "The request could not be completed. Please try again.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  function selectRole(next: Role) {
    setRole(next);
    setMessage("");
    setError("");
    window.history.replaceState(null, "", `/system?role=${next}`);
  }

  const roleLabels: Record<Role, string> = {
    household: `🏠 ${t("Household", "නිවස")}`,
    collector: `🚛 ${t("Collector", "එකතු කරන්නා")}`,
    admin: `🛡️ ${t("Admin", "Admin")}`,
  };

  return (
    <main className="system-shell">
      <header className="system-topbar">
        <Link href="/" className="system-logo">
          <span>↻</span>
          <b>EcoLoop</b>
        </Link>
        <div>
          <small>{t("PICKUP SYSTEM", "එකතු කිරීමේ පද්ධතිය")}</small>
          <strong>{t("Smart Waste Collection", "බුද්ධිමත් කසළ එකතු කිරීම")}</strong>
        </div>
        <div className="system-topbar-actions">
          <LanguageToggle />
          <Link href="/">← {t("Home", "මුල් පිටුව")}</Link>
        </div>
      </header>
      <section className="system-hero">
        <div>
          <h1>
            {t("One request. One collector.", "එක් ඉල්ලීමක්. එක් එකතු කරන්නෙක්.")} <em>{t("A cleaner community.", "පිරිසිදු ප්‍රජාවක්.")}</em>
          </h1>
          <p>
            {t(
              "Households request a pickup for free. Verified collectors earn 100 coins once the household confirms the pickup.",
              "නිවාස නොමිලේ එකතු කිරීමක් ඉල්ලයි. නිවස එකතු කිරීම තහවුරු කළ පසු තහවුරු කළ එකතු කරන්නාට coins 100ක් ලැබේ.",
            )}
          </p>
        </div>
        <div className="flow-mini">
          <span>🏠 {t("Request", "ඉල්ලීම")}</span>
          <b>→</b>
          <span>🚛 {t("Collect", "එකතු කිරීම")}</span>
          <b>→</b>
          <span>✅ {t("Confirm", "තහවුරු කිරීම")}</span>
        </div>
      </section>
      <nav className="role-tabs" aria-label={t("Choose a portal", "පිටුවක් තෝරන්න")}>
        {(["household", "collector", "admin"] as Role[]).map((r) => (
          <button key={r} type="button" className={role === r ? "active" : ""} aria-pressed={role === r} onClick={() => selectRole(r)}>
            {roleLabels[r]}
          </button>
        ))}
      </nav>
      {(message || error) && (
        <div className={error ? "system-alert error" : "system-alert"} role={error ? "alert" : "status"}>
          {error ? translateError(error) : message}
        </div>
      )}
      {loading && (
        <div className="system-alert" role="status" aria-live="polite">
          {t("Loading system data...", "දත්ත load වෙමින්...")}
        </div>
      )}
      {!loading && role === "household" && <Household requests={data.household.requests} busy={busy} act={act} t={t} />}
      {!loading &&
        role === "collector" &&
        (data.collector ? <CollectorView state={data.collector} busy={busy} act={act} t={t} /> : <CollectorAccess busy={busy} act={act} t={t} />)}
      {!loading &&
        role === "admin" &&
        (data.admin ? <Admin admin={data.admin} busy={busy} act={act} t={t} /> : <AdminLogin enabled={data.adminEnabled} busy={busy} act={act} t={t} />)}
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { isSi } = useLanguage();
  return <span className={`status ${statusClass(status)}`}>{isSi ? statusLabels[status] ?? status : status}</span>;
}

function WasteLabel({ value }: { value: string }) {
  const { isSi } = useLanguage();
  return <>{isSi ? WASTE_TYPES.find((type) => type.value === value)?.si ?? value : value}</>;
}

function DistrictOptions({ placeholder }: { placeholder: string }) {
  const { isSi } = useLanguage();
  return (
    <>
      <option value="" disabled>
        {placeholder}
      </option>
      {DISTRICTS.map((district) => (
        <option key={district.value} value={district.value}>
          {isSi ? district.si : district.value}
        </option>
      ))}
    </>
  );
}

function WasteOptions() {
  const { isSi } = useLanguage();
  return (
    <>
      {WASTE_TYPES.map((type) => (
        <option key={type.value} value={type.value}>
          {isSi ? type.si : type.value}
        </option>
      ))}
    </>
  );
}

function ConsentField({ t }: { t: T }) {
  return (
    <label className="consent-field">
      <input type="checkbox" name="consent" required />
      <span>
        {t("I agree that EcoLoop may use these details to arrange the pickup, as described in the ", "එකතු කිරීම සංවිධානය කිරීමට EcoLoop මෙම තොරතුරු භාවිත කිරීමට මම එකඟ වෙමි. ")}
        <Link href="/privacy" target="_blank">
          {t("privacy notice", "පෞද්ගලිකත්ව නිවේදනය")}
        </Link>
        .
      </span>
    </label>
  );
}

const phoneInputProps = {
  name: "phone",
  type: "tel",
  inputMode: "tel",
  required: true,
  pattern: "(?:\\+?94|0)[\\s\\-]?7[0-9](?:[\\s\\-]?[0-9]){7}",
  title: "Enter a mobile number, for example 0771234567.",
  autoComplete: "tel",
  placeholder: "0771234567",
} as const;

function Household({ requests, busy, act, t }: { requests: Pickup[]; busy: boolean; act: Act; t: T }) {
  const minDate = colomboToday();
  const maxDate = addDays(minDate, MAX_PICKUP_DAYS_AHEAD);
  const [reference, setReference] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const json = await act({ action: "createRequest", ...formPayload(form) }, t("Pickup request submitted successfully.", "ඉල්ලීම සාර්ථකව යොමු කළා."));
    if (json) {
      form.reset();
      setReference(json.reference ?? "");
    }
  }

  async function claim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (await act({ action: "claimRequest", ...formPayload(form) }, t("Request added to this device.", "ඉල්ලීම මෙම උපාංගයට එක් කළා."))) form.reset();
  }

  return (
    <section className="system-workspace">
      <div className="system-intro">
        <div>
          <small>{t("HOUSEHOLD PORTAL", "නිවාස පිටුව")}</small>
          <h2>{t("Request a waste pickup", "කසළ එකතු කිරීමක් ඉල්ලන්න")}</h2>
          <p>{t("No fee. Schedule your sorted recyclable waste for collection.", "ගාස්තුවක් නැත. වෙන් කළ ප්‍රතිචක්‍රීකරණ කසළ එකතු කිරීමට වේලාවක් දෙන්න.")}</p>
        </div>
        <span>{t("Free request", "නොමිලේ")}</span>
      </div>
      {reference && (
        <div className="system-alert reference-note" role="status">
          {t("Your request reference is", "ඔබේ ඉල්ලීමේ අංකය")} <code>{reference}</code>.{" "}
          {t(
            "Keep it with your phone number to track this request on another device.",
            "වෙනත් උපාංගයකින් මෙම ඉල්ලීම බැලීමට මෙය ඔබේ දුරකථන අංකය සමඟ තබා ගන්න.",
          )}
        </div>
      )}
      <div className="system-columns">
        <form className="system-card system-form" onSubmit={submit}>
          <h3>{t("Pickup details", "එකතු කිරීමේ තොරතුරු")}</h3>
          <input name="website" className="honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <label>
            {t("Full name", "සම්පූර්ණ නම")}
            <input name="householdName" required minLength={2} maxLength={60} onInput={validateNameInput} autoComplete="name" placeholder="e.g. Nimal Perera" />
          </label>
          <div className="form-pair">
            <label>
              {t("Phone", "දුරකථන අංකය")}
              <input {...phoneInputProps} />
            </label>
            <label>
              {t("Waste type", "කසළ වර්ගය")}
              <select name="wasteType" required defaultValue="">
                <option value="" disabled>
                  {t("Select type", "වර්ගය තෝරන්න")}
                </option>
                <WasteOptions />
              </select>
            </label>
          </div>
          <div className="form-pair">
            <label>
              {t("District", "දිස්ත්‍රික්කය")}
              <select name="district" required defaultValue="">
                <DistrictOptions placeholder={t("Select district", "දිස්ත්‍රික්කය තෝරන්න")} />
              </select>
            </label>
            <label>
              {t("Estimated weight (kg)", "ඇස්තමේන්තු බර (kg)")}
              <input name="quantity" type="number" inputMode="decimal" required min="0.1" max="1000" step="0.1" placeholder="e.g. 3.5" />
            </label>
          </div>
          <label>
            {t("Pickup address", "ලිපිනය")}
            <textarea name="address" required minLength={8} maxLength={250} autoComplete="street-address" placeholder={t("House number, road, city", "නිවස අංකය, මාර්ගය, නගරය")} />
          </label>
          <div className="form-pair">
            <label>
              {t("Preferred date", "කැමති දිනය")}
              <input name="pickupDate" type="date" min={minDate} max={maxDate} required />
            </label>
            <label>
              {t("Preferred time", "කැමති වේලාව")}
              <input name="pickupTime" type="time" required />
            </label>
          </div>
          <label>
            {t("Notes (optional)", "සටහන් (අවශ්‍ය නම්)")}
            <input name="notes" maxLength={200} placeholder={t("Gate colour, landmark…", "ගේට්ටුවේ පාට, සලකුණක්…")} />
          </label>
          <ConsentField t={t} />
          <button className="system-primary" disabled={busy}>
            ♻ {t("Submit pickup request", "ඉල්ලීම යොමු කරන්න")}
          </button>
        </form>
        <div className="system-stack">
          <div className="system-card">
            <h3>{t("My requests", "මගේ ඉල්ලීම්")}</h3>
            {requests.length === 0 ? (
              <Empty text={t("No pickup requests on this device yet.", "මෙම උපාංගයේ තවම ඉල්ලීම් නැත.")} />
            ) : (
              <div className="request-list">
                {requests.map((r) => (
                  <HouseholdRequest key={r.id} request={r} busy={busy} act={act} t={t} />
                ))}
              </div>
            )}
          </div>
          <form className="system-card system-form compact" onSubmit={claim}>
            <h3>{t("Track a request from another device", "වෙනත් උපාංගයකින් දැමූ ඉල්ලීමක් බලන්න")}</h3>
            <div className="form-pair">
              <label>
                {t("Reference", "ඉල්ලීමේ අංකය")}
                <input name="requestId" required pattern="[Rr][Ee][Qq]-[0-9A-Fa-f]{8}" placeholder="REQ-1A2B3C4D" />
              </label>
              <label>
                {t("Phone", "දුරකථන අංකය")}
                <input {...phoneInputProps} />
              </label>
            </div>
            <button className="system-secondary" disabled={busy}>
              {t("Find my request", "ඉල්ලීම සොයන්න")}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function HouseholdRequest({ request: r, busy, act, t }: { request: Pickup; busy: boolean; act: Act; t: T }) {
  return (
    <article>
      <div>
        <b>
          <WasteLabel value={r.waste_type} />
        </b>
        <StatusBadge status={r.status} />
      </div>
      <p>{r.address}</p>
      <small>
        {r.id} · {r.pickup_date} · {r.pickup_time} · {r.quantity}
      </small>
      {r.collector_name && r.status !== "Cancelled" && (
        <small>
          🚛 {r.collector_name}
          {r.collector_phone && r.status === "Scheduled" && (
            <>
              {" "}
              · <a href={`tel:${r.collector_phone}`}>{r.collector_phone}</a>
            </>
          )}
        </small>
      )}
      {r.status === "Awaiting Confirmation" && (
        <div className="confirm-box">
          <p>
            {t("The collector recorded", "එකතු කරන්නා සටහන් කළේ")} <b>{r.recorded_weight} kg</b>.{" "}
            {t("Did this pickup happen?", "මෙම එකතු කිරීම සිදු වුණාද?")}
          </p>
          <div className="button-row">
            <button disabled={busy} onClick={() => void act({ action: "confirmCompletion", requestId: r.id }, t("Thank you! Pickup confirmed.", "ස්තුතියි! එකතු කිරීම තහවුරු කළා."))}>
              ✓ {t("Yes, confirm", "ඔව්, තහවුරු කරන්න")}
            </button>
            <button
              className="danger"
              disabled={busy}
              onClick={() => void act({ action: "disputeCompletion", requestId: r.id }, t("Reported to the EcoLoop team.", "EcoLoop කණ්ඩායමට දැනුම් දුන්නා."))}
            >
              {t("No, report a problem", "නැහැ, ගැටලුවක් දන්වන්න")}
            </button>
          </div>
        </div>
      )}
      {(r.status === "Pending" || r.status === "Scheduled") && (
        <button
          className="text-danger"
          disabled={busy}
          onClick={() => {
            if (window.confirm(t("Cancel this pickup request?", "මෙම ඉල්ලීම අවලංගු කරන්නද?")))
              void act({ action: "cancelRequest", requestId: r.id }, t("Pickup request cancelled.", "ඉල්ලීම අවලංගු කළා."));
          }}
        >
          {t("Cancel request", "ඉල්ලීම අවලංගු කරන්න")}
        </button>
      )}
    </article>
  );
}

function AccessKeyNotice({ accessKey, t }: { accessKey: string; t: T }) {
  return accessKey ? (
    <div className="system-alert" role="status">
      {t("Collector access key:", "Access key එක:")} <code>{accessKey}</code> —{" "}
      {t(
        "save it now. It is needed with the phone number to sign in on another device and will not be shown again.",
        "දැන්ම සුරකින්න. වෙනත් උපාංගයකින් පිවිසීමට දුරකථන අංකය සමඟ මෙය අවශ්‍යයි, නැවත පෙන්වන්නේ නැත.",
      )}
    </div>
  ) : null;
}

function CollectorAccess({ busy, act, t }: { busy: boolean; act: Act; t: T }) {
  const [accessKey, setAccessKey] = useState("");
  async function register(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const json = await act({ action: "registerCollector", ...formPayload(form) }, t("Registration sent for admin verification.", "ලියාපදිංචිය admin තහවුරු කිරීමට යොමු කළා."));
    if (json) {
      form.reset();
      setAccessKey(json.accessKey || "");
    }
  }
  function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void act({ action: "collectorLogin", ...formPayload(e.currentTarget) }, t("Signed in as collector.", "එකතු කරන්නා ලෙස පිවිසුණා."));
  }
  return (
    <section className="system-workspace">
      <AccessKeyNotice accessKey={accessKey} t={t} />
      <div className="collector-head">
        <div>
          <small>{t("COLLECTOR PORTAL", "එකතු කරන්නාගේ පිටුව")}</small>
          <h2>{t("Collection jobs & rewards", "එකතු කිරීම් සහ ත්‍යාග")}</h2>
          <p>{t("Register once, then sign in with your phone number and access key.", "එක් වරක් ලියාපදිංචි වී, දුරකථන අංකය සහ access key එකෙන් පිවිසෙන්න.")}</p>
        </div>
      </div>
      <div className="system-columns">
        <form className="system-card system-form compact" onSubmit={register}>
          <h3>{t("Register as a collector", "එකතු කරන්නෙකු ලෙස ලියාපදිංචි වන්න")}</h3>
          <input name="website" className="honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <label>
            {t("Name", "නම")}
            <input name="name" required minLength={2} maxLength={60} onInput={validateNameInput} autoComplete="name" />
          </label>
          <label>
            {t("Phone", "දුරකථන අංකය")}
            <input {...phoneInputProps} />
          </label>
          <div className="form-pair">
            <label>
              {t("District", "දිස්ත්‍රික්කය")}
              <select name="district" required defaultValue="">
                <DistrictOptions placeholder={t("Select district", "දිස්ත්‍රික්කය තෝරන්න")} />
              </select>
            </label>
            <label>
              {t("Service area", "සේවා ප්‍රදේශය")}
              <input name="serviceArea" required minLength={2} maxLength={80} placeholder="e.g. Chilaw" />
            </label>
          </div>
          <label>
            {t("Organization (optional)", "ආයතනය (අවශ්‍ය නම්)")}
            <input name="organization" maxLength={100} placeholder="Independent Collector" />
          </label>
          <ConsentField t={t} />
          <button className="system-primary" disabled={busy}>
            {t("Send for verification", "තහවුරු කිරීමට යොමු කරන්න")}
          </button>
        </form>
        <form className="system-card system-form compact" onSubmit={login}>
          <h3>{t("Collector sign in", "එකතු කරන්නා පිවිසුම")}</h3>
          <label>
            {t("Phone", "දුරකථන අංකය")}
            <input {...phoneInputProps} />
          </label>
          <label>
            Access key
            <input name="accessKey" type="password" required minLength={32} maxLength={40} autoComplete="current-password" />
          </label>
          <small className="form-help">{t("Lost your key? Ask an EcoLoop admin to issue a new one.", "Key එක නැති වුණාද? අලුත් එකක් ලබා ගැනීමට admin අමතන්න.")}</small>
          <button className="system-primary" disabled={busy}>
            {t("Sign in", "පිවිසෙන්න")}
          </button>
        </form>
      </div>
    </section>
  );
}

function CollectorView({ state, busy, act, t }: { state: CollectorState; busy: boolean; act: Act; t: T }) {
  const { isSi } = useLanguage();
  const { profile, openJobs, jobs, redemptions, earned, balance } = state;
  const verified = profile.verification_status === "Verified";
  const suspended = profile.verification_status === "Suspended";
  const [district, setDistrict] = useState(profile.district || "all");
  const visibleJobs = district === "all" ? openJobs : openJobs.filter((job) => job.district === district);
  const assigned = jobs.filter((r) => r.status === "Scheduled");
  const waiting = jobs.filter((r) => r.status === "Awaiting Confirmation" || r.status === "Disputed");
  const completed = jobs.filter((r) => r.status === "Completed");

  return (
    <section className="system-workspace">
      <div className="collector-head">
        <div>
          <small>{t("COLLECTOR PORTAL", "එකතු කරන්නාගේ පිටුව")}</small>
          <h2>{t("Collection jobs & rewards", "එකතු කිරීම් සහ ත්‍යාග")}</h2>
          <p>{t("100 coins are credited when the household confirms a completed pickup.", "නිවස එකතු කිරීම තහවුරු කළ විට coins 100ක් ලැබේ.")}</p>
        </div>
        <div className="coin-card">
          <small>{t("AVAILABLE BALANCE", "ඇති ශේෂය")}</small>
          <strong>🪙 {balance}</strong>
          <span>{t("Collector coins", "Collector coins")}</span>
        </div>
      </div>
      <div className="collector-select">
        <div>
          <b>{profile.name}</b> · {profile.service_area}
          {profile.district ? `, ${profile.district}` : ""} · {profile.phone}
        </div>
        <StatusBadge status={profile.verification_status} />
        <button type="button" className="admin-logout" disabled={busy} onClick={() => void act({ action: "collectorLogout" }, t("Signed out.", "පිටව ගියා."))}>
          {t("Log out", "පිටවන්න")}
        </button>
      </div>
      {suspended && (
        <div className="system-alert error" role="alert">
          {t("Your collector account is suspended. Contact an EcoLoop admin.", "ඔබේ ගිණුම අත්හිටුවා ඇත. EcoLoop admin අමතන්න.")}
        </div>
      )}
      <div className="system-card wide">
        <div className="card-head">
          <h3>{t("Available pickup requests", "ලබාගත හැකි ඉල්ලීම්")}</h3>
          {verified && (
            <label className="inline-filter">
              {t("District", "දිස්ත්‍රික්කය")}
              <select value={district} onChange={(e) => setDistrict(e.target.value)}>
                <option value="all">{t("All districts", "සියලු දිස්ත්‍රික්ක")}</option>
                {DISTRICTS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {isSi ? d.si : d.value}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {!verified ? (
          <Empty text={suspended ? t("Suspended accounts cannot take jobs.", "අත්හිටුවූ ගිණුම්වලට ඉල්ලීම් ගත නොහැක.") : t("Open pickups appear once an admin verifies your profile.", "Admin ඔබව තහවුරු කළ පසු ඉල්ලීම් පෙන්වයි.")} />
        ) : visibleJobs.length === 0 ? (
          <Empty text={t("No open pickup requests here right now.", "දැනට මෙහි ඉල්ලීම් නැත.")} />
        ) : (
          <div className="job-list job-grid">
            {visibleJobs.map((r) => (
              <article key={r.id}>
                <div>
                  <b>
                    <WasteLabel value={r.waste_type} />
                  </b>
                  <StatusBadge status={r.status} />
                </div>
                <p>
                  📍 {r.address}
                  {r.district ? `, ${r.district}` : ""}
                </p>
                <small>
                  {r.pickup_date} · {r.pickup_time} · {r.quantity}
                </small>
                <button disabled={busy} onClick={() => void act({ action: "acceptRequest", requestId: r.id }, t("Pickup accepted.", "ඉල්ලීම භාරගත්තා."))}>
                  {t("Accept job", "භාරගන්න")}
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
      <div className="system-card wide">
        <h3>{t("My scheduled collections", "මට පැවරූ එකතු කිරීම්")}</h3>
        {assigned.length === 0 ? (
          <Empty text={t("Accepted jobs will appear here.", "භාරගත් ඉල්ලීම් මෙහි පෙන්වයි.")} />
        ) : (
          <div className="job-list job-grid">
            {assigned.map((r) => (
              <article key={r.id}>
                <div>
                  <b>{r.household_name}</b>
                  <StatusBadge status={r.status} />
                </div>
                <p>
                  {r.address}
                  {r.district ? `, ${r.district}` : ""}
                </p>
                <small>
                  {r.pickup_date} · {r.pickup_time} · 📞 <a href={`tel:${r.phone}`}>{r.phone}</a>
                  {r.notes ? ` · ${r.notes}` : ""}
                </small>
                <CompleteForm request={r} busy={busy} act={act} t={t} />
                <button
                  className="text-danger"
                  disabled={busy}
                  onClick={() => void act({ action: "releaseRequest", requestId: r.id }, t("Job released for other collectors.", "ඉල්ලීම වෙනත් අයට නිදහස් කළා."))}
                >
                  {t("I can't do this job — release it", "මට මෙය කළ නොහැක — නිදහස් කරන්න")}
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
      {waiting.length > 0 && (
        <div className="system-card wide">
          <h3>{t("Waiting for household confirmation", "නිවසේ තහවුරු කිරීම බලාපොරොත්තුවෙන්")}</h3>
          <div className="job-list job-grid">
            {waiting.map((r) => (
              <article key={r.id}>
                <div>
                  <b>{r.household_name}</b>
                  <StatusBadge status={r.status} />
                </div>
                <p>{r.address}</p>
                <small>
                  {r.recorded_weight} kg · <WasteLabel value={r.waste_type} />
                </small>
              </article>
            ))}
          </div>
        </div>
      )}
      <div className="rewards-system">
        <div>
          <p className="kicker">{t("COLLECTOR REWARDS", "එකතු කරන්නන්ගේ ත්‍යාග")}</p>
          <h2>{t("Redeem your coins", "Coins මුදාගන්න")}</h2>
          <p>{t("The EcoLoop team delivers each reward after you redeem it.", "ඔබ මුදාගත් පසු EcoLoop කණ්ඩායම ත්‍යාගය ලබා දෙයි.")}</p>
        </div>
        <div className="system-reward-grid">
          {REWARDS.map((r) => (
            <article key={r.name}>
              <span>{r.icon}</span>
              <h3>{isSi ? r.si : r.name}</h3>
              <strong>{r.points} coins</strong>
              <button
                disabled={busy || !verified || balance < r.points}
                onClick={() => void act({ action: "redeem", rewardName: r.name }, t(`${r.name} redeemed. We will contact you to deliver it.`, `${r.si} මුදාගත්තා. ලබා දීමට අපි ඔබව අමතන්නෙමු.`))}
              >
                {balance >= r.points ? t("Redeem", "මුදාගන්න") : t("More coins needed", "තවත් coins අවශ්‍යයි")}
              </button>
            </article>
          ))}
        </div>
        {completed.length > 0 && (
          <p className="completion-note">
            ✓ {completed.length} {t("confirmed collections", "තහවුරු කළ එකතු කිරීම්")} · {earned} {t("coins earned in total", "coins මුළු ඉපයීම")}
          </p>
        )}
        {redemptions.length > 0 && (
          <div className="redemption-list">
            <h3>{t("My redemptions", "මගේ මුදාගැනීම්")}</h3>
            {redemptions.map((r) => (
              <div key={r.id}>
                <span>
                  {r.reward_name} · <code>{r.reference}</code>
                </span>
                <StatusBadge status={r.status ?? "Requested"} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CompleteForm({ request, busy, act, t }: { request: Pickup; busy: boolean; act: Act; t: T }) {
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void act(
      { action: "completeRequest", requestId: request.id, ...formPayload(e.currentTarget) },
      t("Marked as collected. Coins are added when the household confirms.", "එකතු කළ බව සටහන් කළා. නිවස තහවුරු කළ විට coins එකතු වේ."),
    );
  }
  return (
    <form className="complete-form" onSubmit={submit}>
      <select name="wasteType" defaultValue={request.waste_type} aria-label={t("Waste type", "කසළ වර්ගය")}>
        <WasteOptions />
      </select>
      <input name="weight" type="number" min="0.1" max="1000" step="0.1" required placeholder={t("Weight (kg)", "බර (kg)")} />
      <button disabled={busy}>{t("Mark collected", "එකතු කළා")}</button>
    </form>
  );
}

function AdminLogin({ enabled, busy, act, t }: { enabled: boolean; busy: boolean; act: Act; t: T }) {
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void act({ action: "adminLogin", ...formPayload(e.currentTarget) }, t("Admin login successful.", "Admin ලෙස පිවිසුණා."));
  }
  return (
    <section className="system-workspace admin-login-wrap">
      <form className="system-card system-form admin-login" onSubmit={submit}>
        <span className="admin-lock">🔐</span>
        <small>{t("PROTECTED ADMIN PORTAL", "ආරක්ෂිත ADMIN පිටුව")}</small>
        <h2>{t("Admin login", "Admin පිවිසුම")}</h2>
        {enabled ? (
          <p>{t("Enter the administrator password to manage collectors, pickups and rewards.", "එකතු කරන්නන්, ඉල්ලීම් සහ ත්‍යාග කළමනාකරණයට admin මුරපදය ඇතුළත් කරන්න.")}</p>
        ) : (
          <p className="form-help">
            {t(
              "The admin portal is not set up yet. Add ADMIN_PASSWORD to the server's environment variables and redeploy.",
              "Admin පිටුව තවම සකසා නැත. Server environment variables වලට ADMIN_PASSWORD එකතු කර නැවත deploy කරන්න.",
            )}
          </p>
        )}
        <label>
          {t("Password", "මුරපදය")}
          <input name="password" type="password" required autoComplete="current-password" disabled={!enabled} />
        </label>
        <button className="system-primary" disabled={busy || !enabled}>
          {busy ? t("Signing in…", "පිවිසෙමින්…") : t("Sign in securely", "ආරක්ෂිතව පිවිසෙන්න")}
        </button>
      </form>
    </section>
  );
}

const PAGE_SIZE = 20;

function Admin({ admin, busy, act, t }: { admin: AdminState; busy: boolean; act: Act; t: T }) {
  const { isSi } = useLanguage();
  const [accessKey, setAccessKey] = useState("");
  const [status, setStatus] = useState("open");
  const [district, setDistrict] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pendingCollectors = admin.collectors.filter((c) => c.verification_status === "Verification Pending");
  const openRedemptions = admin.redemptions.filter((r) => r.status !== "Delivered");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return admin.requests.filter((r) => {
      const matchesStatus =
        status === "all" ||
        (status === "open" ? ["Pending", "Scheduled", "Awaiting Confirmation", "Disputed"].includes(r.status) : r.status === status);
      const matchesDistrict = district === "all" || r.district === district;
      const haystack = `${r.id} ${r.household_name} ${r.phone} ${r.address} ${r.collector_name ?? ""}`.toLowerCase();
      return matchesStatus && matchesDistrict && (!query || haystack.includes(query));
    });
  }, [admin.requests, status, district, search]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  async function issueKey(c: Collector) {
    const json = await act({ action: "issueCollectorKey", collectorId: c.id }, t(`New access key issued for ${c.name}. Share it privately.`, `${c.name} සඳහා අලුත් key එකක් නිකුත් කළා. පෞද්ගලිකව ලබා දෙන්න.`));
    if (json) setAccessKey(json.accessKey || "");
  }

  const count = (key: string) => admin.counts[key] ?? 0;

  return (
    <section className="system-workspace">
      <AccessKeyNotice accessKey={accessKey} t={t} />
      <div className="system-intro">
        <div>
          <small>{t("ADMIN PORTAL", "ADMIN පිටුව")}</small>
          <h2>{t("Verify and monitor operations", "තහවුරු කිරීම සහ අධීක්ෂණය")}</h2>
          <p>{t("Approve collectors, resolve disputes and deliver rewards.", "එකතු කරන්නන් අනුමත කරන්න, ගැටලු විසඳන්න, ත්‍යාග ලබා දෙන්න.")}</p>
        </div>
        <div className="admin-tools">
          <div className="admin-metrics">
            <span>
              <b>{count("Pending")}</b> {t("pending", "බලාපොරොත්තුවෙන්")}
            </span>
            <span>
              <b>{count("Scheduled")}</b> {t("scheduled", "පවරා ඇත")}
            </span>
            <span>
              <b>{count("Awaiting Confirmation") + count("Disputed")}</b> {t("to review", "සමාලෝචනයට")}
            </span>
            <span>
              <b>{count("Completed")}</b> {t("completed", "සම්පූර්ණයි")}
            </span>
          </div>
          <button type="button" className="admin-logout" disabled={busy} onClick={() => void act({ action: "adminLogout" }, t("Admin logged out.", "Admin පිටව ගියා."))}>
            {t("Log out", "පිටවන්න")}
          </button>
        </div>
      </div>

      <div className="system-columns">
        <div className="system-card">
          <h3>{t("Collectors waiting for verification", "තහවුරු කිරීමට ඇති එකතු කරන්නන්")}</h3>
          {pendingCollectors.length === 0 ? (
            <Empty text={t("No collectors are waiting for verification.", "තහවුරු කිරීමට කිසිවෙක් නැත.")} />
          ) : (
            <div className="job-list">
              {pendingCollectors.map((c) => (
                <article key={c.id}>
                  <div>
                    <b>{c.name}</b>
                    <StatusBadge status={c.verification_status} />
                  </div>
                  <p>
                    {c.organization} · {c.service_area}
                    {c.district ? `, ${c.district}` : ""}
                  </p>
                  <small>{c.phone}</small>
                  <button disabled={busy} onClick={() => void act({ action: "verifyCollector", collectorId: c.id }, t(`${c.name} is now verified.`, `${c.name} තහවුරු කළා.`))}>
                    {t("Verify collector", "තහවුරු කරන්න")}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
        <div className="system-card">
          <h3>{t("Rewards to deliver", "ලබා දිය යුතු ත්‍යාග")}</h3>
          {openRedemptions.length === 0 ? (
            <Empty text={t("No rewards are waiting to be delivered.", "ලබා දීමට ත්‍යාග නැත.")} />
          ) : (
            <div className="job-list">
              {openRedemptions.map((r) => (
                <article key={r.id}>
                  <div>
                    <b>{r.reward_name}</b>
                    <StatusBadge status={r.status ?? "Requested"} />
                  </div>
                  <p>
                    {r.collector_name} · {r.points} coins
                  </p>
                  <small>
                    <code>{r.reference}</code> · {r.created_at.slice(0, 10)}
                  </small>
                  <button disabled={busy} onClick={() => void act({ action: "markRedemptionDelivered", redemptionId: r.id }, t("Marked as delivered.", "ලබා දුන් බව සටහන් කළා."))}>
                    {t("Mark delivered", "ලබා දුන්නා")}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="system-card wide">
        <div className="card-head">
          <h3>{t("Pickup requests", "එකතු කිරීමේ ඉල්ලීම්")}</h3>
          <div className="admin-filters">
            <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder={t("Search name, phone, reference…", "නම, අංකය, reference…")} aria-label={t("Search requests", "ඉල්ලීම් සොයන්න")} />
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} aria-label={t("Status", "තත්ත්වය")}>
              <option value="open">{t("Open", "විවෘත")}</option>
              <option value="all">{t("All", "සියල්ල")}</option>
              {["Pending", "Scheduled", "Awaiting Confirmation", "Disputed", "Completed", "Cancelled"].map((s) => (
                <option key={s} value={s}>
                  {isSi ? statusLabels[s] : s}
                </option>
              ))}
            </select>
            <select value={district} onChange={(e) => { setDistrict(e.target.value); setPage(0); }} aria-label={t("District", "දිස්ත්‍රික්කය")}>
              <option value="all">{t("All districts", "සියලු දිස්ත්‍රික්ක")}</option>
              {DISTRICTS.map((d) => (
                <option key={d.value} value={d.value}>
                  {isSi ? d.si : d.value}
                </option>
              ))}
            </select>
          </div>
        </div>
        {pageItems.length === 0 ? (
          <Empty text={t("No pickup requests match these filters.", "මෙම පෙරහන්වලට ගැළපෙන ඉල්ලීම් නැත.")} />
        ) : (
          <div className="request-list">
            {pageItems.map((r) => (
              <AdminRequest key={r.id} request={r} busy={busy} act={act} t={t} />
            ))}
          </div>
        )}
        {pageCount > 1 && (
          <div className="pager">
            <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
              ← {t("Previous", "පෙර")}
            </button>
            <span>
              {currentPage + 1} / {pageCount} · {filtered.length} {t("requests", "ඉල්ලීම්")}
            </span>
            <button type="button" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>
              {t("Next", "ඊළඟ")} →
            </button>
          </div>
        )}
        {admin.requests.length >= 500 && <small className="form-help">{t("Showing the latest 500 requests.", "නවතම ඉල්ලීම් 500 පෙන්වයි.")}</small>}
      </div>

      <div className="system-card wide">
        <h3>{t("All collectors", "සියලු එකතු කරන්නන්")}</h3>
        {admin.collectors.length === 0 ? (
          <Empty text={t("No collectors registered yet.", "තවම එකතු කරන්නන් ලියාපදිංචි වී නැත.")} />
        ) : (
          <div className="job-list job-grid">
            {admin.collectors.map((c) => (
              <article key={c.id}>
                <div>
                  <b>{c.name}</b>
                  <StatusBadge status={c.verification_status} />
                </div>
                <p>
                  {c.phone} · {c.service_area}
                  {c.district ? `, ${c.district}` : ""}
                </p>
                <small>{c.has_access_key ? t("Access key set", "Access key ඇත") : t("No access key — issue one so they can sign in", "Access key නැත — පිවිසීමට එකක් නිකුත් කරන්න")}</small>
                <div className="button-row">
                  <button disabled={busy} onClick={() => void issueKey(c)}>
                    {c.has_access_key ? t("Reset key", "Key එක යළි සකසන්න") : t("Issue key", "Key නිකුත් කරන්න")}
                  </button>
                  {c.verification_status === "Verified" ? (
                    <button
                      className="danger"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(t(`Suspend ${c.name}? Their scheduled pickups return to the open list.`, `${c.name} අත්හිටුවන්නද? ඔවුන්ට පැවරූ ඉල්ලීම් නැවත විවෘත වේ.`)))
                          void act({ action: "suspendCollector", collectorId: c.id }, t(`${c.name} suspended.`, `${c.name} අත්හිටුවා ඇත.`));
                      }}
                    >
                      {t("Suspend", "අත්හිටුවන්න")}
                    </button>
                  ) : c.verification_status === "Suspended" ? (
                    <button disabled={busy} onClick={() => void act({ action: "verifyCollector", collectorId: c.id }, t(`${c.name} reinstated.`, `${c.name} නැවත සක්‍රිය කළා.`))}>
                      {t("Reinstate", "නැවත සක්‍රිය කරන්න")}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AdminRequest({ request: r, busy, act, t }: { request: Pickup; busy: boolean; act: Act; t: T }) {
  const run = (action: string, success: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    void act({ action, requestId: r.id }, success);
  };
  const review = r.status === "Awaiting Confirmation" || r.status === "Disputed";
  return (
    <article>
      <div>
        <b>
          <WasteLabel value={r.waste_type} /> · {r.quantity}
        </b>
        <StatusBadge status={r.status} />
      </div>
      <p>
        {r.household_name} · <a href={`tel:${r.phone}`}>{r.phone}</a> · {r.address}
        {r.district ? `, ${r.district}` : ""}
      </p>
      <small>
        {r.id} · {r.pickup_date} {r.pickup_time}
        {r.collector_name ? ` · 🚛 ${r.collector_name}` : ""}
        {r.recorded_weight ? ` · ${r.recorded_weight} kg ${t("recorded", "සටහන් කළා")}` : ""}
        {r.status_note ? ` · ${r.status_note}` : ""}
      </small>
      <div className="button-row">
        {review && (
          <>
            <button disabled={busy} onClick={() => run("adminApproveCompletion", t("Pickup approved — coins credited.", "අනුමත කළා — coins එකතු විය."))}>
              ✓ {t("Approve", "අනුමත කරන්න")}
            </button>
            <button disabled={busy} onClick={() => run("adminRejectCompletion", t("Completion rejected; back to scheduled.", "ප්‍රතික්ෂේප කළා; නැවත පවරා ඇත."))}>
              {t("Reject completion", "ප්‍රතික්ෂේප කරන්න")}
            </button>
          </>
        )}
        {(r.status === "Scheduled" || review) && (
          <button disabled={busy} onClick={() => run("adminReopenRequest", t("Request reopened for other collectors.", "ඉල්ලීම නැවත විවෘත කළා."))}>
            {t("Reopen", "නැවත විවෘත කරන්න")}
          </button>
        )}
        {r.status !== "Completed" && r.status !== "Cancelled" && (
          <button className="danger" disabled={busy} onClick={() => run("adminCancelRequest", t("Pickup request cancelled.", "ඉල්ලීම අවලංගු කළා."), t("Cancel this pickup request?", "මෙම ඉල්ලීම අවලංගු කරන්නද?"))}>
            {t("Cancel", "අවලංගු කරන්න")}
          </button>
        )}
      </div>
    </article>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="system-empty">
      <span>♻</span>
      <p>{text}</p>
    </div>
  );
}
