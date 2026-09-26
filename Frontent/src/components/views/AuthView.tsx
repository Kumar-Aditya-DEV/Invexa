import React, { useState, useEffect } from 'react';
import { useStockSense } from '../../context/StockSenseContext';
import {
  Boxes,
  Lock,
  Mail,
  User,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  Sparkles,
  Building2
} from 'lucide-react';

export const AuthView: React.FC = () => {
  const { login, registerUser, showToast, setActiveView } = useStockSense();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'otp' | 'reset'>('login');

  // Login State
  const [loginId, setLoginId] = useState('alex.rivera');
  const [loginPassword, setLoginPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register State
  const [regFullName, setRegFullName] = useState('');
  const [regLoginId, setRegLoginId] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState('Inventory Manager');

  // Forgot / OTP / Reset State
  const [resetEmail, setResetEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(60);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Password Validation Rules for Registration
  const hasMinLen = regPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(regPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(regPassword);
  const isLoginIdValid = regLoginId.length >= 6 && regLoginId.length <= 12 && /^[a-zA-Z0-9._-]+$/.test(regLoginId);

  // Timer effect for OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mode === 'otp' && otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [mode, otpTimer]);

  // Handle Login Submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !loginPassword.trim()) {
      showToast('Please enter both Login ID and Password', 'warning');
      return;
    }

    login(loginId, 'Inventory Manager');
    showToast(`Welcome back, ${loginId}!`, 'success');
    setActiveView('dashboard');
  };

  // Handle Register Submit
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim() || !regLoginId.trim() || !regEmail.trim()) {
      showToast('Please fill all required fields', 'warning');
      return;
    }
    if (!isLoginIdValid) {
      showToast('Login ID must be 6-12 alphanumeric characters', 'danger');
      return;
    }
    if (!hasMinLen || !hasUpperCase || !hasSpecial) {
      showToast('Password does not meet security requirements', 'danger');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      showToast('Passwords do not match', 'danger');
      return;
    }

    registerUser({
      fullName: regFullName,
      loginId: regLoginId,
      email: regEmail,
    });

    showToast('Account registered successfully! Please sign in.', 'success');
    setLoginId(regLoginId);
    setMode('login');
  };

  // Handle Forgot Password Request
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      showToast('Please enter your email or Login ID', 'warning');
      return;
    }
    setOtpTimer(60);
    setMode('otp');
    showToast('6-Digit OTP security code sent to ' + resetEmail, 'info');
  };

  // Handle OTP digit changes
  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    const newArr = [...otpDigits];
    newArr[index] = val;
    setOtpDigits(newArr);

    // Auto move to next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otpDigits.join('');
    if (enteredOtp.length < 6) {
      showToast('Please enter the complete 6-digit verification code', 'warning');
      return;
    }
    showToast('OTP verified successfully! Set your new password.', 'success');
    setMode('reset');
  };

  // Handle Reset Password Submit
  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'warning');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast('Passwords do not match', 'danger');
      return;
    }
    showToast('Password reset successfully! You can now log in.', 'success');
    setMode('login');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 animate-fade-in">
        {/* Left Branding Side (Desktop) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white p-1 flex items-center justify-center shadow-lg shrink-0">
                <img src="/invexa_logo.png" alt="INVEXA Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-2xl font-black tracking-tight text-white">INVEXA</span>
                <span className="block text-[10px] uppercase font-bold tracking-widest text-blue-200">Smart Inventory ERP</span>
              </div>
            </div>

            <div className="mt-10 space-y-3">
              <h2 className="text-2xl font-bold leading-tight">
                Smart Inventory. <br />Simple Control.
              </h2>
              <p className="text-xs text-blue-100/80 leading-relaxed">
                Empower your enterprise supply chain with real-time stock matrix balancing, automated replenishment rules, and immutable audit logs.
              </p>
            </div>
          </div>

          <div className="my-8 space-y-3">
            <div className="flex items-center gap-2.5 text-xs text-blue-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Multi-Warehouse & Rack Location Hierarchy</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-blue-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Zero-Stock-Drift Internal Transfers</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-blue-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Automated Over-Delivery Prevention</span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-blue-200/60">
            <span>INVEXA Core v2.4</span>
            <span>Cryptographic Ledger Active</span>
          </div>
        </div>

        {/* Right Form Side */}
        <div className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-center">
          {/* LOGIN MODE */}
          {mode === 'login' && (
            <div className="space-y-6 animate-scale-up">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sign In to INVEXA</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Access your warehouse operations dashboard and live inventory balance
                </p>
              </div>

              {/* Quick Demo Credentials helper */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs flex items-center justify-between text-blue-800 dark:text-blue-300">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Demo Login: <strong>alex.rivera</strong> / <strong>Admin@123</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLoginId('alex.rivera');
                    setLoginPassword('Admin@123');
                  }}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 underline"
                >
                  Auto-fill
                </button>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Login ID or Corporate Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      placeholder="e.g. alex.rivera or alex@stocksense.io"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400">Remember this workstation</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  Sign In to Portal
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="pt-4 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                Don't have an enterprise account?{' '}
                <button
                  onClick={() => setMode('register')}
                  className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                >
                  Create Account
                </button>
              </div>
            </div>
          )}

          {/* REGISTER MODE */}
          {mode === 'register' && (
            <div className="space-y-5 animate-scale-up">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create StockSense Account</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Join your organization's inventory control and supply chain network
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Connor"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Login ID (6-12 chars) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. sarah.c"
                      value={regLoginId}
                      onChange={(e) => setRegLoginId(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Role / Department
                    </label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="Inventory Manager">Inventory Manager</option>
                      <option value="Warehouse Operator">Warehouse Operator</option>
                      <option value="Supply Chain Auditor">Auditor / Quality</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Corporate Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="sarah@stocksense.io"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Min 8 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Repeat password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Password Strength Checklist */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[11px] space-y-1">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">Security Requirements:</div>
                  <div className="grid grid-cols-2 gap-1 text-slate-500">
                    <span className={`flex items-center gap-1 ${hasMinLen ? 'text-emerald-600 font-bold' : ''}`}>
                      <CheckCircle2 className="w-3 h-3" /> Min 8 Characters
                    </span>
                    <span className={`flex items-center gap-1 ${hasUpperCase ? 'text-emerald-600 font-bold' : ''}`}>
                      <CheckCircle2 className="w-3 h-3" /> 1 Uppercase Letter
                    </span>
                    <span className={`flex items-center gap-1 ${hasSpecial ? 'text-emerald-600 font-bold' : ''}`}>
                      <CheckCircle2 className="w-3 h-3" /> 1 Special Character
                    </span>
                    <span className={`flex items-center gap-1 ${isLoginIdValid ? 'text-emerald-600 font-bold' : ''}`}>
                      <CheckCircle2 className="w-3 h-3" /> 6-12 Char Login ID
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  Complete Registration
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="pt-3 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                Already registered?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                >
                  Sign In
                </button>
              </div>
            </div>
          )}

          {/* FORGOT PASSWORD MODE */}
          {mode === 'forgot' && (
            <div className="space-y-6 animate-scale-up">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Recover Password</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter your registered corporate email or Login ID to receive a 6-digit verification PIN
                </p>
              </div>

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email or Login ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="alex.rivera@stocksense.io"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  Send 6-Digit OTP Code
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="text-center">
                <button
                  onClick={() => setMode('login')}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* OTP VERIFICATION MODE */}
          {mode === 'otp' && (
            <div className="space-y-6 animate-scale-up">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Enter 6-Digit OTP</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  We have sent a verification code to <strong>{resetEmail || 'your email'}</strong>
                </p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div className="flex items-center justify-center gap-2.5">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-input-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      className="w-11 h-12 text-center text-lg font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    />
                  ))}
                </div>

                <div className="text-center text-xs text-slate-500">
                  {otpTimer > 0 ? (
                    <span>Code expires in <strong className="text-blue-600">{otpTimer}s</strong></span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOtpTimer(60)}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Resend Code
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  Verify Code
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="text-center">
                <button
                  onClick={() => setMode('forgot')}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold"
                >
                  Change Email / ID
                </button>
              </div>
            </div>
          )}

          {/* RESET PASSWORD MODE */}
          {mode === 'reset' && (
            <div className="space-y-6 animate-scale-up">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create New Password</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Choose a strong, unique password for your account
                </p>
              </div>

              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Repeat new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  Update & Proceed to Sign In
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
