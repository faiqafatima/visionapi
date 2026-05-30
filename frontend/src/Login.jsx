import { useState } from "react";
import axios from "axios";

const API = "https://visionapi-production-59c4.up.railway.app";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      if (isRegister) {
        await axios.post(`${API}/register`, { email, password });
        setIsRegister(false);
        setError("Account created! Please login.");
      } else {
        const form = new FormData();
        form.append("username", email);
        form.append("password", password);
        const res = await axios.post(`${API}/login`, form);
        onLogin(res.data.access_token);
      }
    } catch (e) {
      setError(e.response?.data?.detail || "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.left}>
        <div style={styles.leftContent}>
          <div style={styles.logo}>👁 VisionAPI</div>
          <h1 style={styles.headline}>Computer Vision<br />as a Service</h1>
          <p style={styles.desc}>Upload any image and get instant AI-powered object detection. Built with YOLOv8.</p>
          <div style={styles.features}>
            <div style={styles.feature}>🎯 Object Detection</div>
            <div style={styles.feature}>📊 Confidence Scores</div>
            <div style={styles.feature}>📁 Analysis History</div>
            <div style={styles.feature}>🔐 Secure Auth</div>
          </div>
          <img
            src="https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=500&auto=format&fit=crop"
            alt="AI Vision"
            style={styles.heroImg}
          />
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>{isRegister ? "Create Account" : "Welcome Back"}</h2>
          <p style={styles.cardSub}>{isRegister ? "Start detecting objects today" : "Sign in to your account"}</p>

          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.btn} onClick={handleSubmit} disabled={loading}>
            {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
          </button>

          <p style={styles.toggle}>
            {isRegister ? "Already have an account? " : "Don't have an account? "}
            <span style={styles.link} onClick={() => { setIsRegister(!isRegister); setError(""); }}>
              {isRegister ? "Sign In" : "Register Free"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { display: "flex", minHeight: "100vh", fontFamily: "'Inter', sans-serif" },
  left: { flex: 1, background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #93c5fd 100%)", padding: "48px", display: "flex", alignItems: "center", justifyContent: "center" },
  leftContent: { maxWidth: "440px" },
  logo: { fontSize: "22px", fontWeight: "800", color: "#fff", marginBottom: "32px", letterSpacing: "-0.5px" },
  headline: { fontSize: "42px", fontWeight: "800", color: "#fff", lineHeight: 1.2, margin: "0 0 16px" },
  desc: { color: "#bfdbfe", fontSize: "16px", lineHeight: 1.6, marginBottom: "32px" },
  features: { display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "32px" },
  feature: { background: "rgba(255,255,255,0.15)", color: "#fff", padding: "8px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "500" },
  heroImg: { width: "100%", borderRadius: "16px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
  right: { width: "460px", background: "#f8faff", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px" },
  card: { width: "100%", maxWidth: "360px" },
  cardTitle: { fontSize: "28px", fontWeight: "700", color: "#1e293b", margin: "0 0 6px" },
  cardSub: { color: "#64748b", fontSize: "14px", marginBottom: "28px" },
  label: { display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" },
  input: { width: "100%", padding: "12px 14px", marginBottom: "16px", borderRadius: "8px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#1e293b", fontSize: "14px", boxSizing: "border-box", outline: "none" },
  btn: { width: "100%", padding: "13px", background: "linear-gradient(135deg, #1e40af, #3b82f6)", color: "#fff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: "pointer", marginTop: "4px" },
  error: { color: "#ef4444", fontSize: "13px", marginBottom: "8px", padding: "8px 12px", background: "#fef2f2", borderRadius: "6px" },
  toggle: { color: "#64748b", textAlign: "center", marginTop: "20px", fontSize: "13px" },
  link: { color: "#3b82f6", cursor: "pointer", fontWeight: "600" },
};

export default Login;