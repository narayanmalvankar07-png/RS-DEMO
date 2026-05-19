// src/config/constants.js

// Supabase Configuration
export const SB_URL = import.meta.env.VITE_SUPABASE_URL;
export const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

// Admin Configuration
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

// Roles
export const ROLES = {
  admin: "Admin",
  management: "Management Team",
  ops: "Ops Team",
  growth_catalyst: "Growth Catalyst",
  community_manager: "Community Manager",
  country_head: "Country Head",
  continental_head: "Continental Head",
  user: "Regular User",
};

// Who Options
export const WHO_OPTS = [
  { id: "founder",      label: "Founder",      icon: "Rocket",        c: "#f97316" },
  { id: "investor",     label: "Investor",      icon: "TrendingUp",    c: "#10b981" },
  { id: "professional", label: "Professional",  icon: "Briefcase",     c: "#3b82f6" },
  { id: "entrepreneur", label: "Entrepreneur",  icon: "Zap",           c: "#8b5cf6" },
  { id: "developer",    label: "Developer",     icon: "Code2",         c: "#06b6d4" },
  { id: "designer",     label: "Designer",      icon: "Palette",       c: "#ec4899" },
  { id: "diplomat",     label: "Diplomat",      icon: "Globe",         c: "#f59e0b" },
  { id: "selfemployed", label: "Self-Employed", icon: "Brain",         c: "#ef4444" },
  { id: "student",      label: "Student",       icon: "GraduationCap", c: "#84cc16" },
  { id: "researcher",   label: "Researcher",    icon: "Microscope",    c: "#6366f1" },
  { id: "creator",      label: "Creator",       icon: "Sparkles",      c: "#f43f5e" },
  { id: "executive",    label: "Executive",     icon: "Building2",     c: "#0ea5e9" },
];

// Interest Options
export const INT_OPTS = [
  { id: "tech",     label: "Technology",   icon: "Cpu",          c: "#3b82f6" },
  { id: "startups", label: "Startups",     icon: "Rocket",       c: "#f97316" },
  { id: "ai",       label: "AI",           icon: "Bot",          c: "#8b5cf6" },
  { id: "finance",  label: "Finance & VC", icon: "TrendingUp",   c: "#10b981" },
  { id: "news",     label: "Global News",  icon: "Globe",        c: "#06b6d4" },
  { id: "sports",   label: "Sports",       icon: "Activity",     c: "#ef4444" },
  { id: "music",    label: "Music",        icon: "Music",        c: "#ec4899" },
  { id: "design",   label: "Design & UX",  icon: "Palette",      c: "#f59e0b" },
  { id: "science",  label: "Science",      icon: "Microscope",   c: "#84cc16" },
  { id: "crypto",   label: "Web3 & Crypto",icon: "Link",         c: "#f43f5e" },
  { id: "health",   label: "Health",       icon: "Heart",        c: "#0ea5e9" },
  { id: "gaming",   label: "Gaming",       icon: "Gamepad2",     c: "#7c3aed" },
  { id: "travel",   label: "Travel",       icon: "Plane",        c: "#059669" },
  { id: "fun",      label: "Fun & Memes",  icon: "Smile",        c: "#dc2626" },
];

// Emojis
export const EMOJIS = ["😀","😂","🥰","😎","🤔","🚀","💡","🔥","👍","❤️","🎉","💪","🙏","✨","🌟","💰","🤝","👏","🎯","💼","🌍","⚡","🛠️","📊","🎨","😮","🤯","👀","💯","🏆"];

// Tags
export const TAGS = ["#SignalTokens","#StartupSandbox","#BuildInPublic","#AlignNotFollow","#AIStartups","#RightSignal","#Founders","#VentureCapital"];

// Phases
export const PHASES = ["week1","week2","week3","week4","hackathon"];

// Phase Labels
export const PH_LABEL = { week1:"Idea Eval", week2:"Interviews", week3:"Refinement", week4:"Final", hackathon:"Hackathon" };

// Status Labels
export const ST_LABEL = { submitted:"Pending", shortlisted_50:"Week 1 ✓", shortlisted_30:"Week 2 ✓", shortlisted_15:"Week 3 ✓", finalist_10:"Top 10 Finalist", winner:"Winner 🏆", rejected:"Not Selected" };

