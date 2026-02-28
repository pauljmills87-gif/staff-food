import { useEffect, useMemo, useState } from "react";

type MenuData = {
  active: boolean;
  mainName: string;
  dessertName: string;
  mainPrice: number;
  dessertPrice: number;
};

type Screen = "LANDING" | "ORDER" | "CONFIRM";
type PaymentMethod = "CASH" | "REVOLUT" | "MBWAY";
type Language = "EN" | "PT";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const WHATSAPP_NUMBER = "351924236232";
const REVOLUT_LINK = "https://revolut.me/jssicau3rs";
const MBWAY_NUMBER = "924236232";

const BARS = [
  "Matt's bar",
  "Coopers",
  "Temple",
  "Ancora",
  "Nico's",
  "Ricks",
  "Blue star",
  "Albertus",
  "Trinity",
  "Pow tattoo",
  "Sultao",
  "Other"
] as const;

const translations = {
  EN: {
    tonight: "Tonight’s Menu",
    book: "Book Your Meal",
    delivered: "Delivered To",
    time: "Time You Want Your Meal",
    name: "Your Name",
    payment: "Payment",
    place: "Place Order",
    back: "← Back",
    close: "Close",
    confirmTitle: "Thank you — your order has been received.",
    confirmSub: "We’ll see you at your scheduled time.",
    openRevolut: "Open Revolut to Pay",
    backHome: "Back to Home",
    orderNow: "ORDER NOW",
    install: "📲 Install App",
    iosGuideLine1: "Install this app on iPhone:",
    iosGuideLine2: "Tap Share → Add to Home Screen",
    ok: "OK",

    // MBWay additions
    totalToPay: "Total to pay",
    payViaMbway: "Please complete payment via MBWay:",
    copy: "Copy",
    copied: "Copied ✓"
  },
  PT: {
    tonight: "Menu de Hoje",
    book: "Pedir Refeição",
    delivered: "Entregar Em",
    time: "Hora de Entrega",
    name: "O Seu Nome",
    payment: "Pagamento",
    place: "Fazer Pedido",
    back: "← Voltar",
    close: "Fechar",
    confirmTitle: "Obrigado — o seu pedido foi recebido.",
    confirmSub: "Vemo-nos à hora escolhida.",
    openRevolut: "Abrir Revolut para Pagar",
    backHome: "Voltar ao Início",
    orderNow: "PEDIR AGORA",
    install: "📲 Instalar App",
    iosGuideLine1: "Instalar no iPhone:",
    iosGuideLine2: "Partilhar → Adicionar ao Ecrã Principal",
    ok: "OK",

    // MBWay additions
    totalToPay: "Total a pagar",
    payViaMbway: "Por favor, pague por MBWay:",
    copy: "Copiar",
    copied: "Copiado ✓"
  }
} as const;

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches;
}

function buildSlots(): string[] {
  const slots: string[] = [];
  let total = 20 * 60 + 30; // 20:30
  const end = 22 * 60 + 30; // 22:30

  while (total <= end) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    total += 15;
  }
  return slots;
}

