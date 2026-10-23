from pathlib import Path
import json,re,hashlib,subprocess,html
r=Path.cwd();d=r/'src/data/shizuku-doodles';out=r/'artifacts/qa/shizuku-quality';out.mkdir(parents=True,exist_ok=True)
paths=[d/'doodles.json',*sorted(d.glob('expansion-20261022*.json')),*sorted(d.glob('expansion-20261023-*.json'))]
rows=[]
for p in paths:
 for a in json.loads(p.read_text(encoding='utf-8'))['doodles']:
  rows.append(dict(a,readability=a.get('readability','safe'),source=p.name,artSha256=hashlib.sha256(json.dumps(a['strokes'],sort_keys=True).encode()).hexdigest()))
assert len(rows)==291
revision=hashlib.sha256(json.dumps(rows,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
sha=subprocess.check_output(['git','rev-parse','HEAD']).decode().strip()
def hira(v):return re.sub('[ァ-ヶ]',lambda m:chr(ord(m[0])-96),v)
conflicts=[]
for pr,ref,file in [(17,'origin/feat/day-night-vocab-v08-20261019','bilingualV08Doodles.ts'),(22,'origin/feat/drawindow-v08-eshiritori-pack-20261020','eshiritoriV08Pack.ts')]:
 text=subprocess.check_output(['git','show',f'{ref}:src/data/{file}']).decode('utf-8')
 refsha=subprocess.check_output(['git','rev-parse',ref]).decode().strip()
 for key,ja,en in re.findall(r"\{\s*id:\s*'([^']+)',\s*ja:\s*'([^']+)',\s*en:\s*'([^']+)'",text):
  matches=[a['key'] for a in rows if hira(a['labelJa'])==ja or a['labelEn']==en]
  conflicts.append(dict(pr=pr,headSha=refsha,key=key,ja=ja,en=en,currentKeys=matches,decision='retain-current-compare-art' if matches else 'preserve-draft-unique'))
dups={}
for a in rows:dups.setdefault(hira(a['labelJa']),[]).append(a['key'])
dups={k:v for k,v in dups.items() if len(v)>1}
(out/'inventory.json').write_text(json.dumps(dict(baseCommit=sha,catalogueRevision=revision,count=len(rows),soft=[a['key'] for a in rows if a['readability']=='soft'],homonyms=dups,draftComparison=conflicts,items=[{k:a[k] for k in ['key','labelJa','labelEn','readability','source','artSha256']} for a in rows]),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
template=(r/'scripts/doodle-quality-review.template.html').read_text(encoding='utf-8')
(out/'index.html').write_text(template.replace('__CATALOGUE__',json.dumps(rows,ensure_ascii=False)).replace('__COMMIT__',sha).replace('__REVISION__',revision),encoding='utf-8')
def svg(a):return '<svg viewBox="0 0 120 120">'+''.join('<path d="'+s['path']+'"/>' for s in a['strokes'])+'</svg>'
sheets=[]
for i in range(0,len(rows),24):
 sheets.append('<section><h2>制作側の比較 '+str(i//24+1)+'</h2><div>'+''.join('<article>'+svg(a)+'<p>'+html.escape(a['labelJa'])+' / '+a['key']+'</p></article>' for a in rows[i:i+24])+'</div></section>')
(out/'contact.html').write_text('<!doctype html><meta charset="utf-8"><style>body{background:#f5f1e8;color:#283d36;font:14px sans-serif}section{padding:16px;width:1000px}section>div{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}article{background:white;padding:10px;border-radius:14px;text-align:center}svg{width:135px;fill:none;stroke:#283d36;stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round}p{margin:6px 0;font-size:12px}</style>'+''.join(sheets),encoding='utf-8')
print(json.dumps(dict(count=len(rows),soft=[a['key'] for a in rows if a['readability']=='soft'],duplicates=dups,drafts=conflicts),ensure_ascii=True))
