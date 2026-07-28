#!/usr/bin/env python3
"""Extract game assets from PCX files and emit a JS asset file."""
import base64, io, os
from PIL import Image

SRC='/Users/paulbieles/development/repton/my_repton'
OUT=os.path.join(SRC,'html5')

def load_pcx(name):
    return Image.open(os.path.join(SRC,name)).convert('RGB')

def png_b64(im):
    buf=io.BytesIO()
    im.save(buf, format='PNG', optimize=True)
    return base64.b64encode(buf.getvalue()).decode()

# 1. Object tiles from REPTON.PCX (32x32 grid) - keep as full sheet
repton = load_pcx('REPTON.PCX')
# 2. Player frames from REPMAN.PCX - full sheet (transparency handled in JS)
repman = load_pcx('REPMAN.PCX')
# 3. 8x8 tiles from REP8PIX.PCX (top row, 20 tiles = 160x8)
rep8 = load_pcx('REP8PIX.PCX').crop((0,0,320,8))
# 4. Title screen
title = load_pcx('REPTIT.PCX')
# 5. Logo
logo = load_pcx('PBLOG3.PCX')

# map data
repmap = open(os.path.join(SRC,'REPMAP.DAT'),'rb').read().decode('latin1')
repmamp = open(os.path.join(SRC,'REPMAMP.DAT'),'rb').read().decode('latin1')
assert len(repmap)==7680 and len(repmamp)==7680

js = []
js.append("// Auto-generated game assets (extracted from original 1994 PCX/DAT files)")
js.append("const ASSETS = {")
for name, im in [('repton',repton),('repman',repman),('rep8',rep8),('title',title),('logo',logo)]:
    js.append(f"  {name}: 'data:image/png;base64,{png_b64(im)}',")
js.append("};")
js.append(f"const REPMAP = {repmap!r};")
js.append(f"const REPMAMP = {repmamp!r};")
open(os.path.join(OUT,'assets.js'),'w').write('\n'.join(js))
print("assets.js written:", os.path.getsize(os.path.join(OUT,'assets.js')), "bytes")
