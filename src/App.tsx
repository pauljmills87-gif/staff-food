import { useEffect, useMemo, useState } from "react";

type MenuData = {
  active: boolean;
  mainName: string;
  dessertName: string;
  mainPrice: number;
  dessertPrice: number;
};

type Screen = "LANDING" | "ORDER" | "CONFIRM";
type PaymentMethod = "CASH" | "REVOLUT";

const WHATSAPP_NUMBER = "351924236232";
const REVOLUT_LINK = "https://revolut.me/jssicau3rs";

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
];

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
    orderNow: "ORDER NOW"
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
    orderNow: "PEDIR AGORA"
  }
} as const;

function buildSlots() {
  const slots: string[] = [];
  let total = 20 * 60 + 30;
  const end = 22 * 60 + 30;

  while (total <= end) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    total += 15;
  }
  return slots;
}

function eur(n: number) {
  return `€${n.toFixed(2)}`;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("LANDING");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menu, setMenu] = useState<MenuData | null>(null);

  const [revolutPending, setRevolutPending] = useState(false);

  const [lang, setLang] = useState<"EN" | "PT">(() => {
    const saved = localStorage.getItem("mb_lang");
    return saved === "PT" ? "PT" : "EN";
  });

  const [name, setName] = useState(localStorage.getItem("mb_name") || "");
  const [bar, setBar] = useState(BARS[0]);
  const [otherBar, setOtherBar] = useState("");
  const [slot, setSlot] = useState(buildSlots()[0]);

  const [mainQty, setMainQty] = useState(0);
  const [dessertQty, setDessertQty] = useState(0);
  const [payment, setPayment] = useState<PaymentMethod>("CASH");

  useEffect(() => {
    localStorage.setItem("mb_lang", lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("mb_name", name);
  }, [name]);

  useEffect(() => {
    fetch("/menu.json?v=" + Date.now())
      .then((res) => res.json())
      .then((data) => setMenu(data));
  }, []);

  const total = useMemo(() => {
    if (!menu) return 0;
    return mainQty * menu.mainPrice + dessertQty * menu.dessertPrice;
  }, [menu, mainQty, dessertQty]);

  const t = translations[lang];

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

  function placeOrder() {
    if (!menu) return;

    const barName = bar === "Other" ? otherBar : bar;

    const message = `
⭐ NEW STAFF FOOD ORDER

Name: ${name}
Delivered To: ${barName}
Time: ${slot}

${menu.mainName} x${mainQty}
${menu.dessertName} x${dessertQty}

Total: ${eur(total)}
Payment: ${payment}
`;

    // Always send order message to WhatsApp
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      "_blank"
    );

    // For iOS-safe flow: show Revolut button on confirm
    setRevolutPending(payment === "REVOLUT");

    // Reset quantities for next order
    setMainQty(0);
    setDessertQty(0);

    setScreen("CONFIRM");
  }

  // ---------- CONFIRM ----------
  if (screen === "CONFIRM") {
    return (
      <div style={landingStyle}>
        <TopBar lang={lang} setLang={setLang} leftButtonLabel={t.backHome} onLeft={() => { setRevolutPending(false); setScreen("LANDING"); }} />

        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <div style={{ ...card, width: "100%", maxWidth: 460, margin: "0 auto" }}>
            <h2 style={{ margin: 0 }}>{t.confirmTitle}</h2>
            <p style={{ marginTop: 8, marginBottom: 0 }}>{t.confirmSub}</p>

            {revolutPending && (
              <button
                style={{ ...primaryBtn, marginTop: 14 }}
                onClick={() => window.open(REVOLUT_LINK, "_blank")}
              >
                {t.openRevolut}
              </button>
            )}

            <button
              style={{ ...secondaryBtn, marginTop: 12 }}
              onClick={() => {
                setRevolutPending(false);
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

  // ---------- ORDER ----------
  if (screen === "ORDER") {
    return (
      <div style={orderStyle}>
        <TopBar
          lang={lang}
          setLang={setLang}
          leftButtonLabel={t.back}
          onLeft={() => setScreen("LANDING")}
        />

        <div style={{ ...card, width: "100%", maxWidth: 520, margin: "0 auto" }}>
          <h3 style={{ margin: 0 }}>{menu?.mainName}</h3>
          <Qty qty={mainQty} setQty={setMainQty} />

          <h3 style={{ marginTop: 12, marginBottom: 0 }}>{menu?.dessertName}</h3>
          <Qty qty={dessertQty} setQty={setDessertQty} />

          <div style={{ marginTop: 10, fontWeight: 900 }}>
            Total: {eur(total)}
          </div>
        </div>

        <div style={{ ...card, width: "100%", maxWidth: 520, margin: "0 auto" }}>
          <label style={labelStyle}>{t.delivered}</label>
          <select style={inputStyle} value={bar} onChange={(e) => setBar(e.target.value)}>
            {BARS.map((b) => (
              <option key={b}>{b}</option>
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
              <option key={s}>{s}</option>
            ))}
          </select>

          <label style={labelStyle}>{t.name}</label>
          <input
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label style={labelStyle}>{t.payment}</label>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="radio"
                checked={payment === "CASH"}
                onChange={() => setPayment("CASH")}
              />
              Cash
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="radio"
                checked={payment === "REVOLUT"}
                onChange={() => setPayment("REVOLUT")}
              />
              Revolut
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

  // ---------- LANDING ----------
  return (
    <div style={landingStyle}>
      <TopBar lang={lang} setLang={setLang} />

      {/* Lower-third button stack */}
      <div style={{ marginTop: "auto", marginBottom: 80, width: "100%", maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button style={primaryBtnFullWidth} onClick={() => setMenuOpen(true)}>
            {t.tonight}
          </button>
          <button style={secondaryBtnFullWidth} onClick={() => setScreen("ORDER")}>
            {t.book}
          </button>
        </div>
      </div>

      {/* Menu modal */}
      {menuOpen && (
        <div
          style={modal}
          onClick={() => setMenuOpen(false)} // tap outside closes
        >
          <div
            style={modalInner}
            onClick={(e) => e.stopPropagation()} // prevent close when clicking inside
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 900, color: "#fff" }}>{t.tonight}</div>
              <button style={tinyBtn} onClick={() => setMenuOpen(false)}>
                {t.close}
              </button>
            </div>

            <img src="/menu.png" style={{ width: "100%", borderRadius: 16 }} />

            <button
              style={primaryBtn}
              onClick={() => {
                setMenuOpen(false);
                setScreen("ORDER");
              }}
            >
              {t.orderNow}
            </button>

            <button style={secondaryBtn} onClick={() => setMenuOpen(false)}>
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
  leftButtonLabel,
  onLeft
}: {
  lang: "EN" | "PT";
  setLang: React.Dispatch<React.SetStateAction<"EN" | "PT">>;
  leftButtonLabel?: string;
  onLeft?: () => void;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <div>
        {leftButtonLabel && onLeft && (
          <button style={tinyBtn} onClick={onLeft}>
            {leftButtonLabel}
          </button>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
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
      <div style={{ minWidth: 24, textAlign: "center", fontWeight: 900 }}>{qty}</div>
      <button style={qtyBtn} onClick={() => setQty(qty + 1)}>
        +
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontWeight: 800,
  marginTop: 6
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
  marginTop: 16,
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

const primaryBtnFullWidth: React.CSSProperties = {
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

const secondaryBtnFullWidth: React.CSSProperties = {
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
  gap: 14
};