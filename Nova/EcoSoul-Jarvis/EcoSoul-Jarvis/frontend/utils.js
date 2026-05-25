/**
 * Utility Functions
 * Safe helpers for common operations
 */

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Create a safe text node (no HTML parsing)
 */
function createSafeTextElement(tag, text, className = '') {
  const element = document.createElement(tag);
  element.textContent = text; // Use textContent instead of innerHTML
  if (className) element.className = className;
  return element;
}

/**
 * Safely insert user-generated content
 * Use textContent instead of innerHTML
 */
function safeSetContent(element, text) {
  if (!element) return;
  element.textContent = text; // Safe - no HTML parsing
}

/**
 * Sanitize user input before display
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return escapeHtml(input).trim();
}

/**
 * Safe timestamp formatter
 */
function formatTimestamp(date) {
  if (!date) return 'Just now';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Safe JSON parse with error handling
 */
function safeJsonParse(jsonString, fallback = null) {
  try {
    return JSON.parse(jsonString);
  } catch {
    console.warn('Invalid JSON:', jsonString);
    return fallback;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escapeHtml,
    createSafeTextElement,
    safeSetContent,
    sanitizeInput,
    formatTimestamp,
    safeJsonParse
  };
}
