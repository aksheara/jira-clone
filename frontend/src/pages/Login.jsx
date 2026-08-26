import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Unverified account flow
  const [unverifiedEmail, setUnverifiedEmail] = useState(null); // set when backend says account is unverified
  const [verifyOtp, setVerifyOtp] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [resendVerifyCooldown, setResendVerifyCooldown] = useState(0);
  const [resendVerifySuccess, setResendVerifySuccess] = useState("");

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: verify email & dispatch OTP, 2: enter OTP + new password, 3: success
  const [forgotEmail, setForgotEmail] = useState("");
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { login, verifyCode } = useAuth();
  const navigate = useNavigate();

  // Countdown timer for resend verification code
  useEffect(() => {
    let timer;
    if (resendVerifyCooldown > 0) {
      timer = setTimeout(() => setResendVerifyCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendVerifyCooldown]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter both email and password");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate("/projects");
    } catch (err) {
      // Account exists but email not verified yet
      if (err?.response?.status === 403 && err?.response?.data?.unverified) {
        setUnverifiedEmail(err.response.data.email || email.trim().toLowerCase());
        setResendVerifyCooldown(30);
        return;
      }
      const msg =
        err?.response?.data?.non_field_errors?.[0] ||
        err?.response?.data?.detail ||
        "Invalid email or password. Please check your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // Verify the OTP code for unverified accounts
  async function handleVerifyOtpSubmit(e) {
    e.preventDefault();
    const cleanCode = verifyOtp.trim();
    if (cleanCode.length !== 6) {
      setVerifyError("Please enter the complete 6-digit verification code.");
      return;
    }
    setVerifyError("");
    setVerifyLoading(true);
    try {
      await verifyCode(unverifiedEmail, cleanCode, "REGISTRATION");
      navigate("/projects");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Invalid or expired code. Please try again.";
      setVerifyError(msg);
    } finally {
      setVerifyLoading(false);
    }
  }

  // Resend verification OTP for unverified account
  async function handleResendVerifyCode() {
    if (resendVerifyCooldown > 0) return;
    setVerifyError("");
    setResendVerifySuccess("");
    setVerifyLoading(true);
    try {
      await api.post("/auth/resend-code/", {
        email: unverifiedEmail,
        purpose: "REGISTRATION",
      });
      setResendVerifySuccess("A fresh verification code has been sent to your email.");
      setResendVerifyCooldown(30);
    } catch (err) {
      setVerifyError(err?.response?.data?.detail || "Could not resend code. Please try again.");
    } finally {
      setVerifyLoading(false);
    }
  }

  // Step 1: Check if email exists in database & dispatch OTP reset code
  async function handleVerifyExistingEmail(e) {
    e.preventDefault();
    const query = forgotEmail.trim().toLowerCase();
    if (!query) {
      setForgotError("Please enter your registered email address.");
      return;
    }
    setForgotError("");
    setForgotLoading(true);

    try {
      const res = await api.post("/auth/verify-email/", { email: query });
      if (res.data?.exists) {
        setVerifiedUser(res.data);
        setForgotStep(2);
        setResendCooldown(30);
      } else {
        setForgotError(`No registered account found with email "${query}".`);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        `No registered account found for "${query}". Only existing accounts can reset their password.`;
      setForgotError(msg);
    } finally {
      setForgotLoading(false);
    }
  }

  const hasResetMinLength = newPassword.length >= 8;
  const hasResetUpper = /[A-Z]/.test(newPassword);
  const hasResetLower = /[a-z]/.test(newPassword);
  const hasResetNumber = /[0-9]/.test(newPassword);
  const hasResetSpecial = /[!@#$%^&*(),.?":{}|<>\-_=+[\]\\;/`~]/.test(newPassword);
  const isResetPasswordValid = hasResetMinLength && hasResetUpper && hasResetLower && hasResetNumber && hasResetSpecial;

  // Step 2: Validate OTP code and update password
  async function handleResetPasswordSubmit(e) {
    e.preventDefault();
    const cleanCode = resetOtp.trim();
    if (cleanCode.length !== 6) {
      setForgotError("Please enter the complete 6-digit verification code sent to your email.");
      return;
    }
    if (!isResetPasswordValid) {
      setForgotError("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special symbol.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError("Passwords do not match. Please check and try again.");
      return;
    }

    setForgotError("");
    setForgotLoading(true);

    try {
      await api.post("/auth/reset-password/", {
        email: forgotEmail.trim().toLowerCase(),
        code: cleanCode,
        new_password: newPassword,
      });
      setForgotStep(3);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Could not update password. Please check your OTP code.";
      setForgotError(msg);
    } finally {
      setForgotLoading(false);
    }
  }

  // Resend reset code
  async function handleResendResetCode() {
    setForgotError("");
    setForgotLoading(true);
    try {
      await api.post("/auth/verify-email/", { email: forgotEmail.trim().toLowerCase() });
      setResendCooldown(30);
    } catch (err) {
      setForgotError("Could not resend code. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  function closeForgotModal() {
    setShowForgotModal(false);
    setForgotStep(1);
    setForgotEmail("");
    setVerifiedUser(null);
    setResetOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setForgotError("");
    setForgotLoading(false);
  }

  return (
    <div className="jira-auth-page">
      {/* Dynamic Background Elements */}
      <div className="jira-auth-bg-blob jira-auth-bg-blob-1"></div>
      <div className="jira-auth-bg-blob jira-auth-bg-blob-2"></div>
      <div className="jira-auth-bg-pattern"></div>

      <div className="jira-auth-container jira-auth-single-card">
        {/* Auth Form Card */}
        <div className="jira-auth-card">
          <div className="jira-auth-card-inner">
            {/* Top Brand Logo */}
            <div className="jira-auth-header-brand">
              <div className="jira-auth-logo">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <path
                    d="M15.938 1.5C11.517 1.5 7.938 5.08 7.938 9.5V15.5H13.938C18.359 15.5 21.938 11.92 21.938 7.5V1.5H15.938Z"
                    fill="#0052CC"
                  />
                  <path
                    d="M23.938 9.5C19.517 9.5 15.938 13.08 15.938 17.5V23.5H21.938C26.359 23.5 29.938 19.92 29.938 15.5V9.5H23.938Z"
                    fill="#2684FF"
                  />
                  <path
                    d="M7.938 17.5C3.517 17.5 -0.062 21.08 -0.062 25.5V31.5H5.938C10.359 31.5 13.938 27.92 13.938 23.5V17.5H7.938Z"
                    fill="#0052CC"
                  />
                </svg>
              </div>
              <span className="jira-auth-brand-name">Jira Software</span>
            </div>

            {/* Header / Nav switcher */}
            <div className="jira-auth-tabs">
              <button
                type="button"
                className="jira-auth-tab active"
                disabled
              >
                Log In
              </button>
              <Link to="/register" className="jira-auth-tab">
                Sign Up
              </Link>
            </div>

            <div className="jira-auth-title-area">
              <h2 className="jira-auth-main-title">
                {unverifiedEmail ? "Verify your email" : "Log in to your account"}
              </h2>
              <p className="jira-auth-main-subtitle">
                {unverifiedEmail
                  ? `Enter the 6-digit verification code sent to ${unverifiedEmail}`
                  : "Enter your credentials to access your Jira projects and team boards."}
              </p>
            </div>

            {/* Unverified account — OTP verification step */}
            {unverifiedEmail ? (
              <>
                {verifyError && (
                  <div className="jira-auth-alert-error">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <div className="jira-auth-alert-msg">{verifyError}</div>
                  </div>
                )}
                {resendVerifySuccess && (
                  <div className="jira-auth-verified-badge" style={{ marginBottom: 16 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#006644" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>{resendVerifySuccess}</span>
                  </div>
                )}
                <form onSubmit={handleVerifyOtpSubmit} className="jira-auth-form">
                  <div className="jira-auth-otp-hero">
                    <div className="jira-auth-otp-badge">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                    </div>
                    <span className="jira-auth-otp-email-label">{unverifiedEmail}</span>
                  </div>
                  <div className="jira-form-group">
                    <label className="jira-form-label" htmlFor="verify-otp" style={{ textAlign: "center", display: "block" }}>
                      Enter 6-Digit Code
                    </label>
                    <input
                      id="verify-otp"
                      type="text"
                      className="jira-form-input jira-otp-input-field"
                      placeholder="• • • • • •"
                      maxLength={6}
                      value={verifyOtp}
                      onChange={(e) => setVerifyOtp(e.target.value.replace(/[^0-9]/g, ""))}
                      autoFocus
                      required
                    />
                    <span style={{ fontSize: 12, color: "#6B778C", textAlign: "center", display: "block", marginTop: 4 }}>
                      Code expires in 15 minutes.
                    </span>
                  </div>
                  <button
                    type="submit"
                    className="jira-auth-submit-btn"
                    disabled={verifyLoading || verifyOtp.length !== 6}
                  >
                    {verifyLoading ? (
                      <span className="jira-btn-spinner-wrap">
                        <span className="jira-btn-spinner"></span>
                        Verifying Code...
                      </span>
                    ) : (
                      <span>Verify & Log In &rarr;</span>
                    )}
                  </button>
                  <div className="jira-auth-resend-row">
                    <button
                      type="button"
                      className="jira-btn-resend"
                      onClick={handleResendVerifyCode}
                      disabled={resendVerifyCooldown > 0 || verifyLoading}
                    >
                      {resendVerifyCooldown > 0 ? `Resend code in ${resendVerifyCooldown}s` : "Resend Code"}
                    </button>
                    <button
                      type="button"
                      className="jira-btn-change-email"
                      onClick={() => {
                        setUnverifiedEmail(null);
                        setVerifyOtp("");
                        setVerifyError("");
                        setResendVerifySuccess("");
                      }}
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              </>
            ) : (
            <>
            {error && (
              <div className="jira-auth-alert-error">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div className="jira-auth-alert-msg">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="jira-auth-form">
              <div className="jira-form-group">
                <label className="jira-form-label" htmlFor="login-email">
                  Email Address
                </label>
                <div className="jira-input-wrapper">
                  <span className="jira-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    className="jira-form-input"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="jira-form-group">
                <div className="jira-form-label-row">
                  <label className="jira-form-label" htmlFor="login-password">
                    Password
                  </label>
                  <button
                    type="button"
                    className="jira-forgot-pwd-link"
                    onClick={() => {
                      setForgotError("");
                      setForgotStep(1);
                      setShowForgotModal(true);
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="jira-input-wrapper">
                  <span className="jira-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    className="jira-form-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="jira-input-action-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="jira-auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <span className="jira-btn-spinner-wrap">
                    <span className="jira-btn-spinner"></span>
                    Authenticating...
                  </span>
                ) : (
                  <span>Continue &rarr;</span>
                )}
              </button>
            </form>

            <div className="jira-auth-divider">
              <span>Or</span>
            </div>

            <div className="jira-auth-switch-prompt">
              Don’t have an account yet?{" "}
              <Link to="/register" className="jira-auth-link">
                Sign up for free
              </Link>
            </div>

            <div className="jira-auth-legal">
              By logging in, you agree to the Atlassian Cloud Terms of Service and Privacy Policy.
            </div>
            </>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password / Account Recovery Modal */}
      {showForgotModal && (
        <div className="jira-modal-overlay" onClick={closeForgotModal}>
          <div className="jira-auth-modal-box" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="jira-auth-modal-header">
              <div className="jira-auth-modal-icon-badge">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  <circle cx="12" cy="16" r="1"></circle>
                </svg>
              </div>
              <div>
                <h3 className="jira-auth-modal-title">
                  {forgotStep === 1 && "Find Your Account"}
                  {forgotStep === 2 && "Enter Code & Reset"}
                  {forgotStep === 3 && "Password Updated"}
                </h3>
                <p className="jira-auth-modal-desc">
                  {forgotStep === 1 && "Enter your registered email address to receive a 6-digit reset code."}
                  {forgotStep === 2 && `Enter the 6-digit code sent to ${forgotEmail}`}
                  {forgotStep === 3 && "Your credentials have been securely updated."}
                </p>
              </div>
            </div>

            {/* Error Message */}
            {forgotError && (
              <div className="jira-auth-alert-error" style={{ marginTop: 12, marginBottom: 12 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div className="jira-auth-alert-msg">{forgotError}</div>
              </div>
            )}

            {/* STEP 1: Verify Existing Email / Account */}
            {forgotStep === 1 && (
              <form onSubmit={handleVerifyExistingEmail} className="jira-auth-form" style={{ marginTop: 14 }}>
                <div className="jira-form-group">
                  <label className="jira-form-label" htmlFor="forgot-email">
                    Registered Email Address <span style={{ color: "#DE350B" }}>*</span>
                  </label>
                  <div className="jira-input-wrapper">
                    <span className="jira-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                    </span>
                    <input
                      id="forgot-email"
                      type="text"
                      className={`jira-form-input ${forgotError ? "jira-input-has-error" : ""}`}
                      placeholder="e.g. alex@gmail.com"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        if (forgotError) setForgotError("");
                      }}
                      required
                      autoFocus
                    />
                  </div>
                  <span style={{ fontSize: 12, color: "#6B778C", marginTop: 3 }}>
                    A 6-digit verification code will be dispatched to this inbox.
                  </span>
                </div>

                <div className="jira-auth-modal-actions">
                  <button
                    type="button"
                    className="jira-btn-cancel"
                    onClick={closeForgotModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="jira-auth-submit-btn"
                    style={{ flex: 1, margin: 0 }}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <span className="jira-btn-spinner-wrap">
                        <span className="jira-btn-spinner"></span>
                        Sending Code...
                      </span>
                    ) : (
                      "Send Reset Code &rarr;"
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Enter OTP + New Password */}
            {forgotStep === 2 && (
              <form onSubmit={handleResetPasswordSubmit} className="jira-auth-form" style={{ marginTop: 14 }}>
                <div className="jira-auth-verified-badge">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#006644" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>
                    Code sent to <strong>{forgotEmail}</strong>
                  </span>
                </div>

                <div className="jira-form-group">
                  <label className="jira-form-label" htmlFor="reset-otp-input">
                    6-Digit Verification Code <span style={{ color: "#DE350B" }}>*</span>
                  </label>
                  <input
                    id="reset-otp-input"
                    type="text"
                    className="jira-form-input jira-otp-input-field"
                    placeholder="• • • • • •"
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/[^0-9]/g, ""))}
                    required
                    autoFocus
                  />
                </div>

                <div className="jira-form-group">
                  <label className="jira-form-label" htmlFor="new-password">
                    New Password <span style={{ color: "#DE350B" }}>*</span>
                  </label>
                  <div className="jira-input-wrapper">
                    <span className="jira-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </span>
                    <input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      className="jira-form-input"
                      placeholder="Enter new password (min. 8 chars)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="jira-input-action-btn"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Password Requirements Checklist */}
                  <div className="jira-pwd-requirements-card">
                    <div className="jira-pwd-req-title">Password must contain:</div>
                    <div className="jira-pwd-req-grid">
                      <div className={`jira-pwd-req-item ${hasResetMinLength ? "satisfied" : ""}`}>
                        <span className="jira-pwd-req-icon">{hasResetMinLength ? "✓" : "○"}</span>
                        <span>8+ chars</span>
                      </div>
                      <div className={`jira-pwd-req-item ${hasResetUpper ? "satisfied" : ""}`}>
                        <span className="jira-pwd-req-icon">{hasResetUpper ? "✓" : "○"}</span>
                        <span>Uppercase</span>
                      </div>
                      <div className={`jira-pwd-req-item ${hasResetLower ? "satisfied" : ""}`}>
                        <span className="jira-pwd-req-icon">{hasResetLower ? "✓" : "○"}</span>
                        <span>Lowercase</span>
                      </div>
                      <div className={`jira-pwd-req-item ${hasResetNumber ? "satisfied" : ""}`}>
                        <span className="jira-pwd-req-icon">{hasResetNumber ? "✓" : "○"}</span>
                        <span>Number</span>
                      </div>
                      <div className={`jira-pwd-req-item ${hasResetSpecial ? "satisfied" : ""}`}>
                        <span className="jira-pwd-req-icon">{hasResetSpecial ? "✓" : "○"}</span>
                        <span>Special symbol</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="jira-form-group">
                  <label className="jira-form-label" htmlFor="confirm-password">
                    Confirm New Password <span style={{ color: "#DE350B" }}>*</span>
                  </label>
                  <div className="jira-input-wrapper">
                    <span className="jira-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </span>
                    <input
                      id="confirm-password"
                      type={showNewPassword ? "text" : "password"}
                      className="jira-form-input"
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="jira-auth-modal-actions">
                  <button
                    type="button"
                    className="jira-btn-cancel"
                    onClick={() => {
                      setForgotStep(1);
                      setForgotError("");
                    }}
                  >
                    &larr; Back
                  </button>
                  <button
                    type="submit"
                    className="jira-auth-submit-btn"
                    style={{ flex: 1, margin: 0 }}
                    disabled={forgotLoading || resetOtp.length !== 6}
                  >
                    {forgotLoading ? (
                      <span className="jira-btn-spinner-wrap">
                        <span className="jira-btn-spinner"></span>
                        Updating Password...
                      </span>
                    ) : (
                      "Set New Password"
                    )}
                  </button>
                </div>

                <div style={{ textAlign: "center", marginTop: 8 }}>
                  <button
                    type="button"
                    className="jira-btn-resend"
                    onClick={handleResendResetCode}
                    disabled={resendCooldown > 0 || forgotLoading}
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend Code"}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Success Confirmation */}
            {forgotStep === 3 && (
              <div className="jira-auth-forgot-success">
                <div className="jira-forgot-success-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00875A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h4>Password successfully updated!</h4>
                <p>
                  Your password has been changed. You can now log in to your account with your new credentials.
                </p>
                <button
                  type="button"
                  className="jira-auth-submit-btn"
                  style={{ marginTop: 16 }}
                  onClick={closeForgotModal}
                >
                  Log In Now &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
