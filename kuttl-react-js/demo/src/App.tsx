import React from "react";
import {
  CuttlefishProvider,
  CuttlefishPanel,
  useCuttlefish,
} from "@cuttlefish/react";

// ─────────────────────────────────────────────
// Global styles
// ─────────────────────────────────────────────

const globalStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --cream: #f5f0e8; --bone: #e8e0d0; --charcoal: #1a1814;
    --mink: #8a7968; --gold: #b89a6a; --rose: #c4a99a;
  }
  html { scroll-behavior: smooth; }
  body { font-family: 'Josefin Sans', sans-serif; background: var(--cream); color: var(--charcoal); }
  a { text-decoration: none; }
`;

// ─────────────────────────────────────────────
// Navbar — uses useCuttlefish for opt-in reorder
// ─────────────────────────────────────────────

function Navbar() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  // opt-in: allows AI to reorder nav actions
  const { reorder } = useCuttlefish("nav-actions");

  const navActions = reorder([
    React.createElement("button", {
      key: "search", "data-uid": "nav-search",
      style: { background: "none", border: "none", fontFamily: "inherit", fontSize: "0.7rem",
               letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--charcoal)",
               cursor: "pointer" }
    }, "Search"),
    React.createElement("button", {
      key: "account", "data-uid": "nav-account",
      style: { background: "none", border: "none", fontFamily: "inherit", fontSize: "0.7rem",
               letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--charcoal)",
               cursor: "pointer" }
    }, "Account"),
    React.createElement("button", {
      key: "bag", "data-uid": "nav-bag",
      style: { background: "none", border: "none", fontFamily: "inherit", fontSize: "0.7rem",
               letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--charcoal)",
               cursor: "pointer" }
    }, "Bag (0)"),
  ]);

  return React.createElement(React.Fragment, null,
    // Drawer overlay
    drawerOpen && React.createElement("div", {
      "data-uid": "drawer-overlay",
      onClick: () => setDrawerOpen(false),
      style: {
        position: "fixed", inset: 0, background: "rgba(26,24,20,0.5)",
        zIndex: 90, cursor: "pointer",
      }
    }),

    // Drawer
    React.createElement("nav", {
      "data-uid": "drawer",
      style: {
        position: "fixed", top: 0, left: 0, bottom: 0, width: 320,
        background: "var(--charcoal)", color: "var(--cream)", zIndex: 100,
        transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.5s cubic-bezier(0.77,0,0.175,1)",
        display: "flex", flexDirection: "column", padding: 0,
      }
    },
      React.createElement("div", {
        "data-uid": "drawer-header",
        style: { display: "flex", alignItems: "center", justifyContent: "space-between",
                 padding: "28px 32px", borderBottom: "1px solid rgba(245,240,232,0.08)" }
      },
        React.createElement("span", {
          "data-uid": "drawer-logo",
          style: { fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem",
                   fontWeight: 300, letterSpacing: "0.3em" }
        }, "MAISON VOSS"),
        React.createElement("button", {
          "data-uid": "drawer-close",
          onClick: () => setDrawerOpen(false),
          style: { background: "none", border: "none", color: "var(--cream)",
                   fontSize: "1.4rem", cursor: "pointer", opacity: 0.6 }
        }, "✕"),
      ),
      React.createElement("div", { "data-uid": "drawer-nav", style: { padding: "40px 32px", flex: 1 } },
        ["New Arrivals", "Women", "Men", "Accessories", "Editorial", "Atelier"].map((item, i) =>
          React.createElement("a", {
            key: item, href: "#",
            "data-uid": `dnav-${i}`,
            style: {
              display: "block", fontFamily: "'Cormorant Garamond', serif",
              fontSize: "2rem", fontWeight: 300, fontStyle: "italic",
              color: "var(--cream)", padding: "10px 0",
              borderBottom: "1px solid rgba(245,240,232,0.06)",
            }
          }, item)
        )
      ),
    ),

    // Main navbar
    React.createElement("header", {
      "data-uid": "navbar",
      style: {
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 40px", height: 72,
        background: "var(--cream)", borderBottom: "1px solid var(--bone)",
      }
    },
      React.createElement("button", {
        "data-uid": "hamburger",
        onClick: () => setDrawerOpen(true),
        style: { background: "none", border: "none", cursor: "pointer",
                 display: "flex", flexDirection: "column", gap: 5, padding: 8 }
      },
        React.createElement("span", { "data-uid": "ham-1", style: { display: "block", width: 24, height: 1, background: "var(--charcoal)" } }),
        React.createElement("span", { "data-uid": "ham-2", style: { display: "block", width: 24, height: 1, background: "var(--charcoal)" } }),
        React.createElement("span", { "data-uid": "ham-3", style: { display: "block", width: 24, height: 1, background: "var(--charcoal)" } }),
      ),
      React.createElement("a", {
        "data-uid": "nav-logo", href: "#",
        style: {
          position: "absolute", left: "50%", transform: "translateX(-50%)",
          fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem",
          fontWeight: 300, letterSpacing: "0.45em", color: "var(--charcoal)",
          textTransform: "uppercase", whiteSpace: "nowrap",
        }
      }, "Maison Voss"),
      React.createElement("div", {
        "data-uid": "nav-actions",
        style: { display: "flex", alignItems: "center", gap: 20 }
      }, ...navActions),
    )
  );
}

// ─────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────

function Hero() {
  return React.createElement("section", {
    "data-uid": "hero",
    style: {
      position: "relative", height: "92vh", display: "flex",
      alignItems: "flex-end", overflow: "hidden", background: "var(--charcoal)",
    }
  },
    React.createElement("div", {
      "data-uid": "hero-bg",
      style: {
        position: "absolute", inset: 0,
        background: "linear-gradient(160deg, #1a1814 0%, #2d2520 40%, #3d3028 70%, #1a1814 100%)",
      }
    }),
    React.createElement("div", {
      "data-uid": "hero-content",
      style: { position: "relative", zIndex: 2, padding: "60px 64px", maxWidth: 680 }
    },
      React.createElement("p", {
        "data-uid": "hero-eyebrow",
        style: { fontSize: "0.65rem", letterSpacing: "0.28em", textTransform: "uppercase",
                 color: "var(--gold)", marginBottom: 24 }
      }, "Autumn / Winter 2025"),
      React.createElement("h1", {
        "data-uid": "hero-title",
        style: { fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(3.5rem, 7vw, 6rem)",
                 fontWeight: 300, lineHeight: 0.95, color: "var(--cream)", marginBottom: 32 }
      }, "The Art of Quiet Luxury"),
      React.createElement("p", {
        "data-uid": "hero-desc",
        style: { fontSize: "0.75rem", letterSpacing: "0.1em", color: "var(--mink)",
                 lineHeight: 1.9, maxWidth: 340, marginBottom: 48 }
      }, "Crafted for those who understand that true elegance speaks in whispers. Each piece a meditation on restraint, proportion, and enduring beauty."),
      React.createElement("div", {
        "data-uid": "hero-cta-group",
        style: { display: "flex", alignItems: "center", gap: 32 }
      },
        React.createElement("a", {
          "data-uid": "hero-cta-primary", href: "#",
          style: {
            background: "var(--gold)", color: "var(--charcoal)",
            fontSize: "0.65rem", letterSpacing: "0.22em", textTransform: "uppercase",
            padding: "16px 36px",
          }
        }, "Explore Collection"),
        React.createElement("a", {
          "data-uid": "hero-cta-secondary", href: "#",
          style: {
            fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase",
            color: "var(--cream)", borderBottom: "1px solid rgba(245,240,232,0.3)", paddingBottom: 2,
          }
        }, "View Lookbook"),
      ),
    ),
  );
}

// ─────────────────────────────────────────────
// Editorial Grid
// ─────────────────────────────────────────────

const CARDS = [
  { uid: "ed-card-1", cat: "Outerwear",    name: "The Cashmere Overcoat", price: "£ 2,850",
    bg: "linear-gradient(170deg, #2d2520, #4a3828)" },
  { uid: "ed-card-2", cat: "Ready to Wear", name: "Silk Bias Dress",       price: "£ 1,490",
    bg: "linear-gradient(160deg, #c4a99a, #a88878)" },
  { uid: "ed-card-3", cat: "Accessories",  name: "Leather Tote, Noir",    price: "£ 890",
    bg: "linear-gradient(170deg, #8a7968, #4a3928)" },
  { uid: "ed-card-4", cat: "Knitwear",     name: "Merino Turtleneck",     price: "£ 620",
    bg: "linear-gradient(150deg, #e8ddd0, #c4b49a)" },
];

function Editorial() {
  const { reorder } = useCuttlefish("editorial-grid");
  const cards = reorder(
    CARDS.map((c) =>
      React.createElement("div", {
        key: c.uid, "data-uid": c.uid,
        style: { position: "relative", overflow: "hidden", cursor: "pointer", background: "var(--bone)" }
      },
        React.createElement("div", {
          "data-uid": `${c.uid}-bg`,
          style: { width: "100%", aspectRatio: c.uid === "ed-card-1" ? "2/3" : "3/4", background: c.bg }
        }),
        React.createElement("div", {
          "data-uid": `${c.uid}-label`,
          style: { position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 20px 20px",
                   background: "linear-gradient(transparent, rgba(26,24,20,0.7))" }
        },
          React.createElement("p", { "data-uid": `${c.uid}-cat`,
            style: { fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 6 }
          }, c.cat),
          React.createElement("p", { "data-uid": `${c.uid}-name`,
            style: { fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", fontWeight: 300, color: "var(--cream)", fontStyle: "italic" }
          }, c.name),
          React.createElement("p", { "data-uid": `${c.uid}-price`,
            style: { fontSize: "0.68rem", color: "rgba(245,240,232,0.6)", marginTop: 4 }
          }, c.price),
        ),
      )
    )
  );

  return React.createElement("section", {
    "data-uid": "editorial",
    style: { padding: "100px 40px", background: "var(--cream)" }
  },
    React.createElement("div", {
      "data-uid": "editorial-header",
      style: { display: "flex", alignItems: "baseline", justifyContent: "space-between",
               marginBottom: 56, borderBottom: "1px solid var(--bone)", paddingBottom: 24 }
    },
      React.createElement("h2", {
        "data-uid": "editorial-title",
        style: { fontFamily: "'Cormorant Garamond', serif", fontSize: "2.8rem", fontWeight: 300 }
      }, "New Arrivals"),
      React.createElement("a", {
        "data-uid": "editorial-link", href: "#",
        style: { fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--mink)" }
      }, "View All Pieces"),
    ),
    React.createElement("div", {
      "data-uid": "editorial-grid",
      style: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gridTemplateRows: "auto auto", gap: 2 }
    },
      ...cards,
    ),
  );
}

// ─────────────────────────────────────────────
// Manifesto
// ─────────────────────────────────────────────

function Manifesto() {
  return React.createElement("section", {
    "data-uid": "manifesto",
    style: {
      padding: "120px 80px", background: "var(--charcoal)",
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center",
    }
  },
    React.createElement("div", { "data-uid": "manifesto-left" },
      React.createElement("p", {
        "data-uid": "manifesto-eyebrow",
        style: { fontSize: "0.6rem", letterSpacing: "0.25em", textTransform: "uppercase",
                 color: "var(--gold)", marginBottom: 28 }
      }, "Our Philosophy"),
      React.createElement("blockquote", {
        "data-uid": "manifesto-quote",
        style: { fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2rem, 3.5vw, 3rem)",
                 fontWeight: 300, fontStyle: "italic", color: "var(--cream)", lineHeight: 1.35, marginBottom: 40 }
      }, '"We do not follow trends. We create heirlooms."'),
      React.createElement("p", {
        "data-uid": "manifesto-body",
        style: { fontSize: "0.72rem", letterSpacing: "0.06em", color: "var(--mink)", lineHeight: 2, maxWidth: 380 }
      }, "Founded in Paris in 1987, Maison Voss has spent nearly four decades in quiet pursuit of the perfect garment — one that fits the life you actually live, grows more beautiful with time, and carries the unmistakable weight of genuine craft."),
    ),
    React.createElement("div", { "data-uid": "manifesto-right" },
      React.createElement("div", {
        "data-uid": "manifesto-img",
        style: { width: "100%", aspectRatio: "4/5", background: "linear-gradient(145deg, #3d3028, #2d2018)" }
      }),
    ),
  );
}

// ─────────────────────────────────────────────
// Collections
// ─────────────────────────────────────────────

const COLLECTIONS = [
  { uid: "col-1", season: "AW 2025",    name: "Obscura",  pieces: 42, bg: "linear-gradient(160deg, #1a1814, #3d3028)" },
  { uid: "col-2", season: "SS 2025",    name: "Lumière",  pieces: 38, bg: "linear-gradient(160deg, #c4a99a, #a88870)" },
  { uid: "col-3", season: "AW 2024",    name: "Cendres",  pieces: 51, bg: "linear-gradient(160deg, #e8ddd0, #c4b49a)" },
  { uid: "col-4", season: "Resort 2024",name: "Mirage",   pieces: 29, bg: "linear-gradient(160deg, #8a7968, #4a3928)" },
];

function Collections() {
  return React.createElement("section", {
    "data-uid": "collections",
    style: { padding: "100px 40px", background: "var(--bone)" }
  },
    React.createElement("div", {
      "data-uid": "collections-header",
      style: { textAlign: "center", marginBottom: 64 }
    },
      React.createElement("p", {
        "data-uid": "collections-eyebrow",
        style: { fontSize: "0.6rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "var(--mink)", marginBottom: 16 }
      }, "Explore"),
      React.createElement("h2", {
        "data-uid": "collections-title",
        style: { fontFamily: "'Cormorant Garamond', serif", fontSize: "3rem", fontWeight: 300 }
      }, "Our Collections"),
    ),
    React.createElement("div", {
      "data-uid": "collections-grid",
      style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }
    },
      ...COLLECTIONS.map((c) =>
        React.createElement("div", { key: c.uid, "data-uid": c.uid, style: { cursor: "pointer" } },
          React.createElement("div", {
            "data-uid": `${c.uid}-img`,
            style: { width: "100%", aspectRatio: "3/4", marginBottom: 16, background: c.bg }
          }),
          React.createElement("p", {
            "data-uid": `${c.uid}-season`,
            style: { fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--mink)", marginBottom: 6 }
          }, c.season),
          React.createElement("h3", {
            "data-uid": `${c.uid}-name`,
            style: { fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 300, marginBottom: 8 }
          }, c.name),
          React.createElement("p", {
            "data-uid": `${c.uid}-pieces`,
            style: { fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--mink)" }
          }, `${c.pieces} Pieces`),
        )
      ),
    ),
  );
}

// ─────────────────────────────────────────────
// Testimonials
// ─────────────────────────────────────────────

const TESTIMONIALS = [
  { uid: "testi-1", quote: "The overcoat arrived and I understood immediately. This is what clothing is supposed to feel like.", author: "Isabelle M., Paris" },
  { uid: "testi-2", quote: "I bought the silk dress for a wedding and three people asked me where it was from. The cut is extraordinary.", author: "Charlotte B., London" },
  { uid: "testi-3", quote: "Maison Voss is the only brand I trust completely. Every piece becomes more beautiful with time.", author: "Elsa R., Stockholm" },
];

function Testimonials() {
  return React.createElement("section", {
    "data-uid": "testimonials",
    style: {
      padding: "100px 80px", background: "var(--cream)",
      display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 48,
    }
  },
    ...TESTIMONIALS.map((t) =>
      React.createElement("div", {
        key: t.uid, "data-uid": t.uid,
        style: { padding: "40px 0", borderTop: "1px solid var(--bone)" }
      },
        React.createElement("p", {
          "data-uid": `${t.uid}-stars`,
          style: { fontSize: "0.65rem", color: "var(--gold)", marginBottom: 20 }
        }, "★ ★ ★ ★ ★"),
        React.createElement("p", {
          "data-uid": `${t.uid}-quote`,
          style: { fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem",
                   fontWeight: 300, fontStyle: "italic", lineHeight: 1.6, marginBottom: 24 }
        }, `"${t.quote}"`),
        React.createElement("p", {
          "data-uid": `${t.uid}-author`,
          style: { fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--mink)" }
        }, `— ${t.author}`),
      )
    ),
  );
}

// ─────────────────────────────────────────────
// Newsletter
// ─────────────────────────────────────────────

function Newsletter() {
  return React.createElement("section", {
    "data-uid": "newsletter",
    style: {
      padding: "100px 80px", background: "var(--charcoal)",
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center",
    }
  },
    React.createElement("div", { "data-uid": "newsletter-left" },
      React.createElement("h2", {
        "data-uid": "newsletter-title",
        style: { fontFamily: "'Cormorant Garamond', serif", fontSize: "2.8rem",
                 fontWeight: 300, color: "var(--cream)", lineHeight: 1.2, marginBottom: 16 }
      }, "Join the Inner Circle"),
      React.createElement("p", {
        "data-uid": "newsletter-sub",
        style: { fontSize: "0.7rem", letterSpacing: "0.08em", color: "var(--mink)", lineHeight: 1.8 }
      }, "Early access to new collections. Private sale invitations. Notes from the atelier."),
    ),
    React.createElement("div", { "data-uid": "newsletter-right" },
      React.createElement("input", {
        "data-uid": "newsletter-input",
        type: "email", placeholder: "Your email address",
        style: {
          width: "100%", background: "transparent", border: "none",
          borderBottom: "1px solid rgba(245,240,232,0.2)", padding: "14px 0",
          color: "var(--cream)", fontFamily: "inherit", fontSize: "0.75rem",
          outline: "none", display: "block", marginBottom: 16,
        }
      }),
      React.createElement("button", {
        "data-uid": "newsletter-btn",
        style: {
          background: "var(--gold)", color: "var(--charcoal)", border: "none",
          padding: "14px 36px", fontFamily: "inherit", fontSize: "0.62rem",
          letterSpacing: "0.22em", textTransform: "uppercase", cursor: "pointer",
        }
      }, "Subscribe"),
    ),
  );
}

// ─────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────

function Footer() {
  return React.createElement("footer", {
    "data-uid": "footer",
    style: { background: "#111", padding: "80px 60px 40px" }
  },
    React.createElement("div", {
      "data-uid": "footer-top",
      style: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 64,
               paddingBottom: 48, borderBottom: "1px solid rgba(245,240,232,0.06)" }
    },
      React.createElement("div", { "data-uid": "footer-brand" },
        React.createElement("span", {
          "data-uid": "footer-logo",
          style: { fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem",
                   fontWeight: 300, letterSpacing: "0.4em", color: "var(--cream)",
                   display: "block", marginBottom: 20 }
        }, "Maison Voss"),
        React.createElement("p", {
          "data-uid": "footer-tagline",
          style: { fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--mink)", lineHeight: 1.8, maxWidth: 220 }
        }, "Handcrafted in France since 1987. Timeless pieces for lives well lived."),
      ),
      ...[
        { uid: "fcol-1", title: "Shop",   links: ["New Arrivals","Women","Men","Accessories","Archive Sale"] },
        { uid: "fcol-2", title: "Maison", links: ["About Us","The Atelier","Editorial","Sustainability","Careers"] },
        { uid: "fcol-3", title: "Help",   links: ["Shipping & Returns","Size Guide","Garment Care","Contact Us","Find a Store"] },
      ].map((col) =>
        React.createElement("div", { key: col.uid, "data-uid": col.uid },
          React.createElement("p", {
            "data-uid": `${col.uid}-title`,
            style: { fontSize: "0.6rem", letterSpacing: "0.22em", textTransform: "uppercase",
                     color: "var(--cream)", marginBottom: 24 }
          }, col.title),
          React.createElement("ul", {
            "data-uid": `${col.uid}-links`,
            style: { listStyle: "none" }
          },
            ...col.links.map((link, i) =>
              React.createElement("li", { key: i, style: { marginBottom: 12 } },
                React.createElement("a", {
                  href: "#",
                  style: { fontSize: "0.68rem", letterSpacing: "0.08em", color: "var(--mink)" }
                }, link)
              )
            )
          ),
        )
      ),
    ),
    React.createElement("div", {
      "data-uid": "footer-bottom",
      style: { display: "flex", alignItems: "center", justifyContent: "space-between" }
    },
      React.createElement("p", {
        "data-uid": "footer-copy",
        style: { fontSize: "0.6rem", color: "rgba(138,121,104,0.4)" }
      }, "© 2025 Maison Voss. All rights reserved."),
      React.createElement("div", {
        "data-uid": "footer-legal",
        style: { display: "flex", gap: 24 }
      },
        ...["Privacy Policy","Terms of Use","Cookies"].map((label) =>
          React.createElement("a", {
            key: label, href: "#",
            style: { fontSize: "0.6rem", color: "rgba(138,121,104,0.4)" }
          }, label)
        )
      ),
    ),
  );
}

// ─────────────────────────────────────────────
// App root
// ─────────────────────────────────────────────

export function App() {
  // Inject global styles once
  React.useEffect(() => {
    if (!document.getElementById("__mv_styles__")) {
      const s = document.createElement("style");
      s.id = "__mv_styles__";
      s.textContent = globalStyles;
      document.head.appendChild(s);
    }
  }, []);

  return React.createElement(CuttlefishProvider, {
    persistKey: "maison-voss-react",
    ai: { provider: "gemini", apiKey: "AIzaSyA8hSOUwATpk15JRtc_dcEyKM-z_aNkk4A" }
  },
    React.createElement("div", { "data-uid": "page" },
      React.createElement(Navbar),
      React.createElement(Hero),
      React.createElement(Editorial),
      React.createElement(Manifesto),
      React.createElement(Collections),
      React.createElement(Testimonials),
      React.createElement(Newsletter),
      React.createElement(Footer),
    ),
    // Drop the Cuttlefish panel in — it reads from context automatically
    React.createElement(CuttlefishPanel, {
      defaultProvider: "anthropic",
    }),
  );
}
