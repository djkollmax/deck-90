#!/usr/bin/env python3
# Compares two folders of scripts/shots.mjs pictures: prints, for each, "same" or how many pixels differ and
# where, and saves a picture of the differences next to the second folder's (<name>.diff.png).
import sys, os
from PIL import Image, ImageChops
a, b = sys.argv[1], sys.argv[2]
bad = 0
for name in sorted(os.listdir(a)):
    if not name.endswith('.png') or name.endswith('.diff.png'): continue
    pa, pb = os.path.join(a, name), os.path.join(b, name)
    if not os.path.exists(pb): print(f'{name}: missing'); bad += 1; continue
    ia, ib = Image.open(pa).convert('RGB'), Image.open(pb).convert('RGB')
    if ia.size != ib.size: print(f'{name}: size {ia.size} vs {ib.size}'); bad += 1; continue
    diff = ImageChops.difference(ia, ib)
    box = diff.getbbox()
    if not box: print(f'{name}: same'); continue
    n = sum(1 for p in (diff.get_flattened_data() if hasattr(diff, "get_flattened_data") else diff.getdata()) if max(p) > 8)
    print(f'{name}: {n} pixels differ in {box}'); bad += 1 if n else 0
    diff.point(lambda v: 255 if v > 8 else 0).save(pb[:-4] + '.diff.png')
sys.exit(1 if bad else 0)
