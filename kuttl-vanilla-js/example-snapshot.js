// Example: Using InterceptJS with Automatic Website Snapshotting
// ============================================================

// Basic initialization with automatic snapshotting enabled
const intercept = window.InterceptJS.init({
  debug: true, // Enable debug logging to see snapshot activity
  
  // Enable automatic website snapshotting
  snapshot: {
    enabled: true,
    
    // Configure the backend API
    api: {
      baseUrl: 'http://localhost:8080', // Your Kuttl API server
      apiKey: 'your-api-key-here',      // Optional API key
      timeout: 10000                    // Request timeout in ms
    },
    
    // Optional: Custom identifiers (auto-detected if not provided)
    websiteId: 'my-website-id',    // Defaults to hostname + pathname
    userId: 'user-123',            // Defaults to auto-detected or anonymous
    
    // Optional: Behavior configuration
    onChanges: true,               // Create snapshots when patches are applied (default: true)
    throttleMs: 5000              // Minimum interval between snapshots (default: 5000ms)
  }
});

// The system will automatically:
// 1. Create an initial snapshot 100ms after initialization
// 2. Send it to your backend API at http://localhost:8080/api/snapshots  
// 3. Trigger AI embedding generation in the background
// 4. Create new snapshots whenever you make changes (with throttling)

console.log('InterceptJS initialized with automatic snapshotting');

// Example: Make a change that will trigger an automatic snapshot
setTimeout(() => {
  console.log('Making a change that will trigger automatic snapshotting...');
  
  // This patch will automatically trigger a snapshot after 5 seconds (throttleMs)
  intercept.patch({
    target: document.body.children[0]?.getAttribute('data-uid'),
    op: 'restyle', 
    payload: { styles: { backgroundColor: '#f0f0f0' } }
  });
}, 2000);

// You can still manually create snapshots if needed
setTimeout(() => {
  const manualSnapshot = intercept.createSnapshot('manual-website', 'manual-user');
  console.log('Manual snapshot created:', manualSnapshot);
}, 4000);

// Monitor the last automatic snapshot
setTimeout(() => {
  console.log('Last automatic snapshot:', intercept.lastSnapshot);
}, 6000);