// Sandbox Cycle
export const SB_CYCLE = { title: "Sandbox Cohort 3", phase: "week2" };

// Category Colors
export const CAT_COLORS = { Technology:"#3b82f6", Product:"#10b981", Developer:"#06b6d4", Leadership:"#8b5cf6", Design:"#ec4899", Startup:"#f97316", General:"#6b7280" };

// Type Colors
export const TYP_COLORS = { article:"#3b82f6", tool:"#10b981", idea:"#f59e0b" };

// Seed Posts
export const SEED_POSTS = [
  { uid:"seed", text:"🚀 Just launched RightSignal — a platform for founders, investors and builders to share signal over noise. #RightSignal #Founders #BuildInPublic", like_count:47, repost_count:12, media:[], hashtags:["#rightsignal","#founders","#buildinpublic"] },
  { uid:"seed", text:"The best time to start was yesterday. The second best time is now. Stop overthinking and ship it. 💡 #BuildInPublic #Startups", like_count:89, repost_count:23, media:[], hashtags:["#buildinpublic","#startups"] },
  { uid:"seed", text:"Hot take: Most startup failures are not due to bad products. Founders solve problems that dont exist at scale. Always validate first. #StartupSandbox", like_count:134, repost_count:45, media:[], hashtags:["#startupsandbox"] },
];

// Seed Events
export const SEED_EVENTS = [
  { title:"Global AI & Startup Summit 2025", description:"5,000+ founders, investors & builders online. 100% free.", category:"Technology", event_date:new Date(Date.now()+259200000).toISOString(), timezone:"UTC", source:"Eventbrite", url:"#", is_free:true, popularity:4200 },
  { title:"Product-Led Growth Masterclass", description:"PLG from Notion, Figma & Calendly leaders. Live Q&A.", category:"Product", event_date:new Date(Date.now()+604800000).toISOString(), timezone:"IST", source:"Meetup", url:"#", is_free:true, popularity:1800 },
  { title:"Open Source Contributors Meetup", description:"Monthly gathering. Find collaborators & get feedback.", category:"Developer", event_date:new Date(Date.now()+172800000).toISOString(), timezone:"EST", source:"Meetup", url:"#", is_free:true, popularity:890 },
];

// Seed Sandbox
export const SEED_SANDBOX = [
  { uid:"seed", title:"SkillSwap", problem:"Freelancers pay 20–30% fees.", solution:"P2P skill exchange, zero commission.", audience:"Freelancers", status:"finalist_10", score_w1:9.6, score_w2:9.2, score_w3:9.0 },
  { uid:"seed", title:"MindBridge", problem:"Mental health resources are fragmented.", solution:"AI platform with culturally-matched counselors.", audience:"Young adults", status:"shortlisted_30", score_w1:9.1, score_w2:8.7, score_w3:null },
];

// Seed Contributions
export const SEED_CONTRIBS = [
  { uid:"seed", type:"article", title:"Why Most Startup Ideas Fail in Year One", body:"After analyzing 200+ failed startups: founders solve problems that don't exist at scale.", upvotes:234, downvotes:12 },
  { uid:"seed", type:"tool", title:"Open Source Rate Limiter for NestJS", body:"Battle-tested Redis-backed rate limiting middleware. MIT licensed.", upvotes:156, downvotes:8 },
];

// Theme function — glassmorphic palette
export const T = dk => ({
  bg:    "transparent",
  surf:  dk ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.72)",
  surf2: dk ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.55)",
  surf3: dk ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.38)",
  bdr:   dk ? "rgba(255,255,255,0.09)" : "rgba(99,102,241,0.16)",
  bdr2:  dk ? "rgba(255,255,255,0.15)" : "rgba(99,102,241,0.10)",
  txt:   dk ? "#e8f0fe" : "#0f172a",
  txt2:  dk ? "rgba(180,205,255,0.72)" : "#475569",
  txt3:  dk ? "rgba(120,155,215,0.48)" : "#94a3b8",
  inp:   dk ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.80)",
  inpB:  dk ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.09)",
  side:  dk ? "rgba(5,8,18,0.82)"  : "rgba(255,255,255,0.82)",
  top:   dk ? "rgba(5,8,18,0.78)"  : "rgba(255,255,255,0.78)",
  blur:  "blur(24px) saturate(1.8)",
});