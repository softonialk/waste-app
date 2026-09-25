// Shared by the browser and the API so both sides agree on the same values.

export const WASTE_TYPES = [
  { value: "Plastic", si: "ප්ලාස්ටික්" },
  { value: "Paper & Cardboard", si: "කඩදාසි සහ කාඩ්බෝඩ්" },
  { value: "Metal", si: "ලෝහ" },
  { value: "Glass", si: "වීදුරු" },
  { value: "E-Waste", si: "ඉලෙක්ට්‍රොනික කසළ" },
  { value: "Organic", si: "කාබනික කසළ" },
  { value: "Mixed Recyclables", si: "මිශ්‍ර ප්‍රතිචක්‍රීකරණ" },
] as const;

export type WasteType = (typeof WASTE_TYPES)[number]["value"];
export const WASTE_TYPE_VALUES: readonly string[] = WASTE_TYPES.map((type) => type.value);

// The 25 districts of Sri Lanka with a central coordinate for each district hub.
export const DISTRICTS = [
  { value: "Ampara", si: "අම්පාර", latitude: 7.2912, longitude: 81.6724 },
  { value: "Anuradhapura", si: "අනුරාධපුර", latitude: 8.3114, longitude: 80.4037 },
  { value: "Badulla", si: "බදුල්ල", latitude: 6.9934, longitude: 81.055 },
  { value: "Batticaloa", si: "මඩකලපුව", latitude: 7.717, longitude: 81.7 },
  { value: "Colombo", si: "කොළඹ", latitude: 6.9271, longitude: 79.8612 },
  { value: "Galle", si: "ගාල්ල", latitude: 6.0329, longitude: 80.2168 },
  { value: "Gampaha", si: "ගම්පහ", latitude: 7.0873, longitude: 80.0144 },
  { value: "Hambantota", si: "හම්බන්තොට", latitude: 6.1241, longitude: 81.1185 },
  { value: "Jaffna", si: "යාපනය", latitude: 9.6615, longitude: 80.0255 },
  { value: "Kalutara", si: "කළුතර", latitude: 6.5854, longitude: 79.9607 },
  { value: "Kandy", si: "මහනුවර", latitude: 7.2906, longitude: 80.6337 },
  { value: "Kegalle", si: "කෑගල්ල", latitude: 7.2513, longitude: 80.3464 },
  { value: "Kilinochchi", si: "කිලිනොච්චිය", latitude: 9.3803, longitude: 80.377 },
  { value: "Kurunegala", si: "කුරුණෑගල", latitude: 7.4863, longitude: 80.3623 },
  { value: "Mannar", si: "මන්නාරම", latitude: 8.981, longitude: 79.9044 },
  { value: "Matale", si: "මාතලේ", latitude: 7.4675, longitude: 80.6234 },
  { value: "Matara", si: "මාතර", latitude: 5.9549, longitude: 80.555 },
  { value: "Monaragala", si: "මොණරාගල", latitude: 6.8728, longitude: 81.3507 },
  { value: "Mullaitivu", si: "මුලතිව්", latitude: 9.2671, longitude: 80.8142 },
  { value: "Nuwara Eliya", si: "නුවරඑළිය", latitude: 6.9497, longitude: 80.7891 },
  { value: "Polonnaruwa", si: "පොළොන්නරුව", latitude: 7.9403, longitude: 81.0188 },
  { value: "Puttalam", si: "පුත්තලම", latitude: 8.0408, longitude: 79.8394 },
  { value: "Ratnapura", si: "රත්නපුර", latitude: 6.7056, longitude: 80.3847 },
  { value: "Trincomalee", si: "ත්‍රිකුණාමලය", latitude: 8.5874, longitude: 81.2152 },
  { value: "Vavuniya", si: "වවුනියාව", latitude: 8.7514, longitude: 80.4971 },
] as const;

export const DISTRICT_VALUES: readonly string[] = DISTRICTS.map((district) => district.value);

export const REWARDS = [
  { name: "Eco Gift Pack", si: "Eco ත්‍යාග පැකේජය", points: 500, icon: "🌱" },
  { name: "Shopping Voucher", si: "සාප්පු වවුචරය", points: 1000, icon: "🛍️" },
  { name: "Special Reward", si: "විශේෂ ත්‍යාගය", points: 1500, icon: "🎁" },
] as const;

export const COINS_PER_PICKUP = 100;
export const MAX_PICKUP_DAYS_AHEAD = 30;

export const PICKUP_STATUSES = ["Pending", "Scheduled", "Awaiting Confirmation", "Disputed", "Completed", "Cancelled"] as const;
export type PickupStatus = (typeof PICKUP_STATUSES)[number];

// Accepts 0771234567, 077 123 4567, +94771234567 and 94771234567; always returns 0771234567.
export function normalizePhone(value: unknown) {
  const digits = typeof value === "string" ? value.replace(/[\s-]/g, "") : "";
  if (/^\+947\d{8}$/.test(digits)) return `0${digits.slice(3)}`;
  if (/^947\d{8}$/.test(digits)) return `0${digits.slice(2)}`;
  return digits;
}

export const isValidPhone = (value: unknown) => /^07\d{8}$/.test(normalizePhone(value));

// Dates are always interpreted in Sri Lanka time, whatever time zone the server runs in.
const colomboParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "00";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
};

export const colomboToday = (now = new Date()) => colomboParts(now).date;
export const colomboTimeNow = (now = new Date()) => colomboParts(now).time;

export function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
