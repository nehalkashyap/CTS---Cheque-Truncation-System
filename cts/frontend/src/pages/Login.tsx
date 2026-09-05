import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const [email, setEmail] = useState("demo@cts.bank");
  const [password, setPassword] = useState("cts@demo123");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password, rememberMe);
      navigate("/dashboard");
    } catch {
      show("Invalid email or password.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 px-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
        backgroundImage: "repeating-linear-gradient(0deg, #D6A84F 0px, #D6A84F 1px, transparent 1px, transparent 32px)",
      }} />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="font-display text-3xl text-cream tracking-tight">CTS</span>
          </div>
          <svg viewBox="0 0 220 24" className="mx-auto w-40 h-6 mb-3" fill="none">
            <path
              d="M2 18 C 20 4, 35 22, 52 12 S 80 2, 95 16 S 120 22, 138 8 S 165 4, 182 14 S 205 20, 218 10"
              stroke="#D6A84F"
              strokeWidth="1.6"
              strokeLinecap="round"
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
              className="animate-draw"
            />
          </svg>
          <p className="text-mist text-sm">Cheque processing, made transparent.</p>
        </div>

        <form onSubmit={handleSubmit} className="ledger-card p-6 sm:p-7 shadow-card">
          <div className="mb-4">
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

          <div className="mb-4">
            <label className="label-text">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-mist hover:text-cream"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center gap-2 text-sm text-mist cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-gold-500"
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-sm text-gold-500 hover:text-gold-400">
              Forgot password?
            </Link>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            <Lock size={15} />
            {loading ? "Signing in…" : "Sign in securely"}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-mist mt-5">
            <ShieldCheck size={13} className="text-success" />
            Your banking information is encrypted and protected.
          </p>
        </form>

        <p className="text-center text-xs text-mist/70 mt-5">
          Demo credentials — demo@cts.bank / cts@demo123
        </p>
      </div>
    </div>
  );
}
