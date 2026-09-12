"use client";

/**
 * MOTION PASS SUMMARY (read this before touching animation code further)
 * ────────────────────────────────────────────────────────────────────
 * - Magnetic pull (GSAP quickTo) is reserved for the 3 true primary actions:
 *   the two hero CTAs and Connect Wallet. Everything else that used to share
 *   that effect now gets a "press-toward-shadow" hover instead (see
 *   PRESS_HOVER) — mechanical, not attractive, because those buttons fire
 *   real on-chain transactions.
 * - Lenis drives site-wide inertial scroll and stays synced with
 *   ScrollTrigger. Both are skipped entirely under prefers-reduced-motion.
 * - Exactly one parallax layer (hero illustration, ~0.9x) and one
 *   scroll-scrubbed effect beyond the hero (the audit-log connector line,
 *   because that content is a genuine chronological sequence). No pinning:
 *   the audit log's height depends on fetched data, so pinning it would be
 *   fragile; scrub-without-pin gets the same "answers to scroll" feel safely.
 */

import { useState, useEffect, useRef } from "react";
import type { RefObject } from "react";
import Image from "next/image";
import { ethers } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { CONTRACT_ADDRESS, TRACECHAIN_ABI } from "../config/contract";

// Registered once, client-side only — touching window/document during
// Next.js server rendering would throw.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const EASE_PRECISE: [number, number, number, number] = [0.16, 1, 0.3, 1]; // expo.out, for Framer-driven reveals

declare global {
  interface Window {
    ethereum?: any;
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/**
 * 16-status map matching enterprise TraceChain.sol enum order.
 */
const STATUS_MAP = [
  "MANUFACTURED",
  "CERTIFIED",
  "IN_TRANSIT",
  "DISTRIBUTOR_RECEIVED",
  "RETAILER_RECEIVED",
  "SOLD",
  "RETURN_REQUESTED",
  "RETURNED_TO_RETAILER",
  "RETURN_IN_TRANSIT",
  "DISTRIBUTOR_RETURN_RECEIVED",
  "MANUFACTURER_RETURN_RECEIVED",
  "INSPECTED",
  "RESTOCKED",
  "REFURBISHED",
  "DAMAGED",
  "DISPOSED",
];

/** Neo-Brutalist stark badge styling per status */
const getStatusBadge = (statusIndex: number): { bg: string; text: string } => {
  if (statusIndex === 0) return { bg: "bg-[#FFD034]", text: "text-black" }; // MANUFACTURED
  if (statusIndex === 1) return { bg: "bg-[#2EE59D]", text: "text-black" }; // CERTIFIED
  if (statusIndex === 2 || statusIndex === 8) return { bg: "bg-[#FF9F1C]", text: "text-black" }; // IN_TRANSIT
  if (statusIndex === 3 || statusIndex === 4) return { bg: "bg-[#00F0FF]", text: "text-black" }; // RECEIVED
  if (statusIndex === 5) return { bg: "bg-[#4A55A2]", text: "text-white" }; // SOLD
  if (statusIndex >= 6 && statusIndex <= 10) return { bg: "bg-[#FF6B6B]", text: "text-black" }; // RETURN FLOW
  if (statusIndex === 12 || statusIndex === 13) return { bg: "bg-[#2EE59D]", text: "text-black" }; // RESTOCKED
  if (statusIndex >= 14) return { bg: "bg-[#FF4A4A]", text: "text-white" }; // DAMAGED / DISPOSED
  return { bg: "bg-white", text: "text-black" };
};

// ─────────────────────────────────────────────────────────────────────────────
// MOTION HOOK: Magnetic pull
// What it does: nudges an element a few px toward the cursor within a clamped
// radius, easing back on mouseleave; a quick non-bouncy compression on
// mousedown/mouseup that flattens the button's own drop-shadow.
// Why it's there: this is the ONE hover language reserved for primary
// actions — see usage sites below. Everything else uses PRESS_HOVER instead,
// so the pull still signals "important" rather than being ambient texture.
// ─────────────────────────────────────────────────────────────────────────────
function useMagnetic<T extends HTMLElement>(ref: RefObject<T | null>, enabled: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const MAX_PULL = 14; // px — restrained, not springy
    const xTo = gsap.quickTo(el, "x", { duration: 0.45, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.45, ease: "power3.out" });

    const handleMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const relX = e.clientX - r.left - r.width / 2;
      const relY = e.clientY - r.top - r.height / 2;
      xTo(gsap.utils.clamp(-MAX_PULL, MAX_PULL, relX * 0.25));
      yTo(gsap.utils.clamp(-MAX_PULL, MAX_PULL, relY * 0.25));
    };
    const handleLeave = () => {
      xTo(0);
      yTo(0);
    };
    const handleDown = () => {
      gsap.to(el, { x: "+=4", y: "+=4", duration: 0.12, ease: "power2.out" });
      gsap.set(el, { boxShadow: "0px 0px 0px 0px rgba(0,0,0,1)" });
    };
    const handleUp = () => {
      gsap.to(el, { x: "-=4", y: "-=4", duration: 0.15, ease: "power2.out" });
      gsap.set(el, { boxShadow: "" });
    };

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    el.addEventListener("mousedown", handleDown);
    el.addEventListener("mouseup", handleUp);

    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
      el.removeEventListener("mousedown", handleDown);
      el.removeEventListener("mouseup", handleUp);
      gsap.killTweensOf(el);
    };
  }, [ref, enabled]);
}