function eur(n: number): string {
  return `€${n.toFixed(2)}`;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("LANDING");

  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem("mb_lang");
    return saved === "PT" ? "PT" : "EN";
  });

  const [menu, setMenu] = useState<MenuData | null>(null);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  const [name, setName] = useState<string>(() => localStorage.getItem("mb_name") || "");
  const [bar, setBar] = useState<(typeof BARS)[number]>(BARS[0]);
  const [otherBar, setOtherBar] = useState<string>("");
  const [slot, setSlot] = useState<string>(buildSlots()[0]);
  const [mainQty, setMainQty] = useState<number>(0);
  const [dessertQty, setDessertQty] = useState<number>(0);
  const [payment, setPayment] = useState<PaymentMethod>("CASH");
  const [revolutPending, setRevolutPending] = useState<boolean>(false);

  // ✅ MBWay additions
  const [totalToPay, setTotalToPay] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  // Android install prompt support
  const [deferredInstall, setDeferredInstall] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState<boolean>(false);

  // iOS install guide (show once)
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);

  const t = translations[lang];

  // Persist language + name
  useEffect(() => {
    localStorage.setItem("mb_lang", lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("mb_name", name);
  }, [name]);

  // Load menu.json (cache-bust so your daily update shows)
  useEffect(() => {
    fetch(`/menu.json?v=${Date.now()}`)
      .then((res) => res.json())
      .then((data: MenuData) => setMenu(data))
      .catch(() => setMenu(null));
  }, []);

  // Android native install prompt hook
  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstall(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const onAppInstalled = () => {
      setCanInstall(false);
      setDeferredInstall(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  // iOS guide (only show once, only when not standalone)
  useEffect(() => {
    const dismissed = localStorage.getItem("mb_iosGuideDismissed") === "1";
    if (!dismissed && isIOS() && !isStandalone()) {
      setShowIOSGuide(true);
    }
  }, []);

  async function triggerInstall(): Promise<void> {
    if (!deferredInstall) return;
    await deferredInstall.prompt();
    await deferredInstall.userChoice;
    setCanInstall(false);
    setDeferredInstall(null);
  }

  const total = useMemo<number>(() => {
    if (!menu) return 0;
    return mainQty * menu.mainPrice + dessertQty * menu.dessertPrice;
  }, [menu, mainQty, dessertQty]);

  // ✅ MBWay copy helper
  function copyMBWayNumber(): void {
    // Clipboard API works in HTTPS/PWA (Vercel is HTTPS)
    navigator.clipboard
      .writeText(MBWAY_NUMBER)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {
        // fallback: still show copied feedback if clipboard blocked
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      });
  }

  function placeOrder(): void {
    if (!menu) return;

    const barName = bar === "Other" ? otherBar.trim() : bar;
    const safeBar = barName.length ? barName : "Other";

    const message = `
⭐ NEW STAFF FOOD ORDER

Name: ${name}
Delivered To: ${safeBar}
Time: ${slot}

${menu.mainName} x${mainQty}
${menu.dessertName} x${dessertQty}

Total: ${eur(total)}
Payment: ${payment}
`.trim();

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      "_blank"
    );

    // ✅ Store total BEFORE resetting quantities (so confirm shows correct total)
    setTotalToPay(total);

    // iOS-safe: show button on confirm
    setRevolutPending(payment === "REVOLUT");

    // reset quantities (optional; keeps it tidy)
    setMainQty(0);
    setDessertQty(0);

    setScreen("CONFIRM");
  }

  const landingStyle: React.CSSProperties = {
    minHeight: "100vh",
    backgroundImage: "url('/landing.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    flexDirection: "column",
    padding: 20
  };

  const orderStyle: React.CSSProperties = {
    minHeight: "100vh",
    backgroundImage: "url('/order-bg.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    flexDirection: "column",
    padding: 20
  };

  // CONFIRM SCREEN
  if (screen === "CONFIRM") {
    return (
      <div style={landingStyle}>
        <TopBar
          lang={lang}
          setLang={setLang}
          canInstall={canInstall}
          onInstall={triggerInstall}
          leftLabel={t.backHome}
          onLeft={() => {
            setRevolutPending(false);
            setCopied(false);
            setScreen("LANDING");
          }}
        />

        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <div style={{ ...card, width: "100%", maxWidth: 520, margin: "0 auto" }}>
            <h2 style={{ margin: 0 }}>{t.confirmTitle}</h2>
            <p style={{ marginTop: 8, marginBottom: 0 }}>{t.confirmSub}</p>

            {/* ✅ Always show total to pay on confirm */}
            <div style={{ marginTop: 12, fontWeight: 900 }}>
              {t.totalToPay}: {eur(totalToPay)}
            </div>

            {revolutPending && (
              <button
                style={{ ...primaryBtn, marginTop: 14 }}
                onClick={() => window.open(REVOLUT_LINK, "_blank")}
              >
                {t.openRevolut}
              </button>
            )}

            {/* ✅ MBWay confirm block */}
            {payment === "MBWAY" && (
              <div style={{ marginTop: 14 }}>
                <div style={{ marginBottom: 8 }}>{t.payViaMbway}</div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 12,
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.08)"
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{MBWAY_NUMBER}</div>

                  <button
                    style={{
                      ...tinyBtn,
                      background: "rgba(255,255,255,0.86)",
                      color: "#000",
                      border: "none"
                    }}
                    onClick={copyMBWayNumber}
                  >
                    {t.copy}
                  </button>
                </div>

                {copied && (
                  <div style={{ marginTop: 8, fontWeight: 900 }}>
                    {t.copied}
                  </div>
                )}
              </div>
            )}

            <button
              style={{ ...secondaryBtn, marginTop: 12 }}
              onClick={() => {
                setRevolutPending(false);
                setCopied(false);
                setScreen("LANDING");
              }}
            >
              {t.backHome}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ORDER SCREEN (full screen)
  if (screen === "ORDER") {
    return (
      <div style={orderStyle}>
        <TopBar
          lang={lang}
          setLang={setLang}
          canInstall={canInstall}
          onInstall={triggerInstall}
          leftLabel={t.back}
          onLeft={() => setScreen("LANDING")}
        />

        <div style={{ ...card, width: "100%", maxWidth: 520, margin: "16px auto 0 auto" }}>
          <h3 style={{ margin: 0 }}>{menu?.mainName ?? "Main"}</h3>
          <Qty qty={mainQty} setQty={setMainQty} />

          <h3 style={{ marginTop: 14, marginBottom: 0 }}>{menu?.dessertName ?? "Dessert"}</h3>
          <Qty qty={dessertQty} setQty={setDessertQty} />

          <div style={{ marginTop: 10, fontWeight: 900 }}>
            Total: {eur(total)}
          </div>
        </div>

        <div style={{ ...card, width: "100%", maxWidth: 520, margin: "16px auto 0 auto" }}>
          <label style={labelStyle}>{t.delivered}</label>
          <select
            style={inputStyle}
            value={bar}
            onChange={(e) => setBar(e.target.value as (typeof BARS)[number])}
          >
            {BARS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {bar === "Other" && (
            <input
              style={inputStyle}
              placeholder="Bar name"
              value={otherBar}
              onChange={(e) => setOtherBar(e.target.value)}
            />
          )}

          <label style={labelStyle}>{t.time}</label>
          <select style={inputStyle} value={slot} onChange={(e) => setSlot(e.target.value)}>
            {buildSlots().map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <label style={labelStyle}>{t.name}</label>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />

          <label style={labelStyle}>{t.payment}</label>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <label style={radioRow}>
              <input
                type="radio"
                checked={payment === "CASH"}
                onChange={() => setPayment("CASH")}
              />
              Cash
            </label>

            <label style={radioRow}>
              <input
                type="radio"
                checked={payment === "REVOLUT"}
                onChange={() => setPayment("REVOLUT")}
              />
              Revolut
            </label>

            {/* ✅ keep MBWay consistent styling */}
            <label style={radioRow}>
              <input
                type="radio"
                checked={payment === "MBWAY"}
                onChange={() => setPayment("MBWAY")}
              />
              MBWay
            </label>
          </div>

          <button style={{ ...primaryBtn, marginTop: 14 }} onClick={placeOrder}>
            {t.place}
          </button>

          <button style={{ ...secondaryBtn, marginTop: 10 }} onClick={() => setScreen("LANDING")}>
            {t.back}
          </button>
        </div>
      </div>
    );
  }

  // LANDING SCREEN
  return (
    <div style={landingStyle}>
      <TopBar lang={lang} setLang={setLang} canInstall={canInstall} onInstall={triggerInstall} />

      {/* lower third stacked buttons */}
      <div
        style={{
          marginTop: "auto",
          marginBottom: 80,
          width: "100%",
          maxWidth: 520,
          marginLeft: "auto",
          marginRight: "auto"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button style={primaryBtnFull} onClick={() => setMenuOpen(true)}>
            {t.tonight}
          </button>
          <button style={secondaryBtnFull} onClick={() => setScreen("ORDER")}>
            {t.book}
          </button>
        </div>
      </div>

      {/* iOS install guide (shows once) */}
      {showIOSGuide && (
        <div style={modal} onClick={() => undefined}>
          <div style={modalInner}>
            <div style={{ fontWeight: 900 }}>{t.iosGuideLine1}</div>
            <div style={{ opacity: 0.9 }}>{t.iosGuideLine2}</div>
            <button
              style={secondaryBtnFull}
              onClick={() => {
                localStorage.setItem("mb_iosGuideDismissed", "1");
                setShowIOSGuide(false);
              }}
            >
              {t.ok}
            </button>
          </div>
        </div>
      )}

      {/* Tonight’s Menu modal */}
      {menuOpen && (
        <div style={modal} onClick={() => setMenuOpen(false)}>
          <div style={modalInner} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 900 }}>{t.tonight}</div>
              <button style={tinyBtn} onClick={() => setMenuOpen(false)}>
                {t.close}
              </button>
            </div>

            <img src="/menu.png" style={{ width: "100%", borderRadius: 16 }} />

            <button
              style={primaryBtnFull}
              onClick={() => {
                setMenuOpen(false);
                setScreen("ORDER");
              }}
            >
              {t.orderNow}
            </button>

            <button style={secondaryBtnFull} onClick={() => setMenuOpen(false)}>
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TopBar({
  lang,
  setLang,
  canInstall,
  onInstall,
  leftLabel,
  onLeft
}: {
  lang: Language;
  setLang: React.Dispatch<React.SetStateAction<Language>>;
  canInstall: boolean;
  onInstall: () => Promise<void>;
  leftLabel?: string;
  onLeft?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        marginTop: 16 // pushes below Android 3-dots area
      }}
    >
      <div>
        {leftLabel && onLeft && (
          <button style={tinyBtn} onClick={onLeft}>
            {leftLabel}
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          onClick={() => setLang("EN")}
          style={{
            ...tinyBtn,
            opacity: lang === "EN" ? 1 : 0.55,
            fontWeight: lang === "EN" ? 900 : 700
          }}
        >
          🇬🇧 EN
        </button>

        <button
          onClick={() => setLang("PT")}
          style={{
            ...tinyBtn,
            opacity: lang === "PT" ? 1 : 0.55,
            fontWeight: lang === "PT" ? 900 : 700
          }}
        >
          🇵🇹 PT
        </button>

        {canInstall && (
          <button
            style={{ ...tinyBtn, background: "#ff7a00", border: "none" }}
            onClick={() => void onInstall()}
          >
            📲
          </button>
        )}
      </div>
    </div>
  );
}

function Qty({
  qty,
  setQty
}: {
  qty: number;
  setQty: React.Dispatch<React.SetStateAction<number>>;
}) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
      <button style={qtyBtn} onClick={() => setQty(Math.max(0, qty - 1))}>
        −
      </button>
      <div style={{ minWidth: 26, textAlign: "center", fontWeight: 900 }}>{qty}</div>
      <button style={qtyBtn} onClick={() => setQty(qty + 1)}>
        +
      </button>
    </div>
  );
}

/* ---------- styles ---------- */

const labelStyle: React.CSSProperties = {
  fontWeight: 800,
  marginTop: 6
};

const radioRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center"
};

const inputStyle: React.CSSProperties = {
  padding: "12px 12px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.10)",
  color: "#fff",
  outline: "none"
};

const card: React.CSSProperties = {
  background: "rgba(0,0,0,0.62)",
  padding: 18,
  borderRadius: 20,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  color: "#fff"
};

const primaryBtn: React.CSSProperties = {
  padding: "16px",
  borderRadius: 20,
  background: "linear-gradient(135deg,#ff7a00,#ff2d55)",
  color: "#fff",
  fontWeight: 900,
  border: "none",
  fontSize: 18,
  cursor: "pointer"
};

const primaryBtnFull: React.CSSProperties = {
  ...primaryBtn,
  width: "100%"
};

const secondaryBtn: React.CSSProperties = {
  padding: "14px",
  borderRadius: 20,
  background: "rgba(255,255,255,0.86)",
  color: "#000",
  fontWeight: 800,
  border: "none",
  cursor: "pointer"
};

const secondaryBtnFull: React.CSSProperties = {
  ...secondaryBtn,
  width: "100%"
};

const tinyBtn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.35)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer"
};

const qtyBtn: React.CSSProperties = {
  width: 44,
  height: 40,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 20,
  lineHeight: "20px"
};

const modal: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.82)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 999
};

const modalInner: React.CSSProperties = {
  background: "#111",
  padding: 18,
  borderRadius: 20,
  width: "100%",
  maxWidth: 420,
  display: "flex",
  flexDirection: "column",
  gap: 14,
  color: "#fff"
};