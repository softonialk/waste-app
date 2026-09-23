export const pointsRules = {
  Plastic: 20,
  "Paper & Cardboard": 15,
  Metal: 25,
  Glass: 20,
  "E-Waste": 30,
} as const;

export type RewardCategory = "Shopping" | "Partner Offers" | "Eco Products" | "Community";

export const rewards = [
  { id: "shopping-1000", icon: "🛍️", name: "Eco Shopping Voucher", points: 1000, category: "Shopping" as RewardCategory, description: "Demo voucher for a future local retail partner.", available: true },
  { id: "eco-500", icon: "🌱", name: "Home Growing Kit", points: 500, category: "Eco Products" as RewardCategory, description: "A starter kit for a greener home garden.", available: true },
  { id: "partner-1500", icon: "☕", name: "Partner Café Offer", points: 1500, category: "Partner Offers" as RewardCategory, description: "Sample offer reserved for a future verified partner.", available: true },
  { id: "community-2000", icon: "🌳", name: "Community Green Fund", points: 2000, category: "Community" as RewardCategory, description: "Direct demo points toward a future community project.", available: false },
];

export const demoUser = {
  name: "Nethmi Perera",
  email: "nethmi@example.com",
  phone: "+94 77 000 0000",
  address: "Nugegoda, Sri Lanka",
  language: "English / සිංහල",
  points: 1250,
  recycledKg: 46.5,
  completedCollections: 8,
  redeemedRewards: 2,
};

export const demoCollections = [
  { id: "COL-1048", date: "28 Sep 2026", location: "Nugegoda", waste: "Plastic", weight: "2.0 kg", status: "Scheduled" },
  { id: "COL-1042", date: "20 Sep 2026", location: "Nugegoda", waste: "Paper & Cardboard", weight: "4.0 kg", status: "Completed" },
  { id: "COL-1036", date: "11 Sep 2026", location: "Kotte", waste: "Metal", weight: "1.5 kg", status: "Completed" },
];

export const demoCollectors = [
  { id: "CLR-021", name: "Kasun Silva", organization: "EcoLoop Demo Network", serviceArea: "Colombo District", wasteTypes: ["Plastic", "Paper & Cardboard", "Metal"], verified: true, verificationStatus: "Verified", assigned: 4, completed: 38 },
  { id: "CLR-034", name: "Amali Fernando", organization: "Independent Collector — Demo", serviceArea: "Gampaha District", wasteTypes: ["Glass", "E-Waste"], verified: false, verificationStatus: "Verification Pending", assigned: 2, completed: 12 },
];

export const demoRequests = [
  { id: "REQ-2081", household: "S. Jayasinghe", location: "Nugegoda", date: "28 Sep", time: "9:30 AM", waste: "Plastic", weight: "3–4 kg", status: "Pending" },
  { id: "REQ-2077", household: "M. Perera", location: "Kotte", date: "28 Sep", time: "1:00 PM", waste: "Paper & Cardboard", weight: "5 kg", status: "Assigned" },
  { id: "REQ-2068", household: "R. Fernando", location: "Maharagama", date: "24 Sep", time: "10:00 AM", waste: "Metal", weight: "2 kg", status: "Completed" },
];
