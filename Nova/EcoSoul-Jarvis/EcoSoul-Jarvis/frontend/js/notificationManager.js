// ============ NOTIFICATION SYSTEM ============

class NotificationManager {
  constructor(io, apiBaseUrl = "/api") {
    this.io = io;
    this.apiBaseUrl = apiBaseUrl;
    this.notifications = [];
    this.unreadCount = 0;
    this.isNotificationPanelOpen = false;
    this.init();
  }

  async init() {
    // Listen for real-time notifications
    if (this.io) {
      this.io.on("new-notification", (notification) => {
        console.log("📢 New notification received:", notification);
        this.addNotification(notification);
        this.showNotificationToast(notification);
        this.updateUnreadCount();
      });
    }

    // Load initial notifications
    await this.loadNotifications();
    this.updateUnreadCount();
  }

  async loadNotifications(page = 1, limit = 20) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${this.apiBaseUrl}/notifications?page=${page}&limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) throw new Error("Failed to load notifications");

      const data = await response.json();
      this.notifications = data.notifications || [];
      return data;
    } catch (error) {
      console.error("❌ Error loading notifications:", error);
      return null;
    }
  }

  async loadUnreadNotifications() {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${this.apiBaseUrl}/notifications/unread`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to load unread notifications");

      const data = await response.json();
      return data.unreadNotifications || [];
    } catch (error) {
      console.error("❌ Error loading unread notifications:", error);
      return [];
    }
  }

  async getUnreadCount() {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${this.apiBaseUrl}/notifications/unread-count`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) throw new Error("Failed to get unread count");

      const data = await response.json();
      this.unreadCount = data.unreadCount || 0;
      this.updateBadge();
      return this.unreadCount;
    } catch (error) {
      console.error("❌ Error getting unread count:", error);
      return 0;
    }
  }

  async markAsRead(notificationId) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${this.apiBaseUrl}/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) throw new Error("Failed to mark as read");

      this.updateUnreadCount();
      return await response.json();
    } catch (error) {
      console.error("❌ Error marking as read:", error);
    }
  }

  async markAllAsRead() {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${this.apiBaseUrl}/notifications/read-all`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) throw new Error("Failed to mark all as read");

      this.unreadCount = 0;
      this.updateBadge();
      this.renderNotificationList();
      return await response.json();
    } catch (error) {
      console.error("❌ Error marking all as read:", error);
    }
  }

  async deleteNotification(notificationId) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${this.apiBaseUrl}/notifications/${notificationId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) throw new Error("Failed to delete notification");

      this.notifications = this.notifications.filter(
        (n) => n._id !== notificationId,
      );
      this.updateUnreadCount();
      this.renderNotificationList();
      return await response.json();
    } catch (error) {
      console.error("❌ Error deleting notification:", error);
    }
  }

  async deleteAllNotifications() {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${this.apiBaseUrl}/notifications`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete all notifications");

      this.notifications = [];
      this.unreadCount = 0;
      this.updateBadge();
      this.renderNotificationList();
      return await response.json();
    } catch (error) {
      console.error("❌ Error deleting all notifications:", error);
    }
  }

  addNotification(notification) {
    this.notifications.unshift(notification);
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }
  }

  updateUnreadCount() {
    this.unreadCount = this.notifications.filter((n) => !n.isRead).length;
    this.updateBadge();
  }

  updateBadge() {
    const badge = document.querySelector("#notificationBadge");
    if (badge) {
      badge.textContent = this.unreadCount;
      badge.style.display = this.unreadCount > 0 ? "flex" : "none";
    }
  }

  getNotificationIcon(type) {
    const icons = {
      follow: "👥",
      follow_request: "📬",
      accept_follow: "✅",
      post_like: "❤️",
      post_comment: "💬",
      comment_like: "❤️",
      post_mention: "🔔",
      comment_mention: "🔔",
    };
    return icons[type] || "🔔";
  }

  getNotificationColor(type) {
    const colors = {
      follow: "bg-blue-50 border-blue-200",
      follow_request: "bg-purple-50 border-purple-200",
      accept_follow: "bg-green-50 border-green-200",
      post_like: "bg-red-50 border-red-200",
      post_comment: "bg-blue-50 border-blue-200",
      comment_like: "bg-red-50 border-red-200",
      post_mention: "bg-yellow-50 border-yellow-200",
      comment_mention: "bg-yellow-50 border-yellow-200",
    };
    return colors[type] || "bg-gray-50 border-gray-200";
  }

  showNotificationToast(notification) {
    const toast = document.createElement("div");
    toast.className =
      "fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-sm z-50 animate-slideIn";
    toast.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="text-2xl">${this.getNotificationIcon(notification.type)}</div>
        <div class="flex-1">
          <div class="font-semibold text-sm">${notification.title}</div>
          <div class="text-sm text-gray-600 mt-1">${notification.message}</div>
          <div class="text-xs text-gray-400 mt-2">${new Date().toLocaleTimeString()}</div>
        </div>
        <button class="text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  renderNotificationPanel() {
    const panel = document.querySelector("#notificationPanel");
    if (!panel) return;

    if (this.notifications.length === 0) {
      panel.innerHTML = `
        <div class="p-4 text-center text-gray-500">
          <div class="text-3xl mb-2">🔔</div>
          <div class="text-sm">No notifications yet</div>
        </div>
      `;
      return;
    }

    const grouped = this.groupNotificationsByDate();
    let html = `
      <div class="max-h-96 overflow-y-auto">
        ${Object.entries(grouped)
          .map(
            ([date, notifs]) => `
          <div class="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 sticky top-0">${date}</div>
          ${notifs
            .map(
              (n) => `
            <div class="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors" data-notification-id="${n._id}">
              <div class="flex items-start gap-3">
                <div class="text-lg">${this.getNotificationIcon(n.type)}</div>
                <div class="flex-1">
                  <div class="flex items-start justify-between">
                    <div>
                      <div class="font-semibold text-sm">${n.title}</div>
                      <div class="text-sm text-gray-600 mt-0.5">${n.message}</div>
                    </div>
                    <div class="flex items-center gap-1 ml-2">
                      ${!n.isRead ? '<div class="w-2 h-2 rounded-full bg-green-500"></div>' : ""}
                      <button class="text-gray-400 hover:text-gray-600 text-sm" data-action="deleteNotification" data-notif-id="${n._id}">×</button>
                    </div>
                  </div>
                  <div class="text-xs text-gray-400 mt-2">${this.formatTime(n.createdAt)}</div>
                </div>
              </div>
            </div>
          `,
            )
            .join("")}
        `,
          )
          .join("")}
      </div>
      <div class="px-4 py-3 border-t border-gray-200 flex gap-2">
        <button id="markAllReadBtn" class="flex-1 text-sm font-semibold text-green-600 hover:bg-green-50 py-2 rounded-lg transition-colors">Mark all as read</button>
        <button id="viewAllBtn" class="flex-1 text-sm font-semibold text-gray-600 hover:bg-gray-100 py-2 rounded-lg transition-colors">View all</button>
      </div>
    `;

    panel.innerHTML = html;

    // Attach event listeners
    panel
      .querySelectorAll("[data-action='deleteNotification']")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.deleteNotification(btn.dataset.notifId);
        });
      });

    panel.querySelector("#markAllReadBtn").addEventListener("click", () => {
      this.markAllAsRead();
    });

    panel.querySelector("#viewAllBtn").addEventListener("click", () => {
      if (window.state && window.state.currentPage !== "Notifications") {
        window.state.currentPage = "Notifications";
        if (window.renderAll) window.renderAll();
      }
      this.isNotificationPanelOpen = false;
      document.querySelector("#notificationDropdown").classList.add("hidden");
    });
  }

  renderNotificationList() {
    this.renderNotificationPanel();
  }

  groupNotificationsByDate() {
    const grouped = {};
    this.notifications.forEach((n) => {
      const date = this.formatDateGroup(n.createdAt);
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(n);
    });
    return grouped;
  }

  formatDateGroup(date) {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return "Today";
    } else if (d.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  }

  formatTime(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);

    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

    return d.toLocaleDateString();
  }

  toggleNotificationPanel() {
    const dropdown = document.querySelector("#notificationDropdown");
    this.isNotificationPanelOpen = !this.isNotificationPanelOpen;

    if (this.isNotificationPanelOpen) {
      dropdown.classList.remove("hidden");
      this.renderNotificationPanel();
      // Mark notifications as read when opened
      this.notifications.forEach((n) => {
        if (!n.isRead) {
          this.markAsRead(n._id);
        }
      });
    } else {
      dropdown.classList.add("hidden");
    }
  }

  getNotificationsView() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">Notifications</h1>
          <button id="clearAllNotifBtn" class="text-sm text-gray-600 hover:text-gray-900">Clear all</button>
        </div>

        ${
          this.notifications.length === 0
            ? `<div class="text-center py-12"><div class="text-4xl mb-4">🔔</div><div class="text-gray-500">No notifications yet</div></div>`
            : `<div class="space-y-2">${this.notifications
                .map(
                  (n) => `
          <div class="bg-white border ${this.getNotificationColor(n.type)} border rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div class="flex items-start gap-3">
              <div class="text-2xl flex-shrink-0">${this.getNotificationIcon(n.type)}</div>
              <div class="flex-1">
                <div class="flex items-start justify-between">
                  <div>
                    <div class="font-semibold text-sm">${n.title}</div>
                    <div class="text-sm text-gray-600 mt-0.5">${n.message}</div>
                    <div class="text-xs text-gray-400 mt-2">${this.formatTime(n.createdAt)}</div>
                  </div>
                  ${!n.isRead ? '<div class="w-3 h-3 rounded-full bg-green-500 flex-shrink-0 mt-1"></div>' : ""}
                </div>
              </div>
              <button class="text-gray-400 hover:text-gray-600 text-sm" data-action="deleteNotification" data-notif-id="${n._id}">×</button>
            </div>
          </div>
        `,
                )
                .join("")}</div>`
        }
      </div>
    `;
  }
}

// Export for use in social.html
window.NotificationManager = NotificationManager;
