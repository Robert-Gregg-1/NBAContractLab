"""Rebuild the UI from editable app/CSS sources while retaining embedded model data.

Run: python3 source/rebuild_ui.py (requires lxml). Opening index.html needs no build.
"""
from pathlib import Path
from lxml import html
import hashlib,json

source=Path(__file__).resolve().parent
root=source.parent
target=root/'index.html'
tree=html.fromstring(target.read_bytes(),parser=html.HTMLParser(huge_tree=True))
script=tree.get_element_by_id('nba-contract-lab-app')
prefix=script.text.split('const data=window.NBAContractLabData,',1)[0]
script.text=prefix+(source/'app.mjs').read_text()
tree.get_element_by_id('product-layout-revision').text=(source/'layout.css').read_text()
target.write_bytes(b'<!DOCTYPE html>\n'+html.tostring(tree,encoding='utf-8',method='html'))
manifest_path=root/'publication-manifest.json'
manifest=json.loads(manifest_path.read_text())
manifest['htmlSHA256']=hashlib.sha256(target.read_bytes()).hexdigest()
manifest['browserRenderingVerified']=False
manifest['publicDeploymentPerformed']=False
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
print('Rebuilt',target)
