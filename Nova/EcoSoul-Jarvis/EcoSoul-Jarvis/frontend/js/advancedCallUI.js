/**
 * Advanced Call UI Manager - WhatsApp Style
 * Professional, production-ready call interface
 */

class AdvancedCallUI {
  constructor() {
    this.callActive = false;
    this.callStartTime = null;
    this.durationTimer = null;
    this.callHistory = []; // Real-time call history
    console.log("✅ Advanced Call UI initialized");
  }

  /**
   * Show incoming call modal
   */
  showIncomingCall(caller) {
    console.log("📞 Showing incoming call UI:", caller.name);

    const modalHTML = `
      <div id="rtcIncomingModal" class="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
        <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm mx-4 p-8 shadow-2xl animate-pulse">
          <!-- Avatar -->
          <div class="flex justify-center mb-6">
            <div class="relative">
              <img 
                src="${caller.avatar || `https://i.pravatar.cc/200?u=${caller.id}`}" 
                alt="${caller.name}"
                class="w-32 h-32 rounded-full border-4 border-green-500 object-cover"
                onerror="this.src='https://i.pravatar.cc/200?u=${caller.id}'"
              />
              <div class="absolute -bottom-2 -right-2 w-12 h-12 bg-green-500 rounded-full animate-bounce flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999.5.5 0 00-.5.5v4a3 3 0 01-3 3H7a4 4 0 01-4-4V8a5 5 0 110 10zm11-7a1 1 0 100-2 1 1 0 000 2z"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Caller Info -->
          <div class="text-center mb-8">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">${caller.name}</h2>
            <p class="text-gray-600 dark:text-gray-400 mb-4">
              ${caller.type === "audio" ? "📞 Voice Call" : "📹 Video Call"}
            </p>
            <div class="flex items-center justify-center gap-2">
              <div class="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Ringing...</p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-4 justify-center">
            <button 
              id="rtcAnswerBtn"
              onclick="window.advancedCallUI?.answerCall()"
              class="flex items-center justify-center gap-2 w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              title="Accept Call"
            >
              <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
              </svg>
            </button>
            <button 
              id="rtcRejectBtn"
              onclick="window.advancedCallUI?.rejectCall()"
              class="flex items-center justify-center gap-2 w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              title="Decline Call"
            >
              <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>

          <!-- Video Call Badge -->
          <div class="mt-6 text-center">
            <span class="inline-block px-4 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-semibold rounded-full">
              ${caller.type === "audio" ? "🎤 HIGH QUALITY AUDIO" : "📹 HD VIDEO CALL"}
            </span>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
    this.currentCallerId = caller.id;
  }

  /**
   * Show outgoing call modal
   */
  showOutgoingCall(callee) {
    console.log("📞 Showing outgoing call UI:", callee.name);

    const modalHTML = `
      <div id="rtcOutgoingModal" class="fixed inset-0 bg-gradient-to-br from-gray-900 to-black z-[9999] flex flex-col items-center justify-center">
        <!-- Animated Background -->
        <div class="absolute inset-0 opacity-10">
          <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl animate-pulse"></div>
          <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse"></div>
        </div>

        <!-- Content -->
        <div class="relative z-10 text-center">
          <!-- Avatar with Animation -->
          <div class="mb-8">
            <div class="relative w-40 h-40 mx-auto">
              <img 
                src="${callee.avatar || `https://i.pravatar.cc/200?u=${callee.id}`}" 
                alt="${callee.name}"
                class="w-full h-full rounded-full border-4 border-green-500 object-cover shadow-2xl"
                onerror="this.src='https://i.pravatar.cc/200?u=${callee.id}'"
              />
              <div class="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-75"></div>
            </div>
          </div>

          <!-- Callee Info -->
          <h2 class="text-4xl font-bold text-white mb-2">${callee.name}</h2>
          <p class="text-gray-300 mb-2">
            ${callee.type === "audio" ? "📞 Calling with Voice" : "📹 Calling with Video"}
          </p>

          <!-- Status -->
          <div class="flex items-center justify-center gap-3 mb-12">
            <div class="flex gap-1">
              <div class="w-2 h-2 bg-green-500 rounded-full animate-bounce" style="animation-delay: 0s"></div>
              <div class="w-2 h-2 bg-green-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
              <div class="w-2 h-2 bg-green-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            </div>
            <p id="rtcCallingStatus" class="text-lg text-gray-300 font-semibold">Calling...</p>
          </div>

          <!-- End Call Button -->
          <button 
            id="rtcEndCallBtn"
            onclick="window.advancedCallUI?.endCall()"
            class="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-2xl hover:shadow-2xl transition-all transform hover:scale-105 flex items-center justify-center"
            title="End Call"
          >
            <svg class="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>

          <!-- Call Info -->
          <div class="mt-12 text-xs text-gray-400">
            <p>Make sure microphone is enabled</p>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
  }

