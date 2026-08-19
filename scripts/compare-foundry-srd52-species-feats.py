import json, sys, pathlib, collections, yaml

oracle_root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else 'packages/content/data/srd-5.2')
foundry_root=pathlib.Path(sys.argv[2] if len(sys.argv)>2 else '/tmp/dnd5e')

def load_json(name):
    return json.loads((oracle_root/name).read_text())

def load_yaml(path):
    with path.open() as f: return yaml.safe_load(f)

species_doc=load_json('species.json')
feats_doc=load_json('feats.json')

oracle_species={x['name']:x for x in species_doc['items']}
oracle_feats={x['name']:x for x in feats_doc['items']}

species_files=[p for p in (foundry_root/'packs/_source/origins24/species').glob('*.yml') if p.name!='_folder.yml']
feat_dirs={
 'origin':'origin-feats',
 'general':'general-feats',
 'fightingStyle':'fighting-style-feats',
 'epicBoon':'epic-boon-feats',
}
foundry_species=[]
for p in species_files:
    y=load_yaml(p)
    foundry_species.append({'name':y.get('name'),'file':p.name,'systemKeys':sorted((y.get('system') or {}).keys()),'advancementTypes':[a.get('type') for a in (y.get('system') or {}).get('advancement',[]) if isinstance(a,dict)]})

foundry_feats=[]
for cat,dirname in feat_dirs.items():
    base=foundry_root/'packs/_source/feats24'/dirname
    for p in base.rglob('*.yml'):
        if p.name=='_folder.yml': continue
        y=load_yaml(p)
        foundry_feats.append({'name':y.get('name'),'category':cat,'file':str(p.relative_to(foundry_root)),'systemKeys':sorted((y.get('system') or {}).keys()),'activityTypes':sorted({a.get('type') for a in (y.get('system') or {}).get('activities',{}).values() if isinstance(a,dict) and a.get('type')})})

# Map flattened Foundry species names to Oracle base + variant semantics.
def resolve_foundry_species(name):
    if name in oracle_species: return (name,None)
    if ', ' in name:
        base,var=name.split(', ',1)
        if base in oracle_species: return (base,var)
    # Foundry may use parenthetical or prefix forms; fall back by variant name.
    for base,item in oracle_species.items():
        for v in item.get('data',{}).get('variants',[]):
            if v.get('name')==name or f'{base}, {v.get("name")}'==name: return (base,v.get('name'))
    return (None,None)

species_issues=[]
resolved=[]
for f in foundry_species:
    base,var=resolve_foundry_species(f['name'])
    if not base:
        species_issues.append({'type':'foundry-species-unmatched','name':f['name'],'file':f['file']})
    else:
        resolved.append({'foundry':f['name'],'oracleBase':base,'oracleVariant':var})

# Ensure all Oracle base species have representation in Foundry either directly or via flattened variants.
for base,item in oracle_species.items():
    if not any(r['oracleBase']==base for r in resolved): species_issues.append({'type':'oracle-species-unmatched','name':base})

feat_issues=[]
foundry_feat_names={x['name']:x for x in foundry_feats}
for name,item in oracle_feats.items():
    f=foundry_feat_names.get(name)
    if not f: feat_issues.append({'type':'oracle-feat-unmatched','name':name,'oracleCategory':item['data'].get('featCategory')})
    elif f['category']!=item['data'].get('featCategory'): feat_issues.append({'type':'feat-category','name':name,'oracle':item['data'].get('featCategory'),'foundry':f['category']})
for name,f in foundry_feat_names.items():
    if name not in oracle_feats: feat_issues.append({'type':'foundry-feat-unmatched','name':name,'foundryCategory':f['category']})

# Structural signals from Foundry that Oracle should model explicitly.
species_adv=collections.Counter(t for x in foundry_species for t in x['advancementTypes'] if t)
feat_activity=collections.Counter(t for x in foundry_feats for t in x['activityTypes'] if t)
foundry_feat_categories=collections.Counter(x['category'] for x in foundry_feats)
oracle_feat_categories=collections.Counter(x['data'].get('featCategory') for x in oracle_feats.values())

report={
 'foundrySpeciesDocuments':len(foundry_species),
 'oracleSpecies':len(oracle_species),
 'speciesResolved':len(resolved),
 'speciesIssues':species_issues,
 'foundryFeatCount':len(foundry_feats),
 'oracleFeatCount':len(oracle_feats),
 'foundryFeatCategories':dict(foundry_feat_categories),
 'oracleFeatCategories':dict(oracle_feat_categories),
 'featIssues':feat_issues,
 'foundrySpeciesAdvancementTypes':dict(species_adv),
 'foundryFeatActivityTypes':dict(feat_activity),
 'speciesResolution':resolved,
 'foundrySpecies':foundry_species,
 'foundryFeats':foundry_feats,
 'status':'SUPPORTED' if not species_issues and not feat_issues else 'PARTIAL'
}
out=oracle_root/'species-feats-foundry-comparison.json'
out.write_text(json.dumps(report,indent=2))
print(json.dumps({k:report[k] for k in ['foundrySpeciesDocuments','oracleSpecies','speciesResolved','foundryFeatCount','oracleFeatCount','foundryFeatCategories','oracleFeatCategories','speciesIssues','featIssues','foundrySpeciesAdvancementTypes','foundryFeatActivityTypes','status']},indent=2))
