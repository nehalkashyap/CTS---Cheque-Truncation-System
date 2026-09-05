import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MailCheck } from "lucide-react";
import { api } from "../lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-md">
        <div className="ledger-card p-7 shadow-card">
          {!sent ? (
            <>
              <h1 className="font-display text-2xl text-cream mb-1.5">Reset your password</h1>
              <p className="text-sm text-mist mb-6">Enter your registered email address.</p>
              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label className="label-text">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="input-field"
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-success/10 border border-success/30 flex items-center justify-center text-success mx-auto mb-4">
                <MailCheck size={22} />
              </div>
              <h2 className="font-display text-xl text-cream mb-2">Check your email</h2>
              <p className="text-sm text-mist">
                Reset instructions have been sent to your registered email.
              </p>
            </div>
          )}
          <Link to="/login" className="flex items-center gap-1.5 justify-center text-sm text-gold-500 hover:text-gold-400 mt-6">
            <ArrowLeft size={14} />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
