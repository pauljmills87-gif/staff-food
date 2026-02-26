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

  const [name, setName] = useState(localStorage.getItem("mb_name") || "");
  const [bar, setBar] = useState(BARS[0]);
  const [otherBar, setOtherBar] = useState("");
  const [slot, setSlot] = useState(buildSlots()[0]);
  const [mainQty, setMainQty] = useState(0);
  const [dessertQty, setDessertQty] = useState(0);
  const [payment, setPayment] = useState<PaymentMethod>("CASH");

  useEffect(() => {
    fetch("/menu.json?v=" + Date.now())
      .then(res => res.json())
      .then(data => setMenu(data));
  }, []);

  useEffect(() => {
    localStorage.setItem("mb_name", name);
  }, [name]);

  const total = useMemo(() => {
    if (!menu) return 0;
    return mainQty * menu.mainPrice + dessertQty * menu.dessertPrice;
  }, [menu, mainQty, dessertQty]);

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

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      "_blank"
    );

    if (payment === "REVOLUT") {
      setRevolutPending(true);
    } else {
      setRevolutPending(false);
    }

    setMainQty(0);
    setDessertQty(0);
    setScreen("CONFIRM");
  }

  const landingStyle = {
    minHeight: "100vh",
    backgroundImage: "url('/landing.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "flex-end",
    padding: "0 20px 80px 20px"
  };

  const orderStyle = {
    minHeight: "100vh",
    backgroundImage: "url('/order-bg.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    padding: 20
  };

  if (screen === "CONFIRM") {
    return (
      <div style={landingStyle}>
        <div style={card}>
          <h2>Thank you — your order has been received.</h2>
          <p>We’ll see you at your scheduled time.</p>

          {revolutPending && (
            <button
              style={primaryBtn}
              onClick={() => window.open(REVOLUT_LINK, "_blank")}
            >
              Open Revolut to Pay
            </button>
          )}

          <button
            style={secondaryBtn}
            onClick={() => {
              setRevolutPending(false);
              setScreen("LANDING");
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (screen === "ORDER") {
    return (
      <div style={orderStyle}>
        <div style={card}>
          <h3>{menu?.mainName}</h3>
          <Qty qty={mainQty} setQty={setMainQty} />

          <h3>{menu?.dessertName}</h3>
          <Qty qty={dessertQty} setQty={setDessertQty} />

          <strong>Total: {eur(total)}</strong>
        </div>

        <div style={card}>
          <label>Delivered To</label>
          <select value={bar} onChange={e => setBar(e.target.value)}>
            {BARS.map(b => <option key={b}>{b}</option>)}
          </select>

          {bar === "Other" && (
            <input
              placeholder="Bar name"
              value={otherBar}
              onChange={e => setOtherBar(e.target.value)}
            />
          )}

          <label>Time You Want Your Meal</label>
          <select value={slot} onChange={e => setSlot(e.target.value)}>
            {buildSlots().map(s => <option key={s}>{s}</option>)}
          </select>

          <label>Your Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <label>Payment</label>
          <div>
            <label>
              <input
                type="radio"
                checked={payment === "CASH"}
                onChange={() => setPayment("CASH")}
              />
              Cash
            </label>

            <label>
              <input
                type="radio"
                checked={payment === "REVOLUT"}
                onChange={() => setPayment("REVOLUT")}
              />
              Revolut
            </label>
          </div>

          <button style={primaryBtn} onClick={placeOrder}>
            Place Order
          </button>
        </div>

        <button style={secondaryBtn} onClick={() => setScreen("LANDING")}>
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div style={landingStyle}>
      <button style={primaryBtn} onClick={() => setMenuOpen(true)}>
        Tonight’s Menu
      </button>

      <button style={secondaryBtn} onClick={() => setScreen("ORDER")}>
        Book Your Meal
      </button>

      {menuOpen && (
        <div style={modal}>
          <div style={modalInner}>
            <img
              src="/menu.png"
              style={{ width: "100%", borderRadius: 16 }}
            />
            <button
              style={primaryBtn}
              onClick={() => {
                setMenuOpen(false);
                setScreen("ORDER");
              }}
            >
              ORDER NOW
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Qty({ qty, setQty }: { qty: number; setQty: (n: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <button onClick={() => setQty(Math.max(0, qty - 1))}>-</button>
      {qty}
      <button onClick={() => setQty(qty + 1)}>+</button>
    </div>
  );
}

const card = {
  background: "rgba(0,0,0,0.6)",
  padding: 20,
  borderRadius: 20,
  marginBottom: 20,
  display: "flex",
  flexDirection: "column" as const,
  gap: 10
};

const primaryBtn = {
  padding: "16px",
  borderRadius: 20,
  background: "linear-gradient(135deg,#ff7a00,#ff2d55)",
  color: "#fff",
  fontWeight: 900,
  border: "none",
  fontSize: 18,
  cursor: "pointer"
};

const secondaryBtn = {
  padding: "14px",
  borderRadius: 20,
  background: "rgba(255,255,255,0.8)",
  color: "#000",
  fontWeight: 700,
  border: "none",
  cursor: "pointer"
};

const modal = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,0.8)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const modalInner = {
  background: "#111",
  padding: 20,
  borderRadius: 20,
  width: "90%",
  maxWidth: 400,
  display: "flex",
  flexDirection: "column" as const,
  gap: 15
};