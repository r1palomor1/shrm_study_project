/**
 * vaultWipe.js: Surgical Clean Slate Protocol
 * Targets ONLY the AI-generated fields (scenario, distractors, rationale, gap_analysis).
 * Preserves core metadata and correct_answer to maintain 1:1 topic mapping.
 */

(function executeSurgicalWipe() {
  const VAULT_KEY = 'shrm_distractor_vault';
  const rawData = localStorage.getItem(VAULT_KEY);

  if (!rawData) {
    console.error('[WIPE FAILURE] No vault found in localStorage.');
    return;
  }

  const vault = JSON.parse(rawData);
  const beforeCount = Object.keys(vault).length;
  let wipedCount = 0;

  console.info(`[WIPE START] Current Vault Size: ${beforeCount} records.`);

  Object.keys(vault).forEach(key => {
    const entry = vault[key];
    
    // We only wipe entries that belong to the sync engine (intelligent or simple)
    if (entry.id) {
       // SURGICAL DELETE
       delete entry.scenario;
       delete entry.distractors;
       delete entry.rationale;
       delete entry.gap_analysis;
       
       // ADD FLAG: Mark as "Stale/Ready for Mirroring Sync"
       entry.lastWiped = new Date().toISOString();
       wipedCount++;
    }
  });

  // COMMIT TO STORAGE
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));

  const afterCount = Object.keys(vault).length;

  console.log('%c [WIPE SUCCESSFUL] ', 'background: #22c55e; color: #fff; font-weight: bold; padding: 4px;');
  console.table({
    'Records Scanned': beforeCount,
    'Records Wiped': wipedCount,
    'Final Vault Size': afterCount,
    'Status': beforeCount === afterCount ? 'INTEGRITY VERIFIED' : 'ERROR: RECORD COUNT MISMATCH'
  });

  console.warn('[ACTION NEEDED] Restarting the application or refreshing the Matrix is recommended now.');
})();
