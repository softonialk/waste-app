import type { ElementType, ReactNode } from "react";

// Every piece of text on the site is shown in Sinhala and English together.
// `stack` puts English on its own smaller line (headings, paragraphs);
// the default keeps both on one line separated by a dot (buttons, labels, badges).
type BiProps = {
  si: ReactNode;
  en: ReactNode;
  as?: ElementType;
  stack?: boolean;
  className?: string;
  id?: string;
};

export function Bi({ si, en, as: Tag = "span", stack = false, className, id }: BiProps) {
  const classes = ["bi", stack ? "bi--stack" : "bi--inline", className].filter(Boolean).join(" ");
  return (
    <Tag className={classes} id={id}>
      <span className="bi__si" lang="si">
        {si}
      </span>
      <span className="bi__en" lang="en">
        {en}
      </span>
    </Tag>
  );
}

// For places that only accept plain text: placeholders, aria labels, alt text, <option>, confirm dialogs.
export const bi = (si: string, en: string) => `${si} / ${en}`;

export type Message = { si: string; en: string };
