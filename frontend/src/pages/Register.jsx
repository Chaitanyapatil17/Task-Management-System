import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/taskApi";

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    setError("");
    setFieldErrors({});
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Validation logic
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    // Client-side validation
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setLoading(true);
      const res = await API.post("/auth/register", {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      if (res.data.success) {
        // Redirect to login after successful registration
        navigate("/login", {
          state: { message: "Registration successful! Please sign in with your credentials." },
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* ── Left panel ── */}
      <div className="login-left">
        <div className="login-brand">
          <span className="login-brand-name">TMS</span>
        </div>
        <h2 className="login-tagline">Join our task<br />management system.</h2>
        <p className="login-sub">Create an account to start managing your tasks efficiently.</p>
        <div className="login-features">
          {[
            "Access assigned tasks in real-time",
            "Receive in-app notifications",
            "Attach files to track progress",
            "Set priorities and due dates",
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
            <h1>Create Account</h1>
            <p>Sign up to get started</p>
          </div>

          {/* Error banner */}
          {error && <div className="login-error">{error}</div>}

          {/* Registration form */}
          <form onSubmit={handleSubmit} className="login-form">
            {/* Name field */}
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <div className="input-with-icon">
                <svg className="input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  autoComplete="name"
                  className={fieldErrors.name ? "input-error" : ""}
                />
              </div>
              {fieldErrors.name && <span className="form-error">{fieldErrors.name}</span>}
            </div>

            {/* Email field */}
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <svg className="input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  className={fieldErrors.email ? "input-error" : ""}
                />
              </div>
              {fieldErrors.email && <span className="form-error">{fieldErrors.email}</span>}
            </div>

            {/* Password field */}
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <svg className="input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  className={fieldErrors.password ? "input-error" : ""}
                />
              </div>
              {fieldErrors.password && <span className="form-error">{fieldErrors.password}</span>}
            </div>

            {/* Confirm Password field */}
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-with-icon">
                <svg className="input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  className={fieldErrors.confirmPassword ? "input-error" : ""}
                />
              </div>
              {fieldErrors.confirmPassword && <span className="form-error">{fieldErrors.confirmPassword}</span>}
            </div>

            <button type="submit" className="primary-button login-button" disabled={loading}>
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner" /> Creating account…
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Sign In link */}
          <div className="register-signin-link">
            <p>
              Already have an account?{" "}
              <Link to="/login" className="link">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
