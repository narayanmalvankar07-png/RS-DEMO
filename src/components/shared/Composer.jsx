// src/components/shared/Composer.jsx
import { useState, useRef } from "react";
import { Image, Mic, MicOff, Smile, MapPin, Send, X, Video } from "lucide-react";
import { T, EMOJIS } from '../../config/constants.js';
import { extractTags, fileToB64 } from '../../utils/helpers.js';
import Av from '../ui/Av.jsx';
import Card from '../ui/Card.jsx';

function Composer({ me, onPost, dk, myProfile }) {
  const th = T(dk);
  const [text, setText] = useState("");
  const [media, setMedia] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recDur, setRecDur] = useState(0);
  const [loc, setLoc] = useState(null);
  const [fetchLoc, setFetchLoc] = useState(false);
  const [mediaErr, setMediaErr] = useState("");
  const fileRef = useRef();
  const recRef = useRef();
  const timerRef = useRef();
  const tags = extractTags(text);
  const canPost = text.trim() || media.length > 0;

  const addMedia = async files => {
    setMediaErr("");
    const newItems = [];
    for (const f of files) {
      try {
        const b64 = await fileToB64(f);
        newItems.push({ type: f.type.startsWith("video") ? "video" : f.type.startsWith("audio") ? "audio" : "image", url: b64, name: f.name });
      } catch (e) { setMediaErr(e.message); }
    }
    setMedia(m => [...m, ...newItems].slice(0, 4));
  };

  const insertBold = () => {
    const sel = window.getSelection?.()?.toString();
    if (sel) setText(t => t.replace(sel, `**${sel}**`));
    else setText(t => t + "****");
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => setMedia(m => [...m, { type: "audio", url: reader.result, name: "voice.webm" }]);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      recRef.current = mr;
      setRecording(true);
      setRecDur(0);
      timerRef.current = setInterval(() => setRecDur(d => d + 1), 1000);
    } catch {}
  };

  const stopRec = () => { recRef.current?.stop(); setRecording(false); clearInterval(timerRef.current); };

  const getLoc = () => {
    setFetchLoc(true);
    navigator.geolocation?.getCurrentPosition(
      p => { setLoc({ lat: p.coords.latitude.toFixed(4), lng: p.coords.longitude.toFixed(4) }); setFetchLoc(false); },
      () => setFetchLoc(false)
    );
  };

  const doPost = () => {
    if (!canPost) return;
    onPost(text.trim(), media, loc, tags);
    setText(""); setMedia([]); setLoc(null); setShowEmoji(false);
  };

  return (
    <Card dk={dk} anim={false} style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <Av profile={myProfile || {}} size={38} />
        <div style={{ flex: 1 }}>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="What's your signal today?" rows={3} style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 15, lineHeight: 1.6, resize: "none", fontFamily: "inherit", color: T(dk).txt, boxSizing: "border-box" }} />
          {tags.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
              {tags.map((t, i) => <span key={i} style={{ fontSize: 12, background: "#3b82f618", color: "#3b82f6", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>{t}</span>)}
            </div>
          )}
          {media.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {media.map((m, i) => (
                <div key={i} style={{ position: "relative", width: 64, height: 64, borderRadius: 8, overflow: "hidden", border: "1px solid #3b82f640" }}>
                  {m.type === "image" ? <img src={m.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                    : m.type === "audio" ? <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center" }}><Mic size={20} color="#fff" /></div>
                    : <div style={{ width: "100%", height: "100%", background: "#1c2d47", display: "flex", alignItems: "center", justifyContent: "center" }}><Video size={20} color="#7a93c0" /></div>}
                  <button onClick={() => setMedia(m => m.filter((_, j) => j !== i))} style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,.6)", border: "none", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}><X size={10} /></button>
                </div>
              ))}
            </div>
          )}
          {loc && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#10b981", marginBottom: 8 }}>
              <MapPin size={12} />📍 {loc.lat}, {loc.lng}
              <button onClick={() => setLoc(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 0, marginLeft: 4 }}><X size={10} /></button>
            </div>
          )}
          {mediaErr && <p style={{ fontSize: 12, color: "#ef4444", margin: "0 0 8px" }}>{mediaErr}</p>}
          {showEmoji && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, background: T(dk).surf2, borderRadius: 10, padding: 10, marginBottom: 10, border: `1px solid ${T(dk).bdr}` }}>
              {EMOJIS.map(e => <button key={e} onClick={() => { setText(t => t + e); setShowEmoji(false); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>{e}</button>)}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${T(dk).bdr}`, paddingTop: 10, marginTop: 6 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { icon: <Image size={16} />, tip: "Photo/Video", action: () => fileRef.current?.click() },
                { icon: recording ? <MicOff size={16} /> : <Mic size={16} />, tip: recording ? `Stop (${recDur}s)` : "Voice", action: recording ? stopRec : startRec },
                { icon: <Smile size={16} />, tip: "Emoji", action: () => setShowEmoji(x => !x) },
                { icon: <MapPin size={16} />, tip: "Location", action: getLoc },
              ].map(({ icon, tip, action }) => (
                <button key={tip} onClick={action} title={tip} style={{ background: "transparent", border: "none", cursor: "pointer", color: recording && tip.includes("Stop") ? "#ef4444" : T(dk).txt3, padding: "4px 6px", borderRadius: 6, display: "flex", alignItems: "center" }}>{icon}</button>
              ))}
              <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={e => addMedia([...e.target.files])} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {text.length > 0 && <span style={{ fontSize: 12, color: text.length > 500 ? "#ef4444" : T(dk).txt3 }}>{text.length}/500</span>}
              <button onClick={doPost} disabled={!canPost} style={{ background: canPost ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "transparent", border: `1px solid ${canPost ? "transparent" : T(dk).bdr}`, borderRadius: 10, padding: "7px 20px", color: canPost ? "#fff" : T(dk).txt3, fontSize: 13, fontWeight: 700, cursor: canPost ? "pointer" : "default", boxShadow: canPost ? "0 0 14px rgba(59,130,246,.3)" : "none", transition: "all .2s" }}>
                Post Signal
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default Composer;