/**
 * BrowserMonitoringService
 * 
 * Service giám sát hành vi của trình duyệt để phát hiện gian lận
 * 
 * FEATURES:
 * - Tab switching detection (HIGH severity)
 * - Fullscreen exit monitoring (MEDIUM severity)
 * - SMART Copy/Paste detection (differentiates internal vs external)
 *   • Internal paste (same page): ALLOWED, no violation
 *   • External paste (from outside): HIGH severity violation
 * - Keyboard shortcuts detection (DevTools, etc.)
 * - Right-click detection (LOW severity)
 * - DevTools detection (HIGH severity)
 * 
 * SMART COPY-PASTE DETECTION:
 * The service tracks copy operations and compares pasted content to determine
 * if it's from internal editing (allowed) or external source (violation).
 * This eliminates false positives for legitimate editing workflows.
 */

class BrowserMonitoringService {
  constructor() {
    this.violations = [];
    this.isMonitoring = false;
    this.isFullscreen = false;
    this.tabSwitchCount = 0;
    this.settings = {};
    this.callbacks = {
      onViolation: null,
      onTabSwitch: null,
      onFullscreenExit: null
    };
    
    // Smart Copy-Paste Detection
    this.lastCopiedText = null;           // Track last copied text
    this.lastCopiedFromInternal = false;  // Was it copied from our page?
    this.lastCopyTimestamp = null;        // When was it copied?
    this.copyExpiryTime = 60000;          // Copy expires after 60 seconds
    
    // Bind methods để giữ context
    this.handleTabSwitch = this.handleTabSwitch.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleFullscreenChange = this.handleFullscreenChange.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handlePaste = this.handlePaste.bind(this);
    this.handleCopy = this.handleCopy.bind(this);
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    
    // Stats
    this.stats = {
      tabSwitches: 0,
      copyAttempts: 0,
      pasteAttempts: 0,
      internalPastes: 0,        // Paste from internal copy
      externalPastes: 0,        // Paste from external source
      rightClicks: 0,
      devToolsAttempts: 0,
      fullscreenExits: 0
    };
  }

