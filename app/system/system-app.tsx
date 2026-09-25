"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { DISTRICTS, MAX_PICKUP_DAYS_AHEAD, REWARDS, WASTE_TYPES, addDays, colomboToday } from "../../lib/constants";
import { Bi, bi, type Message } from "../components/bi";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
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
type Act = (payload: Record<string, unknown>, success: Message) => Promise<ApiResponse | null>;

const emptyData: Data = { adminAuthenticated: false, adminEnabled: true, household: { requests: [] }, collector: null, admin: null };

const statusSi: Record<string, string> = {
  Pending: "බලාපොරොත්තුවෙන්",
  Scheduled: "පවරා ඇත",
  "Awaiting Confirmation": "තහවුරු කිරීමට ඇත",
  Disputed: "ගැටලුවක් දන්වා ඇත",
  Completed: "සම්පූර්ණයි",
  Cancelled: "අවලංගුයි",
  "Verification Pending": "තහවුරු කිරීමට ඇත",
  Verified: "තහවුරුයි",
  Suspended: "අත්හිටුවා ඇත",
  Requested: "ඉල්ලා ඇත",
  Delivered: "ලබා දුන්නා",
};
const ADMIN_STATUSES = ["Pending", "Scheduled", "Awaiting Confirmation", "Disputed", "Completed", "Cancelled"];
const wasteSi = (value: string) => WASTE_TYPES.find((type) => type.value === value)?.si ?? value;
const districtSi = (value?: string) => DISTRICTS.find((district) => district.value === value)?.si ?? value ?? "";
const toMessage = (english: string): Message => ({ si: sinhalaMessages[english] ?? "දෝෂයක් සිදු විය.", en: english });
const formPayload = (form: HTMLFormElement) => Object.fromEntries(new FormData(form));

