import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { 
  Briefcase, DollarSign, Users, MapPin, Globe, CheckCircle2, ChevronRight, 
  ChevronLeft, Search, SlidersHorizontal, Lock, Check, Send, Sparkles, FileText, 
  TrendingUp, BarChart3, AlertCircle, Building2, HelpCircle, Edit2
} from "lucide-react";
import { T } from "../config/constants.js";
import { db } from "../services/supabase.js";
import Card from "../components/ui/Card.jsx";
import Spin from "../components/ui/Spin.jsx";

// ─── CUSTOM LIQUID GLASS DROP-DOWN COMPONENT ───────────────────────
function GlassSelect({ value, onChange, options, formError, dk, th }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  const parsedOptions = options.map(opt => {
    if (typeof opt === "string") {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selectedOpt = parsedOptions.find(opt => opt.value === value) || parsedOptions[0];

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 10,
          border: `1px solid ${formError ? "#ef4444" : th.inpB}`,
          background: th.inp,
          color: th.txt,
          fontSize: 13,
          boxSizing: "border-box",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          userSelect: "none",
          transition: "border-color 0.2s"
        }}
      >
        <span>{selectedOpt?.label || value}</span>
        <span style={{ 
          transform: open ? "rotate(180deg)" : "rotate(0)", 
          transition: "transform 0.2s", 
          fontSize: 8, 
          color: th.txt3, 
          display: "inline-block" 
        }}>
          ▼
        </span>
      </div>

      {/* Dropdown Options List */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 5px)",
          left: 0,
          right: 0,
          background: th.side,
          backdropFilter: th.blur,
          WebkitBackdropFilter: th.blur,
          border: `1px solid ${th.bdr}`,
          borderRadius: 12,
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
          zIndex: 100,
          maxHeight: 200,
          overflowY: "auto",
          padding: 4
        }}>
          {parsedOptions.map(opt => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  color: isSelected ? "#6366f1" : th.txt2,
                  background: isSelected ? (dk ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.08)") : "transparent",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontWeight: isSelected ? 600 : 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = dk ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)";
                    e.currentTarget.style.color = th.txt;
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = th.txt2;
                  }
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <span style={{ color: "#6366f1", fontSize: 10 }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ─── GLASS SELECT PILL COMPONENT ───────────────────────────────────
function GlassSelectPill({ value, onChange, options, placeholder, dk, th }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  const parsedOptions = options.map(opt => {
    if (typeof opt === "string") {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selectedOpt = parsedOptions.find(opt => opt.value === value) || parsedOptions[0];
  const isDefault = value.startsWith("All");

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: "8px 16px",
          borderRadius: 99,
          border: `1px solid ${!isDefault ? "#6366f1" : th.bdr}`,
          background: !isDefault ? (dk ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.08)") : (dk ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)"),
          color: !isDefault ? "#6366f1" : th.txt2,
          fontSize: 12,
          fontWeight: 600,
          boxSizing: "border-box",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          userSelect: "none",
          transition: "all 0.2s"
        }}
        onMouseEnter={e => {
          if (isDefault) {
            e.currentTarget.style.border = `1px solid ${th.txt3}`;
            e.currentTarget.style.color = th.txt;
          }
        }}
        onMouseLeave={e => {
          if (isDefault) {
            e.currentTarget.style.border = `1px solid ${th.bdr}`;
            e.currentTarget.style.color = th.txt2;
          }
        }}
      >
        <span>{isDefault ? placeholder : selectedOpt.label}</span>
        <span style={{ 
          transform: open ? "rotate(180deg)" : "rotate(0)", 
          transition: "transform 0.2s", 
          fontSize: 8, 
          color: !isDefault ? "#6366f1" : th.txt3, 
          display: "inline-block" 
        }}>
          ▼
        </span>
      </div>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          background: th.side,
          backdropFilter: th.blur,
          WebkitBackdropFilter: th.blur,
          border: `1px solid ${th.bdr}`,
          borderRadius: 14,
          boxShadow: "0 12px 30px rgba(0, 0, 0, 0.3)",
          zIndex: 100,
          maxHeight: 220,
          minWidth: 165,
          overflowY: "auto",
          padding: 4
        }}>
          {parsedOptions.map(opt => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  color: isSelected ? "#6366f1" : th.txt2,
                  background: isSelected ? (dk ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.08)") : "transparent",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontWeight: isSelected ? 600 : 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  whiteSpace: "nowrap"
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = dk ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)";
                    e.currentTarget.style.color = th.txt;
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = th.txt2;
                  }
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <span style={{ color: "#6366f1", fontSize: 9 }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ─── FALLBACK SEEDED INVESTORS LIST ────────────────────────────────
const FALLBACK_INVESTORS = [
  {
    id: "inv_peakxv",
    name: "Peak XV Partners",
    email: "jjatan220@gmail.com",
    logo: "🏔️",
    stage: "Seed to Series C",
    checkSize: "$1M - $8M",
    location: "India",
    sectors: ["SaaS", "AI", "Fintech", "Consumer"],
    description: "Peak XV Partners (formerly Sequoia India) is a leading venture capital firm investing across India, South East Asia and beyond. We partner with founders to build legendary companies from idea to IPO.",
    type: "VCs"
  },
  {
    id: "inv_accel",
    name: "Accel Partners",
    email: "jjatan220@gmail.com",
    logo: "⚡",
    stage: "Pre-seed to Series B",
    checkSize: "$500K - $4M",
    location: "Global",
    sectors: ["SaaS", "AI", "Enterprise Software", "HealthTech"],
    description: "Accel is a global venture capital firm that acts as the first partner to exceptional teams, from inception through all phases of private company growth.",
    type: "VCs"
  },
  {
    id: "inv_yc",
    name: "Y Combinator",
    email: "jjatan220@gmail.com",
    logo: "🍊",
    stage: "Pre-seed / Seed",
    checkSize: "$500K (Standard Terms)",
    location: "Global",
    sectors: ["All Sectors", "AI", "SaaS", "Web3", "ClimateTech"],
    description: "Y Combinator is a startup accelerator that launches twice a year. We invest $500k in a large number of startups, and work intensively with them for three months.",
    type: "Accelerators"
  },
  {
    id: "inv_naval",
    name: "Naval Ravikant",
    email: "jjatan220@gmail.com",
    logo: "🦅",
    stage: "Pre-seed / Seed",
    checkSize: "$50K - $250K",
    location: "United States",
    sectors: ["AI", "SaaS", "Web3", "DeepTech"],
    description: "Prolific angel investor and co-founder of AngelList. Investing in early-stage startups with strong technical leverage and long-term vision.",
    type: "Angels"
  },
  {
    id: "inv_premji",
    name: "Premji Invest",
    email: "jjatan220@gmail.com",
    logo: "🏢",
    stage: "Series A to Growth",
    checkSize: "$5M - $20M",
    location: "India",
    sectors: ["AI", "SaaS", "Consumer", "Healthcare"],
    description: "The private equity and venture investment office of Azim Premji, partnering with exceptional entrepreneurs to build long-term value.",
    type: "Family Offices"
  },
  {
    id: "inv_nsf",
    name: "National Science Foundation",
    email: "jjatan220@gmail.com",
    logo: "🎓",
    stage: "Pre-seed / R&D",
    checkSize: "$250K - $1M",
    location: "United States",
    sectors: ["Biotech", "DeepTech", "ClimateTech"],
    description: "Government research grants supporting commercialization of highly innovative, high-impact scientific and engineering technologies without equity dilution.",
    type: "Grants"
  },
  {
    id: "inv_svea",
    name: "Svea Funding",
    email: "jjatan220@gmail.com",
    logo: "💳",
    stage: "Post-revenue",
    checkSize: "$100K - $2M",
    location: "Europe",
    sectors: ["SaaS", "E-commerce", "Marketplace"],
    description: "Non-dilutive venture debt and revenue-based financing solutions for scaling subscription and recurring revenue startups.",
    type: "Debt"
  },
  {
    id: "inv_kickstarter",
    name: "Kickstarter Campaign",
    email: "jjatan220@gmail.com",
    logo: "📢",
    stage: "Idea to Prototype",
    checkSize: "$10K - $500K",
    location: "Global",
    sectors: ["Consumer Tech", "Hardware", "Design", "Software"],
    description: "Community-backed reward crowdfunding platform to launch creative projects and hardware prototype concepts directly to global backers.",
    type: "Crowdfunding"
  },
  {
    id: "inv_blume",
    name: "Blume Ventures",
    email: "jjatan220@gmail.com",
    logo: "🌸",
    stage: "Pre-seed / Seed",
    checkSize: "$250K - $1.5M",
    location: "India",
    sectors: ["DeepTech", "SaaS", "Fintech", "ClimateTech"],
    description: "Blume Ventures is an early-stage venture capital firm that partners with founders building tech-led solutions for India and global markets.",
    type: "VCs"
  },
  {
    id: "inv_elevation",
    name: "Elevation Capital",
    email: "jjatan220@gmail.com",
    logo: "📈",
    stage: "Seed to Series A",
    checkSize: "$500K - $3M",
    location: "India",
    sectors: ["Consumer Tech", "Fintech", "SaaS", "Web3"],
    description: "Elevation Capital is an early-stage venture capital firm focused on investing in consumer internet, SaaS, fintech, enterprise, and Web3 startups.",
    type: "VCs"
  },
  {
    id: "inv_foundersfund",
    name: "Founders Fund",
    email: "jjatan220@gmail.com",
    logo: "🦅",
    stage: "Seed to Growth",
    checkSize: "$1M - $15M",
    location: "United States",
    sectors: ["AI", "Aerospace", "DeepTech", "Enterprise Software"],
    description: "Founders Fund is a San Francisco-based venture capital firm. The firm invests in science and technology companies solving difficult problems.",
    type: "VCs"
  },
  {
    id: "inv_kalaari",
    name: "Kalaari Capital",
    email: "jjatan220@gmail.com",
    logo: "🎨",
    stage: "Seed to Series A",
    checkSize: "$500K - $2.5M",
    location: "India",
    sectors: ["SaaS", "Fintech", "E-commerce", "Consumer"],
    description: "Kalaari Capital is an early-stage, technology-focused venture capital firm with a strong commitment to partnering with outstanding entrepreneurs.",
    type: "VCs"
  },
  {
    id: "inv_tatatrusts",
    name: "Tata Trusts",
    email: "jjatan220@gmail.com",
    logo: "🦁",
    stage: "Idea to Series A",
    checkSize: "$100K - $1M",
    location: "India",
    sectors: ["HealthTech", "ClimateTech", "Biotech", "Agritech"],
    description: "Philanthropic family office and grant provider backing technology that solves critical social problems.",
    type: "Family Offices"
  },
  {
    id: "inv_sequoiaus",
    name: "Sequoia Capital (US)",
    email: "jjatan220@gmail.com",
    logo: "🌲",
    stage: "Seed to Series C",
    checkSize: "$2M - $15M",
    location: "United States",
    sectors: ["AI", "SaaS", "Fintech", "Web3"],
    description: "Leading venture capital firm helping bold founders build legendary companies from idea to IPO.",
    type: "VCs"
  },
  {
    id: "inv_lishana",
    name: "Lishana Angels",
    email: "jjatan220@gmail.com",
    logo: "🌟",
    stage: "Idea to Pre-seed",
    checkSize: "$25K - $150K",
    location: "Europe",
    sectors: ["AI", "SaaS", "Fintech", "Marketplace"],
    description: "An angel network backing early-stage developers, designers and technical founders across Europe.",
    type: "Angels"
  },
  {
    id: "inv_antler",
    name: "Antler Global",
    email: "jjatan220@gmail.com",
    logo: "🦌",
    stage: "Idea / Pre-seed",
    checkSize: "$100K - $250K",
    location: "Global",
    sectors: ["SaaS", "Fintech", "AI", "Marketplace"],
    description: "Global startup generator and early-stage VC enabling extraordinary people to build defining companies.",
    type: "Accelerators"
  },
  {
    id: "inv_venturesouq",
    name: "VentureSouq",
    email: "jjatan220@gmail.com",
    logo: "🌴",
    stage: "Seed to Series B",
    checkSize: "$250K - $2M",
    location: "Europe",
    sectors: ["Fintech", "Web3", "SaaS"],
    description: "A venture capital firm focused on early-stage technology companies with global scalability.",
    type: "VCs"
  },
  {
    id: "inv_indie",
    name: "Indie.vc",
    email: "jjatan220@gmail.com",
    logo: "🎸",
    stage: "MVP to Post-revenue",
    checkSize: "$100K - $500K",
    location: "United States",
    sectors: ["SaaS", "E-commerce", "Consumer Tech"],
    description: "A pilot program designed to fund revenue-generating startups focusing on profitability over VC scale.",
    type: "Debt"
  }
];



const STAGE_STEPS = [
  "Founder Information",
  "Startup Information",
  "Business Overview",
  "Market & Competition",
  "Traction & Growth",
  "Fundraising Info",
  "Documents & Agree"
];

const INITIAL_FORM = {
  // Section 1: Founder
  founderName: "",
  rsid: "",
  founderDesignation: "Founder",
  founderMobile: "",
  founderEmail: "",
  founderLinkedin: "",
  founderCity: "",
  founderCountry: "",
  coFounderName: "",
  coFounderDesignation: "",
  coFounderLinkedin: "",

  // Section 2: Startup
  startupName: "",
  websiteUrl: "",
  registrationStatus: "Registered",
  entityType: "Pvt Ltd",
  registrationCountry: "",
  incorporationDate: "",
  industry: "SaaS",

  // Section 3: Business Overview
  elevatorPitch: "",
  problemStatement: "",
  solution: "",
  targetCustomers: "",
  productStatus: "MVP Ready",
  demoWebsiteUrl: "",
  demoProductUrl: "",
  demoVideoUrl: "",

  // Section 4: Market & Competition
  tam: "",
  sam: "",
  som: "",
  competitors: "",
  competitiveAdvantage: "",

  // Section 5: Traction & Growth
  totalUsers: "",
  activeUsers: "",
  payingCustomers: "",
  monthlyRevenue: "",
  annualRevenue: "",
  monthlyGrowth: "",
  keyAchievements: "",

  // Section 6: Fundraising
  raisedFundsBefore: "No",
  amountRaised: "",
  investorNames: "",
  fundingRound: "Pre-Seed",
  currentFundingRound: "Seed",
  amountRaisingNow: "",
  fundingInstrument: "Equity",
  currentValuation: "",
  runwayRemaining: "6–12 Months",
  useOfFundsProductDev: "0",
  useOfFundsHiring: "0",
  useOfFundsMarketing: "0",
  useOfFundsOperations: "0",
  useOfFundsOther: "0",

  // Section 7: Documents
  pitchDeckUrl: "",
  financialModelUrl: "",
  dataRoomUrl: "",
  productDemoLink: "",
  investorMemoUrl: "",
  companyProfileUrl: "",
  additionalNotes: "",
  agreeToDeclaration: false,
  declarationDate: "",
  declarationName: "",
  appliedInvestors: [] // Track investor IDs applied to
};

export default function FundingView({ me, dk, addNotif, isMobile, profiles, onProfile }) {
  const th = T(dk);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Db application records
  const [myApplication, setMyApplication] = useState(null);
  
  // Real investors list loaded from DB
  const [investors, setInvestors] = useState([]);

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("All Profiles");
  const [selectedSector, setSelectedSector] = useState("All Focus Areas");
  const [selectedStage, setSelectedStage] = useState("All Stages");
  const [selectedTicketSize, setSelectedTicketSize] = useState("All Amounts");
  const [selectedLocation, setSelectedLocation] = useState("All Countries");
  const [selectedFundingInstrument, setSelectedFundingInstrument] = useState("All Instruments");

  // Form Wizard state
  const [form, setForm] = useState(INITIAL_FORM);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [formErrors, setFormErrors] = useState({});

  // Detailed view modal state
  const [selectedVC, setSelectedVC] = useState(null);

  // Pending VC apply targets
  const [pendingVCId, setPendingVCId] = useState(null);

  // Fetch applications & investors
  useEffect(() => {
    loadData();
  }, [me]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch real investors from DB
      const dbInvestors = await db.get("rs_investors");
      let merged = [];
      if (dbInvestors && dbInvestors.length > 0) {
        const mappedDb = dbInvestors.map(i => ({ ...i, type: i.type || "VCs" }));
        const dbNames = new Set(mappedDb.map(i => i.name.toLowerCase()));
        const missingFallbacks = FALLBACK_INVESTORS.filter(f => !dbNames.has(f.name.toLowerCase()));
        merged = [...mappedDb, ...missingFallbacks];
      } else {
        merged = FALLBACK_INVESTORS;
      }
      setInvestors(merged);

      // 2. Load my application
      const myRows = await db.get("rs_funding_applications", `uid=eq.${me}`);
      if (myRows && myRows.length > 0) {
        setMyApplication(myRows[0]);
        setForm({ ...INITIAL_FORM, ...myRows[0].data });
      } else {
        // Check local storage fallback
        const localApp = localStorage.getItem(`rs_funding_app_${me}`);
        if (localApp) {
          try {
            const parsed = JSON.parse(localApp);
            setMyApplication(parsed);
            setForm({ ...INITIAL_FORM, ...parsed.data });
          } catch (e) {}
        }
      }

    } catch (e) {
      console.error("Failed to load funding data:", e);
      setInvestors(FALLBACK_INVESTORS);
    } finally {
      setLoading(false);
    }
  };

  // Helper to parse industries / sectors safely
  const parseSectors = (sectorsField) => {
    if (!sectorsField) return [];
    if (Array.isArray(sectorsField)) return sectorsField;
    try {
      if (typeof sectorsField === "string") {
        return JSON.parse(sectorsField);
      }
    } catch (e) {}
    return [];
  };

  // ─── APPLICATION FORM WIZARD FLOW ────────────────────────────────
  const validateStep = (step, updateState = true) => {
    const errors = {};
    if (step === 0) {
      if (!form.founderName?.trim()) errors.founderName = "Founder Name is required";
      if (!form.rsid?.trim()) errors.rsid = "RightSignal ID (RSID) is required";
      if (!form.founderMobile?.trim()) errors.founderMobile = "Mobile Number is required";
      if (!form.founderEmail?.trim()) {
        errors.founderEmail = "Email Address is required";
      } else if (!/\S+@\S+\.\S+/.test(form.founderEmail)) {
        errors.founderEmail = "Enter a valid email address";
      }
      if (!form.founderLinkedin?.trim()) errors.founderLinkedin = "LinkedIn profile URL is required";
      if (!form.founderCity?.trim()) errors.founderCity = "City is required";
      if (!form.founderCountry?.trim()) errors.founderCountry = "Country is required";
    }

    if (step === 1) {
      if (!form.startupName?.trim()) errors.startupName = "Startup Name is required";
      if (form.registrationStatus === "Registered") {
        if (!form.registrationCountry?.trim()) errors.registrationCountry = "Registration Country is required";
        if (!form.incorporationDate) errors.incorporationDate = "Incorporation Date is required";
      }
    }

    if (step === 2) {
      if (!form.elevatorPitch?.trim()) {
        errors.elevatorPitch = "Elevator pitch is required";
      } else if (form.elevatorPitch.length > 200) {
        errors.elevatorPitch = "Elevator pitch must be under 200 characters";
      }
      if (!form.problemStatement?.trim()) errors.problemStatement = "Problem statement is required";
      if (!form.solution?.trim()) errors.solution = "Solution description is required";
      if (!form.targetCustomers?.trim()) errors.targetCustomers = "Target customer description is required";
    }

    if (step === 3) {
      if (!form.competitors?.trim()) errors.competitors = "Competitors description is required";
      if (!form.competitiveAdvantage?.trim()) errors.competitiveAdvantage = "Competitive advantage description is required";
    }

    if (step === 5) {
      if (!form.amountRaisingNow?.trim()) errors.amountRaisingNow = "Amount raising now is required";
    }

    if (step === 6) {
      if (!form.pitchDeckUrl?.trim()) errors.pitchDeckUrl = "Pitch Deck link is required";
      if (!form.agreeToDeclaration) errors.agreeToDeclaration = "You must agree to the declaration";
      if (!form.declarationName?.trim()) errors.declarationName = "Declaration name is required";
      if (!form.declarationDate) errors.declarationDate = "Declaration date is required";
    }

    if (updateState) {
      setFormErrors(errors);
    }
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(activeStep)) {
      if (activeStep < STAGE_STEPS.length - 1) {
        setActiveStep(prev => prev + 1);
      } else {
        handleSubmitApplication();
      }
    } else {
      addNotif?.({ type: "error", msg: "Please fill out all required fields marked with *" });
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  };

  const handleOpenForm = (initialVCId = null) => {
    setActiveStep(0);
    setFormErrors({});
    setPendingVCId(initialVCId);
    setWizardOpen(true);
  };

  const handleSubmitApplication = async () => {
    setSubmitting(true);
    try {
      // Append pending VC application to the list of applied VCs
      let updatedApplied = [...(form.appliedInvestors || [])];
      if (pendingVCId && !updatedApplied.includes(pendingVCId)) {
        updatedApplied.push(pendingVCId);
      }

      const updatedForm = { ...form, appliedInvestors: updatedApplied };
      setForm(updatedForm);

      const payload = {
        uid: me,
        data: updatedForm
      };

      let response;
      if (myApplication?.id && !String(myApplication.id).startsWith("local_")) {
        // Update existing application
        await db.patch("rs_funding_applications", `id=eq.${myApplication.id}`, payload);
        response = { ...myApplication, ...payload };
      } else {
        // Create new application
        response = await db.post("rs_funding_applications", payload);
      }

      if (response) {
        setMyApplication(response);
        localStorage.setItem(`rs_funding_app_${me}`, JSON.stringify(response));
        
        if (pendingVCId) {
          const targetInvestor = investors.find(i => i.id === pendingVCId);
          const investorName = targetInvestor?.name || "Investor";
          const targetEmail = targetInvestor?.email || "jjatan220@gmail.com";
          
          try {
            await fetch("/api/send-application", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-user-id": me },
              body: JSON.stringify({
                investorEmail: targetEmail,
                investorName: investorName,
                formData: updatedForm
              }),
            });
          } catch (err) {
            console.error("Failed to trigger email:", err);
          }

          addNotif?.({ type: "success", msg: `🚀 Application submitted successfully to ${investorName}!` });
        } else {
          addNotif?.({ type: "success", msg: "✨ Startup Funding Profile updated successfully!" });
        }
        
        setWizardOpen(false);
        setPendingVCId(null);
        loadData();
      } else {
        // Fallback to local storage if API call fails
        const mockResponse = { id: myApplication?.id || `local_${Math.random()}`, uid: me, data: updatedForm, created_at: new Date().toISOString() };
        setMyApplication(mockResponse);
        localStorage.setItem(`rs_funding_app_${me}`, JSON.stringify(mockResponse));
        
        if (pendingVCId) {
          const targetInvestor = investors.find(i => i.id === pendingVCId);
          const investorName = targetInvestor?.name || "Investor";
          const targetEmail = targetInvestor?.email || "jjatan220@gmail.com";
          
          try {
            await fetch("/api/send-application", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-user-id": me },
              body: JSON.stringify({
                investorEmail: targetEmail,
                investorName: investorName,
                formData: updatedForm
              }),
            });
          } catch (err) {
            console.error("Failed to trigger email:", err);
          }

          addNotif?.({ type: "success", msg: `🚀 Application saved locally & submitted to ${investorName}!` });
        } else {
          addNotif?.({ type: "success", msg: "✨ Saved Funding Profile locally!" });
        }

        setWizardOpen(false);
        setPendingVCId(null);
        loadData();
      }
    } catch (e) {
      console.error(e);
      addNotif?.({ type: "error", msg: "Failed to submit. Check your database connections." });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── APPLYING TO INVESTOR FLOW ─────────────────────────────────────
  const handleApplyToVC = async (investorId) => {
    const isCompleted = myApplication !== null;

    if (!isCompleted) {
      // First time - prompt to fill out the form
      addNotif?.({ type: "info", msg: "Please fill out the funding application to apply." });
      handleOpenForm(investorId);
      return;
    }

    const currentApplied = form.appliedInvestors || [];
    if (currentApplied.includes(investorId)) {
      addNotif?.({ type: "info", msg: "You have already applied to this VC." });
      return;
    }

    // Pre-populate form, set target VC, and open wizard for review & submit
    setPendingVCId(investorId);
    setActiveStep(0);
    setFormErrors({});
    setWizardOpen(true);
  };

  const handleWithdrawVC = async (investorId) => {
    try {
      const updatedApplied = (form.appliedInvestors || []).filter(id => id !== investorId);
      const updatedForm = { ...form, appliedInvestors: updatedApplied };
      setForm(updatedForm);

      const payload = {
        uid: me,
        data: updatedForm
      };

      if (myApplication?.id && !String(myApplication.id).startsWith("local_")) {
        await db.patch("rs_funding_applications", `id=eq.${myApplication.id}`, payload);
        const updatedApp = { ...myApplication, data: updatedForm };
        setMyApplication(updatedApp);
        localStorage.setItem(`rs_funding_app_${me}`, JSON.stringify(updatedApp));
      } else {
        const updatedApp = myApplication ? { ...myApplication, data: updatedForm } : { id: `local_${Math.random()}`, uid: me, data: updatedForm, created_at: new Date().toISOString() };
        setMyApplication(updatedApp);
        localStorage.setItem(`rs_funding_app_${me}`, JSON.stringify(updatedApp));
      }

      const investorName = investors.find(i => i.id === investorId)?.name || "Investor";
      addNotif?.({ type: "success", msg: `Withdrew application from ${investorName}.` });
    } catch (e) {
      console.error(e);
      addNotif?.({ type: "error", msg: "Failed to withdraw application." });
    }
  };



  if (loading) {
    return (
      <div style={{ padding: 40, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Spin dk={dk} msg="Loading investor profiles and applications..." />
      </div>
    );
  }

  const parseVal = (str) => {
    if (!str) return 0;
    let clean = str.replace(/[$,]/g, "").trim().toLowerCase();
    let multiplier = 1;
    if (clean.includes("m")) {
      multiplier = 1000000;
      clean = clean.replace("m", "");
    } else if (clean.includes("k")) {
      multiplier = 1000;
      clean = clean.replace("k", "");
    }
    return parseFloat(clean) * multiplier;
  };

  const matchesTicketSize = (vcCheckSize, selectedSize) => {
    if (selectedSize === "All Ticket Sizes") return true;
    if (!vcCheckSize) return false;
    
    let parts = vcCheckSize.split("-").map(p => p.trim());
    let vcMin = parseVal(parts[0]);
    let vcMax = parts.length > 1 ? parseVal(parts[1]) : vcMin;
    
    if (vcMin === 0 && vcMax === 0) return true;
    
    if (selectedSize === "< $100K") {
      return vcMin < 100000;
    }
    if (selectedSize === "$100K - $500K") {
      return (vcMin <= 500000 && vcMax >= 100000);
    }
    if (selectedSize === "$500K - $1M") {
      return (vcMin <= 1000000 && vcMax >= 500000);
    }
    if (selectedSize === "$1M - $5M") {
      return (vcMin <= 5000000 && vcMax >= 1000000);
    }
    if (selectedSize === "$5M+") {
      return vcMax >= 5000000;
    }
    return true;
  };

  const matchesStage = (vcStage, selectedStage) => {
    if (selectedStage === "All Stages") return true;
    if (!vcStage) return false;
    
    const vcLower = vcStage.toLowerCase();
    const selLower = selectedStage.toLowerCase();
    
    if (selLower === "idea") {
      return vcLower.includes("idea") || vcLower.includes("prototype") || vcLower.includes("r&d") || vcLower.includes("pre-seed");
    }
    if (selLower === "mvp") {
      return vcLower.includes("mvp") || vcLower.includes("prototype") || vcLower.includes("post-revenue") || vcLower.includes("seed");
    }
    if (selLower === "pre-seed") {
      return vcLower.includes("pre-seed") || vcLower.includes("pre seed") || vcLower.includes("seed");
    }
    if (selLower === "seed") {
      return vcLower.includes("seed");
    }
    if (selLower === "series a") {
      return vcLower.includes("series a") || vcLower.includes("growth");
    }
    if (selLower === "series b") {
      return vcLower.includes("series b") || vcLower.includes("growth");
    }
    if (selLower === "series c") {
      return vcLower.includes("series c") || vcLower.includes("growth");
    }
    
    return vcLower.includes(selLower);
  };

  const getFundingType = (vc) => {
    if (vc.funding_type) return vc.funding_type;
    if (vc.fundingType) return vc.fundingType;
    const type = (vc.type || "").toLowerCase();
    if (type === "grants" || type === "grant") return "Grant";
    if (type === "debt") return "Debt";
    if (type === "crowdfunding") return "Crowdfunded";
    return "Equity";
  };

  const matchesLocation = (vcLocation, selectedLocation) => {
    if (selectedLocation === "All Countries") return true;
    if (!vcLocation) return true;
    
    const vcLower = vcLocation.toLowerCase();
    const selLower = selectedLocation.toLowerCase();
    
    return vcLower.includes(selLower) || vcLower === "global" || selLower === "global";
  };

  const filteredInvestors = investors.filter(vc => {
    const matchesSearch = 
      vc.name.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesType = selectedType === "All Profiles" || (vc.type || "VCs") === selectedType;
    const matchesSector = selectedSector === "All Focus Areas" || parseSectors(vc.sectors).includes(selectedSector);
    const stageOk = matchesStage(vc.stage, selectedStage);
    const sizeOk = matchesTicketSize(vc.check_size || vc.checkSize, selectedTicketSize);
    const locOk = matchesLocation(vc.location, selectedLocation);
    const ftOk = selectedFundingInstrument === "All Instruments" || 
      getFundingType(vc).toLowerCase() === selectedFundingInstrument.toLowerCase();

    return matchesSearch && matchesType && matchesSector && stageOk && sizeOk && locOk && ftOk;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ─── HEADER ─── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: th.txt, letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ background: "linear-gradient(135deg, #10b981, #6366f1)", width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16 }}>$</span>
            Funding
          </h2>
          <p style={{ margin: 0, color: th.txt2, fontSize: 13, marginTop: 4 }}>Apply directly to diverse funding sources and view firm details</p>
        </div>
      </div>

      {/* ─── SEARCH & FILTERS CONTAINER (MYTABLON STYLE) ─── */}
      <div style={{
        background: th.surf,
        backdropFilter: th.blur,
        WebkitBackdropFilter: th.blur,
        border: `1px solid ${th.bdr}`,
        borderRadius: 24,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        position: "relative",
        zIndex: 20,
        boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.08)"
      }}>
        {/* Search Bar */}
        <div style={{ position: "relative", width: "100%" }}>
          <Search size={18} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: th.txt3 }} />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px 12px 46px",
              borderRadius: 14,
              border: `1px solid ${th.inpB}`,
              background: th.inp,
              color: th.txt,
              outline: "none",
              fontSize: 14,
              boxSizing: "border-box",
              transition: "border-color 0.2s"
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{
                position: "absolute",
                right: 16,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: th.txt3,
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Pill Dropdowns Row */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center"
        }}>
          {/* Countries Dropdown */}
          <GlassSelectPill
            value={selectedLocation}
            onChange={setSelectedLocation}
            options={["All Countries", "India", "United States", "Europe", "Global"]}
            placeholder="Country"
            dk={dk}
            th={th}
          />

          {/* Profile Dropdown */}
          <GlassSelectPill
            value={selectedType}
            onChange={setSelectedType}
            options={["All Profiles", "Angels", "VCs", "Family Offices", "Grants", "Accelerators", "Debt", "Crowdfunding"]}
            placeholder="Profile"
            dk={dk}
            th={th}
          />

          {/* Focus Area Dropdown */}
          <GlassSelectPill
            value={selectedSector}
            onChange={setSelectedSector}
            options={["All Focus Areas", "AI", "SaaS", "Fintech", "Consumer", "Biotech", "DeepTech", "ClimateTech", "Enterprise Software", "Web3", "HealthTech", "E-commerce", "Marketplace"]}
            placeholder="Focus Area"
            dk={dk}
            th={th}
          />

          {/* Amount Dropdown */}
          <GlassSelectPill
            value={selectedTicketSize}
            onChange={setSelectedTicketSize}
            options={["All Amounts", "< $100K", "$100K - $500K", "$500K - $1M", "$1M - $5M", "$5M+"]}
            placeholder="Amount"
            dk={dk}
            th={th}
          />

          {/* Stage Dropdown */}
          <GlassSelectPill
            value={selectedStage}
            onChange={setSelectedStage}
            options={["All Stages", "Idea", "MVP", "Pre-Seed", "Seed", "Series A", "Series B", "Series C"]}
            placeholder="Stage"
            dk={dk}
            th={th}
          />

          {/* Funding Type Dropdown */}
          <GlassSelectPill
            value={selectedFundingInstrument}
            onChange={setSelectedFundingInstrument}
            options={["All Instruments", "Equity", "Debt", "Grant", "Crowdfunded", "Convertible Note"]}
            placeholder="Funding Type"
            dk={dk}
            th={th}
          />
        </div>
      </div>

      {/* ─── FUNDING SOURCES LIST ─── */}
      {filteredInvestors.length === 0 ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
          background: th.surf,
          backdropFilter: th.blur,
          WebkitBackdropFilter: th.blur,
          border: `1px solid ${th.bdr}`,
          borderRadius: 24,
          textAlign: "center",
          gap: 12
        }}>
          <div style={{ fontSize: 40 }}>🔍</div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: th.txt }}>No funding sources found</h3>
          <p style={{ margin: 0, fontSize: 13, color: th.txt2, maxWidth: 320 }}>Try adjusting your search keywords, sector, or category filter.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          {filteredInvestors.map(vc => {
            const hasApplied = (form.appliedInvestors || []).includes(vc.id);
            return (
              <Card
                dk={dk}
                key={vc.id}
                onClick={() => setSelectedVC(vc)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  padding: 20,
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s"
                }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ fontSize: 32, width: 52, height: 52, borderRadius: 16, background: dk ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
                    {vc.logo || "💼"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: th.txt }}>{vc.name}</h3>
                      <span style={{ fontSize: 10, background: dk ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.06)", color: "#f59e0b", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>{vc.type || "VCs"}</span>
                    </div>
                  </div>
                </div>

                {/* Structured Details Grid */}
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
                  gap: "10px 16px", 
                  background: dk ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)", 
                  padding: 14, 
                  borderRadius: 14, 
                  border: `1px solid ${th.bdr}`, 
                  fontSize: 12 
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: th.txt3 }}>Stage:</span>
                    <span style={{ fontWeight: 600, color: "#6366f1" }}>{vc.stage || "N/A"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: th.txt3 }}>Amount:</span>
                    <span style={{ fontWeight: 600, color: "#10b981" }}>{vc.check_size || vc.checkSize || "N/A"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: th.txt3 }}>Location:</span>
                    <span style={{ fontWeight: 600, color: "#3b82f6", display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <MapPin size={10} />
                      {vc.location || "Global"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: th.txt3 }}>Instrument:</span>
                    <span style={{ fontWeight: 600, color: "#8b5cf6" }}>{getFundingType(vc)}</span>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: 13, color: th.txt2, lineHeight: 1.5, flex: 1 }}>{vc.description}</p>

                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  marginTop: 4,
                  borderTop: `1px solid ${th.bdr}`,
                  paddingTop: 12
                }}>
                  {/* Left: Sectors */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", flex: 1 }}>
                    {parseSectors(vc.sectors).map(s => (
                      <span key={s} style={{ fontSize: 10, border: `1px solid ${th.bdr}`, color: th.txt3, padding: "1px 6px", borderRadius: 6, fontWeight: 500 }}>{s}</span>
                    ))}
                  </div>

                  {/* Right: Button */}
                  <div>
                    {hasApplied ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleWithdrawVC(vc.id); }}
                        style={{
                          background: "rgba(239, 68, 68, 0.12)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          color: "#ef4444",
                          padding: "8px 16px",
                          borderRadius: 12,
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          transition: "all 0.2s"
                        }}
                      >
                        <CheckCircle2 size={13} style={{ color: "#10b981" }} />
                        Withdraw
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleApplyToVC(vc.id); }}
                        style={{
                          background: "#10b981",
                          border: "none",
                          color: "#fff",
                          padding: "8px 16px",
                          borderRadius: 12,
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
                          transition: "all 0.2s"
                        }}
                      >
                        <Send size={12} />
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── MODAL WIZARD: APPLICATION FORM (7 STEPS) ─── */}
      {wizardOpen && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: isMobile ? "stretch" : "center", justifyContent: isMobile ? "stretch" : "center" }}>
          {/* Backdrop */}
          <div onClick={() => setWizardOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0, 0, 0, 0.65)", backdropFilter: "blur(6px)" }} />
          
          {/* Form Content Card */}
          <div style={{
            position: isMobile ? "fixed" : "relative",
            inset: isMobile ? 0 : "auto",
            width: "100%",
            maxWidth: isMobile ? "none" : 860,
            height: isMobile ? "100%" : "90vh",
            maxHeight: isMobile ? "none" : 700,
            background: th.side,
            border: isMobile ? "none" : `1px solid ${th.bdr}`,
            borderRadius: isMobile ? 0 : 24,
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.4)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            backdropFilter: th.blur,
            WebkitBackdropFilter: th.blur,
            animation: "rs-fade-up 0.3s ease-out"
          }}>
            {/* Header */}
            <div style={{ padding: isMobile ? "12px 16px" : "18px 24px", borderBottom: `1px solid ${th.bdr}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: dk ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 16, fontWeight: 800, color: th.txt }}>Startup Funding Application</h3>
                <p style={{ margin: 0, fontSize: 10, color: th.txt3 }}>Step {activeStep + 1} of 7: {STAGE_STEPS[activeStep]}</p>
              </div>
              <button 
                onClick={() => setWizardOpen(false)}
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${th.bdr}`, borderRadius: 8, cursor: "pointer", color: th.txt2, padding: "5px 10px", fontSize: 11 }}
              >
                Cancel
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div style={{ height: 4, background: th.bdr, display: "flex" }}>
              {STAGE_STEPS.map((_, i) => (
                <div 
                  key={i} 
                  style={{ 
                    flex: 1, 
                    height: "100%", 
                    background: i <= activeStep ? "#6366f1" : "transparent",
                    transition: "background 0.3s ease",
                    borderRight: i < STAGE_STEPS.length - 1 ? `1px solid ${th.side}` : "none"
                  }} 
                />
              ))}
            </div>

            {/* Main Form Body */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              {/* Sidebar stepper navigation (hidden on mobile) */}
              {!isMobile && (
                <div style={{ width: 200, borderRight: `1px solid ${th.bdr}`, background: dk ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.02)", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                  {STAGE_STEPS.map((stepName, i) => (
                    <button
                      key={i}
                      disabled={i > activeStep && !validateStep(activeStep, false)}
                      onClick={() => {
                        if (validateStep(activeStep) || i < activeStep) {
                          setActiveStep(i);
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "none",
                        background: activeStep === i ? "rgba(99, 102, 241, 0.15)" : "transparent",
                        color: activeStep === i ? "#6366f1" : (i < activeStep ? "#10b981" : th.txt3),
                        fontSize: 12,
                        fontWeight: activeStep === i ? 700 : 500,
                        textAlign: "left",
                        cursor: "pointer"
                      }}
                    >
                      <span style={{ 
                        width: 18, 
                        height: 18, 
                        borderRadius: 99, 
                        background: activeStep === i ? "#6366f1" : (i < activeStep ? "#10b981" : th.bdr),
                        color: "#fff",
                        fontSize: 9,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700
                      }}>
                        {i < activeStep ? "✓" : i + 1}
                      </span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stepName}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Scrollable Form Panel */}
              <div style={{ flex: 1, padding: isMobile ? 16 : 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
                
                {/* ─── SECTION 1: FOUNDER INFORMATION ─── */}
                {activeStep === 0 && (
                  <>
                    <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: th.txt, borderBottom: `1px solid ${th.bdr}`, paddingBottom: 6 }}>Primary Founder Details</h4>
                    
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>Founder Name*</label>
                        <input
                          type="text"
                          value={form.founderName}
                          onChange={e => setForm({ ...form, founderName: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${formErrors.founderName ? "#ef4444" : th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>RightSignal ID (RSID)*</label>
                        <input
                          type="text"
                          placeholder="e.g. RS-1234"
                          value={form.rsid}
                          onChange={e => setForm({ ...form, rsid: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${formErrors.rsid ? "#ef4444" : th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>Designation*</label>
                        <GlassSelect
                          value={form.founderDesignation}
                          onChange={val => setForm({ ...form, founderDesignation: val })}
                          options={["Founder", "Co-Founder", "CEO", "Other"]}
                          dk={dk}
                          th={th}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>Mobile Number*</label>
                        <input
                          type="tel"
                          value={form.founderMobile}
                          onChange={e => setForm({ ...form, founderMobile: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${formErrors.founderMobile ? "#ef4444" : th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>Email Address*</label>
                        <input
                          type="email"
                          value={form.founderEmail}
                          onChange={e => setForm({ ...form, founderEmail: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${formErrors.founderEmail ? "#ef4444" : th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>LinkedIn Profile URL*</label>
                        <input
                          type="url"
                          placeholder="https://linkedin.com/in/..."
                          value={form.founderLinkedin}
                          onChange={e => setForm({ ...form, founderLinkedin: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${formErrors.founderLinkedin ? "#ef4444" : th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>City*</label>
                        <input
                          type="text"
                          value={form.founderCity}
                          onChange={e => setForm({ ...form, founderCity: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${formErrors.founderCity ? "#ef4444" : th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>Country*</label>
                        <input
                          type="text"
                          value={form.founderCountry}
                          onChange={e => setForm({ ...form, founderCountry: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${formErrors.founderCountry ? "#ef4444" : th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    <h4 style={{ margin: "14px 0 10px", fontSize: 13, fontWeight: 700, color: th.txt, borderBottom: `1px solid ${th.bdr}`, paddingBottom: 6 }}>Co-Founder Details (Optional)</h4>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Co-Founder Name</label>
                        <input
                          type="text"
                          value={form.coFounderName}
                          onChange={e => setForm({ ...form, coFounderName: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Designation</label>
                        <input
                          type="text"
                          placeholder="e.g. CTO / Co-founder"
                          value={form.coFounderDesignation}
                          onChange={e => setForm({ ...form, coFounderDesignation: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>LinkedIn Profile URL</label>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/..."
                        value={form.coFounderLinkedin}
                        onChange={e => setForm({ ...form, coFounderLinkedin: e.target.value })}
                        style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                  </>
                )}

                {/* ─── SECTION 2: STARTUP INFORMATION ─── */}
                {activeStep === 1 && (
                  <>
                    <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: th.txt, borderBottom: `1px solid ${th.bdr}`, paddingBottom: 6 }}>Startup Profile</h4>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>Startup Name*</label>
                        <input
                          type="text"
                          value={form.startupName}
                          onChange={e => setForm({ ...form, startupName: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${formErrors.startupName ? "#ef4444" : th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Website URL</label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={form.websiteUrl}
                          onChange={e => setForm({ ...form, websiteUrl: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>Industry*</label>
                        <GlassSelect
                          value={form.industry}
                          onChange={val => setForm({ ...form, industry: val })}
                          options={["SaaS", "AI", "Fintech", "HealthTech", "EdTech", "Consumer", "Marketplace", "E-commerce", "Enterprise Software", "ClimateTech", "Web3", "Other"]}
                          dk={dk}
                          th={th}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>Registration Status*</label>
                        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                          {["Registered", "Not Registered"].map(status => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => setForm({ ...form, registrationStatus: status })}
                              style={{
                                flex: 1,
                                padding: "8px 12px",
                                borderRadius: 10,
                                border: `1px solid ${form.registrationStatus === status ? "#6366f1" : th.inpB}`,
                                background: form.registrationStatus === status ? "rgba(99,102,241,0.12)" : th.inp,
                                color: form.registrationStatus === status ? "#6366f1" : th.txt,
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 600
                              }}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {form.registrationStatus === "Registered" && (
                      <div className="rs-fade-up" style={{ display: "flex", flexDirection: "column", gap: 12, background: dk ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", padding: 16, borderRadius: 12, border: `1px solid ${th.bdr}` }}>
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
                          <div>
                            <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Entity Type*</label>
                            <GlassSelect
                              value={form.entityType}
                              onChange={val => setForm({ ...form, entityType: val })}
                              options={["Pvt Ltd", "LLP", "C-Corp", "Other"]}
                              dk={dk}
                              th={th}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Registration Country*</label>
                            <input
                              type="text"
                              value={form.registrationCountry}
                              onChange={e => setForm({ ...form, registrationCountry: e.target.value })}
                              style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${formErrors.registrationCountry ? "#ef4444" : th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Incorporation Date*</label>
                            <input
                              type="date"
                              value={form.incorporationDate}
                              onChange={e => setForm({ ...form, incorporationDate: e.target.value })}
                              style={{ width: "100%", padding: 9, borderRadius: 10, border: `1px solid ${formErrors.incorporationDate ? "#ef4444" : th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ─── SECTION 3: BUSINESS OVERVIEW ─── */}
                {activeStep === 2 && (
                  <>
                    <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: th.txt, borderBottom: `1px solid ${th.bdr}`, paddingBottom: 6 }}>Business Value Proposition</h4>
                    
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600 }}>Elevator Pitch*</label>
                        <span style={{ fontSize: 10, color: (form.elevatorPitch || "").length > 200 ? "#ef4444" : th.txt3 }}>{(form.elevatorPitch || "").length}/200 chars</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Describe your startup in one sentence (max 200 characters)"
                        value={form.elevatorPitch}
                        onChange={e => setForm({ ...form, elevatorPitch: e.target.value })}
                        maxLength={200}
                        style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${formErrors.elevatorPitch ? "#ef4444" : th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>Problem Statement*</label>
                      <textarea
                        rows={3}
                        placeholder="What specific pain point are you solving?"
                        value={form.problemStatement}
                        onChange={e => setForm({ ...form, problemStatement: e.target.value })}
                        style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${formErrors.problemStatement ? "#ef4444" : th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box", resize: "vertical" }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>Solution*</label>
                      <textarea
                        rows={3}
                        placeholder="How does your product solve this problem?"
                        value={form.solution}
                        onChange={e => setForm({ ...form, solution: e.target.value })}
                        style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${formErrors.solution ? "#ef4444" : th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box", resize: "vertical" }}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>Target Customers*</label>
                        <input
                          type="text"
                          placeholder="e.g. SMBs, Developers, Gen-Z"
                          value={form.targetCustomers}
                          onChange={e => setForm({ ...form, targetCustomers: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${formErrors.targetCustomers ? "#ef4444" : th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>Current Product Status*</label>
                        <GlassSelect
                          value={form.productStatus}
                          onChange={val => setForm({ ...form, productStatus: val })}
                          options={["Idea Stage", "MVP Ready", "Beta Users", "Revenue Generating", "Scaling"]}
                          dk={dk}
                          th={th}
                        />
                      </div>
                    </div>

                    <h4 style={{ margin: "14px 0 10px", fontSize: 13, fontWeight: 700, color: th.txt, borderBottom: `1px solid ${th.bdr}`, paddingBottom: 6 }}>Product Links (Optional)</h4>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Website URL</label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={form.demoWebsiteUrl}
                          onChange={e => setForm({ ...form, demoWebsiteUrl: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Product Demo URL</label>
                        <input
                          type="url"
                          placeholder="https://app.yourstartup.com"
                          value={form.demoProductUrl}
                          onChange={e => setForm({ ...form, demoProductUrl: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Demo Video URL</label>
                        <input
                          type="url"
                          placeholder="Loom / YouTube link"
                          value={form.demoVideoUrl}
                          onChange={e => setForm({ ...form, demoVideoUrl: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* ─── SECTION 4: MARKET & COMPETITION ─── */}
                {activeStep === 3 && (
                  <>
                    <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: th.txt, borderBottom: `1px solid ${th.bdr}`, paddingBottom: 6 }}>Market Sizing</h4>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>TAM (Total Addressable Market)</label>
                        <input
                          type="text"
                          placeholder="e.g. $10B global"
                          value={form.tam}
                          onChange={e => setForm({ ...form, tam: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>SAM (Serviceable Market)</label>
                        <input
                          type="text"
                          placeholder="e.g. $1.5B regional"
                          value={form.sam}
                          onChange={e => setForm({ ...form, sam: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>SOM (Obtainable Market)</label>
                        <input
                          type="text"
                          placeholder="e.g. $150M first 3yrs"
                          value={form.som}
                          onChange={e => setForm({ ...form, som: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    <h4 style={{ margin: "14px 0 10px", fontSize: 13, fontWeight: 700, color: th.txt, borderBottom: `1px solid ${th.bdr}`, paddingBottom: 6 }}>Competitors &amp; Differentiation</h4>

                    <div>
                      <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>Competitors*</label>
                      <textarea
                        rows={2}
                        placeholder="List your top competitors and key players."
                        value={form.competitors}
                        onChange={e => setForm({ ...form, competitors: e.target.value })}
                        style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${formErrors.competitors ? "#ef4444" : th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box", resize: "vertical" }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>Competitive Advantage*</label>
                      <textarea
                        rows={3}
                        placeholder="Why is your startup better? What is your moat?"
                        value={form.competitiveAdvantage}
                        onChange={e => setForm({ ...form, competitiveAdvantage: e.target.value })}
                        style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${formErrors.competitiveAdvantage ? "#ef4444" : th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box", resize: "vertical" }}
                      />
                    </div>
                  </>
                )}

                {/* ─── SECTION 5: TRACTION & GROWTH ─── */}
                {activeStep === 4 && (
                  <>
                    <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: th.txt, borderBottom: `1px solid ${th.bdr}`, paddingBottom: 6 }}>Current Metrics</h4>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Total Users</label>
                        <input
                          type="text"
                          placeholder="e.g. 5,000"
                          value={form.totalUsers}
                          onChange={e => setForm({ ...form, totalUsers: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Active Users</label>
                        <input
                          type="text"
                          placeholder="e.g. 1,200 MAU"
                          value={form.activeUsers}
                          onChange={e => setForm({ ...form, activeUsers: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Paying Customers</label>
                        <input
                          type="text"
                          placeholder="e.g. 150"
                          value={form.payingCustomers}
                          onChange={e => setForm({ ...form, payingCustomers: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Monthly Revenue</label>
                        <input
                          type="text"
                          placeholder="e.g. $8,000 MRR"
                          value={form.monthlyRevenue}
                          onChange={e => setForm({ ...form, monthlyRevenue: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Annual Revenue</label>
                        <input
                          type="text"
                          placeholder="e.g. $96,000 ARR"
                          value={form.annualRevenue}
                          onChange={e => setForm({ ...form, annualRevenue: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Monthly Growth %</label>
                        <input
                          type="text"
                          placeholder="e.g. 15%"
                          value={form.monthlyGrowth}
                          onChange={e => setForm({ ...form, monthlyGrowth: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, fontSize: 13 }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Key Achievements / Milestones</label>
                      <textarea
                        rows={3}
                        placeholder="Mention any awards, user milestones, strategic partnerships, patents, etc."
                        value={form.keyAchievements}
                        onChange={e => setForm({ ...form, keyAchievements: e.target.value })}
                        style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box", resize: "vertical" }}
                      />
                    </div>
                  </>
                )}

                {/* ─── SECTION 6: FUNDRAISING INFORMATION ─── */}
                {activeStep === 5 && (
                  <>
                    <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: th.txt, borderBottom: `1px solid ${th.bdr}`, paddingBottom: 6 }}>Previous Funding History</h4>

                    <div>
                      <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>Have you raised funds before?*</label>
                      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                        {["Yes", "No"].map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setForm({ ...form, raisedFundsBefore: opt })}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              borderRadius: 10,
                              border: `1px solid ${form.raisedFundsBefore === opt ? "#6366f1" : th.inpB}`,
                              background: form.raisedFundsBefore === opt ? "rgba(99,102,241,0.12)" : th.inp,
                              color: form.raisedFundsBefore === opt ? "#6366f1" : th.txt,
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: 600
                            }}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {form.raisedFundsBefore === "Yes" && (
                      <div className="rs-fade-up" style={{ display: "flex", flexDirection: "column", gap: 12, background: dk ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", padding: 16, borderRadius: 12, border: `1px solid ${th.bdr}` }}>
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                          <div>
                            <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Amount Raised</label>
                            <input
                              type="text"
                              placeholder="e.g. $100K"
                              value={form.amountRaised}
                              onChange={e => setForm({ ...form, amountRaised: e.target.value })}
                              style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Funding Round</label>
                            <GlassSelect
                              value={form.fundingRound}
                              onChange={val => setForm({ ...form, fundingRound: val })}
                              options={["Friends & Family", "Angel", "Pre-Seed", "Seed", "Other"]}
                              dk={dk}
                              th={th}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Investor Names</label>
                          <input
                            type="text"
                            placeholder="e.g. Angels / Syndicates"
                            value={form.investorNames}
                            onChange={e => setForm({ ...form, investorNames: e.target.value })}
                            style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                          />
                        </div>
                      </div>
                    )}

                    <h4 style={{ margin: "14px 0 10px", fontSize: 13, fontWeight: 700, color: th.txt, borderBottom: `1px solid ${th.bdr}`, paddingBottom: 6 }}>Current Fundraise details</h4>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>Current Fundraising Round*</label>
                        <GlassSelect
                          value={form.currentFundingRound}
                          onChange={val => setForm({ ...form, currentFundingRound: val })}
                          options={["Pre-Seed", "Seed", "Bridge", "Series A", "Other"]}
                          dk={dk}
                          th={th}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>Amount Raising Now*</label>
                        <input
                          type="text"
                          placeholder="e.g. $1,000,000"
                          value={form.amountRaisingNow}
                          onChange={e => setForm({ ...form, amountRaisingNow: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${formErrors.amountRaisingNow ? "#ef4444" : th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>Funding Instrument*</label>
                        <GlassSelect
                          value={form.fundingInstrument}
                          onChange={val => setForm({ ...form, fundingInstrument: val })}
                          options={["Equity", "SAFE", "Convertible Note", "Debt", "Revenue Share", "Open to Discussion"]}
                          dk={dk}
                          th={th}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Current Valuation (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. $8M cap"
                          value={form.currentValuation}
                          onChange={e => setForm({ ...form, currentValuation: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>Runway Remaining*</label>
                        <GlassSelect
                          value={form.runwayRemaining}
                          onChange={val => setForm({ ...form, runwayRemaining: val })}
                          options={["Less than 3 Months", "3–6 Months", "6–12 Months", "More than 12 Months"]}
                          dk={dk}
                          th={th}
                        />
                      </div>
                    </div>

                    <h4 style={{ margin: "14px 0 10px", fontSize: 13, fontWeight: 700, color: th.txt, borderBottom: `1px solid ${th.bdr}`, paddingBottom: 6 }}>Use of Funds (Estimated % Allocation - Should sum up to 100%)</h4>
                    
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 10, color: th.txt3 }}>Product Dev %</label>
                        <input
                          type="number"
                          min="0" max="100"
                          value={form.useOfFundsProductDev}
                          onChange={e => setForm({ ...form, useOfFundsProductDev: e.target.value })}
                          style={{ width: "100%", padding: 8, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: th.txt3 }}>Hiring %</label>
                        <input
                          type="number"
                          min="0" max="100"
                          value={form.useOfFundsHiring}
                          onChange={e => setForm({ ...form, useOfFundsHiring: e.target.value })}
                          style={{ width: "100%", padding: 8, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: th.txt3 }}>Marketing %</label>
                        <input
                          type="number"
                          min="0" max="100"
                          value={form.useOfFundsMarketing}
                          onChange={e => setForm({ ...form, useOfFundsMarketing: e.target.value })}
                          style={{ width: "100%", padding: 8, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: th.txt3 }}>Operations %</label>
                        <input
                          type="number"
                          min="0" max="100"
                          value={form.useOfFundsOperations}
                          onChange={e => setForm({ ...form, useOfFundsOperations: e.target.value })}
                          style={{ width: "100%", padding: 8, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: th.txt3 }}>Other %</label>
                        <input
                          type="number"
                          min="0" max="100"
                          value={form.useOfFundsOther}
                          onChange={e => setForm({ ...form, useOfFundsOther: e.target.value })}
                          style={{ width: "100%", padding: 8, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, fontSize: 12 }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* ─── SECTION 7: DOCUMENTS & DECLARATION ─── */}
                {activeStep === 6 && (
                  <>
                    <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: th.txt, borderBottom: `1px solid ${th.bdr}`, paddingBottom: 6 }}>Uploads &amp; Share Links</h4>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, fontWeight: 600, display: "block", marginBottom: 5 }}>Pitch Deck Link (Google Drive / DocSend)*</label>
                        <input
                          type="url"
                          placeholder="https://drive.google.com/..."
                          value={form.pitchDeckUrl}
                          onChange={e => setForm({ ...form, pitchDeckUrl: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${formErrors.pitchDeckUrl ? "#ef4444" : th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Financial Model Link</label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={form.financialModelUrl}
                          onChange={e => setForm({ ...form, financialModelUrl: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Data Room Link</label>
                        <input
                          type="url"
                          placeholder="Link to secure file storage room"
                          value={form.dataRoomUrl}
                          onChange={e => setForm({ ...form, dataRoomUrl: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Investor Memo Link</label>
                        <input
                          type="url"
                          placeholder="Link to memo document"
                          value={form.investorMemoUrl}
                          onChange={e => setForm({ ...form, investorMemoUrl: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, color: th.txt2, display: "block", marginBottom: 5 }}>Additional Notes for Investors</label>
                      <textarea
                        rows={2}
                        placeholder="Anything else investors should know?"
                        value={form.additionalNotes}
                        onChange={e => setForm({ ...form, additionalNotes: e.target.value })}
                        style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box", resize: "vertical" }}
                      />
                    </div>

                    <h4 style={{ margin: "14px 0 10px", fontSize: 13, fontWeight: 700, color: th.txt, borderBottom: `1px solid ${th.bdr}`, paddingBottom: 6 }}>Founder Declaration</h4>

                    <div style={{ background: dk ? "rgba(99, 102, 241, 0.08)" : "rgba(99, 102, 241, 0.04)", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <input
                          type="checkbox"
                          id="declaration-agree"
                          checked={form.agreeToDeclaration}
                          onChange={e => setForm({ ...form, agreeToDeclaration: e.target.checked })}
                          style={{ marginTop: 3, cursor: "pointer" }}
                        />
                        <label htmlFor="declaration-agree" style={{ fontSize: 12, color: th.txt, lineHeight: 1.4, cursor: "pointer" }}>
                          I confirm that the information submitted is accurate and can be shared with selected investors through the RightSignal platform.*
                        </label>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginTop: 4 }}>
                        <div>
                          <label style={{ fontSize: 10, color: th.txt2, display: "block", marginBottom: 3 }}>Date*</label>
                          <input
                            type="date"
                            value={form.declarationDate}
                            onChange={e => setForm({ ...form, declarationDate: e.target.value })}
                            style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${formErrors.declarationDate ? "#ef4444" : th.inpB}`, background: th.inp, color: th.txt, fontSize: 12 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, color: th.txt2, display: "block", marginBottom: 3 }}>Name*</label>
                          <input
                            type="text"
                            placeholder="Full Name as signature"
                            value={form.declarationName}
                            onChange={e => setForm({ ...form, declarationName: e.target.value })}
                            style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${formErrors.declarationName ? "#ef4444" : th.inpB}`, background: th.inp, color: th.txt, fontSize: 12 }}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

              </div>
            </div>

            {/* Footer Navigation Controls */}
            <div style={{ padding: isMobile ? "10px 16px" : "14px 24px", borderTop: `1px solid ${th.bdr}`, display: "flex", justifyContent: "space-between", background: dk ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)" }}>
              <button
                onClick={handlePrevStep}
                disabled={activeStep === 0}
                style={{
                  background: "transparent",
                  border: `1px solid ${th.bdr}`,
                  borderRadius: 10,
                  padding: "8px 16px",
                  color: activeStep === 0 ? th.txt3 : th.txt,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: activeStep === 0 ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                <ChevronLeft size={14} /> Back
              </button>

              <button
                onClick={handleNextStep}
                disabled={submitting}
                style={{
                  background: activeStep === STAGE_STEPS.length - 1 ? "#10b981" : "#3b82f6",
                  border: "none",
                  borderRadius: 10,
                  padding: "8px 20px",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                {activeStep === STAGE_STEPS.length - 1 ? (
                  <>Submit &amp; Apply <Send size={12} /></>
                ) : (
                  <>Next <ChevronRight size={14} /></>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── POPUP DETAILED VIEWER: INVESTOR/VC PROFILE ─── */}
      {selectedVC && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: isMobile ? "stretch" : "center", justifyContent: isMobile ? "stretch" : "center" }}>
          {/* Backdrop */}
          <div onClick={() => setSelectedVC(null)} style={{ position: "absolute", inset: 0, background: "rgba(0, 0, 0, 0.65)", backdropFilter: "blur(6px)" }} />
          
          {/* Modal Panel */}
          <div style={{
            position: isMobile ? "fixed" : "relative",
            inset: isMobile ? 0 : "auto",
            width: "100%",
            maxWidth: isMobile ? "none" : 580,
            height: isMobile ? "100%" : "auto",
            maxHeight: isMobile ? "none" : "85vh",
            background: th.side,
            border: isMobile ? "none" : `1px solid ${th.bdr}`,
            borderRadius: isMobile ? 0 : 24,
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.4)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            backdropFilter: th.blur,
            WebkitBackdropFilter: th.blur,
            // For mobile, make sure it covers the full viewport
            ...(isMobile ? {
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              height: "100%"
            } : {})
          }}>
            {/* Header */}
            <div style={{ padding: isMobile ? "12px 16px" : "18px 24px", borderBottom: `1px solid ${th.bdr}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: dk ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 28, width: 44, height: 44, borderRadius: 12, background: dk ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {selectedVC.logo || "💼"}
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 16, fontWeight: 800, color: th.txt }}>{selectedVC.name}</h3>
                  <p style={{ margin: 0, fontSize: 10, color: th.txt3 }}>{selectedVC.type || "VCs"} • Funder Profile</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedVC(null)}
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${th.bdr}`, borderRadius: 8, cursor: "pointer", color: th.txt2, padding: "5px 10px", fontSize: 12 }}
              >
                Close
              </button>
            </div>

            {/* Scrollable Data View */}
            <div style={{ flex: 1, padding: isMobile ? 16 : 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Stats Grid */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <div style={{ background: dk ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)", padding: 12, borderRadius: 12, border: `1px solid ${th.bdr}` }}>
                  <div style={{ fontSize: 10, color: th.txt3, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Investment Stage</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#6366f1" }}>{selectedVC.stage || "N/A"}</div>
                </div>
                <div style={{ background: dk ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)", padding: 12, borderRadius: 12, border: `1px solid ${th.bdr}` }}>
                  <div style={{ fontSize: 10, color: th.txt3, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Check Size</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>{selectedVC.check_size || selectedVC.checkSize || "N/A"}</div>
                </div>
                <div style={{ background: dk ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)", padding: 12, borderRadius: 12, border: `1px solid ${th.bdr}` }}>
                  <div style={{ fontSize: 10, color: th.txt3, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Country / Location</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6" }}>{selectedVC.location || "Global"}</div>
                </div>
                <div style={{ background: dk ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)", padding: 12, borderRadius: 12, border: `1px solid ${th.bdr}` }}>
                  <div style={{ fontSize: 10, color: th.txt3, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Funding Type</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#8b5cf6" }}>{getFundingType(selectedVC)}</div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: th.txt3, textTransform: "uppercase" }}>About the Firm</h4>
                <p style={{ margin: 0, fontSize: 13, color: th.txt2, lineHeight: 1.5 }}>{selectedVC.description}</p>
              </div>

              {/* Sectors */}
              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: th.txt3, textTransform: "uppercase" }}>Target Sectors</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {parseSectors(selectedVC.sectors).map(s => (
                    <span key={s} style={{ fontSize: 11, border: `1px solid ${th.bdr}`, background: dk ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", color: th.txt2, padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: isMobile ? "12px 16px" : "14px 24px", borderTop: `1px solid ${th.bdr}`, display: "flex", justifyContent: "flex-end", background: dk ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)" }}>
              {(() => {
                const hasApplied = (form.appliedInvestors || []).includes(selectedVC.id);
                return hasApplied ? (
                  <button
                    onClick={() => {
                      handleWithdrawVC(selectedVC.id);
                      setSelectedVC(null);
                    }}
                    style={{
                      background: "rgba(239, 68, 68, 0.12)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      color: "#ef4444",
                      padding: "8px 16px",
                      borderRadius: 12,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.2s"
                    }}
                  >
                    <CheckCircle2 size={13} style={{ color: "#10b981" }} />
                    Withdraw Application
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleApplyToVC(selectedVC.id);
                      setSelectedVC(null);
                    }}
                    style={{
                      background: "#10b981",
                      border: "none",
                      color: "#fff",
                      padding: "8px 20px",
                      borderRadius: 12,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
                      transition: "all 0.2s"
                    }}
                  >
                    <Send size={12} />
                    Apply Now
                  </button>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
