import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import GradientWaves from "../components/GradientWaves";
import FoldText from "../components/FoldText";
import LineSidebar from "../components/LineSidebar";
import "./Landing.css";

function Landing() {
  const navigate = useNavigate();
  const [showDemoContent, setShowDemoContent] = useState(true);

  // Check if user is already logged in
  const currentUser = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user"))
    : null;

  return (
    <div className="landing-root">
      {/* ── Background WebGL GradientWaves Canvas ── */}
      <div className="landing-bg-container">
        <GradientWaves
          horizonColor="#0284c7"
          waveColor="#7c3aed"
          crestColor="#06b6d4"
          speed={0.4}
          amplitude={3.0}
          waveScale={0.7}
          waveRatio={0.9}
          swell={40}
          turbulence={22}
          tilt={1.11}
          zoom={1}
          height={5.5}
          fogDepth={24}
          detail="medium"
          brightness={1.25}
          opacity={1}
          mouseInteraction={true}
          parallaxStrength={0.5}
          grain={true}
          grainIntensity={0.06}
        />
      </div>

      {/* ── Foreground Content ── */}
      <div className="landing-content-layer">
        {/* ── Floating Header Navbar ── */}
        <header className="landing-header-wrap">
          <nav className="landing-navbar">
            <div className="landing-nav-brand">
              <div className="landing-logo-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
              <span className="landing-brand-title">TMS Pro</span>
            </div>

            <div className="landing-nav-links">
              <a href="#features" className="landing-nav-link">Features</a>
              <a href="#workflow" className="landing-nav-link">About</a>
            </div>

            <div className="landing-nav-actions">
              {currentUser ? (
                <button
                  className="landing-btn-signin"
                  onClick={() =>
                    navigate(currentUser.role === "admin" ? "/admin" : "/tasks")
                  }
                >
                  Dashboard →
                </button>
              ) : (
                <>
                  <Link to="/login" className="landing-nav-link-login">
                    Sign in
                  </Link>
                  <Link to="/register" className="landing-btn-signup">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>

        {/* ── Hero Section ── */}
        <main className="landing-hero-section">
          {/* Badge */}
          <div className="landing-hero-badge">
            <span className="landing-badge-pill">⚡ TMS 2.0</span>
            <span className="landing-badge-text">Real-Time Task Management & Workflows</span>
          </div>

          {/* 3D Fold Animated Headline */}
          <div className="landing-fold-headline-wrap">
            <FoldText
              text="Task Management"
              splitBy="char"
              hinge="top"
              trigger="mount"
              duration={0.65}
              stagger={0.045}
              ease="power3.out"
              perspective={700}
              creaseShading={0.55}
              fontSize="clamp(2.8rem, 6.5vw, 5.2rem)"
              fontWeight={800}
              color="#ffffff"
            />
          </div>

          <p className="landing-hero-subtitle">
            Plan, collaborate, and track tasks effortlessly with real-time updates,
            interactive Kanban boards, and high-performance workflows.
          </p>

          {/* Action Buttons */}
          <div className="landing-hero-buttons">
            <button
              className="landing-btn-primary"
              onClick={() =>
                navigate(
                  currentUser
                    ? currentUser.role === "admin"
                      ? "/admin"
                      : "/tasks"
                    : "/register"
                )
              }
            >
              Get started
            </button>
            <button
              className="landing-btn-secondary"
              onClick={() => {
                const el = document.getElementById("features");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Learn more
            </button>
          </div>

          {/* Demo Content Toggle Switch */}
          <div className="landing-demo-toggle-wrap">
            <span className="landing-toggle-label">Demo Content</span>
            <label className="landing-toggle-switch">
              <input
                type="checkbox"
                checked={showDemoContent}
                onChange={(e) => setShowDemoContent(e.target.checked)}
              />
              <span className="landing-slider"></span>
            </label>
          </div>
        </main>

        {/* ── Features & Preview Section ── */}
        {showDemoContent && (
          <section id="features" className="landing-features-container">
            <div className="landing-features-grid">
              {/* Feature 1 */}
              <div className="landing-feature-card">
                <div className="landing-feature-icon">⚡</div>
                <h3>Real-time Tracking</h3>
                <p>
                  Instant status updates and progress visualization with minimal latency.
                </p>
                <div className="landing-card-tag">High Performance</div>
              </div>

              {/* Feature 2 */}
              <div className="landing-feature-card">
                <div className="landing-feature-icon">📊</div>
                <h3>Kanban & Calendar</h3>
                <p>
                  Visualize sprint cycles, drag-and-drop cards, and schedule deadlines seamlessly.
                </p>
                <div className="landing-card-tag">Visual Workflow</div>
              </div>

              {/* Feature 3 */}
              <div className="landing-feature-card">
                <div className="landing-feature-icon">🛡️</div>
                <h3>Role-Based Access</h3>
                <p>
                  Dedicated dashboards with advanced analytics for admins and clean task feeds for users.
                </p>
                <div className="landing-card-tag">Enterprise Security</div>
              </div>
            </div>

            {/* ── Interactive Line Sidebar Showcase ── */}
            <div className="landing-linesidebar-section" style={{
              marginTop: 36,
              padding: "32px 36px",
              background: "rgba(10, 20, 35, 0.75)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 32,
              flexWrap: "wrap",
            }}>
              <div style={{ maxWidth: 460 }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#06b6d4",
                  background: "rgba(6, 182, 212, 0.15)",
                  padding: "4px 12px",
                  borderRadius: 20,
                  marginBottom: 12,
                }}>
                  ✨ Interactive Line Slider
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", marginBottom: 8 }}>
                  Fluid Cursor Proximity Navigation
                </h3>
                <p style={{ color: "rgba(248, 250, 252, 0.7)", fontSize: 14, lineHeight: 1.6 }}>
                  Hover over the lines on the right to experience smooth exponential lerp physics and reactive marker scaling.
                </p>
              </div>

              <div style={{ padding: "10px 20px" }}>
                <LineSidebar
                  items={['Overview', 'Components', 'Animations', 'Backgrounds', 'Showcase']}
                  accentColor="#06b6d4"
                  textColor="#94a3b8"
                  markerColor="#475569"
                  showIndex
                  showMarker
                  proximityRadius={100}
                  maxShift={30}
                  falloff="smooth"
                  markerLength={60}
                  markerGap={0}
                  tickScale={0.5}
                  scaleTick
                  itemGap={18}
                  fontSize={1.05}
                  smoothing={100}
                  defaultActive={0}
                  onItemClick={(index, label) => console.log(index, label)}
                />
              </div>
            </div>

            {/* Quick CTA Banner */}
            <div className="landing-cta-banner" id="workflow">
              <div className="landing-cta-text">
                <h2>Ready to streamline your workflow?</h2>
                <p>Join teams managing tasks faster with zero friction.</p>
              </div>
              <div className="landing-cta-btns">
                <Link to="/register" className="landing-btn-primary">
                  Create Free Account
                </Link>
                <Link to="/login" className="landing-btn-outline">
                  Sign In
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── Footer ── */}
        <footer className="landing-footer">
          <p>© {new Date().getFullYear()} Task Management System. Engineered with React & WebGL.</p>
          <div className="landing-footer-links">
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
            <a href="https://reactbits.dev" target="_blank" rel="noreferrer">
              Powered by React Bits
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Landing;
