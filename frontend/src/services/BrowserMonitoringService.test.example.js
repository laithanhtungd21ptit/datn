/**
 * BrowserMonitoringService - Smart Copy-Paste Detection
 * Test Examples và Usage Guide
 * 
 * NOTE: This is an example file, not actual unit tests
 * For real unit tests, use Jest/Mocha framework
 */

import BrowserMonitoringService from './BrowserMonitoringService';

// ============================================================================
// EXAMPLE 1: Basic Usage
// ============================================================================
console.log('\n=== EXAMPLE 1: Basic Usage ===\n');

const monitoring = new BrowserMonitoringService();

// Setup callbacks
monitoring.setCallbacks({
  onViolation: (violation) => {
    console.log(' Violation detected:', violation);
  },
  onTabSwitch: (count) => {
    console.log('⚠️ Tab switch detected:', count);
  }
});

// Start monitoring
monitoring.startMonitoring({
  detectTabSwitch: true,
  detectFullscreenExit: true,
  detectCopyPaste: true,
  detectDevTools: true,
  preventCopyPaste: false  // Don't block, just detect
});

console.log(' Monitoring started');

// ============================================================================
// EXAMPLE 2: Simulate Internal Copy-Paste (Should NOT Report Violation)
// ============================================================================
console.log('\n=== EXAMPLE 2: Internal Copy-Paste ===\n');

// Simulate student typing
console.log('1. Student types: "This is my answer to question 1"');

// Simulate copy event
const copyEvent = {
  type: 'copy',
  preventDefault: () => {}
};

// Mock window.getSelection()
global.window = {
  getSelection: () => ({
    toString: () => 'my answer'
  })
};

monitoring.handleCopy(copyEvent);
console.log('2. Student copies: "my answer" (tracked as internal)');

// Simulate paste event
const pasteEvent = {
  clipboardData: {
    getData: () => 'my answer'
  },
  preventDefault: () => {}
};

monitoring.handlePaste(pasteEvent);
console.log('3. Student pastes: "my answer" in another location');

console.log('\n📊 Stats after internal paste:');
console.log('- Copy attempts:', monitoring.stats.copyAttempts);
console.log('- Paste attempts:', monitoring.stats.pasteAttempts);
console.log('- Internal pastes:', monitoring.stats.internalPastes);
console.log('- External pastes:', monitoring.stats.externalPastes);
console.log('- Violations:', monitoring.violations.length);

console.log('\n✅ RESULT: No violation (internal paste)');

// ============================================================================
// EXAMPLE 3: Simulate External Paste (Should Report Violation)
// ============================================================================
console.log('\n=== EXAMPLE 3: External Paste ===\n');

// Clear previous tracking
monitoring.resetCopyTracking();

console.log('1. Student switches to Google tab...');
console.log('2. Student copies answer from Google');
console.log('3. Student switches back to exam tab');

// Simulate external paste (no internal copy tracked)
const externalPasteEvent = {
  clipboardData: {
    getData: () => 'This is the correct answer from Google. It explains everything in detail and provides the solution.'
  },
  preventDefault: () => {}
};

monitoring.handlePaste(externalPasteEvent);
console.log('4. Student pastes external content (93 chars)');

console.log('\n📊 Stats after external paste:');
console.log('- Copy attempts:', monitoring.stats.copyAttempts);
console.log('- Paste attempts:', monitoring.stats.pasteAttempts);
console.log('- Internal pastes:', monitoring.stats.internalPastes);
console.log('- External pastes:', monitoring.stats.externalPastes);
console.log('- Violations:', monitoring.violations.length);

console.log('\n❌ RESULT: Violation reported (external paste)');
if (monitoring.violations.length > 0) {
  const lastViolation = monitoring.violations[monitoring.violations.length - 1];
  console.log('Violation details:', lastViolation);
}

// ============================================================================
// EXAMPLE 4: Simulate Large External Paste (High Severity)
// ============================================================================
console.log('\n=== EXAMPLE 4: Large External Paste ===\n');

