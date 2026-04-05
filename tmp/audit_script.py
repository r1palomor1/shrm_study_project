import json
import os

backup_path = r'c:\Users\palom\Vibe Coding Apps\SHRM Study Project\topics\HF_V3_Org_SHRM_Backup_2026-04-02_1906.json'

with open(backup_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

vault = data.get('vault', {})
cards = data.get('decks', [{}])[0].get('cards', [])

report = {
    "total_cards": len(cards),
    "total_intelligent_vault": len(vault),
    "pillar_distribution": {},
    "behavior_distribution": {},
    "quality_checks": {
        "inclusive_mindset_count": 0,
        "critical_evaluation_count": 0,
        "global_cultural_count": 0,
        "has_scenario": 0,
        "has_rationale": 0,
        "has_gap_analysis": 0
    }
}

pillars = ["People", "Organization", "Workplace"]
behaviors = [
    "Leadership & Navigation", "Ethical Practice", "Relationship Management", 
    "Communication", "Inclusive Mindset", "Business Acumen", 
    "Consultation", "Analytical Aptitude"
]

for key, entry in vault.items():
    if ":intelligent:CP" not in key:
        continue
    
    report["quality_checks"]["has_scenario"] += 1 if entry.get("scenario") else 0
    report["quality_checks"]["has_rationale"] += 1 if entry.get("rationale") else 0
    report["quality_checks"]["has_gap_analysis"] += 1 if entry.get("gap_analysis") else 0
    
    # Check Pillar
    pb = entry.get("tag_bask", "")
    p_found = False
    for p in pillars:
        if p.lower() in pb.lower():
            report["pillar_distribution"][p] = report["pillar_distribution"].get(p, 0) + 1
            p_found = True
    if not p_found:
        report["pillar_distribution"]["Other/Mixed"] = report["pillar_distribution"].get("Other/Mixed", 0) + 1
        
    # Check Behavior
    bb = entry.get("tag_behavior", "")
    b_found = False
    for b in behaviors:
        if b.lower() in bb.lower():
            report["behavior_distribution"][b] = report["behavior_distribution"].get(b, 0) + 1
            b_found = True
    if not b_found:
        report["behavior_distribution"]["Other/Mixed"] = report["behavior_distribution"].get("Other/Mixed", 0) + 1

    # Text checks
    full_text = (entry.get("scenario", "") + entry.get("rationale", "")).lower()
    if "inclusive mindset" in full_text: report["quality_checks"]["inclusive_mindset_count"] += 1
    if "critical evaluation" in full_text: report["quality_checks"]["critical_evaluation_count"] += 1
    if "global" in full_text and "cultural" in full_text: report["quality_checks"]["global_cultural_count"] += 1

print(json.dumps(report, indent=2))