  /**
   * Show active call interface
   */
  showActiveCall(callInfo) {
    console.log("✅ Showing active call UI:", callInfo.recipientName);

    const html = `
      <div id="rtcActiveCallModal" class="fixed inset-0 bg-black z-[9999] flex flex-col">
        <!-- Video Area -->
        <div id="rtcVideoContainer" class="flex-1 relative bg-black overflow-hidden">
          <!-- Remote Video (Full Screen) -->
          <video 
            id="rtcRemoteVideo"
            autoplay
            muted
            playsinline
            class="w-full h-full object-cover bg-black"
          ></video>

          <!-- Local Video (PiP) -->
          <div id="rtcLocalVideoContainer" class="absolute bottom-4 right-4 w-32 h-40 bg-gray-800 rounded-lg border-2 border-white shadow-lg overflow-hidden">
            <video 
              id="rtcLocalVideo"
              autoplay
              muted
              playsinline
              class="w-full h-full object-cover"
            ></video>
          </div>

          <!-- Call Info Overlay -->
          <div class="absolute top-4 left-4 bg-black/70 px-4 py-3 rounded-2xl text-white z-10">
            <p class="font-bold text-lg">${callInfo.recipientName}</p>
            <p id="rtcCallTimer" class="text-sm text-gray-300 font-mono">00:00</p>
            <p class="text-xs text-green-400 mt-1">✓ Connected</p>
          </div>

          <!-- Connection Quality Indicator -->
          <div id="rtcQualityIndicator" class="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
            📡 Excellent
          </div>
        </div>

        <!-- Controls Bar -->
        <div class="bg-gray-900 px-4 py-6 flex justify-center items-center gap-6">
          <!-- Mute Audio -->
          <button 
            id="rtcMuteBtn"
            onclick="window.advancedCallUI?.toggleMute(this)"
            class="w-14 h-14 rounded-full bg-gray-800 hover:bg-gray-700 text-white transition-all transform hover:scale-110 flex items-center justify-center shadow-lg"
            title="Mute/Unmute"
          >
            <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 16a6 6 0 01-6-6v-1h2a4 4 0 004 4h4a4 4 0 004-4h2v1a6 6 0 01-6 6zM9 5a1 1 0 100-2 1 1 0 000 2zm2 0a1 1 0 100-2 1 1 0 000 2zm2 0a1 1 0 100-2 1 1 0 000 2z"/>
            </svg>
          </button>

          <!-- Toggle Video -->
          <button 
            id="rtcVideoBtn"
            onclick="window.advancedCallUI?.toggleVideo(this)"
            class="w-14 h-14 rounded-full bg-gray-800 hover:bg-gray-700 text-white transition-all transform hover:scale-110 flex items-center justify-center shadow-lg"
            title="Toggle Video"
          >
            <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.293-2.293a1 1 0 111.414 1.414L13.414 10l2.293 2.293a1 1 0 01-1.414 1.414L12 11.414l-2.293 2.293a1 1 0 01-1.414-1.414L10.586 10 8.293 7.707a1 1 0 011.414-1.414L10 8.586l2.293-2.293z"/>
            </svg>
          </button>

          <!-- Speaker Control -->
          <button 
            id="rtcSpeakerBtn"
            onclick="window.advancedCallUI?.toggleSpeaker(this)"
            class="w-14 h-14 rounded-full bg-gray-800 hover:bg-gray-700 text-white transition-all transform hover:scale-110 flex items-center justify-center shadow-lg"
            title="Speaker"
          >
            <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4a1 1 0 011.6-.8l4.8 3.6a1 1 0 01.6.8v4a1 1 0 01-.6.8l-4.8 3.6A1 1 0 019 16v-4a1 1 0 01-1-1V5a1 1 0 011-1zm3 6v2.5a.5.5 0 01-.854.354l-1.8-1.8-.646.646a.5.5 0 01-.854-.354V9.5a.5.5 0 01.854-.354l1.8 1.8.646-.646a.5.5 0 01.854.354z"/>
            </svg>
          </button>

          <!-- Chat (Optional) -->
          <button 
            id="rtcChatBtn"
            onclick="window.advancedCallUI?.toggleChat()"
            class="w-14 h-14 rounded-full bg-gray-800 hover:bg-gray-700 text-white transition-all transform hover:scale-110 flex items-center justify-center shadow-lg"
            title="In-Call Chat"
          >
            <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0L10 9.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>

          <!-- End Call (Red) -->
          <button 
            id="rtcEndActiveCallBtn"
            onclick="window.advancedCallUI?.endCall()"
            class="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all transform hover:scale-110 flex items-center justify-center shadow-2xl"
            title="End Call"
          >
            <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", html);
    this.callActive = true;
    this.callStartTime = Date.now();
    this.startCallTimer();
  }

  /**
   * Start call duration timer
   */
  startCallTimer() {
    if (this.durationTimer) clearInterval(this.durationTimer);

    this.durationTimer = setInterval(() => {
      if (this.callActive && this.callStartTime) {
        const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        const timerEl = document.getElementById("rtcCallTimer");
        if (timerEl) {
          timerEl.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
        }
      }
    }, 1000);
  }

  /**
   * Set local stream
   */
  setLocalStream(stream) {
    console.log("📹 Setting local stream");
    const videoEl = document.getElementById("rtcLocalVideo");
    if (videoEl && stream) {
      try {
        videoEl.srcObject = stream;

        // Log stream details
        const audioTracks = stream.getAudioTracks();
        const videoTracks = stream.getVideoTracks();
        console.log("✅ Local media captured:", {
          audio: audioTracks.length > 0,
          audioEnabled: audioTracks[0]?.enabled,
          video: videoTracks.length > 0,
          videoEnabled: videoTracks[0]?.enabled,
        });

        // Explicit play call with error handling
        videoEl
          .play()
          .then(() => {
            console.log("✅ Local video playing successfully");
          })
          .catch((err) => {
            console.error("❌ Error playing local video:", err);
          });

        // Log track events
        audioTracks.forEach((track) => {
          track.onended = () => console.log("🔊 Audio track ended");
        });
        videoTracks.forEach((track) => {
          track.onended = () => console.log("📹 Video track ended");
        });
      } catch (error) {
        console.error("❌ Error setting local stream:", error);
      }
    } else {
      console.warn("⚠️ Local video element not found or stream is null");
    }
  }

  /**
   * Set remote stream
   */
  setRemoteStream(stream) {
    console.log("📹 Setting remote stream");
    const videoEl = document.getElementById("rtcRemoteVideo");
    if (videoEl && stream) {
      try {
        videoEl.srcObject = stream;

        // Log stream details
        const audioTracks = stream.getAudioTracks();
        const videoTracks = stream.getVideoTracks();
        console.log("✅ Remote media received:", {
          audio: audioTracks.length > 0,
          audioEnabled: audioTracks[0]?.enabled,
          video: videoTracks.length > 0,
          videoEnabled: videoTracks[0]?.enabled,
        });

        videoEl.onloadedmetadata = () => {
          console.log("✅ Remote video metadata loaded");
        };

        // Explicit play call with error handling
        videoEl
          .play()
          .then(() => {
            console.log("✅ Remote video playing successfully");
          })
          .catch((err) => {
            console.error("❌ Error playing remote video:", err);
          });

        // Log track events
        audioTracks.forEach((track) => {
          track.onended = () => console.log("🔊 Remote audio track ended");
        });
        videoTracks.forEach((track) => {
          track.onended = () => console.log("📹 Remote video track ended");
        });
      } catch (error) {
        console.error("❌ Error setting remote stream:", error);
      }
    } else {
      console.warn("⚠️ Remote video element not found or stream is null");
    }
  }

  /**
   * Toggle mute
   */
  toggleMute(btn) {
    const isMuted = btn.classList.contains("muted");
    btn.classList.toggle("muted");
    btn.classList.toggle("bg-red-600", !isMuted);
    btn.classList.toggle("bg-gray-800", isMuted);

    if (window.advancedRtcManager) {
      window.advancedRtcManager.toggleAudio(isMuted);
    }
  }

  /**
   * Toggle video
   */
  toggleVideo(btn) {
    const isOff = btn.classList.contains("video-off");
    btn.classList.toggle("video-off");
    btn.classList.toggle("bg-red-600", !isOff);
    btn.classList.toggle("bg-gray-800", isOff);

    if (window.advancedRtcManager) {
      window.advancedRtcManager.toggleVideo(isOff);
    }
  }

  /**
   * Toggle speaker
   */
  toggleSpeaker(btn) {
    btn.classList.toggle("bg-blue-600");
    btn.classList.toggle("bg-gray-800");
  }

  /**
   * Toggle chat panel (placeholder)
   */
  toggleChat() {
    this.showNotification("Chat feature in-call");
  }

  /**
   * Answer call
   */
  answerCall() {
    console.log("📞 Answering call...");
    if (window.advancedRtcManager) {
      // Close modal immediately to free up browser resources
      this.closeIncomingModal();

      // Wait a tiny bit for modal DOM cleanup, then try to get media
      console.log("⏳ Waiting for DOM cleanup before requesting media...");
      setTimeout(async () => {
        try {
          console.log("🎤 Requesting media for call answer...");
          await window.advancedRtcManager.acceptCall("both");
          console.log("✅ Call answered successfully");
        } catch (error) {
          console.error("❌ Failed to accept call:", error.message);
          this.showError("Failed to accept: " + error.message);
        }
      }, 100);
    } else {
      console.error("❌ rtcManager not available");
      this.showError("Call system not initialized");
    }
  }

  /**
   * Reject call
   */
  rejectCall() {
    console.log("❌ Rejecting call...");
    if (window.advancedRtcManager) {
      window.advancedRtcManager.rejectCall();
      this.closeIncomingModal();
    }
  }

  /**
   * End call
   */
  endCall() {
    console.log("📴 Ending call...");
    this.stopCall();
    if (window.advancedRtcManager) {
      window.advancedRtcManager.endCall();
    }
  }

  /**
   * Stop call UI
   */
  stopCall() {
    if (this.durationTimer) clearInterval(this.durationTimer);
    this.callActive = false;

    const modal = document.getElementById("rtcActiveCallModal");
    if (modal) modal.remove();

    this.showNotification("Call ended");
  }

  /**
   * Close incoming modal
   */
  closeIncomingModal() {
    const modal = document.getElementById("rtcIncomingModal");
    if (modal) modal.remove();
  }

  /**
   * Close outgoing modal
   */
  closeOutgoingModal() {
    const modal = document.getElementById("rtcOutgoingModal");
    if (modal) modal.remove();
  }

  /**
   * Show error
   */
  showError(message) {
    console.error("❌", message);
    const notification = document.createElement("div");
    notification.className =
      "fixed top-6 right-6 bg-red-600 text-white px-6 py-3 rounded-lg shadow-xl z-[10000] animate-pulse";
    notification.textContent = `❌ ${message}`;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 4000);
  }

  /**
   * Show notification
   */
  showNotification(message) {
    console.log("ℹ️", message);
    const notification = document.createElement("div");
    notification.className =
      "fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl z-[10000]";
    notification.textContent = `✅ ${message}`;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
  }

  /**
   * Add call to history
   */
  addToCallHistory(callInfo) {
    if (!callInfo) return;

    const historyEntry = {
      id: Date.now(),
      contact: callInfo.recipientName || callInfo.callerName,
      contactId: callInfo.recipientId || callInfo.callerId,
      avatar: callInfo.recipientAvatar || callInfo.callerAvatar,
      type: callInfo.callType, // "audio" or "both"
      direction: callInfo.direction, // "incoming" or "outgoing"
      status: callInfo.status, // "completed", "rejected", "received", "answered", "missed"
      timestamp: new Date(callInfo.endTime || callInfo.startTime),
      duration: callInfo.endTime
        ? Math.floor((callInfo.endTime - callInfo.startTime) / 1000)
        : 0,
    };

    // Add to history (most recent first)
    this.callHistory.unshift(historyEntry);

    // Keep only last 50 calls
    if (this.callHistory.length > 50) {
      this.callHistory = this.callHistory.slice(0, 50);
    }

    // Store in localStorage for persistence
    try {
      localStorage.setItem("callHistory", JSON.stringify(this.callHistory));
    } catch (e) {
      console.warn("Could not save call history to localStorage", e);
    }

    console.log("📞 Call added to history:", historyEntry);
    console.log("📋 Total calls:", this.callHistory.length);
  }

  /**
   * Load call history from localStorage
   */
  loadCallHistory() {
    try {
      const saved = localStorage.getItem("callHistory");
      if (saved) {
        this.callHistory = JSON.parse(saved);
        console.log(
          "✅ Loaded call history:",
          this.callHistory.length,
          "calls",
        );
      }
    } catch (e) {
      console.warn("Could not load call history", e);
    }
  }

  /**
   * Get call history filtered
   */
  getCallHistory(filter = "all") {
    //"all", "incoming", "outgoing", "missed"
    if (filter === "all") return this.callHistory;
    if (filter === "missed") {
      return this.callHistory.filter(
        (c) => c.direction === "incoming" && c.status === "received",
      );
    }
    return this.callHistory.filter((c) => c.direction === filter);
  }

  /**
   * Show call history in modal
   */
  showCallHistory() {
    console.log("📋 Showing call history");

    // Load latest from storage
    this.loadCallHistory();

    const historyHTML = `
      <div id="rtcCallHistoryModal" class="fixed inset-0 bg-black/50 z-[9998] flex items-end justify-center">
        <div class="bg-white dark:bg-gray-900 w-full max-h-[80vh] rounded-t-3xl shadow-2xl flex flex-col">
          <!-- Header -->
          <div class="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-3xl flex justify-between items-center">
            <h2 class="text-2xl font-bold">📞 Call History</h2>
            <button 
              onclick="document.getElementById('rtcCallHistoryModal')?.remove()"
              class="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Call List -->
          <div class="flex-1 overflow-y-auto">
            ${
              this.callHistory.length === 0
                ? `
              <div class="p-8 text-center text-gray-500 dark:text-gray-400">
                <p>📱 No calls yet</p>
              </div>
            `
                : this.callHistory
                    .map(
                      (call) => `
              <div class="border-b border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-4 cursor-pointer" onclick="console.log('Call:', '${call.contact}')">
                <!-- Avatar -->
                <img 
                  src="${call.avatar || `https://i.pravatar.cc/80?u=${call.contactId}`}"
                  alt="${call.contact}"
                  class="w-12 h-12 rounded-full object-cover"
                  onerror="this.src='https://i.pravatar.cc/80?u=${call.contactId}'"
                />

                <!-- Info -->
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <p class="font-semibold text-gray-900 dark:text-white">${call.contact}</p>
                    <span class="text-xs px-2 py-1 rounded-full ${
                      call.status === "missed" ||
                      (call.status === "received" && call.duration === 0)
                        ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200"
                        : "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200"
                    }">
                      ${
                        call.status === "missed" ||
                        (call.status === "received" && call.duration === 0)
                          ? "Missed"
                          : call.status
                      }
                    </span>
                  </div>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    ${call.type === "audio" ? "📞 Voice" : "📹 Video"} • ${call.direction === "incoming" ? "📥 Incoming" : "📤 Outgoing"}
                  </p>
                </div>

                <!-- Duration/Time -->
                <div class="text-right">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">${this.formatDuration(call.duration)}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">${this.formatTime(call.timestamp)}</p>
                </div>
              </div>
            `,
                    )
                    .join("")
            }
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", historyHTML);
  }

  /**
   * Format call duration
   */
  formatDuration(seconds) {
    if (seconds === 0) return "0s";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  /**
   * Format time for display
   */
  formatTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(date).toLocaleDateString();
  }
}

// Initialize globally with comprehensive logging
console.log("📝 advancedCallUI.js script loaded, initializing...");
window.advancedCallUI = new AdvancedCallUI();
window.advancedCallUI.loadCallHistory(); // Load previous call history
console.log(
  "✅ Advanced Call UI initialized and available at window.advancedCallUI",
);
console.log("🔍 window.advancedCallUI object:", window.advancedCallUI);
