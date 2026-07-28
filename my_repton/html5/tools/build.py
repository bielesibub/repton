#!/usr/bin/env python3
"""Assemble the final single-file repton.html from assets.js + game.js."""
import os

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)   # html5/

HTML_HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>REPTON &mdash; 1994 DOS classic, revived</title>
<style>
  html, body {
    margin: 0; padding: 0; height: 100%;
    background: #050505;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-family: monospace; color: #9f9;
    overflow: hidden;
  }
  #wrap {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
  }
  #screen {
    background: #000;
    image-rendering: pixelated; image-rendering: crisp-edges;
    box-shadow: 0 0 40px #123, 0 0 4px #0f0;
    border: 2px solid #222;
    max-width: 96vw; max-height: 86vh;
    touch-action: none;
  }
  #hint { font-size: 11px; color: #486; letter-spacing: 1px; }
  #msg { color: #f66; padding: 20px; }
</style>
</head>
<body>
<div id="wrap">
  <canvas id="screen" width="960" height="628"></canvas>
  <div id="hint">Z/X/K/M or ARROWS move &middot; SPACE whole map &middot; [ ] speed &middot; S sfx &middot; T music &middot; ESC menu</div>
  <div id="msg">loading&hellip;</div>
</div>
<script>
"""

HTML_TAIL = """
</script>
</body>
</html>
"""

assets = open(os.path.join(ROOT, 'assets.js')).read()
game = open(os.path.join(ROOT, 'game.js')).read()
out = HTML_HEAD + assets + "\n" + game + HTML_TAIL
dest = os.path.join(ROOT, 'repton.html')
open(dest, 'w').write(out)
print("wrote", dest, os.path.getsize(dest), "bytes")