function MagneticButton({
  children,
  className,
  onClick,
  disabled,
  type = "button",
  ...props
}: any) {
  const ref = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = useReducedMotion();
  useMagnetic(ref, !prefersReducedMotion);

  return (
    <button ref={ref} type={type} disabled={disabled} onClick={onClick} className={className} {...props}>
      {children}
    </button>
  );
}

function MagneticAnchor({ children, className, href, ...props }: any) {
  const ref = useRef<HTMLAnchorElement>(null);
  const prefersReducedMotion = useReducedMotion();
  useMagnetic(ref, !prefersReducedMotion);

  return (
    <a ref={ref} href={href} className={className} {...props}>
      {children}
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared hover treatment for secondary/transactional buttons (search, the
// certify/receive/sell trio, dispatch transfer, register submit).
// What it does: the block slides 3px toward its own drop-shadow and the
// shadow tightens to match, using the offset-shadow motif already built into
// this design system.
// Why it's there: these buttons fire real on-chain writes. The cue reads as
// "this is about to execute" — precise and mechanical — rather than the
// exploratory feel of magnetic pull, and it varies the vocabulary instead of
// repeating one hover effect across every clickable element.
// ─────────────────────────────────────────────────────────────────────────────
const PRESS_HOVER =
  "transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.65,0,0.35,1)] " +
  "hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] " +
  "active:translate-x-[6px] active:translate-y-[6px] active:shadow-none";

// ─────────────────────────────────────────────────────────────────────────────
// MOTION COMPONENT: CountUp Metric
// What it does: Smoothly counts up real blockchain telemetry numbers on load.
// Why it's there: Unambiguously justified data animation demonstrating live consensus state.
// ─────────────────────────────────────────────────────────────────────────────
function CountUp({
  end,
  suffix = "",
  duration = 1.2,
}: {
  end: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      setCount(end);
      return;
    }
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      // Confident cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };
    requestAnimationFrame(step);
  }, [end, duration, shouldReduceMotion]);

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stagger Variants — used ONLY for content that reveals in response to a user
// action (a data fetch resolving), never as a default scroll-in-view fade.
// ─────────────────────────────────────────────────────────────────────────────
const containerStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const itemStagger: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: EASE_PRECISE },
  },
};

