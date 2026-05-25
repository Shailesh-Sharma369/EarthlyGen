/**
 * 🎯 UNIVERSAL PROFILE PICTURE SYNC MODULE
 * ==========================================
 * Automatically syncs profile pictures across all pages in real-time.
 * Works with localStorage, Socket.IO, and custom events.
 *
 * Features:
 * - Real-time localStorage sync across tabs
 * - Socket.IO broadcast for multi-user updates
 * - Auto-update all profile picture elements
 * - Works without changing any Ruhi AI logic
 */

(function () {
  // Create a global namespace for profile sync
  window.ProfilePicSync = {
    // Store CSS selectors for all profile elements
    selectors: [
      "#profileImage",
      "#profile-summary-img",
      ".profile-pic",
      ".avatar-img",
      "[data-role='profile-avatar']",
      ".user-avatar",
      "[data-profile-pic]",
      ".message-avatar",
      ".chat-avatar",
      ".sidebar-avatar",
    ],

    /**
     * Update all profile pictures on current page
     * @param {string} userId - User ID
     * @param {string} photoUrl - New photo URL
     */
    updateAllProfilePics(userId, photoUrl) {
      if (!userId || !photoUrl) return;

      console.log(
        `🎯 ProfilePicSync: Updating profile pics for user ${userId}`,
      );

      // Update all known selectors
      this.selectors.forEach((selector) => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el) => {
            // Check if this element belongs to this user
            if (this._belongsToUser(el, userId)) {
              if (el.tagName === "IMG") {
                el.src = photoUrl;
                el.onerror = () => {
                  console.warn(`Failed to load profile pic: ${photoUrl}`);
                };
              } else if (el.style) {
                el.style.backgroundImage = `url(${photoUrl})`;
              }
              console.log(
                `✅ Updated profile pic: ${selector} for user ${userId}`,
              );
            }
          });
        } catch (err) {
          console.error(`Error updating selector ${selector}:`, err);
        }
      });

      // Also update in state if available (for social.html)
      if (window.state && window.state.users && window.state.users[userId]) {
        window.state.users[userId].avatar = photoUrl;
      }

      // Update current user state if it's the logged-in user
      if (window.state && window.state.me && window.state.me.id === userId) {
        window.state.me.avatar = photoUrl;
      }

      // Trigger re-render if available (for social.html)
      if (typeof window.renderAll === "function") {
        console.log("🔄 Triggering renderAll() for dynamic re-rendering...");
        setTimeout(() => {
          try {
            window.renderAll();
          } catch (err) {
            console.error("Error calling renderAll():", err);
          }
        }, 100);
      }
    },

    /**
     * Check if an element belongs to a specific user
     * @private
     */
    _belongsToUser(el, userId) {
      // Check data attributes
      if (el.dataset.userId === userId) return true;
      if (el.dataset.ownerId === userId) return true;
      if (el.dataset.userId === userId) return true;

      // Check parent containers for user info
      let parent = el.parentElement;
      while (parent && parent !== document.body) {
        if (
          parent.dataset.userId === userId ||
          parent.dataset.ownerId === userId
        ) {
          return true;
        }
        parent = parent.parentElement;
      }

      // If no data attributes, assume it's a general profile element
      // (could be the current user's profile)
      return true;
    },

    // Track which user profile is currently being viewed
    watchedProfileUserId: null,

    /**
     * Watch a specific user's profile (for profile page viewing)
     * @param {string} userId - User ID to watch
     */
    watchProfileUser(userId) {
      this.watchedProfileUserId = userId;
      console.log(`👁️ Now watching profile updates for user: ${userId}`);
    },

    /**
     * Stop watching profile user
     */
    stopWatchingProfile() {
      if (this.watchedProfileUserId) {
        console.log(
          `👁️ Stopped watching profile updates for user: ${this.watchedProfileUserId}`,
        );
        this.watchedProfileUserId = null;
      }
    },

    /**
     * Listen to localStorage changes (cross-tab sync)
     */
    listenToStorageChanges() {
      window.addEventListener("storage", (e) => {
        if (e.key && e.key.startsWith("profilePic_")) {
          const userId = e.key.replace("profilePic_", "");
          const photoUrl = e.newValue;

          if (photoUrl) {
            console.log(`📦 localStorage changed: ${e.key}`);
            this.updateAllProfilePics(userId, photoUrl);

            // If we're viewing this user's profile, trigger full page re-render
            if (this.watchedProfileUserId === userId) {
              console.log(
                `🎯 Watched user's profile pic updated! Re-rendering profile page...`,
              );
              if (
                window.state &&
                window.state.currentPage === "Profile" &&
                typeof window.renderAll === "function"
              ) {
                setTimeout(() => {
                  try {
                    window.renderAll();
                  } catch (err) {
                    console.error("Error re-rendering profile:", err);
                  }
                }, 150);
              }
            }
          }
        }
      });

      console.log("✅ Storage listener initialized");
    },

    /**
     * Listen to Socket.IO broadcasts (multi-user real-time)
     */
    listenToSocketIO() {
      if (typeof window.socket === "undefined") {
        console.warn(
          "⚠️ Socket.IO not loaded yet, waiting for initialization...",
        );
        // Retry after a delay
        setTimeout(() => this.listenToSocketIO(), 1000);
        return;
      }

      // Listen for profile photo updates from other users
      window.socket.on("profile-photo-updated", (data) => {
        console.log("📡 Socket.IO event received:", data);

        if (data.userId && data.photoUrl) {
          // Save to localStorage for persistence and cross-tab sync
          localStorage.setItem(`profilePic_${data.userId}`, data.photoUrl);

          // Update all profile pictures on this page
          this.updateAllProfilePics(data.userId, data.photoUrl);

          // If we're viewing this user's profile, trigger focused re-render
          if (this.watchedProfileUserId === data.userId) {
            console.log(
              `🎯🔴 Real-time: Watched user's profile pic updated! Re-rendering...`,
            );
            if (
              window.state &&
              window.state.currentPage === "Profile" &&
              typeof window.renderAll === "function"
            ) {
              setTimeout(() => {
                try {
                  window.renderAll();
                } catch (err) {
                  console.error("Error re-rendering profile:", err);
                }
              }, 100);
            }
          }
        }
      });

      // Listen for custom events (local page communication)
      window.addEventListener("profilePhotoUpdated", (e) => {
        if (e.detail && e.detail.photoUrl && e.detail.userId) {
          console.log("🎯 Custom event received:", e.detail);
          this.updateAllProfilePics(e.detail.userId, e.detail.photoUrl);
        }
      });

      console.log("✅ Socket.IO listener initialized");
    },

    /**
     * Sync profile pictures on page load
     */
    syncOnPageLoad() {
      console.log("🔄 Syncing profile pictures from localStorage...");

      // Get current user ID
      const userId = localStorage.getItem("userId");
      if (!userId) {
        console.warn("⚠️ No userId found in localStorage");
        return;
      }

      // Check for stored profile pictures
      const allKeys = Object.keys(localStorage);
      allKeys.forEach((key) => {
        if (key.startsWith("profilePic_")) {
          const storedUserId = key.replace("profilePic_", "");
          const photoUrl = localStorage.getItem(key);

          if (photoUrl) {
            this.updateAllProfilePics(storedUserId, photoUrl);
            console.log(`✅ Synced ${storedUserId}'s profile pic on page load`);
          }
        }
      });
    },

    /**
     * Initialize the profile picture sync system
     * Call this once on page load
     */
    init() {
      console.log("🚀 Initializing ProfilePicSync...");

      // Sync existing pictures from localStorage
      this.syncOnPageLoad();

      // Listen for localStorage changes (cross-tab)
      this.listenToStorageChanges();

      // Listen for Socket.IO broadcasts (multi-user)
      // We need to wait for socket to be ready
      if (window.socket && window.socket.connected) {
        this.listenToSocketIO();
      } else {
        // Wait for socket connection
        document.addEventListener("DOMContentLoaded", () => {
          setTimeout(() => this.listenToSocketIO(), 500);
        });

        // Also try on window load
        window.addEventListener("load", () => {
          if (window.socket) {
            this.listenToSocketIO();
          }
        });
      }

      console.log("✅ ProfilePicSync initialized successfully!");
    },
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      window.ProfilePicSync.init();
    });
  } else {
    // Already loaded
    window.ProfilePicSync.init();
  }
})();
