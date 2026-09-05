import { useEffect, useState } from "react";
import { ShieldCheck, UploadCloud, PenLine } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type { Signature, SignatureAnalysis } from "../types";
import SignatureCanvas from "../components/SignatureCanvas";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { show } = useToast();
  const [form, setForm] = useState({
    name: "", phone: "", date_of_birth: "", address: "", city: "", state: "", pincode: "",
  });
  const [saving, setSaving] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneVerificationMode, setPhoneVerificationMode] = useState<"unverified" | "otp">("unverified");

  const [signature, setSignature] = useState<Signature | null>(null);
  const [mode, setMode] = useState<"upload" | "draw">("upload");
  const [analysis, setAnalysis] = useState<SignatureAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name, phone: user.phone, date_of_birth: user.date_of_birth,
        address: user.address, city: user.city, state: user.state, pincode: user.pincode,
      });
      setPhoneVerified(user.phone_verified);
      setPhoneVerificationMode(user.phone_verified ? "otp" : "unverified");
    }
    api.get<Signature | null>("/profile/signature").then(setSignature).catch(() => {});
  }, [user]);

  async function saveProfile() {
    setSaving(true);
    try {
      await api.put("/profile", form);
      await refreshUser();
      show("Profile updated.", "success");
    } catch {
      show("Couldn't save your profile.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function requestPhoneOtp() {
    try {
      const response = await api.post<{ message: string }>("/profile/phone/request-otp");
      setPhoneOtpSent(true);
      show(response.message, "success");
    } catch {
      show("Save a phone number before requesting an OTP.", "error");
    }
  }

  async function verifyPhoneOtp() {
    try {
      await api.post(`/profile/phone/verify-otp?otp=${encodeURIComponent(phoneOtp)}`);
    } catch {
      show("Enter a valid phone OTP.", "error");
      return;
    }
    setPhoneVerified(true);
    setPhoneOtpSent(false);
    setPhoneOtp("");
    await refreshUser();
    show("Phone number verified.", "success");
  }

  async function analyzeAndMaybeUpload(file: File, alsoSave: boolean) {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await api.post<SignatureAnalysis>("/profile/signature/analyze", fd);
      setAnalysis(result);
      if (alsoSave) {
        const fd2 = new FormData();
        fd2.append("file", file);
        const sig = await api.post<Signature>("/profile/signature", fd2);
        setSignature(sig);
        show("Signature enrolled.", "success");
      }
    } catch {
      show("Couldn't analyze that image.", "error");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleDrawnSave(blob: Blob) {
    setSavingSignature(true);
    try {
      const file = new File([blob], "signature.png", { type: "image/png" });
      await analyzeAndMaybeUpload(file, true);
    } finally {
      setSavingSignature(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 pb-10">
      <div>
        <h2 className="font-display text-2xl text-cream mb-1.5">Profile</h2>
        <p className="text-sm text-mist">Manage your personal information and signature reference.</p>
      </div>

      {/* Personal Information */}
      <div className="ledger-card p-6">
        <h3 className="font-display text-lg text-cream mb-4">Personal Information</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Email" value={user?.email || ""} disabled />
          <div>
            <Field label="Phone" value={form.phone} onChange={(v) => { setForm({ ...form, phone: v }); setPhoneVerified(false); }} />
            <div className="flex items-center gap-2 mt-2">
              <select
                value={phoneVerified ? "otp" : phoneVerificationMode}
                onChange={(e) => setPhoneVerificationMode(e.target.value as "unverified" | "otp")}
                className="input-field !py-1.5 text-xs max-w-44"
                disabled={phoneVerified}
              >
                <option value="unverified">Not verified</option>
                <option value="otp">Verify with OTP</option>
              </select>
            </div>
            {phoneVerificationMode === "otp" && !phoneVerified && (
              <div className="flex flex-col gap-2 mt-2">
                <button onClick={requestPhoneOtp} className="text-xs text-gold-500 hover:text-gold-400 self-start">
                  {phoneOtpSent ? "Resend OTP" : "Send OTP to this number"}
                </button>
                {phoneOtpSent && (
                  <div className="flex gap-2">
                    <input value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit OTP" className="input-field font-mono !py-2" />
                    <button onClick={verifyPhoneOtp} className="btn-secondary !py-2 !px-3 text-xs">Verify</button>
                  </div>
                )}
              </div>
            )}
          </div>
          <Field label="Date of birth" type="date" value={form.date_of_birth} onChange={(v) => setForm({ ...form, date_of_birth: v })} />
        </div>
        <button onClick={saveProfile} disabled={saving} className="btn-primary mt-5">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Address & Security */}
      <div className="ledger-card p-6">
        <h3 className="font-display text-lg text-cream mb-1">Registered Address</h3>
        <p className="text-xs text-mist mb-4">
          Your registered address is used as an additional security signal when cheque activity occurs from a new location.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} full />
          <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
          <Field label="PIN code" value={form.pincode} onChange={(v) => setForm({ ...form, pincode: v })} />
        </div>
        <p className="flex items-center gap-1.5 text-xs text-mist mt-4">
          <ShieldCheck size={13} className="text-success" /> Secure processing — your address is never shown to other users.
        </p>
      </div>

      {/* Signature */}
      <div className="ledger-card p-6">
        <h3 className="font-display text-lg text-cream mb-1">My Signature</h3>
        <p className="text-xs text-mist mb-4">
          Your signature is used as a reference during cheque verification.
        </p>

        {signature && (
          <div className="ledger-card bg-ink-950 p-4 mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-cream mb-0.5">Current enrolled signature</p>
              <p className="text-xs text-mist font-mono">Quality score: {signature.quality_score.toFixed(0)} / 100</p>
            </div>
            <span className="text-success text-xs font-mono">✓ Active</span>
          </div>
        )}

        <div className="flex gap-1 bg-ink-950 border border-ink-border rounded-sm p-1 w-fit mb-4">
          <button
            onClick={() => setMode("upload")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm ${mode === "upload" ? "bg-gold-500 text-ink-950 font-semibold" : "text-mist"}`}
          >
            <UploadCloud size={13} /> Upload signature
          </button>
          <button
            onClick={() => setMode("draw")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm ${mode === "draw" ? "bg-gold-500 text-ink-950 font-semibold" : "text-mist"}`}
          >
            <PenLine size={13} /> Draw signature
          </button>
        </div>

        {mode === "upload" ? (
          <label className="ledger-card border-dashed flex flex-col items-center justify-center gap-2 py-10 cursor-pointer hover:border-gold-500/40 transition-colors">
            <input
              type="file"
              accept="image/*,.tif,.tiff"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && analyzeAndMaybeUpload(e.target.files[0], true)}
            />
            <UploadCloud size={20} className="text-gold-500" />
            <p className="text-sm text-cream">Click to upload a clear signature image</p>
          </label>
        ) : (
          <SignatureCanvas onSave={handleDrawnSave} saving={savingSignature} />
        )}

        {analyzing && <p className="text-xs text-mist mt-3">Analyzing signature quality…</p>}

        {analysis && (
          <div className="ledger-card bg-ink-950 p-4 mt-4">
            <p className="text-sm text-cream mb-3">Signature Quality</p>
            <ScoreBar label="Clarity" value={analysis.clarity_score} />
            <ScoreBar label="Stroke consistency" value={analysis.stroke_score} />
            <ScoreBar label="Contrast" value={analysis.contrast_score} />
            <ScoreBar label="Background" value={analysis.background_score} />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-mist">Overall quality</span>
              <span className="font-mono text-xl text-gold-500">{analysis.quality_score.toFixed(0)} / 100</span>
            </div>
            <p className={`text-xs mt-2 ${analysis.quality_score >= 80 ? "text-success" : "text-warn"}`}>
              {analysis.quality_score >= 80 ? "✓ " : "⚠ "}
              {analysis.verdict}
            </p>
            {analysis.suggestions.length > 0 && (
              <ul className="text-xs text-mist mt-2 list-disc list-inside space-y-0.5">
                {analysis.suggestions.map((s) => <li key={s}>{s}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, disabled, type = "text", full,
}: {
  label: string; value: string; onChange?: (v: string) => void; disabled?: boolean; type?: string; full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="label-text">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="input-field disabled:opacity-60"
      />
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-mist">{label}</span>
        <span className="font-mono text-cream">{value.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden">
        <div
          className={`h-full ${value >= 80 ? "bg-success" : value >= 60 ? "bg-warn" : "bg-danger"}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}