export default function Home() {
  const [searchId, setSearchId] = useState("1001");
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionStatus, setActionStatus] = useState("");

  // Smart Nav visibility state (Hides on scroll-down, reveals on scroll-up)
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Wallet Connection State
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);

  // Transfer input state
  const [receiverAddress, setReceiverAddress] = useState("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");

  // Registration form state
  const [formData, setFormData] = useState({
    productId: 1002,
    name: "Organic Green Tea",
    category: "Beverages",
    batchId: "BATCH-9900",
    manufacturingDate: Math.floor(Date.now() / 1000),
    expiryDate: Math.floor(Date.now() / 1000) + 31536000,
    manufacturingLocation: "Assam, India",
    returnEligible: true,
    returnPeriod: 2592000,
    description: "First flush organic green tea leaves",
  });
  const [regStatus, setRegStatus] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const prefersReducedMotion = useReducedMotion();

  const details = product?.onChain?.details || null;
  const history = product?.onChain?.history || [];
  const meta = product?.offChain || {};

  // Refs for scroll-driven GSAP effects
  const heroSectionRef = useRef<HTMLElement>(null);
  const heroImageCardRef = useRef<HTMLDivElement>(null);
  const historyWrapperRef = useRef<HTMLDivElement>(null);
  const historyLineRef = useRef<HTMLDivElement>(null);

  // Smart Navigation scroll listener
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > 140 && currentY > lastScrollY.current) {
        setIsNavVisible(false); // Scrolling down: dismiss nav to declutter reading area
      } else {
        setIsNavVisible(true); // Scrolling up: instantly restore access to actions
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // SITE-WIDE SMOOTH SCROLL: Lenis, synced with GSAP ScrollTrigger
  // What it does: adds gentle inertia to native scroll without disturbing
  // sticky nav, in-page anchors, or a11y — then keeps ScrollTrigger's scroll
  // math in lockstep with Lenis's virtual position.
  // Why it's there: the one ambient motion cue felt on every scroll; skipped
  // entirely under reduced motion, where scrolling stays fully native.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => 1 - Math.pow(1 - t, 3), // power3-style ease-out
      smoothWheel: true,
    });

    const update = (time: number) => lenis.raf(time * 1000);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(update);
      lenis.destroy();
    };
  }, [prefersReducedMotion]);

  // ─────────────────────────────────────────────────────────────────────────
  // SCROLL-DRIVEN: Hero visual parallax
  // What it does: the isometric illustration card drifts at roughly 0.9x
  // scroll speed as the hero scrolls past — one background layer, nothing more.
  // Why it's there: keeps the hero feeling considered as it leaves view,
  // without competing with the headline reveal as a second signature moment.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (prefersReducedMotion) return;
    const ctx = gsap.context(() => {
      if (!heroSectionRef.current || !heroImageCardRef.current) return;
      gsap.to(heroImageCardRef.current, {
        yPercent: 8,
        ease: "none",
        scrollTrigger: {
          trigger: heroSectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, heroSectionRef);
    return () => ctx.revert();
  }, [prefersReducedMotion]);

  // ─────────────────────────────────────────────────────────────────────────
  // SCROLL-DRIVEN: Audit log connector line (scrubbed, not pinned)
  // What it does: a vertical line grows down the left edge of the audit log
  // in lockstep with scroll progress through that list.
  // Why it's there: the audit log is a genuine chronological sequence — the
  // one place on this page a progress-style visual is earned. Not pinned,
  // because the list's height depends on fetched data, and pinning a
  // variable-length section is fragile; scrub alone still ties the motion to
  // what the visitor is doing.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (prefersReducedMotion || history.length === 0) return;
    const ctx = gsap.context(() => {
      if (!historyWrapperRef.current || !historyLineRef.current) return;
      gsap.fromTo(
        historyLineRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: historyWrapperRef.current,
            start: "top 80%",
            end: "bottom 80%",
            scrub: true,
          },
        }
      );
      ScrollTrigger.refresh();
    }, historyWrapperRef);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefersReducedMotion, product]);

  // Check if wallet is already connected on mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        })
        .catch(console.error);

      const handleAccountsChanged = (accounts: string[]) => {
        setWalletAddress(accounts && accounts.length > 0 ? accounts[0] : "");
      };

      window.ethereum.on?.("accountsChanged", handleAccountsChanged);
      return () => {
        window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      };
    }
  }, []);

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("MetaMask is not installed. Please install MetaMask extension to interact with Sepolia.");
      return;
    }
    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
      }
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleFetch = async (idToFetch?: string) => {
    const id = idToFetch || searchId;
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`);
      if (!res.ok) throw new Error("Product not found");
      const data = await res.json();
      setProduct(data);
    } catch (err: any) {
      setError(err.message);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (endpoint: string, body?: any) => {
    if (!product?.onChain?.details) return;
    const productId = product.onChain.details[0];
    setActionStatus(`EXECUTING ${endpoint.toUpperCase()}...`);
    try {
      const res = await fetch(`${API_BASE}/api/products/${productId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (res.ok) {
        setActionStatus(`✓ SUCCESS! TX: ${data.txHash ? data.txHash.slice(0, 14) + "..." : "MINED"}`);
        handleFetch(productId.toString());
      } else {
        setActionStatus(`✖ ERROR: ${data.error}`);
      }
    } catch (err: any) {
      setActionStatus(`✖ ERROR: ${err.message}`);
    }
  };

  /**
   * 4-Step Registration with MetaMask + Sepolia + MongoDB sync
   */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    setRegStatus("");

    try {
      if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("MetaMask not detected. Please install MetaMask to interact with Sepolia.");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) {
        throw new Error("No wallet account selected. Please approve the MetaMask connection.");
      }
      setWalletAddress(accounts[0]);

      // Check Sepolia (Chain ID: 11155111)
      const network = await provider.getNetwork();
      if (network.chainId !== BigInt(11155111) && network.chainId !== BigInt(31337)) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xaa36a7" }],
          });
        } catch (switchError: any) {
          console.warn("Could not auto-switch network to Sepolia:", switchError);
        }
      }

      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, TRACECHAIN_ABI, signer);

      setRegStatus("🦊 PROMPTING METAMASK FOR TRANSACTION SIGNATURE...");

      const pId = BigInt(formData.productId);
      const mDate = BigInt(formData.manufacturingDate || Math.floor(Date.now() / 1000));
      const expDate = BigInt(formData.expiryDate || Math.floor(Date.now() / 1000) + 31536000);
      const retPeriod = BigInt(formData.returnPeriod || 2592000);

      const tx = await contract.registerProduct(
        pId,
        formData.name,
        formData.category,
        formData.batchId,
        mDate,
        expDate,
        formData.manufacturingLocation,
        Boolean(formData.returnEligible),
        retPeriod
      );

      setRegStatus(`⏳ TX BROADCASTED (${tx.hash.slice(0, 10)}...). MINING ON SEPOLIA...`);
      const receipt = await tx.wait();
      console.log("Blockchain transaction mined:", receipt);

      setRegStatus(`⛓️ ON-CHAIN MINED! SYNCING METADATA WITH MONGODB...`);

      const res = await fetch(`${API_BASE}/api/products/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          productId: Number(formData.productId),
          txHash: tx.hash,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRegStatus(`★ PRODUCT #${formData.productId} CONFIRMED ON SEPOLIA! TX: ${tx.hash.slice(0, 14)}...`);
        handleFetch(formData.productId.toString());
      } else {
        setRegStatus(`⚠ SEPOLIA CONFIRMED (${tx.hash.slice(0, 10)}...), MONGODB NOTE: ${data.error || "CHECK BACKEND"}`);
        handleFetch(formData.productId.toString());
      }
    } catch (err: any) {
      console.error("Product registration failed:", err);
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        setRegStatus("✖ TRANSACTION REJECTED BY USER IN METAMASK.");
      } else if (err.reason) {
        setRegStatus(`✖ REVERT: ${err.reason.toUpperCase()}`);
      } else {
        setRegStatus(`✖ ${err.message || "FAILED TO REGISTER PRODUCT"}`);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const getHistoryAction = (entry: any): string => {
    if (typeof entry === "string") return entry;
    if (Array.isArray(entry)) return entry[0] ?? "UNKNOWN";
    if (entry?.action) return entry.action;
    return "UNKNOWN";
  };

  const marqueeItems = [
    "★ ETHEREUM SEPOLIA LIVE",
    "✦ IMMUTABLE PROVENANCE PROTOCOL",
    "✖ RBAC SMART CONTRACT ARCHITECTURE",
    "✦ METAMASK SECURED",
    "★ DUAL ON-CHAIN + MONGODB SYNC",
    "✦ 16 LIFECYCLE PHASES",
  ];

  const footerMarqueeItems = [
    "★ MADE BY : AMEY ANIL BONDRE (25BCE1763) ✦ OM PRAVIN THAVARI (25BCE5180)",
    "★ MADE BY : AMEY ANIL BONDRE (25BCE1763) ✦ OM PRAVIN THAVARI (25BCE5180)",
    "★ MADE BY : AMEY ANIL BONDRE (25BCE1763) ✦ OM PRAVIN THAVARI (25BCE5180)",
    "★ MADE BY : AMEY ANIL BONDRE (25BCE1763) ✦ OM PRAVIN THAVARI (25BCE5180)",
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-black font-sans relative overflow-x-hidden selection:bg-[#FFD034] selection:text-black">
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* DECORATIVE BACKGROUND ELEMENTS (Agency Poster Style)                          */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-neo-grid opacity-25 pointer-events-none -z-10" />

      {/* Decorative Asterisks & Shapes */}
      <div className="absolute top-12 left-6 text-7xl font-black select-none pointer-events-none opacity-20 rotate-12">
        ✦
      </div>
      <div className="absolute top-48 right-10 text-8xl font-black select-none pointer-events-none opacity-20 -rotate-12">
        ★
      </div>
      <div className="absolute top-[850px] left-4 text-9xl font-black select-none pointer-events-none opacity-15">
        ✱
      </div>
      <div className="absolute top-[1400px] right-8 text-7xl font-black select-none pointer-events-none opacity-20 rotate-45">
        ✖
      </div>
      <div className="hidden lg:block absolute top-[680px] right-0 w-28 h-14 bg-[#FF4A4A] border-l-4 border-b-4 border-t-4 border-black rounded-l-full shadow-[-6px_6px_0px_0px_rgba(0,0,0,1)] pointer-events-none -z-10" />

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* TOP MARQUEE — continuous ambient status ticker. Frozen (fully readable, no   */}
      {/* motion) under prefers-reduced-motion rather than merely slowed.              */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <div className="border-b-4 border-black bg-[#FFD034] text-black py-2.5 overflow-hidden shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] select-none">
        <motion.div
          className="flex gap-10 whitespace-nowrap font-black uppercase text-xs sm:text-sm tracking-widest"
          animate={prefersReducedMotion ? { x: "0%" } : { x: ["0%", "-50%"] }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { repeat: Infinity, ease: "linear", duration: 22 }
          }
        >
          {marqueeItems.map((text, i) => (
            <span key={`pass1-${i}`} className="inline-block">
              {text}
            </span>
          ))}
          {marqueeItems.map((text, i) => (
            <span key={`pass2-${i}`} className="inline-block">
              {text}
            </span>
          ))}
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
        {/* ───────────────────────────────────────────────────────────────────────────── */}
        {/* SMART NAVIGATION: Hides on scroll-down, reveals on scroll-up. Answers a       */}
        {/* visitor action (scroll direction), never fires on its own.                    */}
        {/* ───────────────────────────────────────────────────────────────────────────── */}
        <motion.nav
          animate={{
            y: isNavVisible ? 0 : -130,
            opacity: isNavVisible ? 1 : 0,
          }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: EASE_PRECISE }}
          className="sticky top-4 z-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none p-6 md:p-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF4A4A] border-3 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center font-black text-xl text-white select-none">
              TC
            </div>
            <div>
              <span className="text-2xl font-black uppercase tracking-tighter block leading-none">
                TRACECHAIN
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#4A55A2]">
                DECENTRALIZED LOGISTICS PROTOCOL
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            {/* Precision draw-underline on hover, confident (power2.inOut-style) easing */}
            <a
              href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="relative inline-block text-xs font-mono font-bold tracking-tight uppercase after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-black after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.65,0,0.35,1)] after:origin-left pb-0.5"
            >
              CONTRACT: {CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)} ↗
            </a>

            {walletAddress ? (
              <div className="bg-[#2EE59D] border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-4 py-2.5 font-mono font-black text-xs flex items-center gap-2 text-black">
                <span className="w-2.5 h-2.5 bg-black rounded-full animate-ping" />
                <span>
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
                <span className="bg-black text-white text-[9px] px-1.5 py-0.5 uppercase tracking-wider">
                  CONNECTED
                </span>
              </div>
            ) : (
              // Magnetic: this is a primary, once-per-session action.
              <MagneticButton
                onClick={connectWallet}
                disabled={isConnecting}
                className="bg-[#FFD034] hover:bg-[#ffe066] border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-5 py-2.5 font-black uppercase tracking-wider text-xs flex items-center gap-2 cursor-pointer"
              >
                🦊 {isConnecting ? "CONNECTING..." : "CONNECT WALLET"}
              </MagneticButton>
            )}
          </div>
        </motion.nav>

        {/* ───────────────────────────────────────────────────────────────────────────── */}
        {/* SIGNATURE HERO SECTION: masked headline reveal + justified count-up metrics  */}
        {/* — the one place most of the motion effort goes.                              */}
        {/* ───────────────────────────────────────────────────────────────────────────── */}
        <section ref={heroSectionRef} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          {/* Left Column: Masked Typography Reveal & Magnetic CTAs */}
          <div className="lg:col-span-7 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none p-10 md:p-14 flex flex-col justify-between space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-[#FFD034] border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] px-3.5 py-1 text-xs font-black uppercase tracking-wider cursor-default">
                <span>✦</span> PRODUCTION SEPOLIA ENGINE
              </div>

              {/* ── THE SIGNATURE MOMENT: overflow-masked word reveal, staggered ── */}
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter text-black leading-[0.92]">
                <div className="overflow-hidden">
                  <motion.div
                    initial={prefersReducedMotion ? { y: "0%" } : { y: "105%" }}
                    animate={{ y: "0%" }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.7, ease: EASE_PRECISE, delay: prefersReducedMotion ? 0 : 0.05 }}
                  >
                    SUPPLY
                  </motion.div>
                </div>

                <div className="overflow-hidden py-1">
                  <motion.div
                    initial={prefersReducedMotion ? { y: "0%" } : { y: "105%" }}
                    animate={{ y: "0%" }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.7, ease: EASE_PRECISE, delay: prefersReducedMotion ? 0 : 0.15 }}
                  >
                    <span className="bg-[#FF4A4A] text-white px-2.5 inline-block border-3 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] -rotate-1 my-1">
                      CHAIN
                    </span>
                  </motion.div>
                </div>

                <div className="overflow-hidden">
                  <motion.div
                    initial={prefersReducedMotion ? { y: "0%" } : { y: "105%" }}
                    animate={{ y: "0%" }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.7, ease: EASE_PRECISE, delay: prefersReducedMotion ? 0 : 0.25 }}
                  >
                    PROVEN.
                  </motion.div>
                </div>
              </h1>

              <p className="text-base sm:text-lg font-bold text-black/80 max-w-lg pt-2 leading-relaxed">
                Zero-trust physical custody tracking on the Ethereum blockchain.
                Cryptographically verify goods from origin manufacturer to customer with complete immutability.
              </p>
            </div>

            {/* ── JUSTIFIED METRICS COUNTER: real telemetry, counts once on load ── */}
            <div className="grid grid-cols-3 gap-3 border-y-3 border-black py-4 font-mono text-center">
              <div>
                <p className="text-xl sm:text-2xl font-black text-black leading-none">
                  <CountUp end={11155111} duration={1.2} />
                </p>
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mt-1">
                  SEPOLIA CHAIN ID
                </p>
              </div>
              <div className="border-x-2 border-black/20">
                <p className="text-xl sm:text-2xl font-black text-black leading-none">
                  <CountUp end={16} duration={0.8} />
                </p>
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mt-1">
                  LIFECYCLE PHASES
                </p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-[#FF4A4A] leading-none">
                  <CountUp end={100} suffix="%" duration={1.0} />
                </p>
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mt-1">
                  IMMUTABLE AUDIT
                </p>
              </div>
            </div>

            {/* ── Magnetic Primary CTAs: these two set the page's tone ── */}
            <div className="flex flex-wrap gap-4 items-center">
              <MagneticAnchor
                href="#register-section"
                className="bg-[#FF4A4A] hover:bg-[#ff6161] text-white font-black uppercase tracking-wider px-8 py-4 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-sm cursor-pointer inline-block"
              >
                + REGISTER PRODUCT
              </MagneticAnchor>

              <MagneticAnchor
                href="#track-section"
                className="bg-[#FFD034] hover:bg-[#ffe066] text-black font-black uppercase tracking-wider px-8 py-4 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-sm cursor-pointer inline-block"
              >
                TRACK ASSET ➔
              </MagneticAnchor>
            </div>
          </div>

          {/* Right Column: Hero illustration — carries the one parallax layer on scroll */}
          <div
            ref={heroImageCardRef}
            className="lg:col-span-5 bg-[#FFD034] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none p-10 md:p-14 relative overflow-hidden flex flex-col justify-between min-h-[460px]"
          >
            {/* Corner Crosshairs */}
            <span className="absolute top-4 left-4 font-black text-2xl select-none leading-none">+</span>
            <span className="absolute top-4 right-4 font-black text-2xl select-none leading-none">+</span>
            <span className="absolute bottom-4 left-4 font-black text-2xl select-none leading-none">+</span>
            <span className="absolute bottom-4 right-4 font-black text-2xl select-none leading-none">+</span>

            {/* Top Pill */}
            <div className="flex justify-between items-center z-10">
              <span className="bg-black text-white px-3 py-1 text-xs font-black uppercase tracking-widest border border-black">
                FIG 01. ISOMETRIC STAGE
              </span>
              <span className="w-4 h-4 bg-[#FF4A4A] border-2 border-black rounded-none" />
            </div>

            {/* Hero Isometric Supply Chain Illustration */}
            <div className="my-auto py-4 flex items-center justify-center z-10 w-full">
              <div className="w-full border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 overflow-hidden">
                <Image
                  src="/hero-image.png"
                  alt="Isometric Supply Chain Illustration"
                  width={600}
                  height={600}
                  className="w-full h-auto object-contain"
                  priority
                />
              </div>
            </div>

            {/* Bottom Meta */}
            <div className="flex justify-between items-end border-t-3 border-black pt-4 font-mono text-xs font-black uppercase z-10">
              <span>NODE: SEPOLIA_11155111</span>
              <span>STATE: VERIFIED</span>
            </div>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────────────────────── */}
        {/* TRACK PRODUCT SECTION (EXPLORER)                                              */}
        {/* ───────────────────────────────────────────────────────────────────────────── */}
        <section
          id="track-section"
          className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none p-10 md:p-14 space-y-8"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-4 border-black pb-6">
            <div>
              <span className="text-xs font-black uppercase tracking-widest bg-[#4A55A2] text-white px-2.5 py-0.5 border-2 border-black inline-block mb-2">
                ON-CHAIN REGISTRY
              </span>
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-black">
                TRACK PRODUCT
              </h2>
            </div>
            <p className="text-xs font-mono font-bold text-black max-w-xs text-left sm:text-right">
              QUERY IMMUTABLE STATE & REVERSE AUDIT TRAILS
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="ENTER NUMERIC PRODUCT ID (E.G. 1001)"
              className="flex-1 bg-[#F4F1EA] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none p-5 text-black font-black uppercase text-base placeholder:text-zinc-500 focus:outline-none focus:bg-[#FFD034]"
            />
            {/* Press-toward-shadow, not magnetic: this fires a real query, not a nav jump */}
            <button
              onClick={() => handleFetch()}
              disabled={loading}
              className={`bg-[#4A55A2] hover:bg-[#3d478a] text-white font-black uppercase tracking-wider px-10 py-5 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none text-base cursor-pointer disabled:opacity-50 shrink-0 ${PRESS_HOVER}`}
            >
              {loading ? "SEARCHING..." : "QUERY STATE ➔"}
            </button>
          </div>

          <AnimatePresence>
            {error && (
              // Opacity + position only (no height animation) — content mounts at full
              // height instantly, only its entrance transform/opacity animates.
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: EASE_PRECISE }}
                className="bg-[#FF4A4A] text-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none p-5 font-black uppercase text-sm"
              >
                ✖ REVERT: {error}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ───────────────────────────────────────────────────────────────────────────── */}
        {/* PRODUCT DETAILS & ACTIONS GRID — stagger fires because a query resolved,      */}
        {/* not because the user scrolled to it.                                          */}
        {/* ───────────────────────────────────────────────────────────────────────────── */}
        {details && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Card: Product Info & QR Code */}
            <div className="lg:col-span-6 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none p-10 md:p-14 space-y-8 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b-4 border-black pb-4 mb-6">
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-black">
                    ASSET SPECS
                  </h3>
                  <span className="bg-[#FFD034] text-black border-2 border-black px-2.5 py-0.5 text-xs font-black font-mono">
                    ID #{details[0].toString()}
                  </span>
                </div>

                {/* Staggered specs cascade triggered by the data fetch resolving */}
                <motion.div
                  variants={containerStagger}
                  initial={prefersReducedMotion ? false : "hidden"}
                  animate="visible"
                  className="space-y-4 font-mono text-sm"
                >
                  <motion.div
                    variants={itemStagger}
                    className="flex justify-between items-center border-b-2 border-black/20 pb-3"
                  >
                    <span className="font-black uppercase text-xs text-zinc-600">NAME:</span>
                    <span className="font-black text-lg text-black">{details[1]}</span>
                  </motion.div>

                  <motion.div
                    variants={itemStagger}
                    className="flex justify-between items-center border-b-2 border-black/20 pb-3"
                  >
                    <span className="font-black uppercase text-xs text-zinc-600">CATEGORY:</span>
                    <span className="font-black text-black">{details[2]}</span>
                  </motion.div>

                  <motion.div
                    variants={itemStagger}
                    className="flex justify-between items-center border-b-2 border-black/20 pb-3"
                  >
                    <span className="font-black uppercase text-xs text-zinc-600">BATCH NUMBER:</span>
                    <span className="font-black text-black">{details[3]}</span>
                  </motion.div>

                  <motion.div
                    variants={itemStagger}
                    className="flex justify-between items-center border-b-2 border-black/20 pb-3"
                  >
                    <span className="font-black uppercase text-xs text-zinc-600">LOCATION:</span>
                    <span className="font-black text-black">{details[6]}</span>
                  </motion.div>

                  <motion.div variants={itemStagger} className="flex justify-between items-center pt-2">
                    <span className="font-black uppercase text-xs text-zinc-600">CURRENT STATUS:</span>
                    {(() => {
                      const badge = getStatusBadge(Number(details[9]));
                      return (
                        <span
                          className={`${badge.bg} ${badge.text} border-3 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] px-3.5 py-1 font-black text-xs uppercase tracking-wider`}
                        >
                          {STATUS_MAP[Number(details[9])] || "UNKNOWN"}
                        </span>
                      );
                    })()}
                  </motion.div>

                  {meta?.txHash && (
                    <motion.div variants={itemStagger} className="pt-3 border-t-2 border-black/20">
                      <span className="font-black uppercase text-xs text-zinc-600 block mb-1">
                        ON-CHAIN HASH:
                      </span>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${meta.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="relative inline-block font-mono text-xs font-black after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-black after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.65,0,0.35,1)] after:origin-left break-all"
                      >
                        {meta.txHash}
                      </a>
                    </motion.div>
                  )}
                </motion.div>
              </div>

              {/* QR Code Container — display-only, not a click target, so no hover motion */}
              <div className="bg-[#FFD034] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none p-6 flex flex-col items-center gap-4 mt-6">
                <p className="font-black text-xs uppercase tracking-widest text-black">
                  PHYSICAL VERIFICATION QR TAG
                </p>
                <div className="bg-white p-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <QRCodeSVG
                    value={`https://tracechain.app/verify/${details[0]}`}
                    size={160}
                    level="H"
                    bgColor="#ffffff"
                    fgColor="#000000"
                    includeMargin={false}
                  />
                </div>
                <p className="font-mono font-bold text-xs text-black uppercase">
                  tracechain.app/verify/{details[0].toString()}
                </p>
              </div>
            </div>

            {/* Right Card: Supply Chain Actions */}
            <div className="lg:col-span-6 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none p-10 md:p-14 space-y-8 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b-4 border-black pb-4 mb-6">
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-black">
                    EXECUTE ACTIONS
                  </h3>
                  <span className="bg-[#4A55A2] text-white border-2 border-black px-2.5 py-0.5 text-xs font-black">
                    RBAC ACTIVE
                  </span>
                </div>

                {/* Press-toward-shadow, not magnetic — each fires a real state-changing tx */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <button
                    onClick={() => handleAction("certify")}
                    className={`bg-[#4A55A2] hover:bg-[#3d478a] p-4 border-3 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] rounded-none font-black uppercase text-xs tracking-wider text-white cursor-pointer text-center ${PRESS_HOVER}`}
                  >
                    CERTIFY
                  </button>
                  <button
                    onClick={() => handleAction("receive")}
                    className={`bg-[#2EE59D] hover:bg-[#25c485] p-4 border-3 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] rounded-none font-black uppercase text-xs tracking-wider text-black cursor-pointer text-center ${PRESS_HOVER}`}
                  >
                    RECEIVE
                  </button>
                  <button
                    onClick={() => handleAction("sell")}
                    className={`bg-[#FFD034] hover:bg-[#ffe066] p-4 border-3 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] rounded-none font-black uppercase text-xs tracking-wider text-black cursor-pointer text-center ${PRESS_HOVER}`}
                  >
                    SELL
                  </button>
                </div>

                {/* Transfer Custody */}
                <div className="space-y-4 pt-6 border-t-4 border-black">
                  <label className="block text-xs font-black uppercase tracking-wider text-black">
                    TRANSFER CUSTODY TO RECEIVER WALLET ADDRESS:
                  </label>
                  <input
                    type="text"
                    value={receiverAddress}
                    onChange={(e) => setReceiverAddress(e.target.value)}
                    placeholder="0x... ETHEREUM RECEIVER WALLET"
                    className="w-full bg-[#F4F1EA] border-3 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] rounded-none p-4 text-xs font-mono font-bold text-black focus:outline-none focus:bg-[#FFD034]"
                  />
                  <button
                    onClick={() => handleAction("transfer", { receiverAddress })}
                    className={`w-full bg-[#FF4A4A] hover:bg-[#ff6161] p-4 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none text-white font-black uppercase tracking-wider text-sm cursor-pointer ${PRESS_HOVER}`}
                  >
                    DISPATCH TRANSFER ON-CHAIN ➔
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {actionStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: EASE_PRECISE }}
                    className="bg-[#FFD034] border-3 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] rounded-none p-4 font-mono font-black text-xs text-black uppercase tracking-tight mt-6"
                  >
                    {actionStatus}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────────────────── */}
        {/* LIFECYCLE AUDIT LOG — the one genuinely chronological content on this page,   */}
        {/* so it's the one place beyond the hero that gets a scroll-scrubbed visual.     */}
        {/* ───────────────────────────────────────────────────────────────────────────── */}
        {history.length > 0 && (
          <section className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none p-10 md:p-14 space-y-8">
            <div className="flex justify-between items-center border-b-4 border-black pb-4">
              <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-black">
                IMMUTABLE AUDIT LOG
              </h3>
              <span className="bg-[#2EE59D] text-black font-black text-xs px-3 py-1 border-2 border-black uppercase tracking-wider">
                {history.length} ENTRIES RECORDED
              </span>
            </div>

            <div ref={historyWrapperRef} className="relative pl-6">
              {/* Scroll-scrubbed connector line — grows with scroll progress through the list */}
              <div
                ref={historyLineRef}
                className="absolute left-0 top-0 bottom-0 w-[3px] bg-black origin-top"
                style={{ transform: "scaleY(0)" }}
                aria-hidden="true"
              />
              <motion.div
                variants={containerStagger}
                initial={prefersReducedMotion ? false : "hidden"}
                animate="visible"
                className="space-y-4"
              >
                {history.map((event: any, index: number) => (
                  <motion.div
                    key={index}
                    variants={itemStagger}
                    className="bg-[#F4F1EA] border-3 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] rounded-none p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs font-black bg-[#FFD034] border-2 border-black px-2.5 py-1 uppercase">
                        #{index + 1}
                      </span>
                      <span className="font-black text-black uppercase text-lg tracking-tight">
                        {getHistoryAction(event)}
                      </span>
                    </div>
                    {event[4] && (
                      <span className="font-mono text-xs font-bold text-zinc-700 bg-white border border-black px-3 py-1">
                        TIME: {new Date(Number(event[4]) * 1000).toLocaleString()}
                      </span>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>
        )}

        {/* ───────────────────────────────────────────────────────────────────────────── */}
        {/* REGISTER NEW PRODUCT FORM (MANUFACTURER)                                      */}
        {/* ───────────────────────────────────────────────────────────────────────────── */}
        <section
          id="register-section"
          className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none p-10 md:p-14 space-y-10"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-4 border-black pb-6">
            <div>
              <span className="text-xs font-black uppercase tracking-widest bg-[#FF4A4A] text-white px-2.5 py-0.5 border-2 border-black inline-block mb-2">
                ORIGIN ACTION
              </span>
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-black">
                REGISTER PRODUCT
              </h2>
            </div>
            <span className="bg-[#FFD034] text-black font-black text-xs px-3 py-1.5 border-3 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wider">
              AUTHORISED MANUFACTURER ONLY
            </span>
          </div>

          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-2">
                PRODUCT ID (NUMERIC)
              </label>
              <input
                type="number"
                placeholder="1002"
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: Number(e.target.value) })}
                className="w-full bg-[#F4F1EA] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none p-5 text-black font-black text-base focus:outline-none focus:bg-[#FFD034]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-2">
                PRODUCT NAME
              </label>
              <input
                type="text"
                placeholder="ORGANIC GREEN TEA"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#F4F1EA] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none p-5 text-black font-black text-base uppercase focus:outline-none focus:bg-[#FFD034]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-2">
                COMMODITY CATEGORY
              </label>
              <input
                type="text"
                placeholder="BEVERAGES"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-[#F4F1EA] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none p-5 text-black font-black text-base uppercase focus:outline-none focus:bg-[#FFD034]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-2">
                BATCH IDENTIFIER
              </label>
              <input
                type="text"
                placeholder="BATCH-9900"
                value={formData.batchId}
                onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                className="w-full bg-[#F4F1EA] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none p-5 text-black font-black text-base uppercase focus:outline-none focus:bg-[#FFD034]"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-2">
                MANUFACTURING LOCATION
              </label>
              <input
                type="text"
                placeholder="ASSAM, INDIA"
                value={formData.manufacturingLocation}
                onChange={(e) => setFormData({ ...formData, manufacturingLocation: e.target.value })}
                className="w-full bg-[#F4F1EA] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none p-5 text-black font-black text-base uppercase focus:outline-none focus:bg-[#FFD034]"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-2">
                OFF-CHAIN METADATA (MONGODB ATLAS SYNC)
              </label>
              <input
                type="text"
                placeholder="DETAILED INGREDIENTS / SHIPMENT SPECIFICATIONS"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-[#F4F1EA] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none p-5 text-black font-bold text-base focus:outline-none focus:bg-[#FFD034]"
              />
            </div>

            <div className="md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4">
              {/* Press-toward-shadow, not magnetic — this signs and broadcasts a real tx */}
              <button
                type="submit"
                disabled={isRegistering}
                className={`bg-[#FF4A4A] hover:bg-[#ff6161] px-10 py-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none text-white font-black uppercase tracking-wider text-base cursor-pointer disabled:opacity-50 flex items-center gap-3 shrink-0 ${PRESS_HOVER}`}
              >
                🦊 {isRegistering ? "CONFIRMING ON-CHAIN..." : "SIGN & REGISTER VIA METAMASK"}
              </button>

              <AnimatePresence>
                {regStatus && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: EASE_PRECISE }}
                    className="bg-[#FFD034] border-3 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] rounded-none p-5 font-mono font-black text-xs text-black uppercase flex-1"
                  >
                    {regStatus}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </section>

        {/* ───────────────────────────────────────────────────────────────────────────── */}
        {/* FOOTER / POSTER COLOPHON                                                      */}
        {/* ───────────────────────────────────────────────────────────────────────────── */}
        <footer className="border-t-4 border-black pt-8 pb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 font-mono text-xs font-black uppercase">
          <div>
            TRACECHAIN PROTOCOL // VIT CHENNAI CAPSTONE ARCHITECTURE
          </div>
          <div className="flex gap-4">
            <span className="bg-black text-white px-2 py-0.5">SOLIDITY 0.8.28</span>
            <span className="bg-black text-white px-2 py-0.5">NEXT.JS 16</span>
            <span className="bg-black text-white px-2 py-0.5">FRAMER MOTION</span>
            <span className="bg-black text-white px-2 py-0.5">MONGODB ATLAS</span>
          </div>
        </footer>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* OPPOSING INFINITE FOOTER MARQUEE (Full Width - Credits) — same freeze-under-  */}
      {/* reduced-motion treatment as the top ticker.                                    */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <div className="border-t-4 border-black bg-[#4A55A2] text-white py-3.5 overflow-hidden shadow-[0px_-4px_0px_0px_rgba(0,0,0,1)] select-none">
        <motion.div
          className="flex gap-12 whitespace-nowrap font-black uppercase text-xs sm:text-sm tracking-widest"
          animate={prefersReducedMotion ? { x: "0%" } : { x: ["-50%", "0%"] }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { repeat: Infinity, ease: "linear", duration: 25 }
          }
        >
          {footerMarqueeItems.map((text, i) => (
            <span key={`f-pass1-${i}`} className="inline-block">
              {text}
            </span>
          ))}
          {footerMarqueeItems.map((text, i) => (
            <span key={`f-pass2-${i}`} className="inline-block">
              {text}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}