import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import API from "../services/taskApi";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData]     = useState({ email: "", password: "" });
  const [loading, setLoading]       = useState(false);
  const [googleLoading, setGLoading] = useState(false);
  const [error, setError]           = useState("");

  const handleChange = (e) => {
    setError("");
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ── Email / password login ────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!formData.email || !formData.password) {
      setError("Email and password are required");
      return;
    }
    try {
      setLoading(true);
      const res = await API.post("/auth/login", formData);
      saveAndRedirect(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // ── Google login (ID token flow via @react-oauth/google) ──────
  // useGoogleLogin with flow:"implicit" gives us an access_token.
  // We use the credential callback approach instead (oneTap / popup).
  const handleGoogleSuccess = async (tokenResponse) => {
    // tokenResponse.access_token → exchange for user info, OR
    // use the credential (ID token) flow. Here we use access_token
    // to fetch user info from Google, then send the ID token.
    setError("");
    setGLoading(true);
    try {
      // Fetch the ID token directly by posting to our backend using access_token
      // We actually need the credential (ID token). Use the credential flow.
      const res = await API.post("/auth/google", {
        credential: tokenResponse.credential,
      });
      saveAndRedirect(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Google sign-in failed. Please try again.");
    } finally {
      setGLoading(false);
    }
  };

  // Use GoogleLogin component approach (renders Google's official button)
  // We render a custom button and trigger the flow ourselves.
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      // This gives us an access_token. We need to exchange it for user info
      // and send to our backend. But our backend expects an ID token (credential).
      // Best approach: use the credential (CredentialResponse) flow via GoogleLogin component.
      setGLoading(false);
    },
    onError: () => {
      setError("Google sign-in was cancelled or failed.");
      setGLoading(false);
    },
  });

  const saveAndRedirect = ({ token, user }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    navigate(user.role === "admin" ? "/admin" : "/tasks");
  };

  return (
    <div className="login-page">

      {/* ── Left panel ── */}
      <div className="login-left">
        <div className="login-brand">
          <span className="login-brand-name">TMS</span>
        </div>
        <h2 className="login-tagline">Task management<br />that stays out of your way.</h2>
        <p className="login-sub">Assign, track and complete work — without the noise.</p>
        <div className="login-features">
          {[
            "Role-based access for admins and users",
            "Real-time in-app notifications",
            "File attachments on every task",
            "Priority levels and due dates",
          ].map((f) => (
            <div className="login-feature" key={f}>
              <span className="login-feature-dot" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-card-header">
            <div className="login-logo">TMS</div>
            <h1>Sign in</h1>
            <p>Enter your credentials to continue</p>
          </div>

          {/* Error banner */}
          {error && <div className="login-error">{error}</div>}

          {/* Google button — uses GoogleLogin component for proper ID token flow */}
          <GoogleSignInButton
            onSuccess={saveAndRedirect}
            onError={(msg) => setError(msg)}
          />

          {/* Divider */}
          <div className="login-divider">
            <span className="login-divider-line" />
            <span className="login-divider-text">or continue with email</span>
            <span className="login-divider-line" />
          </div>

          {/* Email / password form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <div className="input-with-icon">
                <svg className="input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  id="email" type="email" name="email"
                  placeholder="you@example.com"
                  value={formData.email} onChange={handleChange}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <svg className="input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="password" type="password" name="password"
                  placeholder="Enter your password"
                  value={formData.password} onChange={handleChange}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button type="submit" className="primary-button login-button" disabled={loading}>
              {loading
                ? <span className="btn-loading"><span className="spinner" /> Signing in…</span>
                : "Sign In"
              }
            </button>
          </form>

          {/* Create Account link */}
          <div className="register-signin-link">
            <p>
              Don't have an account?{" "}
              <a href="/register" className="link">
                Create one
              </a>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

/* ── Separate component so it can import GoogleLogin cleanly ── */
import { GoogleLogin } from "@react-oauth/google";

function GoogleSignInButton({ onSuccess, onError }) {
  const handleSuccess = async (credentialResponse) => {
    try {
      const res = await API.post("/auth/google", {
        credential: credentialResponse.credential,
      });
      onSuccess(res.data);
    } catch (err) {
      onError(err.response?.data?.message || "Google sign-in failed. Please try again.");
    }
  };

  return (
    <div className="google-btn-wrap">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => onError("Google sign-in was cancelled or failed.")}
        useOneTap={false}
        theme="outline"
        size="large"
        width="100%"
        text="signin_with"
        shape="rectangular"
      />
    </div>
  );
}

export default Login;
