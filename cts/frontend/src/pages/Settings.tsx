import { useState } from "react";
import { ShieldCheck, MapPin, KeyRound, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";

export default function Settings() {
  const [city, setCity] = useState("Mumbai");
  const [locationResult, setLocationResult] = useState<{ is_new_location: boolean; message: string } | null>(null);
  const [captcha, setCaptcha] = useState<{ code: string } | null>(null);
  const [captchaInput, setCaptchaInput] = useState("");
  const [verified, setVerified] = useState(false);
  const { show } = useToast();

  async function checkLocation() {
    const res = await api.post<{ is_new_location: boolean; message: string }>("/security/location-verification", { city });
    setLocationResult(res);
    if (res.is_new_location) {
      const c = await api.get<{ code: string }>("/security/captcha");
      setCaptcha(c);
      setVerified(false);
    }
  }

  async function verifyCaptcha() {
    if (!captcha) return;
    const res = await api.post<{ verified: boolean; message: string }>("/security/captcha", {
      code: captchaInput,
      expected: captcha.code,
    });
    if (res.verified) {
      setVerified(true);
      show("Identity verified.", "success");
    } else {
      show(res.message, "error");
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 pb-10">
      <div>
        <h2 className="font-display text-2xl text-cream mb-1.5">Settings</h2>
        <p className="text-sm text-mist">Security preferences and activity verification.</p>
      </div>

      <div className="ledger-card p-6">
        <h3 className="font-display text-lg text-cream mb-1 flex items-center gap-2">
          <ShieldCheck size={17} className="text-success" /> Secure processing
        </h3>
        <p className="text-sm text-mist mb-1">Your cheque image is processed securely.</p>
        <p className="text-xs text-mist/70">
          CTS never uses the AI assistant to make final financial verification decisions — all outcomes come from
          the deterministic rules engine.
        </p>
      </div>

      <div className="ledger-card p-6">
        <h3 className="font-display text-lg text-cream mb-1 flex items-center gap-2">
          <MapPin size={17} className="text-gold-500" /> Location verification
        </h3>
        <p className="text-xs text-mist mb-4">
          Simulate a cheque upload from a given city to see CTS's location-security signal in action.
        </p>
        <div className="flex gap-2 mb-3">
          <input value={city} onChange={(e) => setCity(e.target.value)} className="input-field" placeholder="City" />
          <button onClick={checkLocation} className="btn-secondary whitespace-nowrap">Simulate Upload</button>
        </div>
        {locationResult && (
          <div className={`rounded-sm border p-3.5 text-sm ${locationResult.is_new_location ? "border-warn/30 bg-warn/5 text-cream" : "border-success/30 bg-success/5 text-cream"}`}>
            {locationResult.is_new_location ? "⚠ New activity detected" : "✓ Familiar location"}
            <p className="text-xs text-mist mt-1">{locationResult.message}</p>
          </div>
        )}

        {captcha && !verified && (
          <div className="mt-4 rounded-sm border border-ink-border p-4">
            <p className="text-sm text-cream mb-1 flex items-center gap-1.5"><KeyRound size={14} className="text-gold-500" /> Verify it's you</p>
            <p className="text-xs text-mist mb-3">Enter the verification code shown below.</p>
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-lg tracking-[0.3em] bg-ink-950 border border-ink-border rounded-sm px-3 py-1.5 text-gold-500">
                {captcha.code}
              </span>
            </div>
            <div className="flex gap-2">
              <input value={captchaInput} onChange={(e) => setCaptchaInput(e.target.value)} className="input-field font-mono" placeholder="Enter code" />
              <button onClick={verifyCaptcha} className="btn-primary whitespace-nowrap">Verify</button>
            </div>
          </div>
        )}

        {verified && (
          <div className="mt-4 flex items-center gap-2 text-success text-sm">
            <CheckCircle2 size={15} /> Identity verified — your cheque upload can continue.
          </div>
        )}
      </div>
    </div>
  );
}
