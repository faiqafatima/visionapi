import { useState, useEffect } from "react";
import axios from "axios";

const API = "https://visionapi-production-59c4.up.railway.app";

const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400&auto=format&fit=crop",
];

function Dashboard({ token, onLogout }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory(res.data);
    } catch (e) { console.log(e); }
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResults(null);
    setError("");
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await axios.post(`${API}/analyze`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResults(res.data);
      fetchHistory();
    } catch (e) {
      setError(e.response?.data?.detail || "Analysis failed");
    }
    setLoading(false);
  };

  const colors = ["#dbeafe", "#fce7f3", "#dcfce7", "#fef3c7", "#ede9fe", "#ffedd5"];

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>👁 VisionAPI</span>
          <span style={styles.badge}>YOLOv8 Powered</span>
        </div>
        <button style={styles.logoutBtn} onClick={onLogout}>Sign Out</button>
      </div>

      <div style={styles.body}>
        {/* Left — Upload */}
        <div style={styles.mainCol}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Detect Objects</h2>
            <p style={styles.cardSub}>Upload any image to identify objects using AI</p>

            <label style={styles.uploadBox}>
              {preview ? (
                <img src={preview} alt="preview" style={styles.previewImg} />
              ) : (
                <div style={styles.uploadInner}>
                  <div style={styles.uploadIcon}>📷</div>
                  <p style={styles.uploadText}>Click to upload image</p>
                  <p style={styles.uploadHint}>JPG, PNG, WEBP supported</p>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            </label>

            {!preview && (
              <div>
                <p style={styles.sampleLabel}>Or try a sample image:</p>
                <div style={styles.sampleRow}>
                  {SAMPLE_IMAGES.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      style={styles.sampleImg}
                      onClick={async () => {
                        const res = await fetch(url);
                        const blob = await res.blob();
                        const f = new File([blob], `sample${i+1}.jpg`, { type: "image/jpeg" });
                        setFile(f);
                        setPreview(url);
                        setResults(null);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {error && <p style={styles.error}>{error}</p>}

            <button
              style={{ ...styles.btn, opacity: !file || loading ? 0.6 : 1 }}
              onClick={handleAnalyze}
              disabled={!file || loading}
            >
              {loading ? "⏳ Analyzing..." : "🔍 Detect Objects"}
            </button>

            {preview && (
              <button style={styles.clearBtn} onClick={() => { setFile(null); setPreview(null); setResults(null); }}>
                Clear
              </button>
            )}
          </div>

          {/* Results */}
          {results && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                Results — {results.objects_detected} object{results.objects_detected !== 1 ? "s" : ""} found
              </h2>
              <p style={styles.cardSub}>File: {results.filename} · Model: {results.model_used}</p>
              <div style={styles.detectionGrid}>
                {results.detections.map((d, i) => (
                  <div key={i} style={{ ...styles.detectionChip, background: colors[i % colors.length] }}>
                    <span style={styles.detLabel}>{d.label}</span>
                    <span style={styles.detConf}>{(d.confidence * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — History + Info */}
        <div style={styles.sideCol}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Analysis History</h2>
            {history.length === 0 ? (
              <div style={styles.emptyHistory}>
                <p style={{ color: "#94a3b8", fontSize: "13px", textAlign: "center" }}>No analyses yet.<br />Upload an image to get started.</p>
              </div>
            ) : (
              history.slice().reverse().map((h) => (
                <div key={h.id} style={styles.historyItem}>
                  <div style={styles.historyIcon}>🖼</div>
                  <div style={styles.historyInfo}>
                    <p style={styles.historyFile}>{h.filename}</p>
                    <p style={styles.historyMeta}>{h.objects_detected} objects detected</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ ...styles.card, background: "linear-gradient(135deg, #1e40af, #3b82f6)" }}>
            <h3 style={{ color: "#fff", margin: "0 0 8px", fontSize: "15px" }}>About VisionAPI</h3>
            <p style={{ color: "#bfdbfe", fontSize: "13px", lineHeight: 1.6, margin: 0 }}>
              Built with FastAPI + YOLOv8 + PostgreSQL. Deployed on Railway. JWT authenticated REST API.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter', sans-serif" },
  header: { background: "#fff", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  logo: { fontSize: "20px", fontWeight: "800", color: "#1e40af" },
  badge: { background: "#dbeafe", color: "#1e40af", fontSize: "11px", fontWeight: "600", padding: "4px 10px", borderRadius: "20px" },
  logoutBtn: { background: "transparent", border: "1.5px solid #e2e8f0", color: "#64748b", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" },
  body: { display: "flex", gap: "24px", padding: "32px", maxWidth: "1100px", margin: "0 auto", alignItems: "flex-start", flexWrap: "wrap" },
  mainCol: { flex: 1, minWidth: "340px", display: "flex", flexDirection: "column", gap: "20px" },
  sideCol: { width: "300px", display: "flex", flexDirection: "column", gap: "20px" },
  card: { background: "#fff", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  cardTitle: { fontSize: "18px", fontWeight: "700", color: "#1e293b", margin: "0 0 4px" },
  cardSub: { color: "#94a3b8", fontSize: "13px", marginBottom: "20px" },
  uploadBox: { display: "flex", alignItems: "center", justifyContent: "center", border: "2px dashed #bfdbfe", borderRadius: "12px", minHeight: "180px", cursor: "pointer", marginBottom: "16px", background: "#f8faff", overflow: "hidden" },
  uploadInner: { textAlign: "center", padding: "24px" },
  uploadIcon: { fontSize: "36px", marginBottom: "8px" },
  uploadText: { color: "#3b82f6", fontWeight: "600", margin: "0 0 4px" },
  uploadHint: { color: "#94a3b8", fontSize: "12px", margin: 0 },
  previewImg: { width: "100%", maxHeight: "240px", objectFit: "contain" },
  sampleLabel: { color: "#64748b", fontSize: "12px", fontWeight: "600", marginBottom: "8px" },
  sampleRow: { display: "flex", gap: "8px", marginBottom: "16px" },
  sampleImg: { width: "80px", height: "60px", objectFit: "cover", borderRadius: "8px", cursor: "pointer", border: "2px solid transparent", transition: "border 0.2s" },
  btn: { width: "100%", padding: "13px", background: "linear-gradient(135deg, #1e40af, #3b82f6)", color: "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: "pointer" },
  clearBtn: { width: "100%", padding: "10px", background: "transparent", color: "#94a3b8", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", cursor: "pointer", marginTop: "8px" },
  error: { color: "#ef4444", fontSize: "13px", padding: "10px 14px", background: "#fef2f2", borderRadius: "8px", marginBottom: "12px" },
  detectionGrid: { display: "flex", flexWrap: "wrap", gap: "8px" },
  detectionChip: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "20px" },
  detLabel: { fontSize: "13px", fontWeight: "600", color: "#1e293b", textTransform: "capitalize" },
  detConf: { fontSize: "12px", color: "#3b82f6", fontWeight: "700" },
  historyItem: { display: "flex", gap: "10px", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" },
  historyIcon: { fontSize: "20px" },
  historyInfo: { flex: 1 },
  historyFile: { margin: 0, fontSize: "13px", fontWeight: "600", color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" },
  historyMeta: { margin: 0, fontSize: "12px", color: "#94a3b8" },
  emptyHistory: { padding: "20px 0" },
};

export default Dashboard;