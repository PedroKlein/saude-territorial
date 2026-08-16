/**
 * Prototype landing — links to the two Phase A UI decision prototypes.
 * Not linked from anywhere in the app; kept out of production nav.
 */

import Link from "next/link";

export default function PrototypeIndex() {
  const items = [
    {
      href: "/prototype/enum-fields",
      title: "Enum fields — 3 renders side-by-side",
      body: "Select vs Segmented vs Radio, applied to 2-, 4-, and 7-value enums.",
    },
    {
      href: "/prototype/cross-field-errors",
      title: "Cross-field errors — 3 affordances",
      body: "Under-field / top-of-section banner / inline diff pill, on the "
        + "'próxima consulta > última' rule.",
    },
  ];
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-medium">Prototype gallery</h1>
      <p className="mt-2 text-sm text-neutral-600">
        UI decisions for Phase A (sheet parity). Pick a variant per prototype;
        the app wires the winner and drops the rest.
      </p>
      <ul className="mt-8 space-y-4">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block rounded-lg border border-neutral-200 p-4 transition hover:border-neutral-400"
            >
              <span className="block text-base font-medium">{item.title}</span>
              <span className="mt-1 block text-sm text-neutral-600">
                {item.body}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