  /**
   * Bắt đầu giám sát browser events
   */
  startMonitoring(settings = {}) {
    if (this.isMonitoring) {
      console.warn('BrowserMonitoringService already monitoring');
      return;
    }

    this.settings = {
      // Default settings
      detectTabSwitch: true,
      detectFullscreenExit: true,
      detectCopyPaste: true,
      detectRightClick: true,
      detectDevTools: true,
      requireFullScreen: true,
      preventContextMenu: true,
      preventCopyPaste: true,
      ...settings
    };

    // 1. Tab switch / Window blur detection
    if (this.settings.detectTabSwitch) {
      window.addEventListener('blur', this.handleTabSwitch);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    // 2. Fullscreen detection
    if (this.settings.detectFullscreenExit || this.settings.requireFullScreen) {
      document.addEventListener('fullscreenchange', this.handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange);
      document.addEventListener('mozfullscreenchange', this.handleFullscreenChange);
      document.addEventListener('MSFullscreenChange', this.handleFullscreenChange);
    }

    // 3. Right-click detection
    if (this.settings.detectRightClick) {
      document.addEventListener('contextmenu', this.handleContextMenu);
    }

    // 4. Keyboard shortcuts detection
    if (this.settings.detectCopyPaste || this.settings.detectDevTools) {
      document.addEventListener('keydown', this.handleKeyDown);
    }

    // 5. Paste event detection
    if (this.settings.detectCopyPaste) {
      document.addEventListener('paste', this.handlePaste);
      document.addEventListener('copy', this.handleCopy);
      document.addEventListener('cut', this.handleCopy);
    }

    // 6. Before unload (detect page refresh/close)
    window.addEventListener('beforeunload', this.handleBeforeUnload);

    this.isMonitoring = true;
    console.log('✅ BrowserMonitoringService started');

    // NOTE: Fullscreen requires user gesture, don't auto-request
    // Call requestFullscreen() manually from a button click in the UI
  }

  /**
   * Handle tab switch (window blur)
   */
  handleTabSwitch() {
    this.tabSwitchCount++;
    this.stats.tabSwitches++;
    
    this.reportViolation({
      type: 'tab_switch',
      description: `Sinh viên đã chuyển tab/cửa sổ (lần ${this.tabSwitchCount})`,
      timestamp: new Date()
    });

    if (this.callbacks.onTabSwitch) {
      this.callbacks.onTabSwitch(this.tabSwitchCount);
    }
  }

  /**
   * Handle visibility change (tab hidden)
   */
  handleVisibilityChange() {
    if (document.hidden) {
      this.stats.tabSwitches++;
      
      this.reportViolation({
        type: 'tab_hidden',
        description: 'Tab bị ẩn hoặc minimize',
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle fullscreen change
   */
  handleFullscreenChange() {
    const isFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );

    this.isFullscreen = isFullscreen;

    if (!isFullscreen) {
      this.stats.fullscreenExits++;
      
      this.reportViolation({
        type: 'fullscreen_exit',
        description: 'Sinh viên thoát chế độ toàn màn hình',
        timestamp: new Date()
      });

      if (this.callbacks.onFullscreenExit) {
        this.callbacks.onFullscreenExit();
      }

      // NOTE: Don't auto re-request fullscreen
      // It requires user gesture and may annoy users
    }
  }

  /**
   * Handle context menu (right-click)
   */
  handleContextMenu(e) {
    this.stats.rightClicks++;
    
    this.reportViolation({
      type: 'right_click',
      description: 'Sinh viên click chuột phải',
      timestamp: new Date()
    });

    // Prevent context menu if setting enabled
    if (this.settings.preventContextMenu) {
      e.preventDefault();
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyDown(e) {
    const key = e.key.toLowerCase();
    const ctrlOrCmd = e.ctrlKey || e.metaKey;

    // NOTE: Copy/Paste shortcuts (Ctrl+C, Ctrl+V, Ctrl+X) are handled by
    // dedicated copy/paste event listeners to avoid duplicate violations.
    // Only track Ctrl+A (Select All) here as it doesn't have a dedicated event.
    if (ctrlOrCmd && key === 'a') {
      this.reportViolation({
        type: 'keyboard_shortcut',
        description: `Phát hiện phím tắt: ${e.ctrlKey ? 'Ctrl' : 'Cmd'}+A (Select All)`,
        timestamp: new Date()
      });

      // Note: Usually we don't prevent Ctrl+A as it's needed for text editing
      // if (this.settings.preventCopyPaste) {
      //   e.preventDefault();
      // }
    }

    // Detect F12 (DevTools)
    if (key === 'f12') {
      this.stats.devToolsAttempts++;
      
      this.reportViolation({
        type: 'devtools_attempt',
        description: 'Cố gắng mở Developer Tools (F12)',
        timestamp: new Date()
      });

      e.preventDefault();
    }

    // Detect Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools shortcuts)
    // Also detect Cmd+Option+I/J/C on macOS
    const isDevToolsShortcut = 
      (e.ctrlKey && e.shiftKey) ||  // Windows/Linux: Ctrl+Shift+I/J/C
      (e.metaKey && e.altKey);      // macOS: Cmd+Option+I/J/C
    
    if (isDevToolsShortcut && ['i', 'j', 'c'].includes(key)) {
      this.stats.devToolsAttempts++;
      
      // Determine which modifier was used for accurate description
      const modifierKey = e.metaKey ? 'Cmd+Option' : 'Ctrl+Shift';
      
      this.reportViolation({
        type: 'devtools_attempt',
        description: `Cố gắng mở Developer Tools (${modifierKey}+${key.toUpperCase()})`,
        timestamp: new Date()
      });

      e.preventDefault();
    }

    // Detect Ctrl+U (View Source)
    if (ctrlOrCmd && key === 'u') {
      this.reportViolation({
        type: 'devtools_attempt',
        description: 'Cố gắng xem mã nguồn trang (Ctrl+U)',
        timestamp: new Date()
      });

      e.preventDefault();
    }
  }

  /**
   * Handle paste event with smart detection
   * Differentiates between internal paste (from same page) and external paste (from outside)
   */
  handlePaste(e) {
    try {
      const pastedText = e.clipboardData.getData('text');
      
      if (!pastedText || pastedText.length === 0) {
        return; // Empty paste, ignore
      }
      
      this.stats.pasteAttempts++;
      
      // Check if this paste is from an internal copy
      const isInternalPaste = this.isInternalCopy(pastedText);
      
      if (isInternalPaste) {
        // ✅ INTERNAL PASTE - Student editing their own answer
        this.stats.internalPastes++;
        
        // Log for debugging but don't report as violation
        console.log(`✅ Internal paste detected (${pastedText.length} chars) - ALLOWED`);
        
        // Reset tracking after successful internal paste
        this.resetCopyTracking();
        
        // Allow the paste to proceed
        return;
      }
      
      // ❌ EXTERNAL PASTE - Potential cheating!
      this.stats.externalPastes++;
      
      // Determine description based on paste length
      let description = `Paste từ nguồn ngoài (${pastedText.length} ký tự)`;
      
      if (pastedText.length > 500) {
        // Large paste is more suspicious
        description = `Paste nội dung LỚN từ nguồn ngoài (${pastedText.length} ký tự) - Nghi ngờ sao chép từ tài liệu`;
      } else if (pastedText.length > 100) {
        description = `Paste nội dung từ nguồn ngoài (${pastedText.length} ký tự)`;
      }
      
      // Report as violation with evidence
      this.reportViolation({
        type: 'paste_detected',
        description: description,
        timestamp: new Date(),
        evidence: {
          length: pastedText.length,
          preview: pastedText.substring(0, 100) + (pastedText.length > 100 ? '...' : ''),
          source: 'external'
        }
      });
      
      console.warn(`⚠️ External paste detected (${pastedText.length} chars) - VIOLATION REPORTED`);
      
      // Prevent if setting enabled
      if (this.settings.preventCopyPaste) {
        e.preventDefault();
        console.log('🚫 External paste BLOCKED by preventCopyPaste setting');
      }
    } catch (error) {
      console.error('Error handling paste:', error);
    }
  }

  /**
   * Handle copy event with smart tracking
   * Tracks what is copied so we can differentiate internal vs external paste later
   */
  handleCopy(e) {
    try {
      this.stats.copyAttempts++;
      
      const isCut = e.type === 'cut';
      
      // Get the copied/cut text
      const selection = window.getSelection();
      const copiedText = selection ? selection.toString() : '';
      
      // Track this as internal copy
      this.lastCopiedText = copiedText;
      this.lastCopiedFromInternal = true;
      this.lastCopyTimestamp = Date.now();
      
      // Log for debugging
      console.log(`📋 ${isCut ? 'Cut' : 'Copy'} detected: ${copiedText.length} chars (tracked as internal)`);
      
      // Only report as violation if copying large amounts of text
      // Small copies are normal editing behavior
      if (copiedText.length > 500) {
        this.reportViolation({
          type: isCut ? 'cut_detected' : 'copy_detected',
          description: `${isCut ? 'Cut' : 'Copy'} nội dung lớn (${copiedText.length} ký tự)`,
          timestamp: new Date(),
          evidence: {
            length: copiedText.length,
            preview: copiedText.substring(0, 100) + '...'
          }
        });
      }
      
      // Note: We don't prevent copy/cut as it's needed for normal editing
      // Only external paste will be blocked
      if (this.settings.preventCopyPaste && copiedText.length > 500) {
        // Only prevent very large copies (suspicious behavior)
        e.preventDefault();
        console.log('🚫 Large copy BLOCKED by preventCopyPaste setting');
      }
    } catch (error) {
      console.error('Error handling copy:', error);
    }
  }

  /**
   * Handle before unload (page refresh/close)
   */
  handleBeforeUnload(e) {
    if (this.isMonitoring) {
      const message = 'Bạn đang làm bài thi. Bạn có chắc muốn rời khỏi trang?';
      e.preventDefault();
      e.returnValue = message;
      return message;
    }
  }

  /**
   * Request fullscreen
   * NOTE: Must be called from user interaction (button click, etc)
   * @returns {Promise<void>}
   */
  async requestFullscreen() {
    const elem = document.documentElement;
    
    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        await elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
      
      console.log('✅ Entered fullscreen');
    } catch (error) {
      console.warn('⚠️ Could not enter fullscreen:', error.message);
      // Don't throw error, just log it
      // Some browsers/contexts don't allow fullscreen
    }
  }

  /**
   * Exit fullscreen
   */
  exitFullscreen() {
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      
      console.log('Exited fullscreen');
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
    }
  }

  /**
   * Check if pasted text is from internal copy
   * @param {string} pastedText - The text that was pasted
   * @returns {boolean} - True if paste is from internal copy
   */
  isInternalCopy(pastedText) {
    // No previous copy tracked
    if (!this.lastCopiedText || !this.lastCopiedFromInternal) {
      return false;
    }
    
    // Check if copy has expired (after 60 seconds, assume new copy)
    const now = Date.now();
    const copyAge = now - (this.lastCopyTimestamp || 0);
    
    if (copyAge > this.copyExpiryTime) {
      console.log('⏰ Copy tracking expired (>60s), treating as external');
      return false;
    }
    
    // Normalize both texts for comparison
    const normalizedCopy = this.normalizeText(this.lastCopiedText);
    const normalizedPaste = this.normalizeText(pastedText);
    
    // Check for exact match
    if (normalizedCopy === normalizedPaste) {
      return true;
    }
    
    // Check if paste is a substring of copy (partial paste)
    // This handles cases where user copies a lot but only pastes part of it
    if (normalizedCopy.includes(normalizedPaste) || normalizedPaste.includes(normalizedCopy)) {
      return true;
    }
    
    // Check similarity for minor differences (whitespace, etc.)
    const similarity = this.calculateTextSimilarity(normalizedCopy, normalizedPaste);
    
    // If similarity is > 90%, consider it internal
    if (similarity > 0.9) {
      console.log(`📊 Text similarity: ${(similarity * 100).toFixed(1)}% - treating as internal`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Normalize text for comparison
   * Removes extra whitespace, converts to lowercase
   * @param {string} text - Text to normalize
   * @returns {string} - Normalized text
   */
  normalizeText(text) {
    if (!text) return '';
    
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
      .replace(/\n+/g, '\n');    // Replace multiple newlines with single newline
  }
  
  /**
   * Calculate similarity between two texts using Levenshtein distance
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @returns {number} - Similarity score (0-1, where 1 is identical)
   */
  calculateTextSimilarity(text1, text2) {
    if (text1 === text2) return 1;
    if (!text1 || !text2) return 0;
    
    const len1 = text1.length;
    const len2 = text2.length;
    const maxLen = Math.max(len1, len2);
    
    if (maxLen === 0) return 1;
    
    // Use simple character match ratio for performance
    // For large texts, comparing every character is expensive
    if (maxLen > 1000) {
      // For large texts, sample characters
      const sampleSize = Math.min(500, maxLen);
      let matches = 0;
      
      for (let i = 0; i < sampleSize; i++) {
        const idx = Math.floor((i / sampleSize) * len1);
        const idx2 = Math.floor((i / sampleSize) * len2);
        
        if (text1[idx] === text2[idx2]) {
          matches++;
        }
      }
      
      return matches / sampleSize;
    }
    
    // For smaller texts, use Levenshtein distance
    const distance = this.levenshteinDistance(text1, text2);
    return 1 - (distance / maxLen);
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Edit distance
   */
  levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];
    
    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    return matrix[len1][len2];
  }
  
  /**
   * Reset copy tracking
   * Called after successful internal paste
   */
  resetCopyTracking() {
    this.lastCopiedText = null;
    this.lastCopiedFromInternal = false;
    this.lastCopyTimestamp = null;
  }

  /**
   * Report violation
   */
  reportViolation(violation) {
    this.violations.push(violation);

    if (this.callbacks.onViolation) {
      this.callbacks.onViolation(violation);
    }

    console.log(`🚨 Browser violation: ${violation.type} (${violation.severity})`);
  }

  /**
   * Set callbacks
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Get violations
   */
  getViolations() {
    return this.violations;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalViolations: this.violations.length,
      isFullscreen: this.isFullscreen,
      isMonitoring: this.isMonitoring
    };
  }

  /**
   * Clear violations
   */
  clearViolations() {
    this.violations = [];
    this.tabSwitchCount = 0;
  }

  /**
   * Update settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    console.log('Browser monitoring settings updated:', this.settings);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    // Remove all event listeners
    window.removeEventListener('blur', this.handleTabSwitch);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('MSFullscreenChange', this.handleFullscreenChange);
    document.removeEventListener('contextmenu', this.handleContextMenu);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('paste', this.handlePaste);
    document.removeEventListener('copy', this.handleCopy);
    document.removeEventListener('cut', this.handleCopy);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);

    // Exit fullscreen if in fullscreen
    if (this.isFullscreen) {
      this.exitFullscreen();
    }

    this.isMonitoring = false;
    console.log('✅ BrowserMonitoringService stopped');
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.stopMonitoring();
    this.violations = [];
    
    // Reset copy tracking
    this.resetCopyTracking();
    
    // Reset stats
    this.stats = {
      tabSwitches: 0,
      copyAttempts: 0,
      pasteAttempts: 0,
      internalPastes: 0,
      externalPastes: 0,
      rightClicks: 0,
      devToolsAttempts: 0,
      fullscreenExits: 0
    };
    
    console.log('✅ BrowserMonitoringService cleaned up');
  }
}

export default BrowserMonitoringService;