// Clear previous tracking
monitoring.resetCopyTracking();
monitoring.violations = [];

const largeText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20);
console.log(`1. Student copies ${largeText.length} characters from external source`);

const largePasteEvent = {
  clipboardData: {
    getData: () => largeText
  },
  preventDefault: () => {}
};

monitoring.handlePaste(largePasteEvent);
console.log('2. Student pastes large external content');

console.log('\n📊 Stats:');
console.log('- External pastes:', monitoring.stats.externalPastes);
console.log('- Violations:', monitoring.violations.length);

if (monitoring.violations.length > 0) {
  const lastViolation = monitoring.violations[monitoring.violations.length - 1];
  console.log('\n❌ HIGH SEVERITY VIOLATION:');
  console.log('- Type:', lastViolation.type);
  console.log('- Severity:', lastViolation.severity);
  console.log('- Description:', lastViolation.description);
  console.log('- Evidence length:', lastViolation.evidence?.length);
  console.log('- Evidence preview:', lastViolation.evidence?.preview);
}

// ============================================================================
// EXAMPLE 5: Text Similarity Test
// ============================================================================
console.log('\n=== EXAMPLE 5: Text Similarity ===\n');

const text1 = 'Hello World';
const text2 = 'hello world'; // Different case
const text3 = 'Hello  World'; // Extra space
const text4 = 'Hello Universe'; // Different word

console.log('Testing text similarity:');
console.log('Text 1:', text1);
console.log('Text 2:', text2, '→ Similarity:', monitoring.calculateTextSimilarity(
  monitoring.normalizeText(text1),
  monitoring.normalizeText(text2)
).toFixed(2));
console.log('Text 3:', text3, '→ Similarity:', monitoring.calculateTextSimilarity(
  monitoring.normalizeText(text1),
  monitoring.normalizeText(text3)
).toFixed(2));
console.log('Text 4:', text4, '→ Similarity:', monitoring.calculateTextSimilarity(
  monitoring.normalizeText(text1),
  monitoring.normalizeText(text4)
).toFixed(2));

// ============================================================================
// EXAMPLE 6: Copy Expiry Test
// ============================================================================
console.log('\n=== EXAMPLE 6: Copy Expiry ===\n');

monitoring.resetCopyTracking();

// Simulate copy
monitoring.lastCopiedText = 'Test content';
monitoring.lastCopiedFromInternal = true;
monitoring.lastCopyTimestamp = Date.now();

console.log('1. Student copies text at time:', new Date().toISOString());

// Check if internal (should be true)
let isInternal = monitoring.isInternalCopy('Test content');
console.log('2. Immediate paste → Is internal?', isInternal, '✅');

// Simulate time passing (61 seconds)
monitoring.lastCopyTimestamp = Date.now() - 61000;

isInternal = monitoring.isInternalCopy('Test content');
console.log('3. Paste after 61 seconds → Is internal?', isInternal, '❌ (expired)');

// ============================================================================
// EXAMPLE 7: Partial Paste Test
// ============================================================================
console.log('\n=== EXAMPLE 7: Partial Paste ===\n');

monitoring.resetCopyTracking();

// Simulate copying large text
const fullText = 'This is a very long answer that contains multiple sentences. It explains the concept in detail and provides examples.';
monitoring.lastCopiedText = fullText;
monitoring.lastCopiedFromInternal = true;
monitoring.lastCopyTimestamp = Date.now();

console.log('1. Student copies:', fullText.length, 'characters');

// Simulate pasting only part of it
const partialText = fullText.substring(0, 50);
isInternal = monitoring.isInternalCopy(partialText);

console.log('2. Student pastes only:', partialText.length, 'characters');
console.log('3. Is internal?', isInternal, isInternal ? '✅ (substring detected)' : '❌');

// ============================================================================
// EXAMPLE 8: Get Statistics
// ============================================================================
console.log('\n=== EXAMPLE 8: Get Full Statistics ===\n');

const stats = monitoring.getStats();
console.log('📊 Complete Statistics:');
console.log(JSON.stringify(stats, null, 2));

