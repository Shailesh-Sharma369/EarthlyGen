/**
 * ruhi.js
 * ========
 * Ruhi AI Assistant - Integrated with SocialCart Backend
 * Features:
 * - Voice recognition & speech synthesis
 * - Real-time AI query processing
 * - Shopping, social, and navigation actions
 * - Multi-page support (injected into all pages)
 * - User context awareness
 */

(function () {
  console.log("🚀 Ruhi AI Assistant Loading...");

  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRuhi);
  } else {
    initRuhi();
  }

  function initRuhi() {
    // Prevent duplicate instances
    if (document.getElementById("ruhi-container")) {
      console.log("⚠️ Ruhi already initialized on this page");
      return;
    }

    console.log("🌟 Ruhi AI Assistant Initializing...");

    // ========================================
    // 1. CSS STYLING
    // ========================================
    const style = document.createElement("style");
    style.innerHTML = `
      /* ===== CONTAINER ===== */
      #ruhi-container {
        position: fixed;
        bottom: 24px;
        left: 24px;
        z-index: 12000;
        display: flex;
        flex-direction: column;
        align-items: center;
        font-family: 'Rubik', 'Segoe UI', sans-serif;
        pointer-events: none;
      }
      #ruhi-container.dragging { cursor: grabbing !important; }

      /* ===== WAVE RINGS (listening) ===== */
      #ruhi-wave-rings {
        position: absolute;
        bottom: 0; left: 50%;
        transform: translateX(-50%);
        width: 76px; height: 76px;
        border-radius: 50%;
        pointer-events: none;
      }
      .ruhi-ring {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        border: 2px solid rgba(33,150,243,0.7);
        opacity: 0;
        pointer-events: none;
      }
      #ruhi-container.is-listening .ruhi-ring:nth-child(1) { animation: ruhi-ripple 2s ease-out 0s infinite; }
      #ruhi-container.is-listening .ruhi-ring:nth-child(2) { animation: ruhi-ripple 2s ease-out 0.55s infinite; }
      #ruhi-container.is-listening .ruhi-ring:nth-child(3) { animation: ruhi-ripple 2s ease-out 1.1s infinite; }
      @keyframes ruhi-ripple {
        0%   { transform: scale(1);   opacity: 0.9; }
        100% { transform: scale(3);   opacity: 0;   }
      }

      /* ===== ORBIT RING ===== */
      #ruhi-orbit {
        position: absolute;
        bottom: -7px; left: 50%;
        transform-origin: center center;
        width: 90px; height: 90px;
        border-radius: 50%;
        border: 2px dashed rgba(139,195,74,0.45);
        animation: ruhi-orbit-spin 9s linear infinite;
        pointer-events: none;
      }
      #ruhi-orbit::before {
        content: '🌱';
        position: absolute;
        top: -11px; left: 50%;
        transform: translateX(-50%);
        font-size: 14px;
        line-height: 1;
      }
      @keyframes ruhi-orbit-spin {
        from { transform: translateX(-50%) rotate(0deg); }
        to   { transform: translateX(-50%) rotate(360deg); }
      }
      #ruhi-container.is-listening  #ruhi-orbit { border-color: rgba(33,150,243,0.7);  animation-duration: 3s; border-style: solid; }
      #ruhi-container.is-processing #ruhi-orbit { border-color: rgba(255,152,0,0.8);   animation-duration: 1.2s; border-style: solid; }
      #ruhi-container.is-speaking   #ruhi-orbit { border-color: rgba(0,200,83,0.7);    animation-duration: 2s; border-style: solid; }

      /* ===== LABEL PILL ===== */
      #ruhi-label-pill {
        background: rgba(10,15,26,0.92);
        color: #a3e635;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.4px;
        padding: 4px 12px;
        border-radius: 20px;
        border: 1px solid rgba(139,195,74,0.45);
        margin-bottom: 8px;
        pointer-events: none;
        white-space: nowrap;
        backdrop-filter: blur(10px);
        box-shadow: 0 2px 14px rgba(0,0,0,0.4);
        animation: ruhi-floatLabel 3.5s ease-in-out infinite;
      }
      #ruhi-label-pill.hidden { display: none; }
      @keyframes ruhi-floatLabel {
        0%, 100% { transform: translateY(0);    }
        50%       { transform: translateY(-5px); }
      }

      /* ===== MAIN ORB ===== */
      #ruhi-orb {
        width: 76px;
        height: 76px;
        border-radius: 50%;
        pointer-events: auto;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        user-select: none;
        position: relative;
        overflow: hidden;
        animation: ruhi-orbFloat 4s ease-in-out infinite;
        transition: box-shadow 0.3s ease;
        box-shadow:
          0 0 0 3px rgba(255,255,255,0.18),
          0 0 32px rgba(139,195,74,0.95),
          0 0 70px rgba(139,195,74,0.4),
          0 8px 24px rgba(0,0,0,0.45);
      }
      @keyframes ruhi-orbFloat {
        0%, 100% { transform: translateY(0px);  }
        50%       { transform: translateY(-9px); }
      }
      #ruhi-orb:hover {
        box-shadow:
          0 0 0 4px rgba(255,255,255,0.3),
          0 0 50px rgba(139,195,74,1),
          0 0 100px rgba(139,195,74,0.55),
          0 10px 32px rgba(0,0,0,0.5);
      }

      /* Globe inside orb */
      #ruhi-globe {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background:
          radial-gradient(ellipse at 30% 28%, rgba(255,255,255,0.18) 0%, transparent 55%),
          linear-gradient(180deg, #1a6b3c 0%, #2e8b50 28%, #1565c0 58%, #0d3b8e 100%);
        border: 1.5px solid rgba(255,255,255,0.22);
        position: relative;
        overflow: hidden;
        animation: ruhi-globeSpin 14s linear infinite;
        flex-shrink: 0;
      }
      /* Continents */
      #ruhi-globe::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
          radial-gradient(ellipse 30% 18% at 28% 38%, rgba(100,200,80,0.88) 0%, transparent 100%),
          radial-gradient(ellipse 19% 25% at 63% 33%, rgba(80,180,60,0.82) 0%, transparent 100%),
          radial-gradient(ellipse 23% 13% at 50% 68%, rgba(120,200,90,0.78) 0%, transparent 100%),
          radial-gradient(ellipse 11% 9%  at 18% 64%, rgba(90,170,70,0.72) 0%, transparent 100%);
        border-radius: 50%;
      }
      /* Latitude lines */
      #ruhi-globe::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: repeating-linear-gradient(
          0deg,
          transparent,
          transparent 13px,
          rgba(255,255,255,0.07) 13px,
          rgba(255,255,255,0.07) 14px
        );
      }
      @keyframes ruhi-globeSpin {
        from { filter: hue-rotate(0deg)   brightness(1);    }
        50%  { filter: hue-rotate(20deg)  brightness(1.08); }
        to   { filter: hue-rotate(0deg)   brightness(1);    }
      }

      /* Orb state label */
      #ruhi-status {
        position: absolute;
        bottom: 5px;
        font-size: 8px;
        font-weight: 800;
        color: rgba(255,255,255,0.88);
        text-transform: uppercase;
        letter-spacing: 0.6px;
        text-shadow: 0 1px 4px rgba(0,0,0,0.9);
        pointer-events: none;
      }

      /* ===== ORB STATES ===== */
      #ruhi-orb.listening {
        box-shadow: 0 0 0 3px rgba(33,150,243,0.4), 0 0 45px rgba(33,150,243,1), 0 0 90px rgba(33,150,243,0.5), 0 8px 24px rgba(0,0,0,0.45);
        animation: ruhi-orbFloat 4s ease-in-out infinite, ruhi-pulseBlue 1s ease-in-out infinite;
      }
      #ruhi-orb.processing {
        box-shadow: 0 0 0 3px rgba(255,152,0,0.4), 0 0 45px rgba(255,152,0,1), 0 0 90px rgba(255,152,0,0.5), 0 8px 24px rgba(0,0,0,0.45);
        animation: ruhi-orbFloat 4s ease-in-out infinite, ruhi-spinHue 1.8s linear infinite;
      }
      #ruhi-orb.speaking {
        box-shadow: 0 0 0 3px rgba(0,200,83,0.4), 0 0 45px rgba(0,200,83,1), 0 0 90px rgba(0,200,83,0.5), 0 8px 24px rgba(0,0,0,0.45);
        animation: ruhi-orbFloat 4s ease-in-out infinite, ruhi-pulseGreen 0.75s ease-in-out infinite;
      }
      #ruhi-orb.error {
        box-shadow: 0 0 0 3px rgba(239,68,68,0.4), 0 0 35px rgba(239,68,68,0.9), 0 8px 24px rgba(0,0,0,0.45);
      }
      @keyframes ruhi-pulseBlue {
        0%,100% { box-shadow: 0 0 0 3px rgba(33,150,243,0.4), 0 0 40px rgba(33,150,243,0.9), 0 0 80px rgba(33,150,243,0.4), 0 8px 24px rgba(0,0,0,0.4); }
        50%      { box-shadow: 0 0 0 9px rgba(33,150,243,0.15), 0 0 65px rgba(33,150,243,1), 0 0 130px rgba(33,150,243,0.55), 0 8px 24px rgba(0,0,0,0.4); }
      }
      @keyframes ruhi-pulseGreen {
        0%,100% { box-shadow: 0 0 0 3px rgba(0,200,83,0.4), 0 0 40px rgba(0,200,83,0.9), 0 0 80px rgba(0,200,83,0.4), 0 8px 24px rgba(0,0,0,0.4); }
        50%      { box-shadow: 0 0 0 9px rgba(0,200,83,0.15), 0 0 65px rgba(0,200,83,1), 0 0 130px rgba(0,200,83,0.55), 0 8px 24px rgba(0,0,0,0.4); }
      }
      @keyframes ruhi-spinHue {
        from { filter: hue-rotate(0deg);   }
        to   { filter: hue-rotate(360deg); }
      }

      /* ===== PANEL ===== */
      #ruhi-panel {
        position: fixed;          /* detached from orb's flex flow — positioned by JS */
        z-index: 12001;
        display: none;
        flex-direction: column;
        width: 360px;
        max-height: 500px;
        border-radius: 22px;
        overflow: hidden;
        background: linear-gradient(160deg, rgba(11,16,28,0.97), rgba(8,13,22,0.98));
        border: 1px solid rgba(139,195,74,0.32);
        box-shadow:
          0 28px 90px rgba(0,0,0,0.75),
          0 0 0 1px rgba(255,255,255,0.04),
          inset 0 1px 0 rgba(255,255,255,0.07);
        backdrop-filter: blur(22px);
        pointer-events: auto;
      }
      /* ✅ FIX: Light mode — when page background is light/white */
      @media (prefers-color-scheme: light) {
        #ruhi-panel {
          background: linear-gradient(160deg, rgba(250,250,250,0.96), rgba(240,240,240,0.97));
          border: 1px solid rgba(180,180,180,0.5);
          color: #1a1a1a;
        }
        #ruhi-panel .ruhi-response { color: #222; }
        #ruhi-panel .is-ai .ruhi-response { background: rgba(139,195,74,0.18); border: 1px solid rgba(139,195,74,0.45); color: #2d5016; }
        #ruhi-panel .is-user .ruhi-response { background: rgba(33,150,243,0.22); border: 1px solid rgba(33,150,243,0.55); color: #003d7a; }
        #ruhi-panel #ruhi-header-name { color: #1a1a1a; }
        #ruhi-panel #ruhi-status-label { color: #555; }
        #ruhi-panel #ruhi-text-input { background: rgba(0,0,0,0.06); border: 1px solid rgba(100,100,100,0.3); color: #1a1a1a; }
        #ruhi-panel #ruhi-text-input::placeholder { color: #888; }
      }
      #ruhi-panel.show {
        display: flex;
        animation: ruhi-panelIn 0.38s cubic-bezier(0.34,1.56,0.64,1);
      }
      @keyframes ruhi-panelIn {
        from { opacity: 0; transform: translateY(18px) scale(0.94); }
        to   { opacity: 1; transform: translateY(0)    scale(1);    }
      }

      /* Panel Header */
      #ruhi-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        background: linear-gradient(90deg, rgba(27,94,32,0.75), rgba(21,101,192,0.38));
        border-bottom: 1px solid rgba(139,195,74,0.18);
        flex-shrink: 0;
      }
      #ruhi-header-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      #ruhi-avatar-circle {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: radial-gradient(circle at 35% 35%, #a5d96b, #2e8b57);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        border: 2px solid rgba(139,195,74,0.55);
        box-shadow: 0 0 12px rgba(139,195,74,0.45);
        flex-shrink: 0;
      }
      #ruhi-header-name {
        color: #fff;
        font-weight: 700;
        font-size: 14px;
        line-height: 1.2;
      }
      #ruhi-header-status {
        display: flex;
        align-items: center;
        gap: 5px;
        margin-top: 2px;
      }
      #ruhi-status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #69f0ae;
        box-shadow: 0 0 6px #69f0ae;
        animation: ruhi-dotBlink 2s ease-in-out infinite;
        flex-shrink: 0;
      }
      #ruhi-status-dot.listening  { background: #64b5f6; box-shadow: 0 0 8px #64b5f6; }
      #ruhi-status-dot.processing { background: #ffb74d; box-shadow: 0 0 8px #ffb74d; animation: ruhi-dotSpin 0.7s linear infinite; }
      #ruhi-status-dot.speaking   { background: #69f0ae; box-shadow: 0 0 8px #69f0ae; animation: ruhi-dotBlink 0.5s ease-in-out infinite; }
      #ruhi-status-dot.error      { background: #ef5350; box-shadow: 0 0 8px #ef5350; animation: none; }
      @keyframes ruhi-dotBlink {
        0%,100% { opacity: 1; }
        50%      { opacity: 0.35; }
      }
      @keyframes ruhi-dotSpin {
        from { transform: scale(0.6); }
        50%  { transform: scale(1.4); }
        to   { transform: scale(0.6); }
      }
      #ruhi-status-label {
        color: #94a3b8;
        font-size: 11px;
        font-weight: 500;
      }
      #ruhi-close-btn {
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.11);
        color: #94a3b8;
        width: 28px; height: 28px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        pointer-events: auto;
        line-height: 1;
      }
      #ruhi-close-btn:hover { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.4); color: #f87171; }

      /* Messages area */
      #ruhi-messages {
        flex: 1;
        overflow-y: auto;
        padding: 14px 14px 8px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        scroll-behavior: smooth;
      }
      #ruhi-messages::-webkit-scrollbar { width: 4px; }
      #ruhi-messages::-webkit-scrollbar-track { background: transparent; }
      #ruhi-messages::-webkit-scrollbar-thumb { background: rgba(139,195,74,0.38); border-radius: 4px; }

      /* Message bubbles */
      .ruhi-message {
        display: flex;
        flex-direction: column;
        max-width: 88%;
        animation: ruhi-msgPop 0.28s cubic-bezier(0.34,1.56,0.64,1);
      }
      @keyframes ruhi-msgPop {
        from { opacity: 0; transform: scale(0.82) translateY(10px); }
        to   { opacity: 1; transform: scale(1)    translateY(0);    }
      }
      .ruhi-message.is-ai   { align-self: flex-start; align-items: flex-start; }
      .ruhi-message.is-user { align-self: flex-end;   align-items: flex-end;   }

      .ruhi-user {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        margin-bottom: 3px;
        padding: 0 4px;
      }
      .is-ai   .ruhi-user { color: #69f0ae; }
      .is-user .ruhi-user { color: #90caf9; }

      .ruhi-response {
        padding: 10px 14px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.58;
        font-weight: 400;
      }
      .is-ai .ruhi-response {
        background: rgba(139,195,74,0.11);
        border: 1px solid rgba(139,195,74,0.24);
        color: #e2e8f0;
        border-top-left-radius: 4px;
      }
      .is-user .ruhi-response {
        background: linear-gradient(135deg, rgba(33,150,243,0.22), rgba(21,101,192,0.32));
        border: 1px solid rgba(33,150,243,0.28);
        color: #f0f9ff;
        border-top-right-radius: 4px;
      }
      .ruhi-action {
        margin-top: 6px;
        padding: 6px 10px;
        font-size: 12px;
        font-weight: 600;
        color: #a3e635;
        background: rgba(139,195,74,0.14);
        border: 1px solid rgba(139,195,74,0.28);
        border-radius: 8px;
      }
      .ruhi-error { color: #f87171; }

      /* Input row */
      #ruhi-input-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 12px;
        border-top: 1px solid rgba(139,195,74,0.13);
        background: rgba(0,0,0,0.18);
        flex-shrink: 0;
      }
      /* ✅ FIX: Light mode input row */
      @media (prefers-color-scheme: light) {
        #ruhi-input-row {
          border-top: 1px solid rgba(180,180,180,0.3);
          background: rgba(255,255,255,0.1);
        }
      }
      #ruhi-text-input {
        flex: 1;
        background: rgba(255,255,255,0.055);
        border: 1px solid rgba(139,195,74,0.22);
        border-radius: 20px;
        padding: 8px 14px;
        color: #e2e8f0;
        font-size: 13px;
        font-family: inherit;
        outline: none;
        transition: border-color 0.2s, background 0.2s;
      }
      #ruhi-text-input::placeholder { color: #475569; }
      #ruhi-text-input:focus { border-color: rgba(139,195,74,0.55); background: rgba(255,255,255,0.08); }
      #ruhi-mic-btn, #ruhi-send-btn {
        width: 34px; height: 34px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        font-size: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;
        pointer-events: auto;
      }
      #ruhi-mic-btn {
        background: rgba(33,150,243,0.18);
        border: 1px solid rgba(33,150,243,0.38);
        color: #90caf9;
      }
      #ruhi-mic-btn:hover { background: rgba(33,150,243,0.32); transform: scale(1.1); }
      #ruhi-mic-btn.active { background: rgba(33,150,243,0.5); box-shadow: 0 0 12px rgba(33,150,243,0.7); }
      #ruhi-send-btn {
        background: linear-gradient(135deg, #8bc34a, #4caf50);
        color: #fff;
        box-shadow: 0 2px 10px rgba(139,195,74,0.45);
      }
      #ruhi-send-btn:hover { transform: scale(1.1); box-shadow: 0 4px 18px rgba(139,195,74,0.65); }

      /* ===== ECO BADGE ===== */
      .eco-badge {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        text-align: center;
        margin: 4px 0;
        animation: eco-badge-pop 0.4s cubic-bezier(0.34,1.56,0.64,1);
      }
      @keyframes eco-badge-pop {
        from { opacity: 0; transform: scale(0.85); }
        to   { opacity: 1; transform: scale(1); }
      }
      .eco-badge.verified {
        background: linear-gradient(135deg, rgba(76,175,80,0.9), rgba(56,142,60,0.9));
        border: 1px solid rgba(76,175,80,0.5);
        color: #fff;
        box-shadow: 0 2px 12px rgba(76,175,80,0.35);
      }
      .eco-badge.verified::before {
        content: '✅ ';
      }
      .eco-badge.certified {
        background: linear-gradient(135deg, rgba(34,197,94,0.95), rgba(21,128,61,0.92));
        border: 1px solid rgba(74,222,128,0.55);
        color: #fff;
        box-shadow: 0 2px 12px rgba(34,197,94,0.35);
      }
      .eco-badge.certified::before {
        content: '✅ ';
      }
      .eco-badge.eco_verified {
        background: linear-gradient(135deg, rgba(139,195,74,0.9), rgba(76,175,80,0.9));
        border: 1px solid rgba(139,195,74,0.5);
        color: #fff;
        box-shadow: 0 2px 12px rgba(139,195,74,0.35);
      }
      .eco-badge.eco_verified::before {
        content: '🌱 ';
      }
      .eco-badge.partially_eco {
        background: linear-gradient(135deg, rgba(251,191,36,0.9), rgba(245,158,11,0.9));
        border: 1px solid rgba(251,191,36,0.45);
        color: #111827;
        box-shadow: 0 2px 12px rgba(245,158,11,0.35);
      }
      .eco-badge.partially_eco::before {
        content: '⚠️ ';
      }
      .eco-badge.not_verified {
        background: linear-gradient(135deg, rgba(239,68,68,0.9), rgba(220,38,38,0.9));
        border: 1px solid rgba(252,165,165,0.45);
        color: #fff;
        box-shadow: 0 2px 12px rgba(239,68,68,0.35);
      }
      .eco-badge.not_verified::before {
        content: '❌ ';
      }
      .eco-badge.pending {
        background: linear-gradient(135deg, rgba(255,152,0,0.85), rgba(255,111,0,0.85));
        border: 1px solid rgba(255,152,0,0.5);
        color: #fff;
        box-shadow: 0 2px 12px rgba(255,152,0,0.3);
      }
      .eco-badge.pending::before {
        content: '⚠️ ';
      }
      .eco-confidence {
        font-size: 12px;
        color: rgba(255,255,255,0.8);
        margin-top: 4px;
        font-weight: 500;
      }
      .eco-meta {
        font-size: 12px;
        color: rgba(226,232,240,0.92);
        margin-top: 4px;
      }

      /* Responsive */
      @media (max-width: 768px) {
        #ruhi-panel { width: calc(100vw - 52px); max-width: 340px; max-height: 420px; }
        #ruhi-orb   { width: 64px; height: 64px; }
        #ruhi-globe { width: 44px; height: 44px; }
        #ruhi-orbit { width: 76px; height: 76px; }
        #ruhi-container { left: 12px; bottom: 14px; }
      }
    `;
    document.head.appendChild(style);

    // ========================================
    // 2. HTML ELEMENTS
    // ========================================
    const container = document.createElement("div");
    container.id = "ruhi-container";
    container.innerHTML = `
      <div id="ruhi-panel">
        <div id="ruhi-panel-header">
          <div id="ruhi-header-left">
            <div id="ruhi-avatar-circle">🌍</div>
            <div>
              <div id="ruhi-header-name">Ruhi AI</div>
              <div id="ruhi-header-status">
                <span id="ruhi-status-dot"></span>
                <span id="ruhi-status-label">Ready</span>
              </div>
            </div>
          </div>
          <button id="ruhi-close-btn" title="Close">✕</button>
        </div>
        <div id="ruhi-messages"></div>
        <div id="ruhi-input-row">
          <input id="ruhi-text-input" type="text" placeholder="Ask Ruhi anything..." autocomplete="off" />
          <button id="ruhi-mic-btn" title="Voice input">🎤</button>
          <button id="ruhi-send-btn" title="Send">➤</button>
        </div>
      </div>
      <div id="ruhi-label-pill">🌍 Talk to Ruhi</div>
      <div id="ruhi-orbit"></div>
      <div id="ruhi-wave-rings">
        <div class="ruhi-ring"></div>
        <div class="ruhi-ring"></div>
        <div class="ruhi-ring"></div>
      </div>
      <div id="ruhi-orb" title="Click to chat with Ruhi AI">
        <div id="ruhi-globe"></div>
        <span id="ruhi-status"></span>
      </div>
    `;
    document.body.appendChild(container);

    // ========================================
    // 3. STATE & VARIABLES
    // ========================================
    const orb = document.getElementById("ruhi-orb");
    const panel = document.getElementById("ruhi-panel");
    const messagesDiv = document.getElementById("ruhi-messages");
    const statusSpan = document.getElementById("ruhi-status");
    const statusDotEl = document.getElementById("ruhi-status-dot");
    const statusLabelEl = document.getElementById("ruhi-status-label");
    const labelPill = document.getElementById("ruhi-label-pill");
    const closeBtn = document.getElementById("ruhi-close-btn");
    const micBtn = document.getElementById("ruhi-mic-btn");
    const sendBtn = document.getElementById("ruhi-send-btn");
    const textInput = document.getElementById("ruhi-text-input");

    let recognition = null;
    let isBusy = false;
    let isListening = false;
    let silenceTimer = null;
    const API_BASE = "/api/ai"; // Express backend
    const ecoCheckedProducts = new Set();

    // Dragging state
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let orbStartX = 0;
    let orbStartY = 0;
    let justDragged = false;

    // Load saved position from localStorage
    function loadPosition() {
      const savedPos = localStorage.getItem("ruhi-position");
      if (savedPos) {
        try {
          let { x, y } = JSON.parse(savedPos);
          // ✅ SAFETY: Clamp coordinates to keep globe always visible in viewport
          const minMargin = 20;
          const maxX = window.innerWidth - 100 - minMargin; // 100 = approx container width
          const maxY = window.innerHeight - 100 - minMargin; // 100 = approx container height
          x = Math.max(minMargin, Math.min(x, maxX));
          y = Math.max(minMargin, Math.min(y, maxY));
          container.style.left = x + "px";
          container.style.top = y + "px";
          container.style.right = "auto";
          container.style.bottom = "auto";
          console.log("✅ Ruhi position loaded safely:", {x, y});
        } catch (e) {
          console.log("Could not load saved position");
        }
      }
    }

    // Save position to localStorage
    function savePosition() {
      const rect = container.getBoundingClientRect();
      const position = {
        x: rect.left,
        y: rect.top,
      };
      localStorage.setItem("ruhi-position", JSON.stringify(position));
    }

    // Get auth token if user is logged in
    function getAuthToken() {
      return localStorage.getItem("token") || null;
    }

    // Get current user ID
    // Authenticated users get a stable ID from their JWT payload.
    // Guests get a stable UUID stored in localStorage so their session
    // memory on the AI server doesn't reset between requests.
    function getUserId() {
      const user = localStorage.getItem("currentUser");
      if (user) {
        try {
          const parsed = JSON.parse(user);
          return parsed.id || parsed._id || _getOrCreateGuestId();
        } catch {
          return _getOrCreateGuestId();
        }
      }
      return _getOrCreateGuestId();
    }

    function _getOrCreateGuestId() {
      let gid = localStorage.getItem("ruhi-guest-id");
      if (!gid) {
        gid = "guest_" + Math.random().toString(36).slice(2, 12);
        localStorage.setItem("ruhi-guest-id", gid);
      }
      return gid;
    }

    // ========================================
    // DEVICE CHAT HISTORY  (localStorage)
    // Stores the last 20 turns per user for privacy —
    // nothing is persisted to the server.
    // ========================================
    const RUHI_HISTORY_KEY = "ruhi-chat-v1";
    const MAX_HISTORY_TURNS = 20;

    function _historyKey() {
      return `${RUHI_HISTORY_KEY}-${getUserId()}`;
    }

    /** Load full history array [ {who, text, ts}, ... ] */
    function loadChatHistory() {
      try {
        const raw = localStorage.getItem(_historyKey());
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }

    /** Append one turn and cap at MAX_HISTORY_TURNS */
    function saveChatTurn(who, text) {
      try {
        const history = loadChatHistory();
        history.push({ who, text: String(text).slice(0, 500), ts: Date.now() });
        if (history.length > MAX_HISTORY_TURNS) {
          history.splice(0, history.length - MAX_HISTORY_TURNS);
        }
        localStorage.setItem(_historyKey(), JSON.stringify(history));
      } catch (e) {
        console.warn("Ruhi: Could not save chat history", e);
      }
    }

    /** Render the last N turns into the messages panel on first open */
    function renderStoredHistory(maxTurns = 6) {
      const history = loadChatHistory();
      const recent = history.slice(-maxTurns);
      if (recent.length === 0) return;
      const divider = document.createElement("div");
      divider.style.cssText =
        "font-size:11px;color:#64748b;text-align:center;padding:4px 0 8px;";
      divider.textContent = "— previous conversation —";
      messagesDiv.appendChild(divider);
      recent.forEach(({ who, text }) => {
        const msgEl = document.createElement("div");
        msgEl.className = "ruhi-message";
        const whoEl = document.createElement("div");
        whoEl.className = "ruhi-user";
        whoEl.style.opacity = "0.6";
        whoEl.textContent = who;
        const textEl = document.createElement("div");
        textEl.className = "ruhi-response";
        textEl.style.opacity = "0.7";
        textEl.textContent =
          text.length > 120 ? text.slice(0, 120) + "…" : text;
        msgEl.appendChild(whoEl);
        msgEl.appendChild(textEl);
        messagesDiv.appendChild(msgEl);
      });
    }

    // ========================================
    // 4. UI FUNCTIONS
    // ========================================

    /**
     * Log message to panel
     */
    function logMessage(who, text, type = "normal") {
      const isUser = who === "You";
      const msgEl = document.createElement("div");
      msgEl.className = "ruhi-message " + (isUser ? "is-user" : "is-ai");

      const whoEl = document.createElement("div");
      whoEl.className = "ruhi-user";
      whoEl.textContent = isUser ? "You" : "Ruhi";

      const textEl = document.createElement("div");
      textEl.className =
        "ruhi-response" + (type === "error" ? " ruhi-error" : "");
      textEl.innerHTML = text;

      msgEl.appendChild(whoEl);
      msgEl.appendChild(textEl);

      messagesDiv.appendChild(msgEl);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;

      // Auto-hide after 12 seconds if not busy
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        if (!isBusy && !isListening) {
          panel.classList.remove("show");
          labelPill.classList.remove("hidden");
        }
      }, 12000);
    }

    /**
     * Update orb status
     */
    function updateOrb(state) {
      orb.className = state;
      // Update container state classes for CSS-driven wave rings + orbit
      container.classList.remove(
        "is-listening",
        "is-processing",
        "is-speaking",
      );
      if (state === "listening") container.classList.add("is-listening");
      if (state === "processing") container.classList.add("is-processing");
      if (state === "speaking") container.classList.add("is-speaking");

      const labelMap = {
        default: "",
        listening: "MIC",
        processing: "THINKING",
        speaking: "SPEAKING",
        error: "ERROR",
      };
      const statusMap = {
        default: "Ready",
        listening: "Listening…",
        processing: "Thinking…",
        speaking: "Speaking…",
        error: "Error",
      };
      const dotClass = {
        default: "",
        listening: "listening",
        processing: "processing",
        speaking: "speaking",
        error: "error",
      };

      statusSpan.textContent = labelMap[state] || "";
      if (statusLabelEl)
        statusLabelEl.textContent = statusMap[state] || "Ready";
      if (statusDotEl) {
        statusDotEl.className = "";
        if (dotClass[state]) statusDotEl.classList.add(dotClass[state]);
      }
      if (micBtn) micBtn.classList.toggle("active", state === "listening");
    }

    /**
     * Reposition the panel so it always stays within the viewport.
     * Opens above the orb when there is room, below when not.
     * Handles any orb position — corner, edge, centre.
     */
    function _repositionPanel() {
      const orbRect = orb.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const panelW = panel.offsetWidth || 360;
      const panelH = panel.offsetHeight || 480;
      const gap = 12;

      // Horizontal: left-align with orb, clamp so panel never clips right/left edge
      let left = orbRect.left;
      if (left + panelW > vw - gap) left = vw - panelW - gap;
      if (left < gap) left = gap;

      // Vertical: prefer ABOVE the orb
      let top = orbRect.top - panelH - gap;
      if (top < gap) {
        // Not enough room above → open BELOW the orb
        top = orbRect.bottom + gap;
      }
      // Still overflows viewport bottom → clamp
      if (top + panelH > vh - gap) top = vh - panelH - gap;
      if (top < gap) top = gap;

      panel.style.left = left + "px";
      panel.style.top = top + "px";
    }

    /**
     * Show panel — always repositioned to be fully in-viewport
     */
    function showPanel() {
      panel.classList.add("show");
      if (labelPill) labelPill.classList.add("hidden");
      // offsetHeight is available after display:flex is applied — use rAF
      requestAnimationFrame(_repositionPanel);
    }

    /**
     * Clear messages
     */
    function clearMessages() {
      messagesDiv.innerHTML = "";
    }

    // ========================================
    // 5. SPEECH FUNCTIONS
    // ========================================

    /**
     * Pick the best available female voice for Indian-English accent.
     * Strategy: score every voice and pick highest score.
     * Explicitly EXCLUDES known male voices (David, James, Mark, etc.)
     */
    function _getPreferredVoice() {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return null;

      const _MALE_NAMES =
        /\b(david|james|mark|george|daniel|alex|fred|jorge|diego|carlos|paul|richard|thomas|aaron|arthur|eddy|oliver|luca|juan)\b/i;
      const _FEMALE_NAMES =
        /\b(heera|zira|samantha|karen|moira|tessa|victoria|susan|kate|lisa|fiona|alice|nora|amelie|anna|kyoko|sin-ji|mei-jia|ting-ting|yuna|joanna|kathy|vicki|serena|raveena|lekha|veena)\b/i;

      let best = null;
      let bestScore = -1;

      for (const v of voices) {
        if (!v.lang.toLowerCase().startsWith("en")) continue;
        if (_MALE_NAMES.test(v.name)) continue; // skip known male voices

        let score = 0;
        if (/en[-_]IN/i.test(v.lang)) score += 40; // Indian English preferred
        if (_FEMALE_NAMES.test(v.name)) score += 30; // known female name
        if (/female/i.test(v.name)) score += 20; // labeled female
        if (/en[-_](AU|NZ|GB)/i.test(v.lang)) score += 5; // other English accents

        if (score > bestScore) {
          bestScore = score;
          best = v;
        }
      }
      return best;
    }

    // Preload voices as soon as the browser makes them available
    if (typeof speechSynthesis !== "undefined") {
      speechSynthesis.getVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
      }
    }

    /**
     * Text-to-Speech — female Indian-English voice
     */
    function speak(text) {
      if (recognition) recognition.abort();

      isBusy = true;
      updateOrb("speaking");
      showPanel();
      logMessage("Ruhi", text);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-IN";
      utterance.rate = 0.95;
      utterance.pitch = 1.35; // noticeably higher — unmistakably feminine

      utterance.onend = () => {
        isBusy = false;
        updateOrb("default");
        setTimeout(() => startListening(), 500);
      };

      utterance.onerror = (e) => {
        console.error("Speech synthesis error:", e);
        isBusy = false;
        updateOrb("default");
      };

      // Wait for voices to load if not yet available, then assign and speak
      const _assignVoiceAndSpeak = () => {
        const _voice = _getPreferredVoice();
        if (_voice) {
          utterance.voice = _voice;
          console.log("🎤 Ruhi voice:", _voice.name, _voice.lang);
        }
        window.speechSynthesis.speak(utterance);
      };

      const _voices = window.speechSynthesis.getVoices();
      if (_voices && _voices.length > 0) {
        _assignVoiceAndSpeak();
      } else {
        // Voices not loaded yet — wait for the event then speak
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
          _assignVoiceAndSpeak();
        };
      }
    }

    /**
     * Start Speech Recognition
     */
    function startListening() {
      if (isBusy || isListening) return;

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        logMessage(
          "Ruhi",
          "⚠️ Speech recognition not supported in this browser",
          "error",
        );
        return;
      }

      recognition = new SR();
      recognition.lang = "en-IN";
      recognition.continuous = true; // keeps mic open — captures full sentence
      recognition.interimResults = false;

      let _accumulated = "";
      let _sendTimer = null;

      recognition.onstart = () => {
        isListening = true;
        _accumulated = "";
        updateOrb("listening");
        showPanel();
        console.log("🎤 Listening (continuous)...");
      };

      recognition.onend = () => {
        isListening = false;
        clearTimeout(_sendTimer);
        if (!isBusy) updateOrb("default");
        // Flush anything captured before the browser closed the mic
        if (_accumulated.trim()) {
          const final = _accumulated.trim();
          _accumulated = "";
          sendQuery(final);
        }
      };

      recognition.onresult = (event) => {
        // Accumulate every new FINAL segment (ignores interim)
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            _accumulated += " " + event.results[i][0].transcript;
          }
        }
        const partial = _accumulated.trim();
        if (!partial) return;
        console.log(`📝 Captured so far: "${partial}"`);

        // After 1.8 s of silence → treat as complete utterance and send
        clearTimeout(_sendTimer);
        _sendTimer = setTimeout(() => {
          if (_accumulated.trim()) {
            const final = _accumulated.trim();
            _accumulated = "";
            isListening = false;
            try {
              recognition.stop();
            } catch (e) {}
            console.log(`✅ Sending: "${final}"`);
            sendQuery(final);
          }
        }, 1800);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        isListening = false;
        // "aborted" fires when we call recognition.abort() ourselves (e.g. after getting transcript) — not a real error
        // "no-speech" is normal silence — hide both from chat
        const silent = ["aborted", "no-speech", "audio-capture"];
        if (!silent.includes(event.error)) {
          logMessage(
            "Ruhi",
            `Speech recognition error: ${event.error}`,
            "error",
          );
        }
      };

      try {
        recognition.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
      }
    }

    // ========================================
    // 6. AI QUERY FUNCTION
    // ========================================

    /**
     * Send query to AI backend
     */
    async function sendQuery(query) {
      if (!query || query.trim().length === 0) return;

      isBusy = true;
      updateOrb("processing");
      showPanel();
      logMessage("You", query);
      saveChatTurn("You", query); // persist to device

      // Check for eco verification keywords
      const ecoKeywords = ["verify", "eco cert", "certification", "check eco", "eco verify", "eco check", "green check"];
      const lowerQuery = query.toLowerCase();
      const hasEcoKeyword = ecoKeywords.some(kw => lowerQuery.includes(kw));
      
      if (hasEcoKeyword) {
        // Extract product ID if present in query (e.g., "verify product prod_123")
        const productIdMatch = query.match(/product[_\s]([a-zA-Z0-9_]+)/i) || query.match(/([a-zA-Z0-9]+_[a-zA-Z0-9]+)/);
        if (productIdMatch && productIdMatch[1]) {
          // Trigger eco verification
          console.log(`🌿 Eco verification detected for: ${productIdMatch[1]}`);
          const productCache = window.__ruhiProductCache || {};
          const cachedProduct = productCache[productIdMatch[1]] || { product_id: productIdMatch[1] };
          const ecoResult = await handleEcoVerification(cachedProduct, { source: "query" });
          if (ecoResult) {
            isBusy = false;
            updateOrb("default");
            return;
          }
        }
      }

      try {
        const token = getAuthToken();
        const reqHeaders = { "Content-Type": "application/json" };
        if (token) reqHeaders["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`${API_BASE}/query`, {
          method: "POST",
          headers: reqHeaders,
          body: JSON.stringify({
            query: query,
            user_id: getUserId(), // stable ID so server session is maintained
            context: {
              currentPage: window.location.pathname,
              userAgent: navigator.userAgent,
              // Send last 6 turns so the AI brain has conversation context
              chatHistory: loadChatHistory()
                .slice(-6)
                .map((t) => ({
                  user: t.who === "You" ? t.text : undefined,
                  ai: t.who === "Ruhi" ? t.text : undefined,
                }))
                .filter((t) => t.user || t.ai),
            },
          }),
        });

        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || !contentType.includes("application/json")) {
          const bodyText = await response.text();
          throw new Error(
            `Server error ${response.status}: ` +
              (bodyText.startsWith("<")
                ? "Invalid response from server (HTML received — check CORS/ngrok)"
                : bodyText.slice(0, 120)),
          );
        }
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to process query");
        }

        console.log("✅ AI Response:", data);

        // Persist Ruhi's reply to device history
        if (data.message) {
          saveChatTurn("Ruhi", data.message);
        }

        // ==============================
        // HANDLE AI RESPONSE
        // ==============================
        handleAIResponse(data);
      } catch (error) {
        console.error("❌ Query Error:", error);
        logMessage(
          "Ruhi",
          `Sorry, I encountered an error: ${error.message}. Please try again.`,
          "error",
        );
        isBusy = false;
        updateOrb("error");
        setTimeout(() => {
          if (!isListening) {
            updateOrb("default");
          }
        }, 2000);
      }
    }

    // ========================================
    // 7. RESPONSE HANDLER
    // ========================================

    /**
     * Handle AI response and execute actions
     */
    function handleAIResponse(aiResponse) {
      const { type, intent, action, message, data, payload } = aiResponse;

      // ===== ECO DEED — show rich card before speaking =====
      if (type === "ECO_DEED" && data) {
        const deed = data.deed || {};
        const score = data.ecoScore != null ? data.ecoScore : "?";
        const points = data.greenPoints != null ? data.greenPoints : "?";
        const rank = data.planetRank || "";
        const cat = deed.category || "";
        const deedCard = [
          `🌿 <strong>Eco Deed Logged!</strong>`,
          cat ? `Category: <em>${cat}</em>` : null,
          `🌟 Green Points: <strong>+${points}</strong>`,
          `🌍 Eco Score: <strong>${score}</strong>`,
          rank ? `🏆 Planet Rank: <strong>${rank}</strong>` : null,
        ]
          .filter(Boolean)
          .join("<br>");
        showPanel();
        logMessage("Ruhi", deedCard);
      }

      // ===== PRE-SPEECH RICH CARDS =====

      // Product list card (SEARCH_PRODUCT / RECOMMEND results)
      if (
        (type === "SUCCESS" || type === "PRODUCT_LIST") &&
        data &&
        data.products &&
        data.products.length > 0
      ) {
        const prods = data.products.slice(0, 3);
        const prodHtml = prods
          .map(
            (p) =>
              '<div style="border-bottom:1px solid rgba(139,195,74,0.2);padding:4px 0;">' +
              "<strong>" +
              (p.name || p.title || "Product") +
              "</strong>" +
              (p.price ? " \u2014 <em>\u20B9" + p.price + "</em>" : "") +
              (p.sustainabilityRating || p.rating
                ? " \u2B50" + (p.sustainabilityRating || p.rating)
                : "") +
              "</div>",
          )
          .join("");
        showPanel();
        logMessage(
          "Ruhi",
          "\uD83D\uDED2 <strong>Top Results:</strong><br>" +
            prodHtml +
            (data.products.length > 3
              ? "<br><em>+" +
                (data.products.length - 3) +
                " more on Products page</em>"
              : ""),
        );
      }

      // Leaderboard card (GET_LEADERBOARD result)
      if (
        type === "SUCCESS" &&
        data &&
        data.leaderboard &&
        data.leaderboard.length > 0
      ) {
        const leaders = data.leaderboard.slice(0, 5);
        const lbHtml = leaders
          .map(function (l) {
            return (
              '<div style="padding:2px 0;">' +
              l.rank +
              ". <strong>" +
              l.fullName +
              "</strong>" +
              " \u2014 " +
              l.ecoScore +
              " pts \uD83C\uDF3F <em>" +
              (l.planetRank || "") +
              "</em></div>"
            );
          })
          .join("");
        showPanel();
        logMessage(
          "Ruhi",
          "\uD83C\uDFC6 <strong>Eco Leaderboard:</strong><br>" + lbHtml,
        );
      }

      // Eco-Stats card (GET_ECO_STATS result) — BUG-02 fix
      if (type === "SUCCESS" && intent === "GET_ECO_STATS" && data) {
        const ecoCard = [
          "\uD83C\uDF0D <strong>Your Eco Profile</strong>",
          data.ecoScore != null
            ? "\u2B50 Eco Score: <strong>" + data.ecoScore + " pts</strong>"
            : null,
          data.greenPoints != null
            ? "\uD83C\uDF31 Green Points: <strong>" +
              data.greenPoints +
              "</strong>"
            : null,
          data.planetRank
            ? "\uD83C\uDFC6 Planet Rank: <strong>" +
              data.planetRank +
              "</strong>"
            : null,
          data.totalDeeds != null
            ? "\uD83C\uDF3F Total Deeds: <strong>" +
              data.totalDeeds +
              "</strong>"
            : null,
        ]
          .filter(Boolean)
          .join("<br>");
        showPanel();
        logMessage("Ruhi", ecoCard);
      }

      // Eco Verification card (ECO_VERIFICATION result)
      if (type === "eco_verification" && data) {
        const badgeClass = data.eco_status || "not_verified";
        const statusMap = {
          certified: "Certified Eco",
          eco_verified: "Eco Friendly",
          partially_eco: "Partially Eco",
          not_verified: "Not Verified"
        };
        const statusText = statusMap[badgeClass] || "Verification Pending";
        const ecoCard = 
          `<div class="eco-badge ${badgeClass}">${statusText}</div>` +
          `<div class="eco-confidence">Confidence: ${data.confidence}%</div>` +
          `<div class="eco-meta">🌱 Eco Score: ${data.eco_score || 0} (${data.category || "Poor"})</div>` +
          `<div class="eco-meta">👤 Seller Trust: ${data.trust_level || "Basic"}</div>` +
          (data.message ? `<div style="font-size:12px;margin-top:6px;color:rgba(255,255,255,0.7);">${data.message}</div>` : "");
        showPanel();
        logMessage("Ruhi", ecoCard);
      }

      // Social action confirmation card (LIKE, JOIN, SEND_MESSAGE, CREATE_POST)
      if (type === "SOCIAL_ACTION") {
        var intentLabels = {
          CREATE_POST: "\u2728 Post created and shared!",
          LIKE_POST: "\uD83D\uDC4D Post liked!",
          JOIN_COMMUNITY: "\uD83C\uDF89 Joined community successfully!",
          SEND_MESSAGE: "\uD83D\uDCAC Message sent successfully!",
        };
        var socialLabel = intentLabels[intent] || "\u2705 Action completed!";
        showPanel();
        logMessage("Ruhi", "<strong>" + socialLabel + "</strong>");
      }

      // Order result card (TRACK_ORDER / PLACE_ORDER / CANCEL_ORDER)
      if (
        type === "SUCCESS" &&
        data &&
        (intent === "TRACK_ORDER" ||
          intent === "PLACE_ORDER" ||
          intent === "CANCEL_ORDER")
      ) {
        var orderObj =
          typeof data === "object" && !Array.isArray(data) ? data : {};
        if (orderObj._id || orderObj.status || orderObj.grandTotal) {
          var orderLines = [
            orderObj._id
              ? "\uD83D\uDCE6 Order ID: <code>" +
                String(orderObj._id).slice(-10) +
                "</code>"
              : null,
            orderObj.status
              ? "Status: <strong>" + orderObj.status + "</strong>"
              : null,
            orderObj.grandTotal
              ? "Total: <strong>\u20B9" + orderObj.grandTotal + "</strong>"
              : null,
            intent === "CANCEL_ORDER"
              ? "\uD83D\uDCB3 <em>Refund initiated.</em>"
              : null,
          ]
            .filter(Boolean)
            .join("<br>");
          showPanel();
          logMessage("Ruhi", orderLines);
        }
      }

      // Cart badge refresh after ADD_TO_CART success (backend already mutated the cart)
      if (type === "SUCCESS" && intent === "ADD_TO_CART") {
        if (typeof window.updateCartBadge === "function") {
          try {
            window.updateCartBadge();
          } catch (e) {
            /* non-fatal */
          }
        }
      }

      // Always speak the response
      if (message) {
        isBusy = true;
        updateOrb("speaking");

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = "en-IN";

        utterance.onend = () => {
          isBusy = false;
          if (action) {
            // ✅ FIX: Make executeAction async-aware
            const result = executeAction(action, payload, intent);
            if (result instanceof Promise) {
              result.catch(err => console.error("Action error:", err));
            }
            } else if (intent === "ADD_TO_CART" && data) {
              // ✅ FIX: Fallback for ADD_TO_CART if action field is missing
              const productId = (data.productId || data.product_id || payload?.productId || "");
              if (productId) {
                const result = executeAction("ADD_TO_CART", {productId, quantity: payload?.quantity || 1}, intent);
                if (result instanceof Promise) result.catch(err => console.error("Cart error:", err));
              }
            } else if (intent === "SEARCH_PRODUCT" && data) {
              // ✅ FIX: Fallback for SEARCH_PRODUCT if action field is missing
              const searchQ = data.query || payload?.query || "";
              if (searchQ) {
                window.location.href = `products.html?search=${encodeURIComponent(searchQ)}`;
              }
          } else if (type === "NAVIGATION" && data && data.destination) {
            // Fallback: map destination string → page URL (covers missing action field)
            const _navMap = {
              home: "homepage.html",
              social: "social.html",
              products: "products.html",
              shop: "products.html",
              cart: "acc.html#cart",
              orders: "acc.html#orders",
              dashboard: "acc.html",
              account: "acc.html",
              profile: "acc.html",
              communities: "social.html?tab=communities",
              messages: "social.html?tab=messages",
              explore: "social.html?tab=explore",
            };
            const dest = _navMap[data.destination] || "index.html";
            window.location.href = dest;
          } else if (type === "SOCIAL_PROFILE" && data) {
            // VIEW_PROFILE: navigate to the user's public profile page
            const uid = (
              data._id ||
              data.id ||
              (payload && payload.userId) ||
              ""
            ).toString();
            window.location.href = uid
              ? "social.html?profile=" + uid
              : "acc.html";
          } else if (type === "SOCIAL_FEED") {
            // READ_FEED: take user to the social feed page
            window.location.href = "social.html";
          } else if (type === "SOCIAL_DISCOVERY") {
            // DISCOVER_COMMUNITIES: open communities tab
            window.location.href = "social.html?tab=communities";
          } else {
            updateOrb("default");
          }
        };

        utterance.onerror = () => {
          isBusy = false;
          if (action) {
            executeAction(action, payload, intent);
          } else {
            updateOrb("default");
          }
        };

        window.speechSynthesis.speak(utterance);
      } else if (action) {
        executeAction(action, payload, intent);
      }
    }
    /**
     * Execute AI action
     */
    function executeAction(action, payload, intent) {
      console.log(`🎯 Executing action: ${action}`, {payload, intent});
      logMessage("Ruhi", `<div class="ruhi-action">Action: ${action}</div>`);

      switch (action) {
        // ===== NAVIGATION =====
        case "NAVIGATE_HOME":
          window.location.href = "homepage.html";
          break;

        case "NAVIGATE_PRODUCTS":
        case "NAVIGATE_SHOP":
          window.location.href = "products.html";
          break;

        case "NAVIGATE_SOCIAL":
          window.location.href = "social.html";
          break;

        case "NAVIGATE_ACCOUNT":
        case "NAVIGATE_PROFILE":
          window.location.href = "acc.html";
          break;

        case "NAVIGATE_CART":
          // Show cart inline in Ruhi panel, then navigate
          fetchAndShowCart();
          break;

        case "NAVIGATE_ORDERS":
        case "SHOW_ORDERS":
        case "LIST_ORDERS":
          // Show recent orders inline in Ruhi panel, then navigate
          fetchAndShowOrders();
          break;

        case "NAVIGATE_PAYMENT":
          window.location.href = "Payment/payment.html";
          break;

        // ===== OPEN SPECIFIC PRODUCT =====
        case "NAVIGATE_PRODUCT_DETAIL":
          if (payload && (payload.product_id || payload._id)) {
            const pid = payload.product_id || payload._id;
            window.location.href = `products.html?productId=${pid}`;
          } else {
            window.location.href = "products.html";
          }
          break;

        // ===== SHOPPING =====
        case "ADD_TO_CART": {
          // ✅ FIX: Better validation and error handling for cart operations
          if (!payload) {
            console.error("❌ ADD_TO_CART: No payload provided");
            logMessage("Ruhi", "❌ Could not add product - missing product details", "error");
            return;
          }
          
          const productId = payload.productId || payload.product_id || payload._id;
          if (!productId) {
            console.error("❌ ADD_TO_CART: No productId in payload", payload);
            logMessage("Ruhi", "❌ Could not identify product to add", "error");
            return;
          }
          
          console.log(`✅ Adding product to cart: ${productId}, qty: ${payload.quantity || 1}`);
          return addToCart({...payload, productId}); // ✅ Return promise so caller can await if needed
        }

        case "SEARCH_PRODUCTS": {
          // Try to extract query from payload (explicit search) or fall back to products page
          const searchQ = (payload && (payload.query || payload.search)) || "";
          window.location.href = searchQ
            ? `products.html?search=${encodeURIComponent(searchQ)}`
            : "products.html";
          break;
        }

        // ===== SOCIAL =====
        // ===== NEW SOCIAL TABS =====
        case "NAVIGATE_COMMUNITIES":
        case "DISCOVER_COMMUNITIES":
          window.location.href = "social.html?tab=communities";
          break;

        case "NAVIGATE_MESSAGES":
          window.location.href = "social.html?tab=messages";
          break;

        case "NAVIGATE_EXPLORE":
          window.location.href = "social.html?tab=explore";
          break;

        case "NAVIGATE_CHECKOUT":
        case "CHECKOUT":
          window.location.href = "Payment/payment.html";
          break;

        case "SHOW_PROFILE":
        case "GET_PROFILE":
          fetchAndShowProfile();
          break;

        case "CREATE_POST":
          // FIX: Now correctly triggered — navigate to social with ?action=create
          window.location.href = "social.html?action=create";
          break;

        case "VIEW_FEED":
        case "SHOW_FEED":
          window.location.href = "social.html";
          break;

        case "VIEW_PROFILE":
          if (payload && payload.userId) {
            window.location.href = `social.html?profile=${payload.userId}`;
          } else {
            window.location.href = "acc.html";
          }
          break;

        // ===== APP CONTROL =====
        case "STOP":
        case "QUIT":
        case "EXIT":
          logMessage(
            "Ruhi",
            "👋 Goodbye! Feel free to ask me anything anytime.",
          );
          isBusy = false;
          updateOrb("default");
          setTimeout(() => {
            panel.classList.remove("show");
          }, 3000);
          break;

        default:
          console.log(`⚠️ Unknown action: ${action}`);
          isBusy = false;
          updateOrb("default");
      }
    }

    /**
     * Add product to cart
     */
    async function addToCart(payload) {
      try {
        // ✅ FIX: Validate payload structure
        if (!payload) {
          throw new Error("Payload is required");
        }
        
        const productId = payload.productId || payload.product_id || payload._id;
        if (!productId) {
          throw new Error("Product ID is missing from payload");
        }

        const token = getAuthToken();
        if (!token) {
          logMessage(
            "Ruhi",
            "Please login first to add items to cart",
            "error",
          );
          window.location.href = "login.html";
          return;
        }

        updateOrb("processing");
        logMessage("Ruhi", "⏳ Adding to cart...");
        
        const API_URL = window.API_CONFIG?.API_URL || "/api";
        const response = await fetch(`${API_URL}/cart/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: productId,
            quantity: payload.quantity || 1,
          }),
        });

        const data = await response.json();
        if (data.success) {
          logMessage(
            "Ruhi",
            `✅ Added to cart! You have ${data.cartCount || 1} items.`,
          );
          console.log("✅ Cart updated:", data);
          if (window.updateCartBadge) {
            window.updateCartBadge();
          }
        } else {
          logMessage("Ruhi", `Could not add to cart: ${data.message}`, "error");
          console.error("❌ Cart add failed:", data);
        }
      } catch (error) {
        console.error("❌ Add to cart error:", error);
        logMessage("Ruhi", `Sorry, I couldn't add it to cart: ${error.message}`, "error");
      } finally {
        isBusy = false;
        updateOrb("default");
      }
    }

    /**
     * Fetch cart from backend and display inline in Ruhi panel
     */
    async function fetchAndShowCart() {
      showPanel();
      const token = getAuthToken();
      if (!token) {
        logMessage("Ruhi", "⚠️ Please login first to view your cart.");
        isBusy = false;
        updateOrb("default");
        setTimeout(() => {
          window.location.href = "homepage.html";
        }, 1500);
        return;
      }
      try {
        updateOrb("processing");
        const API_URL = window.API_CONFIG?.API_URL || "/api";
        const res = await fetch(`${API_URL}/cart`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.items && data.items.length > 0) {
          let total = 0;
          const rows = data.items
            .map((item) => {
              const prod = item.productId || item.product || {};
              const name = prod.name || item.name || "Product";
              const price = prod.price || item.price || 0;
              const qty = item.quantity || 1;
              const sub = price * qty;
              total += sub;
              return (
                `<div style="padding:4px 0;border-bottom:1px solid rgba(139,195,74,0.2);">` +
                `🛒 <strong>${name}</strong> × ${qty} — <em>₹${sub}</em></div>`
              );
            })
            .join("");
          logMessage(
            "Ruhi",
            `🛒 <strong>Your Cart (${data.items.length} item${data.items.length > 1 ? "s" : ""}):</strong><br>${rows}` +
              `<br><strong>Total: ₹${total}</strong>` +
              `<br><small style="color:#8bc34a;">Say "checkout" to place your order.</small>`,
          );
          // navigate so user can manage cart
          setTimeout(() => {
            window.location.href = "acc.html#cart";
          }, 3500);
        } else {
          logMessage(
            "Ruhi",
            "🛒 Your cart is empty. Say 'show products' to browse!",
          );
        }
      } catch (err) {
        console.error("fetchAndShowCart error:", err);
        logMessage(
          "Ruhi",
          "Could not fetch your cart. Please try again.",
          "error",
        );
      } finally {
        isBusy = false;
        updateOrb("default");
      }
    }

    /**
     * Fetch recent orders from backend and display inline in Ruhi panel
     */
    async function fetchAndShowOrders() {
      showPanel();
      const token = getAuthToken();
      if (!token) {
        logMessage("Ruhi", "⚠️ Please login first to view your orders.");
        isBusy = false;
        updateOrb("default");
        setTimeout(() => {
          window.location.href = "homepage.html";
        }, 1500);
        return;
      }
      try {
        updateOrb("processing");
        const res = await fetch("/api/orders?limit=5", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.orders && data.orders.length > 0) {
          const rows = data.orders
            .slice(0, 5)
            .map((o, i) => {
              const id = String(o._id || "").slice(-8);
              const status = o.status || "Pending";
              const total = o.grandTotal || o.total || "—";
              const date = o.createdAt
                ? new Date(o.createdAt).toLocaleDateString("en-IN")
                : "";
              return (
                `<div style="padding:4px 0;border-bottom:1px solid rgba(139,195,74,0.2);">` +
                `📦 <code>#${id}</code> — <strong>${status}</strong> — ₹${total}` +
                (date ? ` <em>(${date})</em>` : "") +
                `</div>`
              );
            })
            .join("");
          logMessage(
            "Ruhi",
            `📦 <strong>Your Recent Orders (${data.orders.length} total):</strong><br>${rows}` +
              `<br><small style="color:#8bc34a;">Taking you to order history…</small>`,
          );
          setTimeout(() => {
            window.location.href = "acc.html#orders";
          }, 3500);
        } else {
          logMessage(
            "Ruhi",
            "📦 No orders found. Say 'show products' to start shopping!",
          );
        }
      } catch (err) {
        console.error("fetchAndShowOrders error:", err);
        logMessage(
          "Ruhi",
          "Could not fetch your orders. Please try again.",
          "error",
        );
      } finally {
        isBusy = false;
        updateOrb("default");
      }
    }

    /**
     * Fetch user profile from backend and display inline in Ruhi panel
     */
    async function fetchAndShowProfile() {
      showPanel();
      const token = getAuthToken();
      if (!token) {
        logMessage("Ruhi", "⚠️ Please login first to view your profile.");
        isBusy = false;
        updateOrb("default");
        setTimeout(() => {
          window.location.href = "homepage.html";
        }, 1500);
        return;
      }
      try {
        updateOrb("processing");
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.user) {
          const u = data.user;
          logMessage(
            "Ruhi",
            `👤 <strong>${u.fullName || u.name || "User"}</strong><br>` +
              `📧 ${u.email || ""}<br>` +
              (u.phone ? `📱 ${u.phone}<br>` : "") +
              (u.ecoScore != null
                ? `🌍 Eco Score: <strong>${u.ecoScore}</strong> pts<br>`
                : "") +
              (u.planetRank
                ? `🏆 Planet Rank: <strong>${u.planetRank}</strong><br>`
                : "") +
              `<small style="color:#8bc34a;">Opening your account…</small>`,
          );
          setTimeout(() => {
            window.location.href = "acc.html";
          }, 2500);
        } else {
          logMessage(
            "Ruhi",
            "Could not load profile. Please try again.",
            "error",
          );
        }
      } catch (err) {
        console.error("fetchAndShowProfile error:", err);
        logMessage(
          "Ruhi",
          "Error fetching profile. Please try again.",
          "error",
        );
      } finally {
        isBusy = false;
        updateOrb("default");
      }
    }

    /**
     * Eco Verification Handler
     * Verify product eco certifications
     */
    function normalizeEcoProductInput(productInput) {
      if (!productInput) return null;
      if (typeof productInput === "string") {
        return {
          product_id: String(productInput),
          name: "",
          materials: "",
          packaging: "",
          transport: "",
          description: "",
          certificate_name: "",
          certificate_id: "",
          issuing_authority: "",
          proof_url: "",
          eco_checked: false
        };
      }

      return {
        product_id: String(productInput.product_id || productInput._id || productInput.id || ""),
        name: String(productInput.name || ""),
        materials: productInput.materials || productInput.material || "",
        packaging: productInput.packaging || "",
        transport: productInput.transport || "",
        description: String(productInput.description || productInput.eco_impact || ""),
        certificate_name: String(productInput.certificate_name || ""),
        certificate_id: String(productInput.certificate_id || ""),
        issuing_authority: String(productInput.issuing_authority || ""),
        proof_url: String(productInput.proof_url || ""),
        user_id: String(productInput.user_id || productInput.seller_id || ""),
        eco_checked: Boolean(productInput.eco_checked)
      };
    }

    function ecoBadgeMeta(ecoStatus) {
      const map = {
        certified: { className: "certified", text: "Certified Eco" },
        eco_verified: { className: "eco_verified", text: "Eco Friendly" },
        partially_eco: { className: "partially_eco", text: "Partially Eco" },
        not_verified: { className: "not_verified", text: "Not Verified" }
      };
      return map[ecoStatus] || { className: "pending", text: "Verification Pending" };
    }

    async function handleEcoVerification(productInput, options = {}) {
      try {
        const API_URL = window.API_CONFIG?.API_URL || "/api";
        const product = normalizeEcoProductInput(productInput);

        if (!product || !product.product_id) {
          throw new Error("Product data is missing product_id");
        }

        const isAuto = Boolean(options.auto);
        const silent = Boolean(options.silent);

        if (product.eco_checked || ecoCheckedProducts.has(product.product_id)) {
          if (!silent) {
            console.log(`🌿 Eco already checked for ${product.product_id}, skipping duplicate verification`);
          }
          return null;
        }

        const payload = {
          ...product,
          user_id: product.user_id || getUserId()
        };

        const response = await fetch(`${API_URL}/verify/eco/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Eco verification failed: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success) {
          ecoCheckedProducts.add(product.product_id);
          if (typeof productInput === "object" && productInput) {
            productInput.eco_checked = true;
          }

          const badge = ecoBadgeMeta(result.eco_status);

          if (!silent) {
            showPanel();
            logMessage(
              "Ruhi",
              `<div class="eco-badge ${badge.className}">${badge.text}</div>` +
              `<div class="eco-confidence">Confidence: ${result.confidence}%</div>` +
              `<div class="eco-meta">🌱 Eco Score: ${result.eco_score || 0} (${result.category || "Poor"})</div>` +
              `<div class="eco-meta">👤 Seller Trust: ${result.trust_level || "Basic"}</div>` +
              (isAuto ? `<div class="eco-meta">Auto-check completed for ${product.name || product.product_id}</div>` : "")
            );
          }

          return {
            type: "eco_verification",
            product_id: result.product_id,
            eco_status: result.eco_status,
            confidence: result.confidence,
            eco_score: result.eco_score,
            category: result.category,
            trust_level: result.trust_level,
            message: result.message
          };
        } else {
          if (!silent) {
            logMessage("Ruhi", `⚠️ Eco verification error: ${result.message}`, "error");
          }
          return null;
        }
      } catch (error) {
        console.error("Eco verification error:", error);
        if (!options.silent) {
          logMessage("Ruhi", `Sorry, I couldn't verify the product certification. ${error.message}`, "error");
        }
        return null;
      }
    }

    /**
     * Public API: Verify product eco status (can be called from other scripts)
     * Usage: window.verifyProductEco(productObjectOrId, { auto, silent, source })
     */
    window.verifyProductEco = handleEcoVerification;

    // Allow any page flow to trigger auto checks without direct coupling.
    document.addEventListener("ruhi:product-loaded", (event) => {
      if (event && event.detail && event.detail.product) {
        handleEcoVerification(event.detail.product, {
          auto: true,
          silent: true,
          source: "loaded"
        });
      }
    });

    document.addEventListener("ruhi:product-created", (event) => {
      if (event && event.detail && event.detail.product) {
        handleEcoVerification(event.detail.product, {
          auto: true,
          silent: false,
          source: "created"
        });
      }
    });

    window.notifyRuhiProductCreated = function (product) {
      if (!product) return;
      handleEcoVerification(product, { auto: true, source: "created" });
    };

    // ========================================
    // 8. EVENT LISTENERS
    // ========================================

    /**     * Orb drag handlers
     */
    orb.addEventListener("mousedown", (e) => {
      // Only allow dragging if not busy
      if (isBusy || isListening) return;

      isDragging = true;
      container.classList.add("dragging");

      dragStartX = e.clientX;
      dragStartY = e.clientY;

      const rect = container.getBoundingClientRect();
      orbStartX = rect.left;
      orbStartY = rect.top;

      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;

      // Only start dragging if moved more than 10px (prevents accidental moves on click)
      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) return;

      const newX = orbStartX + deltaX;
      const newY = orbStartY + deltaY;

      // Keep within viewport bounds
      const maxX = window.innerWidth - container.offsetWidth;
      const maxY = window.innerHeight - container.offsetHeight;

      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));

      container.style.left = boundedX + "px";
      container.style.top = boundedY + "px";
      container.style.right = "auto";
      container.style.bottom = "auto";

      e.preventDefault();
    });

    document.addEventListener("mouseup", (e) => {
      if (isDragging) {
        isDragging = false;
        container.classList.remove("dragging");

        // Prevent click event if dragged
        const deltaX = Math.abs(e.clientX - dragStartX);
        const deltaY = Math.abs(e.clientY - dragStartY);
        if (deltaX > 10 || deltaY > 10) {
          savePosition();
          justDragged = true;
          setTimeout(() => {
            justDragged = false;
          }, 100);
        }
      }
    });

    /**
     * Close button
     */
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        panel.classList.remove("show");
        if (labelPill) labelPill.classList.remove("hidden");
        if (recognition)
          try {
            recognition.abort();
          } catch (err) {}
        isListening = false;
        isBusy = false;
        updateOrb("default");
      });
    }

    /**
     * Send text input
     */
    function handleSend() {
      const val = (textInput ? textInput.value : "").trim();
      if (!val || isBusy || isListening) return;
      if (textInput) textInput.value = "";
      sendQuery(val);
    }
    if (sendBtn) sendBtn.addEventListener("click", handleSend);
    if (textInput) {
      textInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleSend();
        }
      });
      // Prevent the auto-hide timer from closing the panel while the user is typing
      textInput.addEventListener("focus", () => clearTimeout(silenceTimer));
      textInput.addEventListener("input", () => clearTimeout(silenceTimer));
    }

    // Keep panel in-viewport when user resizes the browser window
    window.addEventListener("resize", () => {
      if (panel.classList.contains("show")) _repositionPanel();
    });

    /**
     * Mic button (open/toggle listen)
     */
    if (micBtn) {
      micBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isBusy) return;
        if (isListening) {
          if (recognition)
            try {
              recognition.abort();
            } catch (err) {}
          isListening = false;
          updateOrb("default");
        } else {
          showPanel();
          startListening();
        }
      });
    }

    /**
     * Orb click handler
     */
    orb.addEventListener("click", () => {
      if (isListening || isBusy || justDragged) return;

      const alreadyOpen = panel.classList.contains("show");
      if (alreadyOpen) {
        panel.classList.remove("show");
        if (labelPill) labelPill.classList.remove("hidden");
        return;
      }

      // First open: show stored history then greet
      clearMessages();
      renderStoredHistory(6);
      showPanel();
      logMessage("Ruhi", "👋 Hello! Type a message or tap 🎤 to speak.");
      // Focus text input instead of auto-starting speech
      if (textInput) setTimeout(() => textInput.focus(), 80);
    });

    /**
     * Keyboard shortcut: Alt + R to activate Ruhi
     */
    document.addEventListener("keydown", (event) => {
      // Alt + R
      if (event.altKey && event.key === "r") {
        event.preventDefault();
        orb.click();
      }
    });

    // ========================================
    // 9. INITIALIZATION
    // ========================================

    // Load saved position
    loadPosition();

    // ✅ FIX: Periodic visibility check — ensure Ruhi globe always stays visible
    setInterval(() => {
      if (!container || !container.parentNode) {
        console.warn("⚠️ Ruhi container missing from DOM, re-adding...");
        document.body.appendChild(container);
      }
      
      // Ensure container is not hidden
      if (container.style.display === "none") {
        console.warn("⚠️ Ruhi container was hidden, showing it...");
        container.style.display = "flex";
      }
      
      // Ensure coordinates are still within viewport (in case page was resized)
      const rect = container.getBoundingClientRect();
      if (rect.left < -50 || rect.right > window.innerWidth + 50 ||
          rect.top < -50 || rect.bottom > window.innerHeight + 50) {
        console.warn("⚠️ Ruhi went off-screen, resetting position...");
        localStorage.removeItem("ruhi-position");
        container.style.left = "24px";
        container.style.top = "auto";
        container.style.right = "auto";
        container.style.bottom = "24px";
      }
    }, 5000); // Check every 5 seconds

    console.log("✅ Ruhi AI Assistant ready!");
    console.log("📌 Quick start: Click the orb or press Alt+R");
    console.log("🔄 Drag the orb to reposition it anywhere!");
    console.log("🔒 Ruhi will always stay visible on your screen!");

    // Optional: Auto-greet on first page load
    window.addEventListener("load", () => {
      // Auto-show greeting after 2 seconds — restore history first
      setTimeout(() => {
        if (!isListening && !isBusy) {
          clearMessages();
          renderStoredHistory(6); // ← show previous conversation on every page load
          showPanel();
          const history = loadChatHistory();
          const greeting =
            history.length > 0
              ? "👋 Welcome back! I remember our last chat. How can I help?"
              : "👋 Hi there! I'm Ruhi, your AI Assistant. Click me to chat!";
          logMessage("Ruhi", greeting);
        }
      }, 2000);
    });
  }
})();
