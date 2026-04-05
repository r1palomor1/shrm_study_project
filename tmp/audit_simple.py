import json
import sys

try:
    with open(r'c:\Users\palom\Vibe Coding Apps\SHRM Study Project\topics\HF_V3_Org_SHRM_Backup_2026-04-02_1906.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    vault = data.get('vault', {})
    print(f"Total entries in vault: {len(vault)}")
    
    intelligent_entries = [k for k in vault.keys() if ":intelligent:CP" in k]
    print(f"Total Intelligent entries: {len(intelligent_entries)}")
    
    # Check first few entries
    for k in intelligent_entries[:3]:
        entry = vault[k]
        print(f"\nID: {entry.get('id')}")
        print(f"BASK: {entry.get('tag_bask')}")
        print(f"Behavior: {entry.get('tag_behavior')}")
        print(f"Scenario Length: {len(entry.get('scenario', ''))}")

except Exception as e:
    print(f"Error: {e}")
