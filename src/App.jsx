import { useState, useRef, useEffect } from "react";

const VENMO = "flipresale";
const BOOST_FEE = 3;
const PLATFORM_FEE_PCT = 0.08;

const CATEGORIES = ["Electronics","Clothing","Furniture","Books","Sports","Toys","Collectibles","Other"];
const CONDITIONS = ["Like New","Great","Good","Fair","For Parts"];

// ── Supabase config ───────────────────────────────────────────────────
// Paste your values from supabase.com → Project Settings → API
const SUPABASE_URL = "https://uttxaskxqwexlmljpnai.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dHhhc2t4cXdleGxtbGpwbmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTA2NDEsImV4cCI6MjA5NzI4NjY0MX0.0eOhOL_nBw0SYeMwXNyrbBoHie-kS_BOGCAB_I0bi1g";

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Prefer": options.prefer || "",
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function fetchListings() {
  return sbFetch("/listings?select=*&order=boosted.desc,created_at.desc");
}

async function insertListing(listing) {
  const body = {
    title: listing.title,
    price: listing.price,
    condition: listing.condition,
    category: listing.category,
    description: listing.desc,
    img: listing.img,
    venmo: listing.venmo,
    boosted: false,
  };
  console.log("Inserting listing:", body);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/listings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log("Supabase response status:", res.status, "body:", text);
  if (!res.ok) throw new Error(text);
  return JSON.parse(text);
}

