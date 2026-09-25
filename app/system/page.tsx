import type { Metadata } from "next";
import SystemApp, { type Role } from "./system-app";

export const metadata: Metadata = { title: "Pickups & Collectors" };

const roles: Role[] = ["household", "collector", "admin"];

// Reading the role on the server keeps the highlighted tab and the shown portal in sync from the first paint.
export default async function SystemPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const role = (await searchParams).role;
  const initialRole = typeof role === "string" && roles.includes(role as Role) ? (role as Role) : "household";
  return <SystemApp initialRole={initialRole} />;
}
