import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud, RotateCw, Trash2, ZoomIn, ChevronDown, CheckCircle2, XCircle, AlertCircle, ShieldCheck,
} from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";
import type { BankAccount, VerificationResult } from "../types";
import { DEMO_SCENARIOS, SUPPORTED_BANKS } from "../types";
import { formatINR, reasonLabel } from "../utils/format";
import * as UTIF from "utif";

type Stage = "upload" | "details" | "otp" | "verifying" | "result";

const PIPELINE_STEPS = [
  "Image quality",
  "Cheque boundaries detected",
  "Bank information detected",
  "Reading MICR",
  "Comparing signature",
  "Validating amount",
  "Checking date",
];

export default function AddCheque() {
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [rotation, setRotation] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [bankAccountId, setBankAccountId] = useState("");
  const [newBank, setNewBank] = useState({
    bank_name: SUPPORTED_BANKS[0],
    account_number: "",
    ifsc: "",
    account_type: "Savings",
  });
  const [amount, setAmount] = useState("");
  const [amountWords, setAmountWords] = useState("");
  const [payee, setPayee] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [demoOpen, setDemoOpen] = useState(false);
  const [scenario, setScenario] = useState("success");

  const [stepIndex, setStepIndex] = useState(0);
  const [chequeId, setChequeId] = useState<string | null>(null);
  const [displayId, setDisplayId] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [chequeOtp, setChequeOtp] = useState("");
  const [chequeOtpSent, setChequeOtpSent] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { show } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.get<BankAccount[]>("/banks").then((list) => {
      setBanks(list);
      const def = list.find((b) => b.is_default) || list[0];
      if (def) setBankAccountId(def.id);
    });
  }, []);

  async function handleFile(f: File) {
    setFile(f);
    if (f.type === "image/tiff" || /\.tiff?$/i.test(f.name)) {
      try {
        const buffer = await f.arrayBuffer();
        const ifds = UTIF.decode(buffer);
        if (!ifds.length) throw new Error("TIFF has no image frames");
        UTIF.decodeImage(buffer, ifds[0]);
        const rgba = UTIF.toRGBA8(ifds[0]);
        const canvas = document.createElement("canvas");
        canvas.width = ifds[0].width;
        canvas.height = ifds[0].height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas is unavailable");
        context.putImageData(new ImageData(new Uint8ClampedArray(rgba), canvas.width, canvas.height), 0, 0);
        setPreview(canvas.toDataURL("image/png"));
      } catch {
        setPreview("");
      }
    } else {
      setPreview(URL.createObjectURL(f));
    }
    setStage("details");
  }

  const isTiff = file?.type === "image/tiff" || /\.tiff?$/i.test(file?.name ?? "");

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  async function handleVerify() {
    if (!bankAccountId) {
      show("Select a bank account and enter the amount.", "error");
      return;
    }
    if (!amount) {
      show("Enter the cheque amount.", "error");
      return;
    }

    setStage("verifying");
    setStepIndex(0);

    try {
      let selectedBankId = bankAccountId;

      if (bankAccountId === "new") {
        if (!newBank.account_number || !newBank.ifsc) {
          show("Enter the new bank account number and IFSC code.", "error");
          setStage("details");
          return;
        }
        const createdBank = await api.post<BankAccount>("/banks", newBank);
        selectedBankId = createdBank.id;
        setBanks((current) => [...current, createdBank]);
        setBankAccountId(createdBank.id);
      }

      const formData = new FormData();
      formData.append("bank_account_id", selectedBankId);
      formData.append("amount_numeric", amount);
      formData.append("amount_words", amountWords || `${amount} Rupees Only`);
      formData.append("payee", payee);
      formData.append("cheque_date", chequeDate);
      formData.append("demo_scenario", scenario);
      if (file) formData.append("file", file);

      const cheque = await api.post<{ id: string; display_id: string }>("/cheques", formData);
      setChequeId(cheque.id);
      setDisplayId(cheque.display_id);
      const otpResponse = await api.post<{ message: string }>(`/cheques/${cheque.id}/request-otp`);
      setChequeOtpSent(true);
      show(otpResponse.message, "success");
      setStage("otp");
    } catch {
      show("Something went wrong while processing your cheque. Your cheque has NOT been submitted.", "error");
      setStage("details");
    }
  }

  async function verifyChequeOtp() {
    if (!chequeId || !chequeOtp.trim()) {
      show("Enter the OTP sent to your mobile.", "error");
      return;
    }
    try {
      await api.post(`/cheques/${chequeId}/verify-otp?otp=${encodeURIComponent(chequeOtp.trim())}`);
      setStage("verifying");
      setStepIndex(0);
      // Animate through the pipeline steps for a realistic feel, then fetch the real decision.
      for (let i = 0; i < PIPELINE_STEPS.length; i++) {
        await new Promise((r) => setTimeout(r, 420));
        setStepIndex(i + 1);
      }

      const verification = await api.post<VerificationResult>(`/cheques/${chequeId}/verify`);
      await new Promise((r) => setTimeout(r, 400));
      setResult(verification);
      setStage("result");
    } catch {
      show("Invalid or expired OTP. Please try again.", "error");
    }
  }

  function resetFlow() {
    setStage("upload");
    setFile(null);
    setPreview("");
    setResult(null);
    setChequeId(null);
    setChequeOtp("");
    setChequeOtpSent(false);
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 pb-10">
      {stage !== "result" && (
        <div>
          <h2 className="font-display text-2xl text-cream mb-1.5">Deposit a cheque</h2>
          <p className="text-sm text-mist">
            Upload a clear photo and CTS will verify the cheque before processing.
          </p>
        </div>
      )}

      {stage === "upload" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`ledger-card border-dashed flex flex-col items-center justify-center gap-3 py-16 px-6 cursor-pointer transition-colors ${
            dragOver ? "border-gold-500 bg-ink-800/40" : "hover:border-gold-500/40"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.tif,.tiff"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="w-12 h-12 rounded-full bg-ink-800 border border-ink-border flex items-center justify-center text-gold-500">
            <UploadCloud size={22} />
          </div>
          <p className="text-cream font-medium">Drop your cheque here</p>
          <p className="text-sm text-mist">or click to browse</p>
          <p className="text-xs text-mist/60 font-mono">JPG • PNG • TIF • max 10MB</p>
        </div>
      )}

      {stage === "details" && (
        <div className="flex flex-col gap-6">
          <div className="ledger-card p-4">
            <div className="relative rounded-sm overflow-hidden border border-ink-border">
              {isTiff && !preview ? (
                <div className="w-full h-48 flex flex-col items-center justify-center gap-2 bg-ink-950 text-mist">
                  <UploadCloud size={24} className="text-gold-500" />
                  <span className="text-sm">TIFF image ready to upload</span>
                  <span className="text-xs text-mist/60 font-mono">{file?.name}</span>
                </div>
              ) : (
                <img
                  src={preview}
                  alt="Cheque preview"
                  style={{ transform: `rotate(${rotation}deg)` }}
                  className="w-full max-h-72 object-contain bg-ink-950"
                />
              )}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => fileInputRef.current?.click()} className="btn-ghost !px-2 text-xs">
                Replace
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.tif,.tiff"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <button onClick={() => setRotation((r) => r + 90)} className="btn-ghost !px-2 text-xs">
                <RotateCw size={13} /> Rotate
              </button>
              <button className="btn-ghost !px-2 text-xs">
                <ZoomIn size={13} /> Zoom
              </button>
              <button onClick={resetFlow} className="btn-ghost !px-2 text-xs text-danger ml-auto">
                <Trash2 size={13} /> Remove
              </button>
            </div>
          </div>

          <div className="ledger-card p-5 flex flex-col gap-4">
            <div>
              <label className="label-text">Bank account</label>
              <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className="input-field">
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bank_name} {b.masked_account_number}
                  </option>
                ))}
                <option value="new">+ Add new bank account</option>
              </select>
              {bankAccountId === "new" && (
                <div className="flex flex-col gap-4 mt-4 border-t border-ink-border pt-4">
                  <div>
                    <label className="label-text">Bank</label>
                    <select
                      value={newBank.bank_name}
                      onChange={(e) => setNewBank({ ...newBank, bank_name: e.target.value })}
                      className="input-field"
                    >
                      {SUPPORTED_BANKS.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-text">Account number</label>
                      <input
                        value={newBank.account_number}
                        onChange={(e) => setNewBank({ ...newBank, account_number: e.target.value })}
                        placeholder="0012345678214821"
                        className="input-field font-mono"
                      />
                    </div>
                    <div>
                      <label className="label-text">IFSC code</label>
                      <input
                        value={newBank.ifsc}
                        onChange={(e) => setNewBank({ ...newBank, ifsc: e.target.value.toUpperCase() })}
                        placeholder="HDFC0001234"
                        className="input-field font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label-text">Account type</label>
                    <select
                      value={newBank.account_type}
                      onChange={(e) => setNewBank({ ...newBank, account_type: e.target.value })}
                      className="input-field"
                    >
                      <option>Savings</option>
                      <option>Current</option>
                    </select>
                  </div>
                </div>
              )}
              {banks.find((b) => b.id === bankAccountId) && (
                <div className="grid grid-cols-2 gap-4 mt-3 text-xs">
                  <div>
                    <p className="text-mist mb-0.5">IFSC Code</p>
                    <p className="font-mono text-cream">{banks.find((b) => b.id === bankAccountId)?.ifsc}</p>
                  </div>
                  <div>
                    <p className="text-mist mb-0.5">Account</p>
                    <p className="font-mono text-cream">{banks.find((b) => b.id === bankAccountId)?.masked_account_number}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">Amount (₹)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="48500" className="input-field font-mono" />
              </div>
              <div>
                <label className="label-text">Cheque date</label>
                <input type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} className="input-field font-mono" />
              </div>
            </div>

            <div>
              <label className="label-text">Amount in words (optional)</label>
              <input value={amountWords} onChange={(e) => setAmountWords(e.target.value)} placeholder="Forty Eight Thousand Five Hundred Rupees" className="input-field" />
            </div>

            <div>
              <label className="label-text">Payee</label>
              <input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="Your name" className="input-field" />
            </div>
          </div>

          <div className="ledger-card p-4">
            <button onClick={() => setDemoOpen((o) => !o)} className="flex items-center justify-between w-full text-sm text-mist">
              <span>Demo Verification (hackathon controls)</span>
              <ChevronDown size={15} className={`transition-transform ${demoOpen ? "rotate-180" : ""}`} />
            </button>
            {demoOpen && (
              <div className="flex flex-col gap-1.5 mt-3">
                {DEMO_SCENARIOS.map((s) => (
                  <label key={s.key} className="flex items-center gap-2 text-sm text-mist cursor-pointer">
                    <input
                      type="radio"
                      name="scenario"
                      checked={scenario === s.key}
                      onChange={() => setScenario(s.key)}
                      className="accent-gold-500"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleVerify} className="btn-primary w-full">
            Verify Cheque
          </button>
        </div>
      )}

      {stage === "otp" && (
        <div className="ledger-card p-7 sm:p-8 flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gold-500/15 border border-gold-500/40 flex items-center justify-center text-gold-500">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="font-display text-xl text-cream mb-1">Confirm cheque processing</h3>
            <p className="text-sm text-mist">Enter the OTP sent to your verified mobile number to continue.</p>
          </div>
          <input
            value={chequeOtp}
            onChange={(e) => setChequeOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit OTP"
            inputMode="numeric"
            className="input-field font-mono text-center max-w-xs"
          />
          <button onClick={verifyChequeOtp} disabled={!chequeOtpSent} className="btn-primary w-full max-w-xs">
            Confirm and process cheque
          </button>
          <button onClick={() => setStage("details")} className="btn-ghost text-xs">Back to cheque details</button>
        </div>
      )}

      {stage === "verifying" && (
        <div className="ledger-card p-8 flex flex-col items-center">
          <h3 className="font-display text-xl text-cream mb-6">Analyzing your cheque...</h3>
          <div className="w-full max-w-sm flex flex-col gap-2.5 mb-6">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-2.5 text-sm">
                {i < stepIndex ? (
                  <CheckCircle2 size={15} className="text-success shrink-0" />
                ) : i === stepIndex ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-gold-500 border-t-transparent animate-spin shrink-0" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-ink-border shrink-0" />
                )}
                <span className={i < stepIndex ? "text-cream" : "text-mist"}>{step}</span>
              </div>
            ))}
          </div>
          <div className="w-full max-w-sm">
            <div className="flex justify-between text-xs text-mist mb-1.5">
              <span>Verification progress</span>
              <span className="font-mono">{Math.round((stepIndex / PIPELINE_STEPS.length) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-ink-800 overflow-hidden">
              <div
                className="h-full bg-gold-500 transition-all duration-500 ease-out"
                style={{ width: `${(stepIndex / PIPELINE_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {stage === "result" && result && (
        <ResultScreen
          result={result}
          displayId={displayId}
          amount={Number(amount)}
          bankName={banks.find((b) => b.id === bankAccountId)?.bank_name || ""}
          chequeId={chequeId!}
          onReset={resetFlow}
          onDashboard={() => navigate("/dashboard")}
        />
      )}
    </div>
  );
}

function ResultScreen({
  result, displayId, amount, bankName, chequeId, onReset, onDashboard,
}: {
  result: VerificationResult;
  displayId: string;
  amount: number;
  bankName: string;
  chequeId: string;
  onReset: () => void;
  onDashboard: () => void;
}) {
  const navigate = useNavigate();
  const accepted = result.decision === "accepted";
  const manual = result.decision === "manual_review";

  return (
    <div className="ledger-card p-7 sm:p-8 text-center">
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
          accepted ? "bg-success/10 text-success" : manual ? "bg-warn/10 text-warn" : "bg-danger/10 text-danger"
        }`}
      >
        {accepted ? <CheckCircle2 size={26} /> : manual ? <AlertCircle size={26} /> : <XCircle size={26} />}
      </div>
      <h2 className="font-display text-xl text-cream mb-1">
        {accepted ? "CHEQUE ACCEPTED" : manual ? "UNDER MANUAL REVIEW" : "CHEQUE REQUIRES ATTENTION"}
      </h2>
      <p className="text-sm text-mist mb-6">
        {accepted ? "Verification completed successfully." : result.message}
      </p>

      <p className="font-display text-3xl text-gold-500 mono-figure mb-1">{formatINR(amount)}</p>
      <p className="text-sm text-mist mb-1">{bankName}</p>
      <p className="text-xs text-mist/70 font-mono mb-6">Cheque ID: {displayId}</p>

      <div className="ledger-divider my-5" />

      <div className="text-left max-w-sm mx-auto flex flex-col gap-2 mb-6">
        <p className="text-xs text-mist mb-1">Verification checks</p>
        <CheckRow label="Signature verified" pass={result.checks.signature_match >= 75} score={result.checks.signature_match} />
        <CheckRow label="Amount matched" pass={result.checks.amount_match} />
        <CheckRow label="Date valid" pass={result.checks.date_valid} />
        <CheckRow label="MICR readable" pass={result.checks.micr_readable >= 70} score={result.checks.micr_readable} />
        <CheckRow label="Image quality sufficient" pass={result.checks.image_quality >= 70} score={result.checks.image_quality} />
      </div>

      <p className="text-xs text-mist mb-1">Verification confidence</p>
      <p className="font-mono text-2xl text-cream mb-6">{result.confidence.toFixed(1)}%</p>

      {!accepted && !manual && (
        <p className="text-xs text-danger mb-6 font-mono">Reason: {reasonLabel(result.reason)}</p>
      )}

      <div className="flex flex-col gap-2.5">
        {accepted || manual ? (
          <button onClick={() => navigate(`/cheques/${chequeId}`)} className="btn-primary w-full">View Receipt</button>
        ) : (
          <button onClick={onReset} className="btn-primary w-full">Upload Again</button>
        )}
        <button onClick={onDashboard} className="btn-secondary w-full">Back to Dashboard</button>
      </div>
    </div>
  );
}

function CheckRow({ label, pass, score }: { label: string; pass: boolean; score?: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-cream">
        {pass ? <CheckCircle2 size={14} className="text-success" /> : <XCircle size={14} className="text-danger" />}
        {label}
      </span>
      {score !== undefined && <span className="font-mono text-xs text-mist">{score.toFixed(1)}%</span>}
    </div>
  );
}