function validateNameInput(event: FormEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  const value = input.value.trim();
  input.setCustomValidity(
    !value || (/^[\p{L}\p{M}.' -]+$/u.test(value) && /\p{L}/u.test(value))
      ? ""
      : bi("අකුරු, හිස්තැන්, ' සහ . පමණක් භාවිත කරන්න", "Use letters, spaces, apostrophes and full stops only"),
  );
}

const phoneInputProps = {
  name: "phone",
  type: "tel",
  inputMode: "tel",
  required: true,
  pattern: "(?:\\+?94|0)[\\s\\-]?7[0-9](?:[\\s\\-]?[0-9]){7}",
  title: bi("ජංගම අංකයක්, උදා: 0771234567", "A mobile number, e.g. 0771234567"),
  autoComplete: "tel",
  placeholder: "0771234567",
  className: "input",
} as const;

export default function SystemApp({ initialRole }: { initialRole: Role }) {
  const [role, setRole] = useState<Role>(initialRole);
  const [data, setData] = useState<Data>(emptyData);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [error, setError] = useState<Message | null>(null);

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
        if (active) setError(toMessage(e instanceof Error && e.message ? e.message : "System data is temporarily unavailable."));
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
    setError(null);
    setMessage(null);
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
      setError(toMessage(e instanceof Error && e.message ? e.message : "The request could not be completed. Please try again."));
      return null;
    } finally {
      setBusy(false);
    }
  };

  function selectRole(next: Role) {
    setRole(next);
    setMessage(null);
    setError(null);
    window.history.replaceState(null, "", `/system?role=${next}`);
  }

  const tabs: { role: Role; icon: string; si: string; en: string }[] = [
    { role: "household", icon: "🏠", si: "නිවස", en: "Household" },
    { role: "collector", icon: "🚛", si: "එකතු කරන්නා", en: "Collector" },
    { role: "admin", icon: "🛡️", si: "පරිපාලක", en: "Admin" },
  ];

  return (
    <>
      <SiteHeader />
      <main id="main" className="portal">
        <section className="portal-hero">
          <div className="container">
            <Bi as="p" className="eyebrow" si="එකතු කිරීමේ පද්ධතිය" en="Pickup system" />
            <h1 className="portal-hero__title">
              <Bi stack si="එක් ඉල්ලීමක්. එක් එකතු කරන්නෙක්." en="One request. One collector." />
            </h1>
            <ol className="flow">
              <li>
                <Bi si="ඉල්ලීම" en="Request" />
              </li>
              <li>
                <Bi si="එකතු කිරීම" en="Collect" />
              </li>
              <li>
                <Bi si="තහවුරු කිරීම" en="Confirm" />
              </li>
              <li>
                <Bi si="Coins 100" en="100 coins" />
              </li>
            </ol>
          </div>
        </section>

        <div className="container portal__body">
          <nav className="role-tabs" aria-label={bi("පිටුවක් තෝරන්න", "Choose a portal")}>
            {tabs.map((tab) => (
              <button key={tab.role} type="button" className="role-tab" aria-pressed={role === tab.role} onClick={() => selectRole(tab.role)}>
                <span aria-hidden="true">{tab.icon}</span>
                <Bi stack si={tab.si} en={tab.en} />
              </button>
            ))}
          </nav>

          <div className="portal__alerts" aria-live="polite">
            {error && (
              <div className="alert alert--error" role="alert">
                <Bi stack si={error.si} en={error.en} />
              </div>
            )}
            {message && (
              <div className="alert alert--success" role="status">
                <Bi stack si={message.si} en={message.en} />
              </div>
            )}
          </div>

          {loading ? (
            <div className="skeleton" role="status">
              <Bi si="දත්ත load වෙමින්..." en="Loading..." />
            </div>
          ) : role === "household" ? (
            <Household requests={data.household.requests} busy={busy} act={act} />
          ) : role === "collector" ? (
            data.collector ? (
              <CollectorView state={data.collector} busy={busy} act={act} />
            ) : (
              <CollectorAccess busy={busy} act={act} />
            )
          ) : data.admin ? (
            <Admin admin={data.admin} busy={busy} act={act} />
          ) : (
            <AdminLogin enabled={data.adminEnabled} busy={busy} act={act} />
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Status({ status }: { status: string }) {
  return (
    <span className={`status status--${status.toLowerCase().replace(/\s+/g, "-")}`}>
      <Bi si={statusSi[status] ?? status} en={status} />
    </span>
  );
}

function Field({ si, en, children, hint }: { si: string; en: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="field">
      <Bi className="field__label" si={si} en={en} />
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

function Panel({ si, en, children, className, actions }: { si: string; en: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`panel ${className ?? ""}`.trim()}>
      <header className="panel__head">
        <h2 className="panel__title">
          <Bi stack si={si} en={en} />
        </h2>
        {actions}
      </header>
      {children}
    </section>
  );
}

function Empty({ si, en }: { si: string; en: string }) {
  return (
    <div className="empty">
      <span aria-hidden="true">♻</span>
      <Bi as="p" stack si={si} en={en} />
    </div>
  );
}

function DistrictOptions() {
  return (
    <>
      <option value="" disabled>
        {bi("තෝරන්න", "Select")}
      </option>
      {DISTRICTS.map((district) => (
        <option key={district.value} value={district.value}>
          {bi(district.si, district.value)}
        </option>
      ))}
    </>
  );
}

function WasteOptions() {
  return (
    <>
      {WASTE_TYPES.map((type) => (
        <option key={type.value} value={type.value}>
          {bi(type.si, type.value)}
        </option>
      ))}
    </>
  );
}

function ConsentField() {
  return (
    <label className="consent">
      <input type="checkbox" name="consent" required />
      <span>
        <Bi
          stack
          si={
            <>
              එකතු කිරීම සංවිධානයට මෙම තොරතුරු භාවිත කිරීමට මම එකඟ වෙමි (<Link href="/privacy" target="_blank">පෞද්ගලිකත්ව නිවේදනය</Link>).
            </>
          }
          en={
            <>
              I agree NextGen may use these details to arrange the pickup (<Link href="/privacy" target="_blank">privacy notice</Link>).
            </>
          }
        />
      </span>
    </label>
  );
}

function Honeypot() {
  return <input name="website" className="honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" />;
}

function PortalIntro({ si, en, textSi, textEn, aside }: { si: string; en: string; textSi: string; textEn: string; aside?: ReactNode }) {
  return (
    <div className="portal-intro">
      <div>
        <h2 className="portal-intro__title">
          <Bi stack si={si} en={en} />
        </h2>
        <Bi as="p" stack className="portal-intro__text" si={textSi} en={textEn} />
      </div>
      {aside}
    </div>
  );
}

function Household({ requests, busy, act }: { requests: Pickup[]; busy: boolean; act: Act }) {
  const minDate = colomboToday();
  const maxDate = addDays(minDate, MAX_PICKUP_DAYS_AHEAD);
  const [reference, setReference] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const json = await act({ action: "createRequest", ...formPayload(form) }, { si: "ඉල්ලීම සාර්ථකව යොමු කළා.", en: "Pickup request submitted." });
    if (json) {
      form.reset();
      setReference(json.reference ?? "");
    }
  }

  async function claim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (await act({ action: "claimRequest", ...formPayload(form) }, { si: "ඉල්ලීම මෙම උපාංගයට එක් කළා.", en: "Request added to this device." })) form.reset();
  }

  return (
    <div className="workspace">
      <PortalIntro
        si="කසළ එකතු කිරීමක් ඉල්ලන්න"
        en="Request a waste pickup"
        textSi="ගාස්තුවක් නැත. වෙන් කළ ප්‍රතිචක්‍රීකරණ කසළ එකතු කිරීමට දිනයක් තෝරන්න."
        textEn="No fee. Choose a day for your sorted recyclable waste to be collected."
        aside={
          <span className="tag">
            <Bi si="නොමිලේ" en="Free" />
          </span>
        }
      />
      {reference && (
        <div className="alert alert--info" role="status">
          <Bi
            stack
            si={
              <>
                ඔබේ ඉල්ලීමේ අංකය <code className="code">{reference}</code>. වෙනත් උපාංගයකින් බැලීමට මෙය දුරකථන අංකය සමඟ තබා ගන්න.
              </>
            }
            en={
              <>
                Your reference is <code className="code">{reference}</code>. Keep it with your phone number to track this request on another device.
              </>
            }
          />
        </div>
      )}
      <div className="grid-2">
        <Panel si="එකතු කිරීමේ තොරතුරු" en="Pickup details">
          <form className="form" onSubmit={submit}>
            <Honeypot />
            <Field si="සම්පූර්ණ නම" en="Full name">
              <input className="input" name="householdName" required minLength={2} maxLength={60} onInput={validateNameInput} autoComplete="name" placeholder="Nimal Perera" />
            </Field>
            <div className="form-row">
              <Field si="දුරකථන අංකය" en="Phone">
                <input {...phoneInputProps} />
              </Field>
              <Field si="දිස්ත්‍රික්කය" en="District">
                <select className="input" name="district" required defaultValue="">
                  <DistrictOptions />
                </select>
              </Field>
            </div>
            <Field si="ලිපිනය" en="Pickup address">
              <textarea className="input" name="address" required minLength={8} maxLength={250} autoComplete="street-address" placeholder={bi("නිවස අංකය, මාර්ගය, නගරය", "House number, road, town")} />
            </Field>
            <div className="form-row">
              <Field si="කසළ වර්ගය" en="Waste type">
                <select className="input" name="wasteType" required defaultValue="">
                  <option value="" disabled>
                    {bi("තෝරන්න", "Select")}
                  </option>
                  <WasteOptions />
                </select>
              </Field>
              <Field si="ඇස්තමේන්තු බර (kg)" en="Estimated weight (kg)">
                <input className="input" name="quantity" type="number" inputMode="decimal" required min="0.1" max="1000" step="0.1" placeholder="3.5" />
              </Field>
            </div>
            <div className="form-row">
              <Field si="කැමති දිනය" en="Preferred date">
                <input className="input" name="pickupDate" type="date" min={minDate} max={maxDate} required />
              </Field>
              <Field si="කැමති වේලාව" en="Preferred time">
                <input className="input" name="pickupTime" type="time" required />
              </Field>
            </div>
            <Field si="සටහන් (අවශ්‍ය නම්)" en="Notes (optional)">
              <input className="input" name="notes" maxLength={200} placeholder={bi("ගේට්ටුවේ පාට, සලකුණක්", "Gate colour, landmark")} />
            </Field>
            <ConsentField />
            <button className="btn btn--primary btn--block btn--lg" disabled={busy}>
              <Bi si="ඉල්ලීම යොමු කරන්න" en="Submit request" />
            </button>
          </form>
        </Panel>

        <div className="stack">
          <Panel si="මගේ ඉල්ලීම්" en="My requests">
            {requests.length === 0 ? (
              <Empty si="මෙම උපාංගයේ තවම ඉල්ලීම් නැත." en="No requests on this device yet." />
            ) : (
              <ul className="list">
                {requests.map((r) => (
                  <HouseholdRequest key={r.id} request={r} busy={busy} act={act} />
                ))}
              </ul>
            )}
          </Panel>
          <Panel si="වෙනත් උපාංගයකින් දැමූ ඉල්ලීමක්" en="Track a request from another device">
            <form className="form" onSubmit={claim}>
              <div className="form-row">
                <Field si="ඉල්ලීමේ අංකය" en="Reference">
                  <input className="input" name="requestId" required pattern="[Rr][Ee][Qq]-[0-9A-Fa-f]{8}" placeholder="REQ-1A2B3C4D" />
                </Field>
                <Field si="දුරකථන අංකය" en="Phone">
                  <input {...phoneInputProps} />
                </Field>
              </div>
              <button className="btn btn--secondary btn--block" disabled={busy}>
                <Bi si="ඉල්ලීම සොයන්න" en="Find my request" />
              </button>
            </form>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function ItemHead({ si, en, status }: { si: string; en: string; status: string }) {
  return (
    <div className="item__head">
      <h3 className="item__title">
        <Bi si={si} en={en} />
      </h3>
      <Status status={status} />
    </div>
  );
}

function HouseholdRequest({ request: r, busy, act }: { request: Pickup; busy: boolean; act: Act }) {
  return (
    <li className="item">
      <ItemHead si={wasteSi(r.waste_type)} en={r.waste_type} status={r.status} />
      <p className="item__text">{r.address}</p>
      <p className="item__meta">
        <code className="code">{r.id}</code> · {r.pickup_date} · {r.pickup_time} · {r.quantity}
      </p>
      {r.collector_name && r.status !== "Cancelled" && (
        <p className="item__meta">
          🚛 {r.collector_name}
          {r.collector_phone && r.status === "Scheduled" && (
            <>
              {" "}
              · <a href={`tel:${r.collector_phone}`}>{r.collector_phone}</a>
            </>
          )}
        </p>
      )}
      {r.status === "Awaiting Confirmation" && (
        <div className="confirm">
          <Bi
            as="p"
            stack
            si={
              <>
                එකතු කරන්නා <b>{r.recorded_weight} kg</b> සටහන් කළා. මෙම එකතු කිරීම සිදු වුණාද?
              </>
            }
            en={
              <>
                The collector recorded <b>{r.recorded_weight} kg</b>. Did this pickup happen?
              </>
            }
          />
          <div className="item__actions">
            <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => void act({ action: "confirmCompletion", requestId: r.id }, { si: "ස්තුතියි. එකතු කිරීම තහවුරු කළා.", en: "Thank you. Pickup confirmed." })}>
              <Bi si="ඔව්, තහවුරුයි" en="Yes, confirm" />
            </button>
            <button className="btn btn--danger btn--sm" disabled={busy} onClick={() => void act({ action: "disputeCompletion", requestId: r.id }, { si: "NextGen කණ්ඩායමට දැනුම් දුන්නා.", en: "Reported to the NextGen team." })}>
              <Bi si="නැහැ, ගැටලුවක්" en="No, report a problem" />
            </button>
          </div>
        </div>
      )}
      {(r.status === "Pending" || r.status === "Scheduled") && (
        <div className="item__actions">
          <button
            className="btn btn--link btn--danger-text"
            disabled={busy}
            onClick={() => {
              if (window.confirm(bi("මෙම ඉල්ලීම අවලංගු කරන්නද?", "Cancel this pickup request?")))
                void act({ action: "cancelRequest", requestId: r.id }, { si: "ඉල්ලීම අවලංගු කළා.", en: "Pickup request cancelled." });
            }}
          >
            <Bi si="ඉල්ලීම අවලංගු කරන්න" en="Cancel request" />
          </button>
        </div>
      )}
    </li>
  );
}

function AccessKeyNotice({ accessKey }: { accessKey: string }) {
  return accessKey ? (
    <div className="alert alert--info" role="status">
      <Bi
        stack
        si={
          <>
            Access key: <code className="code">{accessKey}</code> — දැන්ම සුරකින්න. වෙනත් උපාංගයකින් පිවිසීමට දුරකථන අංකය සමඟ මෙය අවශ්‍යයි; නැවත පෙන්වන්නේ නැත.
          </>
        }
        en="Save it now. You need it with the phone number to sign in on another device, and it will not be shown again."
      />
    </div>
  ) : null;
}

function CollectorAccess({ busy, act }: { busy: boolean; act: Act }) {
  const [accessKey, setAccessKey] = useState("");
  async function register(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const json = await act({ action: "registerCollector", ...formPayload(form) }, { si: "ලියාපදිංචිය තහවුරු කිරීමට යොමු කළා.", en: "Registration sent for verification." });
    if (json) {
      form.reset();
      setAccessKey(json.accessKey || "");
    }
  }
  function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void act({ action: "collectorLogin", ...formPayload(e.currentTarget) }, { si: "එකතු කරන්නා ලෙස පිවිසුණා.", en: "Signed in as collector." });
  }
  return (
    <div className="workspace">
      <AccessKeyNotice accessKey={accessKey} />
      <PortalIntro
        si="එකතු කරන්නන්ගේ පිටුව"
        en="Collector portal"
        textSi="එක් වරක් ලියාපදිංචි වී, පසුව දුරකථන අංකය සහ access key එකෙන් පිවිසෙන්න."
        textEn="Register once, then sign in with your phone number and access key."
      />
      <div className="grid-2">
        <Panel si="අලුතින් ලියාපදිංචි වන්න" en="Register as a collector">
          <form className="form" onSubmit={register}>
            <Honeypot />
            <Field si="නම" en="Name">
              <input className="input" name="name" required minLength={2} maxLength={60} onInput={validateNameInput} autoComplete="name" />
            </Field>
            <Field si="දුරකථන අංකය" en="Phone">
              <input {...phoneInputProps} />
            </Field>
            <div className="form-row">
              <Field si="දිස්ත්‍රික්කය" en="District">
                <select className="input" name="district" required defaultValue="">
                  <DistrictOptions />
                </select>
              </Field>
              <Field si="සේවා ප්‍රදේශය" en="Service area">
                <input className="input" name="serviceArea" required minLength={2} maxLength={80} placeholder={bi("උදා: හලාවත", "e.g. Chilaw")} />
              </Field>
            </div>
            <Field si="ආයතනය (අවශ්‍ය නම්)" en="Organization (optional)">
              <input className="input" name="organization" maxLength={100} placeholder="Independent Collector" />
            </Field>
            <ConsentField />
            <button className="btn btn--primary btn--block btn--lg" disabled={busy}>
              <Bi si="තහවුරු කිරීමට යොමු කරන්න" en="Send for verification" />
            </button>
          </form>
        </Panel>
        <Panel si="පිවිසෙන්න" en="Sign in">
          <form className="form" onSubmit={login}>
            <Field si="දුරකථන අංකය" en="Phone">
              <input {...phoneInputProps} />
            </Field>
            <Field
              si="Access key"
              en="Access key"
              hint={<Bi stack si="Key එක නැති වුණාද? අලුත් එකක් සඳහා පරිපාලක අමතන්න." en="Lost your key? Ask an admin for a new one." />}
            >
              <input className="input" name="accessKey" type="password" required minLength={32} maxLength={40} autoComplete="current-password" />
            </Field>
            <button className="btn btn--secondary btn--block btn--lg" disabled={busy}>
              <Bi si="පිවිසෙන්න" en="Sign in" />
            </button>
          </form>
        </Panel>
      </div>
    </div>
  );
}

function CollectorView({ state, busy, act }: { state: CollectorState; busy: boolean; act: Act }) {
  const { profile, openJobs, jobs, redemptions, earned, balance } = state;
  const verified = profile.verification_status === "Verified";
  const suspended = profile.verification_status === "Suspended";
  const [district, setDistrict] = useState(profile.district || "all");
  const visibleJobs = district === "all" ? openJobs : openJobs.filter((job) => job.district === district);
  const assigned = jobs.filter((r) => r.status === "Scheduled");
  const waiting = jobs.filter((r) => r.status === "Awaiting Confirmation" || r.status === "Disputed");
  const completed = jobs.filter((r) => r.status === "Completed");

  return (
    <div className="workspace">
      <div className="profile-bar">
        <div>
          <p className="profile-bar__name">{profile.name}</p>
          <p className="profile-bar__meta">
            {profile.service_area}
            {profile.district ? `, ${districtSi(profile.district)} · ${profile.district}` : ""} · {profile.phone}
          </p>
        </div>
        <Status status={profile.verification_status} />
        <div className="coin-card">
          <Bi stack className="coin-card__label" si="ඇති ශේෂය" en="Balance" />
          <strong className="coin-card__value">
            {balance.toLocaleString("en-LK")} <small>coins</small>
          </strong>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => void act({ action: "collectorLogout" }, { si: "පිටව ගියා.", en: "Signed out." })}>
          <Bi si="පිටවන්න" en="Log out" />
        </button>
      </div>

      {suspended && (
        <div className="alert alert--error" role="alert">
          <Bi stack si="ඔබේ ගිණුම අත්හිටුවා ඇත. NextGen පරිපාලක අමතන්න." en="Your collector account is suspended. Contact a NextGen admin." />
        </div>
      )}
      {!verified && !suspended && (
        <div className="alert alert--info" role="status">
          <Bi stack si="ඔබේ ලියාපදිංචිය පරිපාලක තහවුරු කරන තුරු ඉල්ලීම් භාරගත නොහැක." en="You can take jobs once an admin verifies your registration." />
        </div>
      )}

      <Panel
        si="ලබාගත හැකි ඉල්ලීම්"
        en="Available pickups"
        actions={
          verified && (
            <label className="inline-field">
              <Bi className="field__label" si="දිස්ත්‍රික්කය" en="District" />
              <select className="input input--sm" value={district} onChange={(e) => setDistrict(e.target.value)}>
                <option value="all">{bi("සියලු දිස්ත්‍රික්ක", "All districts")}</option>
                {DISTRICTS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {bi(d.si, d.value)}
                  </option>
                ))}
              </select>
            </label>
          )
        }
      >
        {!verified ? (
          <Empty si="තහවුරු කළ පසු ඉල්ලීම් මෙහි පෙන්වයි." en="Pickups appear here once you are verified." />
        ) : visibleJobs.length === 0 ? (
          <Empty si="දැනට මෙහි ඉල්ලීම් නැත." en="No open pickups here right now." />
        ) : (
          <ul className="list list--grid">
            {visibleJobs.map((r) => (
              <li className="item" key={r.id}>
                <ItemHead si={wasteSi(r.waste_type)} en={r.waste_type} status={r.status} />
                <p className="item__text">
                  📍 {r.address}
                  {r.district ? ` · ${districtSi(r.district)}` : ""}
                </p>
                <p className="item__meta">
                  {r.pickup_date} · {r.pickup_time} · {r.quantity}
                </p>
                <div className="item__actions">
                  <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => void act({ action: "acceptRequest", requestId: r.id }, { si: "ඉල්ලීම භාරගත්තා.", en: "Pickup accepted." })}>
                    <Bi si="භාරගන්න" en="Accept" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel si="මට පැවරූ එකතු කිරීම්" en="My scheduled pickups">
        {assigned.length === 0 ? (
          <Empty si="භාරගත් ඉල්ලීම් මෙහි පෙන්වයි." en="Accepted jobs appear here." />
        ) : (
          <ul className="list list--grid">
            {assigned.map((r) => (
              <li className="item" key={r.id}>
                <div className="item__head">
                  <h3 className="item__title">{r.household_name}</h3>
                  <Status status={r.status} />
                </div>
                <p className="item__text">
                  {r.address}
                  {r.district ? ` · ${districtSi(r.district)}` : ""}
                </p>
                <p className="item__meta">
                  {r.pickup_date} · {r.pickup_time} · 📞 <a href={`tel:${r.phone}`}>{r.phone}</a>
                  {r.notes ? ` · ${r.notes}` : ""}
                </p>
                <CompleteForm request={r} busy={busy} act={act} />
                <button
                  className="btn btn--link btn--danger-text"
                  disabled={busy}
                  onClick={() => void act({ action: "releaseRequest", requestId: r.id }, { si: "ඉල්ලීම වෙනත් අයට නිදහස් කළා.", en: "Job released to other collectors." })}
                >
                  <Bi si="මට යා නොහැක — නිදහස් කරන්න" en="I can't go — release it" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {waiting.length > 0 && (
        <Panel si="නිවසේ තහවුරු කිරීම බලාපොරොත්තුවෙන්" en="Waiting for household confirmation">
          <ul className="list list--grid">
            {waiting.map((r) => (
              <li className="item" key={r.id}>
                <div className="item__head">
                  <h3 className="item__title">{r.household_name}</h3>
                  <Status status={r.status} />
                </div>
                <p className="item__text">{r.address}</p>
                <p className="item__meta">
                  {r.recorded_weight} kg · {bi(wasteSi(r.waste_type), r.waste_type)}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel si="Coins මුදාගන්න" en="Redeem your coins" className="panel--rewards">
        <Bi as="p" stack className="panel__lead" si="ඔබ මුදාගත් පසු NextGen කණ්ඩායම ත්‍යාගය ලබා දෙයි." en="The NextGen team delivers each reward after you redeem it." />
        <ul className="reward-grid">
          {REWARDS.map((r) => (
            <li className="reward-card" key={r.name}>
              <span className="reward-card__icon" aria-hidden="true">
                {r.icon}
              </span>
              <Bi as="h3" stack className="reward-card__title" si={r.si} en={r.name} />
              <p className="reward-card__points">
                {r.points.toLocaleString("en-LK")} <small>coins</small>
              </p>
              <button
                className="btn btn--primary btn--block btn--sm"
                disabled={busy || !verified || balance < r.points}
                onClick={() => void act({ action: "redeem", rewardName: r.name }, { si: `${r.si} මුදාගත්තා. ලබා දීමට අපි ඔබව අමතමු.`, en: `${r.name} redeemed. We will contact you to deliver it.` })}
              >
                {balance >= r.points ? <Bi si="මුදාගන්න" en="Redeem" /> : <Bi si="තවත් coins අවශ්‍යයි" en="More coins needed" />}
              </button>
            </li>
          ))}
        </ul>
        {completed.length > 0 && (
          <p className="panel__note">
            <Bi si={`තහවුරු කළ එකතු කිරීම් ${completed.length} · මුළු ඉපයීම coins ${earned}`} en={`${completed.length} confirmed pickups · ${earned} coins earned`} />
          </p>
        )}
        {redemptions.length > 0 && (
          <>
            <h3 className="panel__subtitle">
              <Bi si="මගේ මුදාගැනීම්" en="My redemptions" />
            </h3>
            <ul className="rows">
              {redemptions.map((r) => (
                <li key={r.id}>
                  <span>
                    {r.reward_name} · <code className="code">{r.reference}</code>
                  </span>
                  <Status status={r.status ?? "Requested"} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </div>
  );
}

function CompleteForm({ request, busy, act }: { request: Pickup; busy: boolean; act: Act }) {
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void act(
      { action: "completeRequest", requestId: request.id, ...formPayload(e.currentTarget) },
      { si: "එකතු කළ බව සටහන් කළා. නිවස තහවුරු කළ විට coins එකතු වේ.", en: "Marked as collected. Coins are added when the household confirms." },
    );
  }
  return (
    <form className="complete-form" onSubmit={submit}>
      <select className="input input--sm" name="wasteType" defaultValue={request.waste_type} aria-label={bi("කසළ වර්ගය", "Waste type")}>
        <WasteOptions />
      </select>
      <input className="input input--sm" name="weight" type="number" min="0.1" max="1000" step="0.1" required placeholder={bi("බර kg", "Weight kg")} aria-label={bi("බර kg", "Weight kg")} />
      <button className="btn btn--primary btn--sm" disabled={busy}>
        <Bi si="එකතු කළා" en="Collected" />
      </button>
    </form>
  );
}

function AdminLogin({ enabled, busy, act }: { enabled: boolean; busy: boolean; act: Act }) {
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void act({ action: "adminLogin", ...formPayload(e.currentTarget) }, { si: "පරිපාලක ලෙස පිවිසුණා.", en: "Signed in as admin." });
  }
  return (
    <div className="workspace workspace--narrow">
      <Panel si="පරිපාලක පිවිසුම" en="Admin sign in">
        <form className="form" onSubmit={submit}>
          {enabled ? (
            <Bi as="p" stack className="panel__lead" si="එකතු කරන්නන්, ඉල්ලීම් සහ ත්‍යාග කළමනාකරණයට මුරපදය ඇතුළත් කරන්න." en="Enter the password to manage collectors, pickups and rewards." />
          ) : (
            <div className="alert alert--info">
              <Bi stack si="පරිපාලක පිටුව තවම සකසා නැත. Vercel environment variables වලට ADMIN_PASSWORD එකතු කර නැවත deploy කරන්න." en="The admin portal is not set up yet. Add ADMIN_PASSWORD to the Vercel environment variables and redeploy." />
            </div>
          )}
          <Field si="මුරපදය" en="Password">
            <input className="input" name="password" type="password" required autoComplete="current-password" disabled={!enabled} />
          </Field>
          <button className="btn btn--primary btn--block btn--lg" disabled={busy || !enabled}>
            {busy ? <Bi si="පිවිසෙමින්..." en="Signing in..." /> : <Bi si="පිවිසෙන්න" en="Sign in" />}
          </button>
        </form>
      </Panel>
    </div>
  );
}

const PAGE_SIZE = 20;

function Admin({ admin, busy, act }: { admin: AdminState; busy: boolean; act: Act }) {
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
      const matchesStatus = status === "all" || (status === "open" ? ["Pending", "Scheduled", "Awaiting Confirmation", "Disputed"].includes(r.status) : r.status === status);
      const matchesDistrict = district === "all" || r.district === district;
      const haystack = `${r.id} ${r.household_name} ${r.phone} ${r.address} ${r.collector_name ?? ""}`.toLowerCase();
      return matchesStatus && matchesDistrict && (!query || haystack.includes(query));
    });
  }, [admin.requests, status, district, search]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const count = (key: string) => admin.counts[key] ?? 0;
  const resetPage = () => setPage(0);

  async function issueKey(c: Collector) {
    const json = await act({ action: "issueCollectorKey", collectorId: c.id }, { si: `${c.name} සඳහා අලුත් key එකක්. පෞද්ගලිකව ලබා දෙන්න.`, en: `New access key for ${c.name}. Share it privately.` });
    if (json) setAccessKey(json.accessKey || "");
  }

  const metrics = [
    { si: "බලාපොරොත්තුවෙන්", en: "Pending", value: count("Pending") },
    { si: "පවරා ඇත", en: "Scheduled", value: count("Scheduled") },
    { si: "සමාලෝචනයට", en: "To review", value: count("Awaiting Confirmation") + count("Disputed") },
    { si: "සම්පූර්ණයි", en: "Completed", value: count("Completed") },
  ];

  return (
    <div className="workspace">
      <AccessKeyNotice accessKey={accessKey} />
      <div className="portal-intro">
        <div>
          <h2 className="portal-intro__title">
            <Bi stack si="පරිපාලනය" en="Admin" />
          </h2>
          <Bi as="p" stack className="portal-intro__text" si="එකතු කරන්නන් අනුමත කරන්න, ගැටලු විසඳන්න, ත්‍යාග ලබා දෙන්න." en="Approve collectors, resolve disputes and deliver rewards." />
        </div>
        <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => void act({ action: "adminLogout" }, { si: "පිටව ගියා.", en: "Signed out." })}>
          <Bi si="පිටවන්න" en="Log out" />
        </button>
      </div>

      <dl className="metrics">
        {metrics.map((metric) => (
          <div className="metric" key={metric.en}>
            <dt>
              <Bi stack si={metric.si} en={metric.en} />
            </dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid-2">
        <Panel si="තහවුරු කිරීමට ඇති එකතු කරන්නන්" en="Collectors to verify">
          {pendingCollectors.length === 0 ? (
            <Empty si="තහවුරු කිරීමට කිසිවෙක් නැත." en="Nobody is waiting." />
          ) : (
            <ul className="list">
              {pendingCollectors.map((c) => (
                <li className="item" key={c.id}>
                  <div className="item__head">
                    <h3 className="item__title">{c.name}</h3>
                    <Status status={c.verification_status} />
                  </div>
                  <p className="item__text">
                    {c.organization} · {c.service_area}
                    {c.district ? `, ${c.district}` : ""}
                  </p>
                  <p className="item__meta">{c.phone}</p>
                  <div className="item__actions">
                    <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => void act({ action: "verifyCollector", collectorId: c.id }, { si: `${c.name} තහවුරු කළා.`, en: `${c.name} is verified.` })}>
                      <Bi si="තහවුරු කරන්න" en="Verify" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel si="ලබා දිය යුතු ත්‍යාග" en="Rewards to deliver">
          {openRedemptions.length === 0 ? (
            <Empty si="ලබා දීමට ත්‍යාග නැත." en="No rewards waiting." />
          ) : (
            <ul className="list">
              {openRedemptions.map((r) => (
                <li className="item" key={r.id}>
                  <div className="item__head">
                    <h3 className="item__title">{r.reward_name}</h3>
                    <Status status={r.status ?? "Requested"} />
                  </div>
                  <p className="item__text">
                    {r.collector_name} · {r.points} coins
                  </p>
                  <p className="item__meta">
                    <code className="code">{r.reference}</code> · {r.created_at.slice(0, 10)}
                  </p>
                  <div className="item__actions">
                    <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => void act({ action: "markRedemptionDelivered", redemptionId: r.id }, { si: "ලබා දුන් බව සටහන් කළා.", en: "Marked as delivered." })}>
                      <Bi si="ලබා දුන්නා" en="Mark delivered" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel si="එකතු කිරීමේ ඉල්ලීම්" en="Pickup requests">
        <div className="filters">
          <input className="input input--sm" type="search" value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }} placeholder={bi("නම, අංකය, reference", "Name, phone, reference")} aria-label={bi("සොයන්න", "Search")} />
          <select className="input input--sm" value={status} onChange={(e) => { setStatus(e.target.value); resetPage(); }} aria-label={bi("තත්ත්වය", "Status")}>
            <option value="open">{bi("විවෘත", "Open")}</option>
            <option value="all">{bi("සියල්ල", "All")}</option>
            {ADMIN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {bi(statusSi[s], s)}
              </option>
            ))}
          </select>
          <select className="input input--sm" value={district} onChange={(e) => { setDistrict(e.target.value); resetPage(); }} aria-label={bi("දිස්ත්‍රික්කය", "District")}>
            <option value="all">{bi("සියලු දිස්ත්‍රික්ක", "All districts")}</option>
            {DISTRICTS.map((d) => (
              <option key={d.value} value={d.value}>
                {bi(d.si, d.value)}
              </option>
            ))}
          </select>
        </div>
        {pageItems.length === 0 ? (
          <Empty si="ගැළපෙන ඉල්ලීම් නැත." en="No requests match." />
        ) : (
          <ul className="list">
            {pageItems.map((r) => (
              <AdminRequest key={r.id} request={r} busy={busy} act={act} />
            ))}
          </ul>
        )}
        {pageCount > 1 && (
          <div className="pager">
            <button type="button" className="btn btn--ghost btn--sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
              ← <Bi si="පෙර" en="Previous" />
            </button>
            <span>
              {currentPage + 1} / {pageCount} · {filtered.length}
            </span>
            <button type="button" className="btn btn--ghost btn--sm" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>
              <Bi si="ඊළඟ" en="Next" /> →
            </button>
          </div>
        )}
        {admin.requests.length >= 500 && <Bi as="p" className="panel__note" si="නවතම ඉල්ලීම් 500 පෙන්වයි." en="Showing the latest 500 requests." />}
      </Panel>

      <Panel si="සියලු එකතු කරන්නන්" en="All collectors">
        {admin.collectors.length === 0 ? (
          <Empty si="තවම ලියාපදිංචි වී නැත." en="No collectors registered yet." />
        ) : (
          <ul className="list list--grid">
            {admin.collectors.map((c) => (
              <li className="item" key={c.id}>
                <div className="item__head">
                  <h3 className="item__title">{c.name}</h3>
                  <Status status={c.verification_status} />
                </div>
                <p className="item__text">
                  {c.phone} · {c.service_area}
                  {c.district ? `, ${c.district}` : ""}
                </p>
                <p className="item__meta">
                  {c.has_access_key ? <Bi si="Access key ඇත" en="Access key set" /> : <Bi si="Access key නැත" en="No access key" />}
                </p>
                <div className="item__actions">
                  <button className="btn btn--secondary btn--sm" disabled={busy} onClick={() => void issueKey(c)}>
                    {c.has_access_key ? <Bi si="Key යළි සකසන්න" en="Reset key" /> : <Bi si="Key නිකුත් කරන්න" en="Issue key" />}
                  </button>
                  {c.verification_status === "Verified" ? (
                    <button
                      className="btn btn--danger btn--sm"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(bi(`${c.name} අත්හිටුවන්නද?`, `Suspend ${c.name}? Their scheduled pickups return to the open list.`)))
                          void act({ action: "suspendCollector", collectorId: c.id }, { si: `${c.name} අත්හිටුවා ඇත.`, en: `${c.name} suspended.` });
                      }}
                    >
                      <Bi si="අත්හිටුවන්න" en="Suspend" />
                    </button>
                  ) : c.verification_status === "Suspended" ? (
                    <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => void act({ action: "verifyCollector", collectorId: c.id }, { si: `${c.name} නැවත සක්‍රියයි.`, en: `${c.name} reinstated.` })}>
                      <Bi si="නැවත සක්‍රිය කරන්න" en="Reinstate" />
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function AdminRequest({ request: r, busy, act }: { request: Pickup; busy: boolean; act: Act }) {
  const run = (action: string, success: Message, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    void act({ action, requestId: r.id }, success);
  };
  const review = r.status === "Awaiting Confirmation" || r.status === "Disputed";
  return (
    <li className="item">
      <ItemHead si={`${wasteSi(r.waste_type)} · ${r.quantity}`} en={r.waste_type} status={r.status} />
      <p className="item__text">
        {r.household_name} · <a href={`tel:${r.phone}`}>{r.phone}</a> · {r.address}
        {r.district ? `, ${r.district}` : ""}
      </p>
      <p className="item__meta">
        <code className="code">{r.id}</code> · {r.pickup_date} {r.pickup_time}
        {r.collector_name ? ` · 🚛 ${r.collector_name}` : ""}
        {r.recorded_weight ? ` · ${r.recorded_weight} kg` : ""}
        {r.status_note ? ` · ${r.status_note}` : ""}
      </p>
      <div className="item__actions">
        {review && (
          <>
            <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => run("adminApproveCompletion", { si: "අනුමත කළා — coins එකතු විය.", en: "Approved — coins credited." })}>
              <Bi si="අනුමත කරන්න" en="Approve" />
            </button>
            <button className="btn btn--secondary btn--sm" disabled={busy} onClick={() => run("adminRejectCompletion", { si: "ප්‍රතික්ෂේප කළා; නැවත පවරා ඇත.", en: "Rejected; back to scheduled." })}>
              <Bi si="ප්‍රතික්ෂේප කරන්න" en="Reject" />
            </button>
          </>
        )}
        {(r.status === "Scheduled" || review) && (
          <button className="btn btn--secondary btn--sm" disabled={busy} onClick={() => run("adminReopenRequest", { si: "ඉල්ලීම නැවත විවෘත කළා.", en: "Request reopened." })}>
            <Bi si="නැවත විවෘත කරන්න" en="Reopen" />
          </button>
        )}
        {r.status !== "Completed" && r.status !== "Cancelled" && (
          <button className="btn btn--danger btn--sm" disabled={busy} onClick={() => run("adminCancelRequest", { si: "ඉල්ලීම අවලංගු කළා.", en: "Request cancelled." }, bi("මෙම ඉල්ලීම අවලංගු කරන්නද?", "Cancel this pickup request?"))}>
            <Bi si="අවලංගු කරන්න" en="Cancel" />
          </button>
        )}
      </div>
    </li>
  );
}
