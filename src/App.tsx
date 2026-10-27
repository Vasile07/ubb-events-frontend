import { Route, Routes } from "react-router-dom";

const palette = [
  ["Blue 900", "#223A5E", "Text, nav, strong surfaces", "blue-900"],
  ["Blue 800", "#355982", "Primary buttons, headings", "blue-800"],
  ["Blue 700", "#4D79A8", "Accent, focus, icons", "blue-700"],
  ["Blue 600", "#6E9ECC", "Highlights, charts", "blue-600"],
  ["Blue 400", "#9FC0E3", "Strong borders", "blue-400"],
  ["Blue 200", "#D0E1F2", "Borders, soft fills", "blue-200"],
  ["Blue 50", "#F3F8FD", "Page background", "blue-50"],
] as const;
const statuses = [
  ["Success fg", "#2B7A57", "var(--status-success-fg)"],
  ["Success bg", "#E2F3EA", "var(--status-success-bg)"],
  ["Warning fg", "#9A6410", "var(--status-warning-fg)"],
  ["Warning bg", "#FBF0DA", "var(--status-warning-bg)"],
  ["Danger fg", "#B23A48", "var(--status-danger-fg)"],
  ["Danger bg", "#FBE5E8", "var(--status-danger-bg)"],
] as const;
const typeStyles = [
  [
    "Display/Hero",
    "44 / 52 · ExtraBold",
    "text-display-hero",
    "Discover what’s on campus",
  ],
  ["Heading/H1", "32 / 40 · Bold", "text-heading-h1", "Events this month"],
  ["Heading/H2", "24 / 32 · Bold", "text-heading-h2", "Registration list"],
  [
    "Heading/H3",
    "18 / 26 · SemiBold",
    "text-heading-h3",
    "Career Fair: Meet Cluj Tech Companies",
  ],
  [
    "Body/Large",
    "16 / 24 · Regular",
    "text-body-large",
    "Join student organizations and never miss an event.",
  ],
  [
    "Body/Default",
    "14 / 22 · Regular",
    "text-body-default",
    "Registration closes on 12 November at 23:59.",
  ],
  [
    "Body/Strong",
    "14 / 22 · SemiBold",
    "text-body-strong",
    "Societatea Hermes",
  ],
  [
    "Caption/Default",
    "12 / 16 · Medium",
    "text-caption-default",
    "42 of 60 spots taken",
  ],
  ["Caption/Strong", "12 / 16 · SemiBold", "text-caption-strong", "PUBLISHED"],
  [
    "Label/Button",
    "14 / 20 · SemiBold",
    "text-label-button",
    "Register for event",
  ],
] as const;

function Foundations() {
  return (
    <main className="foundations-page">
      <header className="foundations-header">
        <h1 className="text-heading-h1">Foundations</h1>
        <p className="text-body-large text-secondary">
          Palette-driven tokens, bound to Figma variables. Primitives → Semantic
          aliases.
        </p>
      </header>
      <section className="section" aria-labelledby="brand-palette">
        <h2 id="brand-palette" className="text-heading-h2">
          Brand palette
        </h2>
        <div className="palette-row">
          {palette.map(([name, hex, description, token]) => (
            <div className="swatch" key={name}>
              <div
                className="swatch-color"
                data-token={token}
                style={{ backgroundColor: `var(--color-${token})` }}
                aria-label={`${name} ${hex}`}
              />
              <p className="text-body-strong">{name}</p>
              <p className="text-caption-default text-muted">{hex}</p>
              <p className="text-caption-default text-secondary">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="section" aria-labelledby="status-colors">
        <h2 id="status-colors" className="text-heading-h2">
          Status colors
        </h2>
        <p className="text-body-default text-secondary">
          Muted, palette-harmonised tones used only for feedback states
          (published, pending, canceled).
        </p>
        <div className="status-row">
          {statuses.map(([name, hex, token]) => (
            <div className="status-card" key={name}>
              <div
                className="status-color"
                style={{ backgroundColor: token }}
                aria-label={`${name} ${hex}`}
              />
              <p className="text-body-strong">{name}</p>
              <p className="text-caption-default text-muted">{hex}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="section" aria-labelledby="typography">
        <h2 id="typography" className="text-heading-h2">
          Typography — Plus Jakarta Sans
        </h2>
        <div className="type-card">
          {typeStyles.map(([name, meta, className, sample]) => (
            <div
              className="type-row"
              key={name}
              data-type-style={className.replace("text-", "")}
            >
              <div className="type-label">
                <p className="text-body-strong">{name}</p>
                <p className="text-caption-default text-muted">{meta}</p>
              </div>
              <p className={className}>{sample}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="section" aria-labelledby="elevation-radius">
        <h2 id="elevation-radius" className="text-heading-h2">
          Elevation &amp; radius
        </h2>
        <div className="elevation-radius-row">
          <div className="elevation-row">
            <div
              className="elevation-demo"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <span className="text-body-strong">Shadow/Card</span>
              <span className="text-caption-default text-muted">
                Cards, menus, dialogs
              </span>
            </div>
            <div
              className="elevation-demo"
              style={{ boxShadow: "var(--shadow-raised)" }}
            >
              <span className="text-body-strong">Shadow/Raised</span>
              <span className="text-caption-default text-muted">
                Cards, menus, dialogs
              </span>
            </div>
          </div>
          <div className="radius-row">
            {[
              ["radius/sm", "var(--radius-sm)"],
              ["radius/md", "var(--radius-md)"],
              ["radius/lg", "var(--radius-lg)"],
              ["radius/xl", "var(--radius-xl)"],
              ["radius/pill", "var(--radius-pill)"],
            ].map(([name, radius]) => (
              <div
                className="radius-demo text-caption-default"
                key={name}
                style={{ borderRadius: radius }}
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section spacing-section" aria-labelledby="spacing">
        <h2 id="spacing" className="text-heading-h2">
          Spacing
        </h2>
        <div className="spacing-row">
          {Array.from({ length: 12 }, (_, index) => index + 1).map((step) => (
            <div className="spacing-demo" key={step}>
              <span style={{ width: `var(--space-${step})` }} />
              <small>{step * 4}px</small>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<Foundations />} />
    </Routes>
  );
}