async function boostListing(id) {
  return sbFetch(`/listings?id=eq.${id}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify({ boosted: true }),
  });
}

async function deleteListing(id) {
  return sbFetch(`/listings?id=eq.${id}`, {
    method: "DELETE",
  });
}

// Fallback demo data shown while Supabase isn't configured yet
const DEMO_LISTINGS = [
  { id:1, title:"Sony WH-1000XM4 Headphones", price:180, condition:"Good", category:"Electronics", desc:"Barely used, original box included. Minor scuff on left cup.", img:"🎧", views:34, created_at: new Date(Date.now()-7200000).toISOString(), boosted:true },
  { id:2, title:"Vintage Levi's 501 Jeans W32", price:65, condition:"Great", category:"Clothing", desc:"Classic 90s cut, faded naturally. No rips or stains.", img:"👖", views:12, created_at: new Date(Date.now()-18000000).toISOString(), boosted:false },
  { id:3, title:"Herman Miller Aeron Chair", price:420, condition:"Good", category:"Furniture", desc:"Size B, lumbar support works great. Some wear on armrests.", img:"🪑", views:89, created_at: new Date(Date.now()-86400000).toISOString(), boosted:false },
  { id:4, title:"Nintendo Switch + 3 Games", price:230, condition:"Like New", category:"Electronics", desc:"Switch OLED model, comes with Zelda, Mario Kart, and Metroid.", img:"🎮", views:56, created_at: new Date(Date.now()-10800000).toISOString(), boosted:false },
];

function timeAgo(isoString) {
  if (!isoString) return "";
  const diff = (Date.now() - new Date(isoString)) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const usingDemo = SUPABASE_URL === "YOUR_SUPABASE_URL";

function payVenmo({ amount, note }) {
  const url = `https://venmo.com/${VENMO}?txn=pay&amount=${amount}&note=${encodeURIComponent(note)}`;
  window.open(url, "_blank");
}

async function aiGenerateListing(description) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

function Badge({ text }) {
  const colors = {
    "Like New": "#2A7A4B", "Great": "#3A6B9E", "Good": "#7A5C2A",
    "Fair": "#8A4A2A", "For Parts": "#6B2A2A"
  };
  return (
    <span style={{
      background: colors[text] || "#555", color: "#fff",
      fontSize: 11, fontWeight: 600, padding: "2px 8px",
      borderRadius: 3, letterSpacing: "0.04em", textTransform: "uppercase"
    }}>{text}</span>
  );
}

function ListingCard({ listing, onClick }) {
  return (
    <div onClick={() => onClick(listing)} style={{
      background: "#fff",
      border: listing.boosted ? "2px solid #C9973A" : "1px solid #DDD9D3",
      borderRadius: 6, padding: 16, cursor: "pointer",
      transition: "box-shadow 0.15s", display: "flex", flexDirection: "column", gap: 8,
      position: "relative"
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      {listing.boosted && (
        <div style={{
          position: "absolute", top: -1, right: 10,
          background: "#C9973A", color: "#fff", fontSize: 10,
          fontWeight: 700, padding: "2px 8px", borderRadius: "0 0 4px 4px",
          letterSpacing: "0.06em", textTransform: "uppercase"
        }}>⚡ Boosted</div>
      )}
      <div style={{ fontSize: 36, textAlign: "center", background: "#F5F4F1", borderRadius: 4, padding: "12px 0" }}>
        {listing.img}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3, color: "#1A1A18", flex: 1 }}>{listing.title}</span>
        <span style={{ fontWeight: 800, fontSize: 18, color: "#C9973A", whiteSpace: "nowrap" }}>${listing.price}</span>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <Badge text={listing.condition} />
        <span style={{ fontSize: 11, color: "#888", marginLeft: "auto" }}>👁 {listing.views || 0} · {timeAgo(listing.created_at)}</span>
      </div>
      <p style={{ fontSize: 12, color: "#666", margin: 0, lineHeight: 1.5 }}>{listing.description || listing.desc}</p>
    </div>
  );
}

function BuyModal({ listing, onClose }) {
  const fee = Math.ceil(listing.price * PLATFORM_FEE_PCT * 100) / 100;
  const sellerVenmo = listing.venmo || "the seller";
  const [step, setStep] = useState("confirm"); // confirm → pay_seller → pay_fee → done

  const paySteps = [
    {
      key: "pay_seller",
      label: `Step 1 of 2 — Pay seller`,
      amount: listing.price,
      to: sellerVenmo,
      note: `flip. purchase: ${listing.title}`,
      btnText: `Ⓥ Pay $${listing.price} to @${sellerVenmo}`,
      next: "pay_fee",
    },
    {
      key: "pay_fee",
      label: `Step 2 of 2 — Pay platform fee`,
      amount: fee.toFixed(2),
      to: VENMO,
      note: `flip. platform fee: ${listing.title}`,
      btnText: `Ⓥ Pay $${fee.toFixed(2)} to flip.`,
      next: "done",
    },
  ];

  const current = paySteps.find(s => s.key === step);

  const handlePay = () => {
    const url = `https://venmo.com/${current.to}?txn=pay&amount=${current.amount}&note=${encodeURIComponent(current.note)}`;
    window.open(url, "_blank");
    setStep(current.next);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 28, maxWidth: 380, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>

        {step === "confirm" && (
          <>
            <h2 style={{ margin: "0 0 4px", fontSize: 18, color: "#1A1A18" }}>Confirm purchase</h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#888" }}>You'll make 2 quick Venmo payments — one to the seller, one to flip.</p>
            <div style={{ background: "#F5F4F1", borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 8, color: "#444" }}>
                <span>{listing.title}</span><span>${listing.price}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 12, color: "#888" }}>
                <span>Platform fee (8%)</span><span>${fee.toFixed(2)}</span>
              </div>
              <div style={{ borderTop: "1px solid #DDD9D3", paddingTop: 12, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 16, color: "#1A1A18" }}>
                <span>Total</span><span style={{ color: "#C9973A" }}>${(listing.price + fee).toFixed(2)}</span>
              </div>
            </div>
            <button onClick={() => setStep("pay_seller")} style={{ width: "100%", background: "#C9973A", color: "#fff", border: "none", padding: "13px 0", borderRadius: 6, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              Let's go →
            </button>
            <button onClick={onClose} style={{ marginTop: 10, width: "100%", background: "none", border: "1px solid #DDD9D3", padding: "10px 0", borderRadius: 6, color: "#888", cursor: "pointer", fontSize: 13 }}>Cancel</button>
          </>
        )}

        {(step === "pay_seller" || step === "pay_fee") && current && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {paySteps.map((s, i) => (
                <div key={s.key} style={{ flex: 1, height: 4, borderRadius: 2, background: step === s.key || paySteps.indexOf(paySteps.find(x => x.key === step)) > i ? "#C9973A" : "#DDD9D3" }} />
              ))}
            </div>
            <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "#C9973A", textTransform: "uppercase", letterSpacing: "0.05em" }}>{current.label}</p>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, color: "#1A1A18" }}>
              {step === "pay_seller" ? `Pay @${sellerVenmo}` : "Pay flip. fee"}
            </h2>
            <div style={{ background: "#F5F4F1", borderRadius: 8, padding: 16, marginBottom: 20, textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#C9973A" }}>${current.amount}</div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
                {step === "pay_seller" ? `goes to @${sellerVenmo}` : "goes to flip. platform"}
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#aaa", margin: "0 0 16px", lineHeight: 1.5 }}>
              Tap below to open Venmo. Once sent, come back here to complete the next step.
            </p>
            <button onClick={handlePay} style={{ width: "100%", background: "#008CFF", color: "#fff", border: "none", padding: "13px 0", borderRadius: 6, fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>Ⓥ</span> {current.btnText}
            </button>
            <button onClick={onClose} style={{ marginTop: 10, width: "100%", background: "none", border: "1px solid #DDD9D3", padding: "10px 0", borderRadius: 6, color: "#888", cursor: "pointer", fontSize: 13 }}>Cancel</button>
          </>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h3 style={{ margin: "0 0 8px", color: "#1A1A18" }}>You're all set!</h3>
            <p style={{ fontSize: 14, color: "#666", margin: "0 0 20px" }}>Both payments sent. Message the seller to arrange pickup or shipping.</p>
            <button onClick={onClose} style={{ width: "100%", background: "#1A1A18", color: "#fff", border: "none", padding: "12px 0", borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ListingModal({ listing, onClose, onBoost, onSold }) {
  const [buying, setBuying] = useState(false);
  const [confirmSold, setConfirmSold] = useState(false);
  const [soldVenmo, setSoldVenmo] = useState("");
  const [soldError, setSoldError] = useState("");
  if (!listing) return null;

  const handleSoldVerify = () => {
    if (soldVenmo.replace("@","").toLowerCase() === (listing.venmo || "").toLowerCase()) {
      onSold(listing.id);
      onClose();
    } else {
      setSoldError("That Venmo handle doesn't match. Only the seller can remove this listing.");
    }
  };
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16
      }} onClick={onClose}>
        <div style={{
          background: "#fff", borderRadius: 10, padding: 28, maxWidth: 420, width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)"
        }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 56, textAlign: "center", marginBottom: 16 }}>{listing.img}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: "#1A1A18" }}>{listing.title}</h2>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#C9973A" }}>${listing.price}</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Badge text={listing.condition} />
            <span style={{ fontSize: 12, color: "#888", padding: "2px 8px", background: "#F5F4F1", borderRadius: 3 }}>{listing.category}</span>
            {listing.boosted && <span style={{ fontSize: 12, color: "#C9973A", padding: "2px 8px", background: "#FFF8EC", borderRadius: 3, fontWeight: 700 }}>⚡ Boosted</span>}
          </div>
          <p style={{ fontSize: 14, color: "#444", lineHeight: 1.6, marginBottom: 20 }}>{listing.description || listing.desc}</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button style={{ flex: 1, background: "#1A1A18", color: "#fff", border: "none", padding: "11px 0", borderRadius: 5, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Message Seller</button>
            <button onClick={() => setBuying(true)} style={{ flex: 1, background: "#C9973A", color: "#fff", border: "none", padding: "11px 0", borderRadius: 5, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Buy Now</button>
          </div>
          {!listing.boosted && (
            <button onClick={() => { onClose(); onBoost(listing); }} style={{
              width: "100%", background: "none", border: "1.5px solid #C9973A",
              padding: "9px 0", borderRadius: 5, color: "#C9973A", cursor: "pointer",
              fontSize: 13, fontWeight: 700, marginBottom: 8
            }}>⚡ Boost this listing — $3</button>
          )}
          {!confirmSold ? (
            <button onClick={() => setConfirmSold(true)} style={{
              width: "100%", background: "none", border: "1px solid #2A7A4B",
              padding: "9px 0", borderRadius: 5, color: "#2A7A4B", cursor: "pointer",
              fontSize: 13, fontWeight: 700, marginBottom: 8
            }}>✓ Mark as sold</button>
          ) : (
            <div style={{ background: "#F0FAF4", border: "1.5px solid #2A7A4B", borderRadius: 6, padding: "12px", marginBottom: 8 }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, color: "#2A7A4B", fontWeight: 600 }}>Enter your Venmo to confirm:</p>
              <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #DDD9D3", borderRadius: 6, overflow: "hidden", marginBottom: 8, background: "#fff" }}>
                <span style={{ background: "#F5F4F1", padding: "8px 10px", fontSize: 14, color: "#888", borderRight: "1px solid #DDD9D3" }}>@</span>
                <input value={soldVenmo} onChange={e => setSoldVenmo(e.target.value.replace("@",""))} placeholder="yourvenmo"
                  style={{ flex: 1, border: "none", padding: "8px 12px", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
              </div>
              {soldError && <p style={{ color: "#8A4A2A", fontSize: 12, margin: "0 0 8px" }}>{soldError}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setConfirmSold(false); setSoldError(""); }} style={{ flex: 1, background: "none", border: "1px solid #DDD9D3", padding: "8px 0", borderRadius: 5, color: "#888", cursor: "pointer", fontSize: 13 }}>Cancel</button>
                <button onClick={handleSoldVerify} style={{ flex: 1, background: "#2A7A4B", border: "none", padding: "8px 0", borderRadius: 5, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Remove listing</button>
              </div>
            </div>
          )}
          <button onClick={onClose} style={{ width: "100%", background: "none", border: "1px solid #DDD9D3", padding: "9px 0", borderRadius: 5, color: "#888", cursor: "pointer", fontSize: 13 }}>Close</button>
        </div>
      </div>
      {buying && <BuyModal listing={listing} onClose={() => setBuying(false)} />}
    </>
  );
}

function BoostModal({ listing, onClose, onConfirm }) {
  const [paid, setPaid] = useState(false);
  const [venmoInput, setVenmoInput] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = () => {
    if (venmoInput.replace("@","").toLowerCase() === (listing.venmo || "").toLowerCase()) {
      setVerified(true);
      setError("");
    } else {
      setError("That Venmo handle doesn't match this listing. Only the seller can boost.");
    }
  };

  const handlePay = () => {
    payVenmo({ amount: BOOST_FEE, note: `flip. listing boost: "${listing.title}"` });
    setPaid(true);
  };

  const handleDone = () => { onConfirm(listing.id); onClose(); };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 28, maxWidth: 380, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
        {!verified ? (
          <>
            <div style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }}>🔒</div>
            <h2 style={{ margin: "0 0 6px", fontSize: 18, color: "#1A1A18", textAlign: "center" }}>Seller verification</h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#888", textAlign: "center", lineHeight: 1.5 }}>Enter the Venmo handle you listed with to boost this listing.</p>
            <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #DDD9D3", borderRadius: 6, overflow: "hidden", marginBottom: 8 }}>
              <span style={{ background: "#F5F4F1", padding: "9px 10px", fontSize: 14, color: "#888", borderRight: "1px solid #DDD9D3" }}>@</span>
              <input value={venmoInput} onChange={e => setVenmoInput(e.target.value.replace("@",""))} placeholder="yourvenmo"
                style={{ flex: 1, border: "none", padding: "9px 12px", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            </div>
            {error && <p style={{ color: "#8A4A2A", fontSize: 12, margin: "0 0 12px" }}>{error}</p>}
            <button onClick={handleVerify} style={{ width: "100%", background: "#C9973A", color: "#fff", border: "none", padding: "12px 0", borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 8 }}>Verify</button>
            <button onClick={onClose} style={{ width: "100%", background: "none", border: "1px solid #DDD9D3", padding: "10px 0", borderRadius: 6, color: "#888", cursor: "pointer", fontSize: 13 }}>Cancel</button>
          </>
        ) : !paid ? (
          <>
            <div style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }}>⚡</div>
            <h2 style={{ margin: "0 0 6px", fontSize: 18, color: "#1A1A18", textAlign: "center" }}>Boost your listing</h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#888", textAlign: "center", lineHeight: 1.5 }}>
              Pin <strong>"{listing.title}"</strong> to the top of results and get a featured border.
            </p>
            <div style={{ background: "#FFF8EC", border: "1.5px solid #C9973A", borderRadius: 8, padding: 14, marginBottom: 20, textAlign: "center" }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: "#C9973A" }}>${BOOST_FEE}</span>
              <span style={{ fontSize: 13, color: "#888", display: "block" }}>one-time · instant</span>
            </div>
            <button onClick={handlePay} style={{ width: "100%", background: "#008CFF", color: "#fff", border: "none", padding: "13px 0", borderRadius: 6, fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>Ⓥ</span> Pay $3 on Venmo
            </button>
            <button onClick={onClose} style={{ marginTop: 10, width: "100%", background: "none", border: "1px solid #DDD9D3", padding: "10px 0", borderRadius: 6, color: "#888", cursor: "pointer", fontSize: 13 }}>Maybe later</button>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
            <h3 style={{ margin: "0 0 8px", color: "#1A1A18" }}>Payment sent!</h3>
            <p style={{ fontSize: 14, color: "#666", margin: "0 0 20px" }}>Tap below to activate your boost.</p>
            <button onClick={handleDone} style={{ width: "100%", background: "#C9973A", color: "#fff", border: "none", padding: "12px 0", borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Activate Boost ⚡</button>
          </div>
        )}
      </div>
    </div>
  );
}

function SellModal({ onClose, onPublish }) {
  const [step, setStep] = useState("quick");
  const [rough, setRough] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title:"", price:"", condition:"Good", category:"Electronics", desc:"", venmo:"" });
  const [agreed, setAgreed] = useState(false);

  const handleAI = async () => {
    if (!rough.trim()) return;
    setLoading(true); setError("");
    try {
      const result = await aiGenerateListing(rough);
      setForm({ title: result.title||"", price: String(result.price||""), condition: result.condition||"Good", category: result.category||"Other", desc: result.desc||"" });
      setStep("form");
    } catch(e) {
      setError("Couldn't generate listing. Fill in manually below.");
      setStep("form");
    } finally { setLoading(false); }
  };

  const handlePublish = async () => {
    if (!form.title || !form.price || !form.venmo || !agreed) return;
    setLoading(true);
    try {
      await onPublish({ id: Date.now(), title: form.title, price: parseInt(form.price), condition: form.condition, category: form.category, desc: form.desc, venmo: form.venmo, img: "📦", views: 0, boosted: false });
      onClose();
    } catch(e) {
      setError("Failed to publish. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 28, maxWidth: 460, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, color: "#1A1A18" }}>List something</h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#888" }}>Describe what you're selling and we'll fill in the details.</p>

        {step === "quick" && (
          <>
            <textarea value={rough} onChange={e => setRough(e.target.value)}
              placeholder='e.g. "Sony headphones, noise cancelling, used for 6 months, good shape, box included"'
              rows={4} style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #DDD9D3", borderRadius: 6, padding: "10px 12px", fontSize: 14, lineHeight: 1.5, fontFamily: "inherit", resize: "vertical", outline: "none", color: "#1A1A18" }} />
            <button onClick={handleAI} disabled={loading || !rough.trim()} style={{ marginTop: 12, width: "100%", background: loading ? "#888" : "#C9973A", color: "#fff", border: "none", padding: "12px 0", borderRadius: 6, fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Generating your listing…" : "✦ Generate listing"}
            </button>
            <button onClick={() => setStep("form")} style={{ marginTop: 8, width: "100%", background: "none", border: "1px solid #DDD9D3", padding: "10px 0", borderRadius: 6, color: "#888", cursor: "pointer", fontSize: 13 }}>Fill in manually</button>
          </>
        )}

        {step === "form" && (
          <>
            {error && <p style={{ color: "#8A4A2A", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            {[{ label:"Title", key:"title", type:"text", placeholder:"What are you selling?" }, { label:"Price (USD)", key:"price", type:"number", placeholder:"0" }].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 4 }}>{f.label}</label>
                <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                  style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #DDD9D3", borderRadius: 6, padding: "9px 12px", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              {[{ label:"Condition", key:"condition", options:CONDITIONS }, { label:"Category", key:"category", options:CATEGORIES }].map(f => (
                <div key={f.key} style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 4 }}>{f.label}</label>
                  <select value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: "100%", border: "1.5px solid #DDD9D3", borderRadius: 6, padding: "9px 10px", fontSize: 13, fontFamily: "inherit", background: "#fff", outline: "none" }}>
                    {f.options.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 4 }}>Description</label>
              <textarea value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} rows={3} placeholder="A bit more about the item…"
                style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #DDD9D3", borderRadius: 6, padding: "9px 12px", fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none", lineHeight: 1.5 }} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 4 }}>Your Venmo username</label>
              <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #DDD9D3", borderRadius: 6, overflow: "hidden" }}>
                <span style={{ background: "#F5F4F1", padding: "9px 10px", fontSize: 14, color: "#888", borderRight: "1px solid #DDD9D3" }}>@</span>
                <input value={form.venmo} onChange={e => setForm(p => ({ ...p, venmo: e.target.value.replace("@","") }))} placeholder="yourvenmo"
                  style={{ flex: 1, border: "none", padding: "9px 12px", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#aaa" }}>Buyers will pay you directly at this handle.</p>
            </div>
            <div onClick={() => setAgreed(a => !a)} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16, cursor: "pointer", background: agreed ? "#F0FAF4" : "#FFF8EC", border: `1.5px solid ${agreed ? "#2A7A4B" : "#C9973A"}`, borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${agreed ? "#2A7A4B" : "#C9973A"}`, background: agreed ? "#2A7A4B" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                {agreed && <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, color: "#444", lineHeight: 1.5 }}>
                I agree to pay the <strong>8% platform fee</strong> to flip. after my item sells. Buyer pays me directly via Venmo/CashApp.
              </span>
            </div>

            <button onClick={handlePublish} disabled={!form.title || !form.price || !form.venmo || !agreed || loading}
              style={{ width: "100%", background: (!form.title || !form.price || !form.venmo || !agreed || loading) ? "#ccc" : "#1A1A18", color: "#fff", border: "none", padding: "12px 0", borderRadius: 6, fontWeight: 700, fontSize: 15, cursor: (!form.title || !form.price || !form.venmo || !agreed || loading) ? "not-allowed" : "pointer" }}>
              {loading ? "Publishing…" : "Publish listing"}
            </button>
            <button onClick={() => setStep("quick")} style={{ marginTop: 8, width: "100%", background: "none", border: "none", padding: "8px 0", color: "#C9973A", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← Try AI again</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── AI Chat Bot ──────────────────────────────────────────────────────
const BOT_SYSTEM = `You are Flip, a friendly assistant for flip. — a local resale marketplace. You help buyers find deals, help sellers price and list items, and answer questions about how the platform works.

Key facts about flip.:
- 8% platform fee paid by the seller after a sale
- Buyers pay sellers directly via Venmo or CashApp
- Sellers can boost their listing to the top for $3 (one-time)
- AI automatically generates listing titles, prices, and descriptions from a rough description
- Categories: Electronics, Clothing, Furniture, Books, Sports, Toys, Collectibles, Other
- Conditions: Like New, Great, Good, Fair, For Parts

Be concise, helpful, and a little casual. If someone describes an item they want to sell, suggest a price range. If someone asks about an item in the listings, help them decide if it's a good deal. Never make up listings that don't exist.`;

async function chatWithBot(messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: BOT_SYSTEM,
      messages,
    }),
  });
  const data = await res.json();
  return data.content?.find(b => b.type === "text")?.text || "Sorry, I ran into an issue. Try again!";
}

function ChatBot({ listings }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey! I'm Flip 👋 Ask me anything — pricing help, how the platform works, or whether a listing is worth it." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    // Give bot context about current listings
    const listingContext = listings.length
      ? `\n\nCurrent listings on the platform:\n${listings.map(l => `- ${l.title} ($${l.price}, ${l.condition}, ${l.category}): ${l.desc}`).join("\n")}`
      : "";

    const apiMessages = next.map((m, i) => {
      if (i === 0 && m.role === "assistant") return null; // skip initial greeting in API call
      return m;
    }).filter(Boolean);

    // Inject listing context into last user message
    const withContext = apiMessages.map((m, i) =>
      i === apiMessages.length - 1 && m.role === "user"
        ? { ...m, content: m.content + listingContext }
        : m
    );

    try {
      const reply = await chatWithBot(withContext);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Try again!" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat bubble button */}
      <button onClick={() => setOpen(o => !o)} style={{
        position: "fixed", bottom: 90, right: 24, width: 52, height: 52,
        borderRadius: "50%", background: "#1A1A18", border: "2px solid #C9973A",
        color: "#fff", fontSize: 22, cursor: "pointer", zIndex: 50,
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {open ? "✕" : "💬"}
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: "fixed", bottom: 154, right: 24, width: 320, maxHeight: 420,
          background: "#fff", borderRadius: 12, boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
          display: "flex", flexDirection: "column", zIndex: 50,
          border: "1px solid #DDD9D3", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ background: "#1A1A18", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ADE80" }} />
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Flip Assistant</span>
            <span style={{ color: "#C9973A", fontSize: 11, marginLeft: "auto" }}>AI · flip.</span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "82%", padding: "8px 12px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: m.role === "user" ? "#C9973A" : "#F5F4F1",
                  color: m.role === "user" ? "#fff" : "#1A1A18",
                  fontSize: 13, lineHeight: 1.5,
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ background: "#F5F4F1", borderRadius: "12px 12px 12px 2px", padding: "8px 14px", fontSize: 18, color: "#888" }}>
                  <span style={{ animation: "pulse 1s infinite" }}>···</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid #DDD9D3", display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask anything…"
              style={{ flex: 1, border: "1.5px solid #DDD9D3", borderRadius: 20, padding: "7px 12px", fontSize: 13, outline: "none", fontFamily: "inherit" }}
            />
            <button onClick={send} disabled={!input.trim() || loading} style={{
              background: input.trim() && !loading ? "#C9973A" : "#ccc",
              border: "none", borderRadius: "50%", width: 34, height: 34,
              color: "#fff", fontWeight: 900, fontSize: 16, cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>↑</button>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  const [listings, setListings] = useState(DEMO_LISTINGS);
  const [loading, setLoading] = useState(!usingDemo);
  const [selected, setSelected] = useState(null);
  const [selling, setSelling] = useState(false);
  const [boostTarget, setBoostTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");

  // Load listings from Supabase on mount
  useEffect(() => {
    if (usingDemo) return;
    fetchListings()
      .then(data => { if (data) setListings(data); })
      .catch(err => console.error("Failed to load listings:", err))
      .finally(() => setLoading(false));
  }, []);

  const handlePublish = async (listing) => {
    if (usingDemo) {
      setListings(prev => [{ ...listing, created_at: new Date().toISOString() }, ...prev]);
      return;
    }
    try {
      const saved = await insertListing(listing);
      const newListing = Array.isArray(saved) ? saved[0] : saved;
      setListings(prev => [newListing, ...prev]);
    } catch (err) {
      console.error("Failed to save listing:", err);
      alert("Couldn't save: " + err.message);
    }
  };

  const handleBoostConfirm = async (id) => {
    if (usingDemo) {
      setListings(prev => {
        const boosted = prev.find(l => l.id === id);
        const rest = prev.filter(l => l.id !== id);
        return [{ ...boosted, boosted: true }, ...rest];
      });
      return;
    }
    try {
      await boostListing(id);
      setListings(prev => {
        const boosted = prev.find(l => l.id === id);
        const rest = prev.filter(l => l.id !== id);
        return [{ ...boosted, boosted: true }, ...rest];
      });
    } catch (err) {
      console.error("Boost failed:", err);
    }
  };

  const handleSold = async (id) => {
    try {
      await deleteListing(id);
      setListings(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error("Failed to delete listing:", err);
    }
  };

  const filtered = listings.filter(l => {
    const matchSearch = l.title.toLowerCase().includes(search.toLowerCase()) || (l.description || l.desc || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "All" || l.category === filterCat;
    return matchSearch && matchCat;
  });

  const sorted = [...filtered].sort((a, b) => (b.boosted ? 1 : 0) - (a.boosted ? 1 : 0));

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: "#F5F4F1", minHeight: "100vh" }}>
      <div style={{ background: "#1A1A18", padding: "0 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div>
            <span style={{ fontWeight: 900, fontSize: 20, color: "#fff", letterSpacing: "-0.02em" }}>flip</span>
            <span style={{ fontWeight: 900, fontSize: 20, color: "#C9973A", letterSpacing: "-0.02em" }}>.</span>
          </div>
          <button onClick={() => setSelling(true)} style={{ background: "#C9973A", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 5, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            + Sell something
          </button>
        </div>
      </div>

      <div style={{ background: "#232320", padding: "28px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={{ margin: "0 0 4px", color: "#C9973A", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Local resale, simplified</p>
          <h1 style={{ margin: "0 0 16px", color: "#fff", fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.2 }}>Describe it.<br/>We'll list it.</h1>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search listings…"
            style={{ width: "100%", maxWidth: 480, boxSizing: "border-box", border: "none", borderRadius: 6, padding: "11px 14px", fontSize: 14, outline: "none", background: "#fff", color: "#1A1A18" }} />
        </div>
      </div>

      <div style={{ background: "#fff", borderBottom: "1px solid #DDD9D3", padding: "0 20px", overflowX: "auto" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex" }}>
          {["All", ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)} style={{ background: "none", border: "none", padding: "12px 14px", fontSize: 13, fontWeight: filterCat === cat ? 700 : 400, color: filterCat === cat ? "#1A1A18" : "#888", borderBottom: filterCat === cat ? "2px solid #C9973A" : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap" }}>{cat}</button>
          ))}
        </div>
      </div>

      <div style={{ background: "#FFF8EC", borderBottom: "1px solid #F0E4C4", padding: "10px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#8A6A20", fontWeight: 600 }}>⚡ Sellers: boost your listing to the top for $3</span>
          <span style={{ fontSize: 12, color: "#aaa" }}>·</span>
          <span style={{ fontSize: 12, color: "#8A6A20" }}>8% platform fee on all sales</span>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
        {usingDemo && (
          <div style={{ background: "#FFF8EC", border: "1.5px solid #C9973A", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#8A6A20" }}>
            ⚠️ <strong>Demo mode</strong> — listings won't persist across devices. Add your Supabase credentials to go live.
          </div>
        )}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <p style={{ fontSize: 14 }}>Loading listings…</p>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: 15 }}>No listings match. <button onClick={() => setSelling(true)} style={{ background: "none", border: "none", color: "#C9973A", fontWeight: 700, cursor: "pointer", fontSize: 15 }}>Be the first to sell!</button></p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {sorted.map(l => <ListingCard key={l.id} listing={l} onClick={setSelected} />)}
          </div>
        )}
      </div>

      <button onClick={() => setSelling(true)} style={{ position: "fixed", bottom: 24, right: 24, background: "#C9973A", color: "#fff", border: "none", width: 56, height: 56, borderRadius: "50%", fontSize: 24, cursor: "pointer", boxShadow: "0 4px 20px rgba(201,151,58,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>+</button>

      {selected && <ListingModal listing={selected} onClose={() => setSelected(null)} onBoost={(l) => { setSelected(null); setBoostTarget(l); }} onSold={handleSold} />}
      {boostTarget && <BoostModal listing={boostTarget} onClose={() => setBoostTarget(null)} onConfirm={handleBoostConfirm} />}
      {selling && <SellModal onClose={() => setSelling(false)} onPublish={handlePublish} />}
      <ChatBot listings={listings} />
    </div>
  );
}