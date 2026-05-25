/**
 * Advanced WebRTC Call Manager - Production Ready
 * Real-time video/voice calling like WhatsApp
 */

class AdvancedRTCManager {
  constructor(socket, userId, userName) {
    this.socket = socket;
    this.userId = userId;
    this.userName = userName;

    // Connection state
    this.peerConnections = {};
    this.localStream = null;
    this.remoteStreams = {};
    this.activeCallState = null;
    this.lastCallInfo = null;

    // Audio/Video tracks
    this.audioEnabled = true;
    this.videoEnabled = true;

    // Configuration
    this.config = {
      iceServers: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ],
      },
      sdpConstraints: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      },
    };

    this.setupSocketEvents();
    console.log(
      "✅ Advanced RTC Manager initialized for user:",
      userName,
      "ID:",
      userId,
    );
  }

  setupSocketEvents() {
    // Incoming call
    this.socket.on("rtc:incoming-call", (data) => {
      console.log(
        "📞 INCOMING CALL from",
        data.callerName,
        "Type:",
        data.callType,
        "Data:",
        data,
      );
      console.log("🔍 Checking advancedCallUI:", !!window.advancedCallUI);
      this.handleIncomingCall(data);
    });

    // Call accepted
    this.socket.on("rtc:call-accepted", (data) => {
      console.log("✅ Call accepted by", data.receiverName);
      this.handleCallAccepted(data);
    });

    // Call rejected
    this.socket.on("rtc:call-rejected", (data) => {
      console.log("❌ Call rejected:", data.reason);
      this.handleCallRejected(data);
    });

    // ICE candidates
    this.socket.on("rtc:ice-candidate", (data) => {
      this.handleIceCandidate(data);
    });

    // SDP Answer
    this.socket.on("rtc:answer", (data) => {
      console.log("📥 Received SDP answer");
      this.handleAnswer(data);
    });

    // Call ended
    this.socket.on("rtc:call-ended", (data) => {
      console.log("📴 Call ended by", data.enderId);
      this.handleCallEnded(data);
    });

    // Call busy
    this.socket.on("rtc:call-busy", (data) => {
      console.log("📵 User busy:", data.reason);
      this.handleCallBusy(data);
    });
  }

  /**
   * Initiate outgoing call
   */
  async initiateCall(recipientId, recipientName, callType = "both") {
    try {
      if (this.activeCallState) {
        throw new Error("Already in a call");
      }

      console.log(
        `📞 Initiating ${callType} call to ${recipientName} (${recipientId})`,
      );

      // Get media constraints with proper audio configuration
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: callType !== "audio" ? { width: 1280, height: 720 } : false,
      };

      // Request media with error handling
      console.log("🎤 Requesting media devices...");
      try {
        this.localStream =
          await navigator.mediaDevices.getUserMedia(constraints);
        console.log("✅ Local media captured:", {
          audio: this.localStream.getAudioTracks().length > 0,
          video: this.localStream.getVideoTracks().length > 0,
        });
      } catch (mediaError) {
        console.error("❌ Media error:", mediaError.name, mediaError.message);

        // If video fails, try audio only
        if (mediaError.name === "NotReadableError" && callType === "both") {
          console.warn("⚠️ Video device in use, trying audio only...");
          const audioOnly = {
            audio: true,
            video: false,
          };
          this.localStream =
            await navigator.mediaDevices.getUserMedia(audioOnly);
          console.log("✅ Audio-only stream captured");
        } else {
          throw mediaError;
        }
      }

      // Trigger local stream event
      if (window.advancedCallUI) {
        window.advancedCallUI.setLocalStream(this.localStream);
      }

      // Create peer connection
      const peerConnection = this.createPeerConnection(recipientId);

      // Add tracks
      this.localStream.getTracks().forEach((track) => {
        console.log(
          "➕ Adding track to peer connection:",
          track.kind,
          track.enabled,
        );
        peerConnection.addTrack(track, this.localStream);
      });

      // Create and send offer
      const offer = await peerConnection.createOffer(
        this.config.sdpConstraints,
      );
      await peerConnection.setLocalDescription(offer);

      // Set call state
      this.activeCallState = {
        recipientId,
        recipientName,
        callType,
        direction: "outgoing",
        startTime: Date.now(),
        status: "ringing",
      };

      // Get recipient avatar from state if available
      let recipientAvatar = null;
      if (
        typeof state !== "undefined" &&
        state.users &&
        state.users[recipientId]
      ) {
        recipientAvatar =
          state.users[recipientId].avatar ||
          state.users[recipientId].profilePic;
      }

      // Get caller avatar for showing on recipient side
      let callerAvatar = null;
      if (
        typeof state !== "undefined" &&
        state.users &&
        state.users[this.userId]
      ) {
        callerAvatar =
          state.users[this.userId].avatar ||
          state.users[this.userId].profilePic;
      }

      console.log("📤 Sending call request with offer...", {
        recipientId,
        recipientName,
        callerId: this.userId,
        callerName: this.userName,
        callType,
        callerAvatar: callerAvatar ? "✅ included" : "❌ not found",
        recipientAvatar: recipientAvatar ? "✅ found" : "❌ not found",
        offerLength: offer.sdp.length,
      });

      this.socket.emit("rtc:initiate-call", {
        recipientId,
        recipientName,
        callerId: this.userId,
        callerName: this.userName,
        callType,
        offer: offer.sdp,
        callerAvatar, // 🔧 FIX: Pass avatar through socket
      });

      // Store call info for history
      this.lastCallInfo = {
        recipientId,
        recipientName,
        recipientAvatar,
        callType,
        direction: "outgoing",
        startTime: Date.now(),
        status: "initiated",
      };

      window.advancedCallUI?.showOutgoingCall({
        name: recipientName,
        id: recipientId,
        type: callType,
        avatar: recipientAvatar,
      });
    } catch (error) {
      console.error("❌ Error initiating call:", error);
      this.cleanup();
      if (window.advancedCallUI) {
        window.advancedCallUI.showError(error.message);
      }
      throw error;
    }
  }

  /**
   * Handle incoming call
   */
  async handleIncomingCall(data) {
    try {
      console.log("✅ handleIncomingCall called with data:", data);

      if (this.activeCallState) {
        console.warn("⚠️ Already in a call, rejecting incoming call");
        this.socket.emit("rtc:reject-call", {
          recipientId: data.callerId,
          reason: "User already in call",
        });
        return;
      }

      this.activeCallState = {
        callerId: data.callerId,
        callerName: data.callerName,
        callType: data.callType,
        direction: "incoming",
        offerSdp: data.offer,
        status: "ringing",
      };

      // Store incoming call for history (as "received")
      this.lastCallInfo = {
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        callType: data.callType,
        direction: "incoming",
        startTime: Date.now(),
        status: "received", // Will be updated to "answered" or "missed" later
      };

      console.log("🎯 activeCallState set:", this.activeCallState);

      // Wait for UI to be available (with timeout)
      let attempts = 0;
      while (!window.advancedCallUI && attempts < 50) {
        console.warn("⏳ Waiting for advancedCallUI... attempt", attempts + 1);
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.advancedCallUI) {
        console.error(
          "❌ advancedCallUI not available after 5000ms, showing alert",
        );
        alert(`📞 Incoming call from ${data.callerName}! Click OK to answer.`);
        return;
      }

      console.log("✅ advancedCallUI available, showing incoming call");

      // Show incoming call UI
      window.advancedCallUI.showIncomingCall({
        name: data.callerName,
        id: data.callerId,
        type: data.callType,
        avatar: data.callerAvatar,
      });

      console.log("✅ Incoming call UI displayed successfully");
    } catch (error) {
      console.error("❌ Error handling incoming call:", error);
      alert(`Call Error: ${error.message}`);
    }
  }

  /**
   * Accept incoming call
   */
  async acceptCall(callType = "both") {
    try {
      if (
        !this.activeCallState ||
        this.activeCallState.direction !== "incoming"
      ) {
        throw new Error("No incoming call to accept");
      }

      console.log("📞 Accepting call from", this.activeCallState.callerName);

      // Check if we already have local stream
      if (this.localStream) {
        console.log("⏳ Reusing existing local stream");
      } else {
        console.log("🎤 Requesting media devices...");

        // Get media with error handling and proper audio configuration
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: callType !== "audio" ? { width: 1280, height: 720 } : false,
        };

        try {
          this.localStream =
            await navigator.mediaDevices.getUserMedia(constraints);
          console.log("✅ Local media captured for answer");
        } catch (mediaError) {
          console.error("❌ Media error:", mediaError.name, mediaError.message);

          // If video fails, try audio only
          if (mediaError.name === "NotReadableError" && callType === "both") {
            console.warn("⚠️ Video device in use, trying audio only...");
            const audioOnly = {
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
              video: false,
            };
            this.localStream =
              await navigator.mediaDevices.getUserMedia(audioOnly);
            console.log("✅ Audio-only stream captured");
          } else {
            throw mediaError;
          }
        }
      }

      if (window.advancedCallUI) {
        window.advancedCallUI.setLocalStream(this.localStream);
      }

      // Create peer connection
      const peerConnection = this.createPeerConnection(
        this.activeCallState.callerId,
      );

      // Add tracks
      this.localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, this.localStream);
      });

      // Set remote offer and create answer
      const offer = new RTCSessionDescription({
        type: "offer",
        sdp: this.activeCallState.offerSdp,
      });

      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer(
        this.config.sdpConstraints,
      );
      await peerConnection.setLocalDescription(answer);

      // Update state
      this.activeCallState.status = "connected";

      // Get receiver avatar to send back to caller
      let receiverAvatar = null;
      if (
        typeof state !== "undefined" &&
        state.users &&
        state.users[this.userId]
      ) {
        receiverAvatar =
          state.users[this.userId].avatar ||
          state.users[this.userId].profilePic;
      }

      // Send answer with avatar info
      console.log("📤 Sending call answer...", {
        callerId: this.activeCallState.callerId,
        receiverId: this.userId,
        receiverName: this.userName,
        receiverAvatar: receiverAvatar ? "✅ included" : "❌ not found",
        answerLength: answer.sdp.length,
      });

      this.socket.emit("rtc:accept-call", {
        callerId: this.activeCallState.callerId,
        receiverId: this.userId,
        receiverName: this.userName,
        answer: answer.sdp,
        receiverAvatar, // 🔧 FIX: Pass receiver avatar to caller
      });

      // Close incoming call modal
      window.advancedCallUI?.closeIncomingModal();

      // Get caller avatar
      let callerAvatar = null;
      if (
        typeof state !== "undefined" &&
        state.users &&
        state.users[this.activeCallState.callerId]
      ) {
        callerAvatar =
          state.users[this.activeCallState.callerId].avatar ||
          state.users[this.activeCallState.callerId].profilePic;
      }

      // Store call info for history
      this.lastCallInfo = {
        callerId: this.activeCallState.callerId,
        callerName: this.activeCallState.callerName,
        callerAvatar,
        callType: this.activeCallState.callType,
        direction: "incoming",
        startTime: Date.now(),
        status: "answered",
      };

      // Show active call
      window.advancedCallUI?.showActiveCall({
        recipientName: this.activeCallState.callerName,
        recipientId: this.activeCallState.callerId,
        type: callType,
        avatar: callerAvatar,
      });
    } catch (error) {
      console.error("❌ Error accepting call:", error);
      window.advancedCallUI?.showError(
        "Failed to accept call: " + error.message,
      );
      this.cleanup();
    }
  }

  /**
   * Reject call
   */
  rejectCall() {
    try {
      if (this.activeCallState?.direction === "incoming") {
        console.log("❌ Rejecting call from", this.activeCallState.callerName);
        this.socket.emit("rtc:reject-call", {
          recipientId: this.activeCallState.callerId,
          reason: "User declined",
        });
        this.cleanup();
      }
    } catch (error) {
      console.error("Error rejecting call:", error);
    }
  }

  /**
   * Handle call accepted
   */
  async handleCallAccepted(data) {
    try {
      console.log("✅ Handling call accepted with data:", {
        receiverId: data.receiverId,
        receiverName: data.receiverName,
        receiverAvatar: data.receiverAvatar ? "✅ received" : "❌ not in data",
        answerLength: data.answer?.length || 0,
      });

      const peerId = data.receiverId;
      const peerConnection = this.peerConnections[peerId];

      if (!peerConnection) {
        throw new Error("Peer connection not found");
      }

      // Set remote answer
      const answer = new RTCSessionDescription({
        type: "answer",
        sdp: data.answer,
      });

      await peerConnection.setRemoteDescription(answer);
      console.log("✅ Remote answer set");
      this.activeCallState.status = "connected";

      // Close outgoing call modal
      window.advancedCallUI?.closeOutgoingModal();

      // Update call history
      if (this.lastCallInfo) {
        this.lastCallInfo.status = "answered";
        this.lastCallInfo.answeredTime = Date.now();
        if (data.receiverAvatar) {
          this.lastCallInfo.recipientAvatar = data.receiverAvatar;
        }
      }

      // Show active call UI with receiver avatar
      window.advancedCallUI?.showActiveCall({
        recipientName: data.receiverName,
        recipientId: peerId,
        type: this.activeCallState.callType,
        avatar: data.receiverAvatar, // 🔧 Show receiver avatar
      });

      console.log("✅ Call connection established and UI updated");
    } catch (error) {
      console.error("❌ Error handling call accepted:", error);
    }
  }

  /**
   * Handle call rejected
   */
  handleCallRejected(data) {
    console.log("❌ Call rejected:", data.reason);

    // Log to call history
    if (this.lastCallInfo) {
      this.lastCallInfo.status = "rejected";
      this.lastCallInfo.endTime = Date.now();
      window.advancedCallUI?.addToCallHistory(this.lastCallInfo);
    }

    window.advancedCallUI?.closeOutgoingModal();
    window.advancedCallUI?.showError(data.reason || "Call rejected");
    this.cleanup();
  }

  /**
   * Handle call ended
   */
  handleCallEnded(data) {
    console.log("📴 Call ended");

    // Close outgoing modal if still open
    window.advancedCallUI?.closeOutgoingModal();

    // Log to call history
    if (this.lastCallInfo) {
      this.lastCallInfo.status = "completed";
      this.lastCallInfo.endTime = Date.now();
      window.advancedCallUI?.addToCallHistory(this.lastCallInfo);
    }

    window.advancedCallUI?.stopCall();
    this.cleanup();
  }

  /**
   * Handle call busy
   */
  handleCallBusy(data) {
    console.log("📵 User busy:", data.reason);
    window.advancedCallUI?.showError("User is busy");
    this.cleanup();
  }

  /**
   * Handle ICE candidate
   */
  async handleIceCandidate(data) {
    try {
      const peerConnection = this.peerConnections[data.from];
      if (peerConnection && data.candidate) {
        const candidate = new RTCIceCandidate(JSON.parse(data.candidate));
        await peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }

  /**
   * Handle SDP answer
   */
  async handleAnswer(data) {
    try {
      const peerConnection = this.peerConnections[data.from];
      if (peerConnection) {
        const answer = new RTCSessionDescription({
          type: "answer",
          sdp: data.answer,
        });
        await peerConnection.setRemoteDescription(answer);
      }
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  }

  /**
   * Create peer connection
   */
  createPeerConnection(peerId) {
    console.log("🔗 Creating peer connection with:", peerId);

    const peerConnection = new RTCPeerConnection(this.config.iceServers);

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("🧊 New ICE candidate");
        this.socket.emit("rtc:ice-candidate", {
          to: peerId,
          from: this.userId,
          candidate: JSON.stringify(event.candidate),
        });
      }
    };

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log(
        "📹 Remote track received:",
        event.track.kind,
        "Streams:",
        event.streams.length,
      );
      if (event.streams && event.streams[0]) {
        this.remoteStreams[peerId] = event.streams[0];
        if (window.advancedCallUI) {
          window.advancedCallUI.setRemoteStream(event.streams[0]);
        }
      }
    };

    // Connection state
    peerConnection.onconnectionstatechange = () => {
      console.log("🔗 Connection state:", peerConnection.connectionState);
      if (peerConnection.connectionState === "failed") {
        console.error("❌ Connection failed");
        window.advancedCallUI?.showError("Connection failed");
      }
    };

    // ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
      console.log(
        "❄️ ICE connection state:",
        peerConnection.iceConnectionState,
      );
    };

    this.peerConnections[peerId] = peerConnection;
    return peerConnection;
  }

  /**
   * End call
   */
  endCall() {
    try {
      console.log("📴 Ending call...");

      // Notify peer
      if (this.activeCallState?.recipientId) {
        this.socket.emit("rtc:end-call", {
          recipientId: this.activeCallState.recipientId,
        });
      } else if (this.activeCallState?.callerId) {
        this.socket.emit("rtc:end-call", {
          recipientId: this.activeCallState.callerId,
        });
      }

      this.cleanup();
      window.advancedCallUI?.stopCall();
    } catch (error) {
      console.error("Error ending call:", error);
    }
  }

  /**
   * Toggle audio
   */
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
      this.audioEnabled = enabled;
      console.log("🔊 Audio:", enabled ? "ON" : "OFF");
    }
  }

  /**
   * Toggle video
   */
  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
      this.videoEnabled = enabled;
      console.log("📹 Video:", enabled ? "ON" : "OFF");
    }
  }

  /**
   * Get call duration
   */
  getCallDuration() {
    if (this.activeCallState?.startTime) {
      return Math.floor((Date.now() - this.activeCallState.startTime) / 1000);
    }
    return 0;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    try {
      console.log("🧹 Starting cleanup...");

      // Stop local stream
      if (this.localStream) {
        console.log(
          `📹 Stopping ${this.localStream.getTracks().length} media tracks`,
        );
        this.localStream.getTracks().forEach((track) => {
          console.log(`⏹️ Stopping ${track.kind} track`);
          track.stop();
        });
        this.localStream = null;
      }

      // Close peer connections
      const pcCount = Object.keys(this.peerConnections).length;
      if (pcCount > 0) {
        console.log(`🔓 Closing ${pcCount} peer connection(s)`);
        Object.keys(this.peerConnections).forEach((peerId) => {
          const pc = this.peerConnections[peerId];
          if (pc) {
            pc.close();
          }
        });
      }

      this.peerConnections = {};
      this.remoteStreams = {};
      this.activeCallState = null;
      this.lastCallInfo = null;
      this.audioEnabled = true;
      this.videoEnabled = true;

      console.log("✅ Resources cleaned up, media devices released");
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }
}

// Global export
window.AdvancedRTCManager = AdvancedRTCManager;
console.log("✅ Advanced RTC Manager script loaded");
