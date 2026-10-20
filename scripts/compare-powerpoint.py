"""Compare actual PowerPoint rasters to the browser's 1280x720 preview. Never substitutes LibreOffice."""
import json, sys
from pathlib import Path
from PIL import Image, ImageChops, ImageStat, ImageDraw
root = Path(sys.argv[1] if len(sys.argv)>1 else 'qualification-results/powerpoint')
actual = root/'actual'
report=json.loads((actual/'powerpoint-report.json').read_text(encoding='utf-8-sig'))
if report['status']!='rendered-awaiting-pixel-comparison': raise SystemExit('PowerPoint did not render the deck. Qualification remains incomplete.')
results=[]
for i in range(1,51):
    a=Image.open(root/f'preview-slide-{i:03}.png').convert('RGB')
    b=Image.open(actual/f'powerpoint-slide-{i:03}.png').convert('RGB')
    if a.size!=(1280,720) or b.size!=a.size: raise SystemExit('Unexpected raster size; do not resize a mismatch into a pass.')
    # The draft-only label is an intentional export annotation, separately asserted in XML checks.
    for image in [a,b]: ImageDraw.Draw(image).rectangle((192,16,864,40),fill=(255,255,255))
    diff=ImageChops.difference(a,b)
    mean=sum(ImageStat.Stat(diff).mean)/(3*255)
    changed=sum(max(pixel)>32 for pixel in diff.getdata())/(1280*720)
    diff.save(actual/f'diff-slide-{i:03}.png')
    results.append(dict(slide=i,meanAbsoluteError=mean,changedPixelFraction=changed,passed=mean<=0.005 and changed<=0.02))
report['pixelComparison']={'meanErrorLimit':0.005,'changedPixelLimit':0.02,'channelDifferenceThreshold':32,'draftLabelMasked':True,'slides':results}
report['status']='passed-automated-render-checks-needs-human-review' if all(r['passed'] for r in results) else 'failed-render-fidelity'
report['limitations']='Automated 50-layout raster and text-edit qualification. Classroom hardware, accessibility, font substitution and dense scientific figures require separate witnessed tests. A human must inspect all diffs; pixel thresholds are release criteria, not proof of pixel identity.'
(actual/'powerpoint-report.json').write_text(json.dumps(report,indent=2))
print(report['status'])
if any(not r['passed'] for r in results): raise SystemExit(1)