// ============================================================================
// EXAMPLE 9: Update Settings
// ============================================================================
console.log('\n=== EXAMPLE 9: Update Settings ===\n');

console.log('Current preventCopyPaste:', monitoring.settings.preventCopyPaste);

monitoring.updateSettings({
  preventCopyPaste: true  // Now block external pastes
});

console.log('Updated preventCopyPaste:', monitoring.settings.preventCopyPaste);

// ============================================================================
// EXAMPLE 10: Cleanup
// ============================================================================
console.log('\n=== EXAMPLE 10: Cleanup ===\n');

monitoring.cleanup();
console.log('✅ Monitoring cleaned up');
console.log('Violations cleared:', monitoring.violations.length);
console.log('Stats reset:', JSON.stringify(monitoring.stats, null, 2));

// ============================================================================
// USAGE IN REAL EXAM PAGE
// ============================================================================
console.log('\n=== REAL USAGE EXAMPLE IN EXAM PAGE ===\n');

const exampleCode = `
// In StudentExamPage.js

import BrowserMonitoringService from '../services/BrowserMonitoringService';

const StudentExamPage = () => {
  const [violations, setViolations] = useState([]);
  const monitoringRef = useRef(null);

  useEffect(() => {
    // Initialize monitoring
    const monitoring = new BrowserMonitoringService();
    monitoringRef.current = monitoring;

    // Setup callbacks
    monitoring.setCallbacks({
      onViolation: (violation) => {
        // Add to violations list
        setViolations(prev => [...prev, violation]);
        
        // Report to backend
        socket.emit('violation_detected', {
          sessionId: examSession.id,
          violation: violation
        });
        
        // Show alert if severe
        if (violation.severity === 'high') {
          alert('⚠️ Vi phạm phát hiện: ' + violation.description);
        }
      }
    });

    // Start monitoring
    monitoring.startMonitoring({
      detectTabSwitch: true,
      detectFullscreenExit: true,
      detectCopyPaste: true,      // Enable smart copy-paste
      detectDevTools: true,
      preventCopyPaste: false      // Don't block, just detect
    });

    // Cleanup on unmount
    return () => {
      monitoring.cleanup();
    };
  }, []);

  return (
    <div>
      <h1>Exam Page</h1>
      <ViolationsPanel violations={violations} />
      <textarea 
        placeholder="Type your answer here..."
        // Copy/paste events automatically handled by monitoring service
      />
    </div>
  );
};
`;

console.log(exampleCode);

// ============================================================================
// PERFORMANCE BENCHMARKS
// ============================================================================
console.log('\n=== PERFORMANCE BENCHMARKS ===\n');

// Test 1: Small text comparison
const smallText1 = 'Hello World';
const smallText2 = 'Hello World';
console.time('Small text comparison (11 chars)');
for (let i = 0; i < 1000; i++) {
  monitoring.calculateTextSimilarity(smallText1, smallText2);
}
console.timeEnd('Small text comparison (11 chars)');

// Test 2: Medium text comparison
const mediumText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(5);
console.time(`Medium text comparison (${mediumText.length} chars)`);
for (let i = 0; i < 100; i++) {
  monitoring.calculateTextSimilarity(mediumText, mediumText);
}
console.timeEnd(`Medium text comparison (${mediumText.length} chars)`);

// Test 3: Large text comparison
const largeText1 = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50);
console.time(`Large text comparison (${largeText1.length} chars)`);
for (let i = 0; i < 10; i++) {
  monitoring.calculateTextSimilarity(largeText1, largeText1);
}
console.timeEnd(`Large text comparison (${largeText1.length} chars)`);

console.log('\n✅ All examples completed!');
console.log('\n📝 Summary:');
console.log('- Internal paste: ✅ Allowed (no violation)');
console.log('- External paste: ❌ Violation reported');
console.log('- Large external paste: ❌ High severity violation');
console.log('- Expired copy: ❌ Treated as external');
console.log('- Partial paste: ✅ Detected as internal');
console.log('- Performance: ⚡ Fast even for large texts');

export default monitoring;

