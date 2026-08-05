import { useState, useEffect } from "react";
import {
  Download, Smartphone, Monitor, Apple, Chrome, CheckCircle2,
  Sparkles, ExternalLink, ShieldCheck, ArrowDownToLine, Info, ChevronRight
} from "lucide-react";
import { T } from "../config/constants.js";
import Card from "../components/ui/Card.jsx";

export default function DownloadsView({ me, dk, isMobile }) {
  const th = T(dk);

  // Auto-detect user platform
  const detectPlatform = () => {
    const ua = navigator.userAgent || "";
    if (/android/i.test(ua)) return "android";
    if (/iphone|ipad|ipod/i.test(ua)) return "ios";
    if (/mac/i.test(ua)) return "desktop";
    if (/win|linux/i.test(ua)) return "desktop";
    return "android";
  };

  const [activeTab, setActiveTab] = useState(detectPlatform);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert("To install RightSignal: click the Install icon (computer with down arrow) in your browser address bar.");
    }
  };

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", width: "100%", paddingBottom: 40 }}>
      {/* Header Banner */}
      <div style={{
        background: dk
          ? "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(16, 185, 129, 0.08))"
          : "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(16, 185, 129, 0.05))",
        borderRadius: 24,
        padding: isMobile ? "24px 18px" : "36px 32px",
        border: `1px solid ${dk ? "rgba(99, 102, 241, 0.25)" : "rgba(99, 102, 241, 0.15)"}`,
        marginBottom: 24,
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(99, 102, 241, 0.12)", border: "1px solid rgba(99, 102, 241, 0.3)", padding: "4px 12px", borderRadius: 99, color: "#6366f1", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
          <Sparkles size={14} />
          Official Downloads & Apps
        </div>
        <h1 style={{ margin: "0 0 8px", fontSize: isMobile ? 22 : 28, fontWeight: 800, color: th.txt }}>
          Download RightSignal for Any Device
        </h1>
        <p style={{ margin: 0, fontSize: isMobile ? 13 : 14, color: th.txt2, maxWidth: 640, lineHeight: 1.6 }}>
          Get the full native experience. Download the official Android APK or install our Progressive Web App (PWA) across Windows, macOS, Linux, and iOS.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        paddingBottom: 8,
        marginBottom: 20,
        borderBottom: `1px solid ${th.bdr}`
      }}>
        {[
          { id: "android", label: "Android (.APK)", icon: Smartphone, badge: "Direct Download" },
          { id: "desktop", label: "Desktop (Chrome / Edge)", icon: Monitor, badge: "PWA App" },
          { id: "ios", label: "iOS (iPhone / iPad)", icon: Apple, badge: "Safari PWA" },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 14,
                border: isActive ? "1px solid #6366f1" : `1px solid ${th.bdr}`,
                background: isActive
                  ? (dk ? "rgba(99, 102, 241, 0.18)" : "rgba(99, 102, 241, 0.1)")
                  : (dk ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"),
                color: isActive ? "#6366f1" : th.txt2,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s"
              }}
            >
              <Icon size={16} />
              {tab.label}
              <span style={{
                fontSize: 10,
                background: isActive ? "#6366f1" : (dk ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                color: isActive ? "#fff" : th.txt3,
                padding: "2px 6px",
                borderRadius: 99,
                fontWeight: 600
              }}>
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── ANDROID DIRECT APK SECTION ─── */}
      {activeTab === "android" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card dk={dk} style={{ padding: isMobile ? 18 : 26 }}>
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: 20 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  boxShadow: "0 8px 20px rgba(16, 185, 129, 0.25)",
                  flexShrink: 0
                }}>
                  <Smartphone size={28} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: th.txt }}>
                      RightSignal for Android
                    </h3>
                    <span style={{ fontSize: 11, background: "rgba(16, 185, 129, 0.12)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>
                      v1.0.0 APK
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: th.txt2 }}>
                    Official Android package file • Direct installation for all Android devices.
                  </p>
                </div>
              </div>

              {/* Download APK Button */}
              <a
                href="/rightsignal-1.0.0.apk"
                download="rightsignal-1.0.0.apk"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "#fff",
                  padding: "14px 24px",
                  borderRadius: 16,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                  boxShadow: "0 6px 20px rgba(16, 185, 129, 0.35)",
                  transition: "transform 0.2s, boxShadow 0.2s",
                  width: isMobile ? "100%" : "auto"
                }}
              >
                <ArrowDownToLine size={18} />
                Download Android APK
              </a>
            </div>

            {/* File info bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 20,
              paddingTop: 16,
              borderTop: `1px solid ${th.bdr}`,
              fontSize: 12,
              color: th.txt3,
              flexWrap: "wrap"
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><ShieldCheck size={14} color="#10b981" /> Verified Safe & Signed</span>
              <span>•</span>
              <span>File: <strong>rightsignal-1.0.0.apk</strong></span>
              <span>•</span>
              <span>Requires Android 7.0+</span>
            </div>
          </Card>

          {/* Installation Steps */}
          <Card dk={dk} style={{ padding: isMobile ? 18 : 24 }}>
            <h4 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: th.txt, display: "flex", alignItems: "center", gap: 8 }}>
              <Info size={16} color="#6366f1" />
              How to Install the APK on Android
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              {[
                { step: "1", title: "Download the File", desc: "Tap the green 'Download Android APK' button above to save rightsignal-1.0.0.apk." },
                { step: "2", title: "Open Downloaded APK", desc: "Open your browser Downloads or File Manager and tap 'rightsignal-1.0.0.apk'." },
                { step: "3", title: "Allow Unknown Sources", desc: "If prompted, tap 'Settings' and toggle 'Allow from this source' for your browser/file manager." },
                { step: "4", title: "Install & Launch", desc: "Tap 'Install' on the installer prompt. Open RightSignal directly from your home screen!" },
              ].map(item => (
                <div key={item.step} style={{
                  background: dk ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                  padding: 14,
                  borderRadius: 14,
                  border: `1px solid ${th.bdr}`,
                  display: "flex",
                  gap: 12
                }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: dk ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.1)",
                    color: "#6366f1",
                    fontWeight: 800,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    {item.step}
                  </div>
                  <div>
                    <h5 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: th.txt }}>{item.title}</h5>
                    <p style={{ margin: 0, fontSize: 12, color: th.txt2, lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ─── DESKTOP PWA SECTION ─── */}
      {activeTab === "desktop" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card dk={dk} style={{ padding: isMobile ? 18 : 26 }}>
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: 20 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  boxShadow: "0 8px 20px rgba(99, 102, 241, 0.25)",
                  flexShrink: 0
                }}>
                  <Monitor size={28} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: th.txt }}>
                    Desktop App (Chrome / Edge / Brave)
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: th.txt2 }}>
                    Install RightSignal directly as a desktop window application.
                  </p>
                </div>
              </div>

              <button
                onClick={handleInstallPWA}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  background: isInstalled ? "rgba(16, 185, 129, 0.15)" : "#6366f1",
                  color: isInstalled ? "#10b981" : "#fff",
                  padding: "14px 24px",
                  borderRadius: 16,
                  fontWeight: 700,
                  fontSize: 14,
                  border: isInstalled ? "1px solid rgba(16, 185, 129, 0.3)" : "none",
                  cursor: "pointer",
                  boxShadow: isInstalled ? "none" : "0 6px 20px rgba(99, 102, 241, 0.35)",
                  width: isMobile ? "100%" : "auto"
                }}
              >
                {isInstalled ? (
                  <>
                    <CheckCircle2 size={18} />
                    App Installed
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Install Desktop App
                  </>
                )}
              </button>
            </div>
          </Card>

          {/* Chrome/Edge Desktop Steps */}
          <Card dk={dk} style={{ padding: isMobile ? 18 : 24 }}>
            <h4 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: th.txt, display: "flex", alignItems: "center", gap: 8 }}>
              <Chrome size={16} color="#6366f1" />
              Desktop App Installation Steps
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              {[
                { step: "1", title: "Open in Chrome or Edge", desc: "Visit rightsignal.social in Google Chrome, Microsoft Edge, or Brave." },
                { step: "2", title: "Find the Install Icon", desc: "Look at the far right of your address bar for the Monitor icon with a down arrow." },
                { step: "3", title: "Click 'Install'", desc: "Click the Install icon and confirm by clicking 'Install' in the prompt." },
                { step: "4", title: "Launch Anywhere", desc: "RightSignal will open in its own window and be saved to your Desktop & Start Menu!" },
              ].map(item => (
                <div key={item.step} style={{
                  background: dk ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                  padding: 14,
                  borderRadius: 14,
                  border: `1px solid ${th.bdr}`,
                  display: "flex",
                  gap: 12
                }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: dk ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.1)",
                    color: "#6366f1",
                    fontWeight: 800,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    {item.step}
                  </div>
                  <div>
                    <h5 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: th.txt }}>{item.title}</h5>
                    <p style={{ margin: 0, fontSize: 12, color: th.txt2, lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ─── IOS SAFARI PWA SECTION ─── */}
      {activeTab === "ios" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card dk={dk} style={{ padding: isMobile ? 18 : 26 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                background: "linear-gradient(135deg, #000000, #333333)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
                flexShrink: 0
              }}>
                <Apple size={28} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: th.txt }}>
                  RightSignal for iPhone & iPad
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: th.txt2 }}>
                  Add RightSignal directly to your iOS Home Screen via Safari.
                </p>
              </div>
            </div>
          </Card>

          {/* iOS Steps */}
          <Card dk={dk} style={{ padding: isMobile ? 18 : 24 }}>
            <h4 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: th.txt, display: "flex", alignItems: "center", gap: 8 }}>
              <Apple size={16} color="#6366f1" />
              iPhone / iPad Safari Setup Steps
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              {[
                { step: "1", title: "Open Safari Browser", desc: "Open rightsignal.social in Safari on your iPhone or iPad." },
                { step: "2", title: "Tap the Share Icon", desc: "Tap the Share button (rectangle with an up arrow) at the bottom toolbar." },
                { step: "3", title: "Select 'Add to Home Screen'", desc: "Scroll down the menu options and tap 'Add to Home Screen'." },
                { step: "4", title: "Tap 'Add'", desc: "Tap 'Add' in the top right corner. RightSignal will appear on your iPhone home screen!" },
              ].map(item => (
                <div key={item.step} style={{
                  background: dk ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                  padding: 14,
                  borderRadius: 14,
                  border: `1px solid ${th.bdr}`,
                  display: "flex",
                  gap: 12
                }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: dk ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.1)",
                    color: "#6366f1",
                    fontWeight: 800,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    {item.step}
                  </div>
                  <div>
                    <h5 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: th.txt }}>{item.title}</h5>
                    <p style={{ margin: 0, fontSize: 12, color: th.txt2, lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
