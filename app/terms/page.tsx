import type { Metadata } from "next";
import TermsContent from "./terms-content";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The rules for households and collectors using NextGen.",
};

export default function TermsPage() {
  return <TermsContent />;
}
