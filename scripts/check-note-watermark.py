"""Inspect Poppler-rendered note pages using only the Python standard library."""
import statistics
import pathlib
import struct
import sys
import zlib

def png_rgb(path):
    data = path.read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    offset, chunks = 8, []
    while offset < len(data):
        size = struct.unpack('>I', data[offset:offset+4])[0]
        kind, body = data[offset+4:offset+8], data[offset+8:offset+8+size]
        if kind == b'IHDR':
            width, height, depth, colour, _, _, interlace = struct.unpack('>IIBBBBB', body)
            assert depth == 8 and colour == 2 and interlace == 0
        if kind == b'IDAT':
            chunks.append(body)
        offset += size+12
    raw = zlib.decompress(b''.join(chunks))
    stride, rows, previous = width*3, [], bytearray(width*3)
    for y in range(height):
        start = y*(stride+1)
        method, row = raw[start], bytearray(raw[start+1:start+1+stride])
        for x in range(stride):
            a = row[x-3] if x >= 3 else 0
            b = previous[x]
            c = previous[x-3] if x >= 3 else 0
            if method == 1:
                row[x] = (row[x]+a) & 255
            elif method == 2:
                row[x] = (row[x]+b) & 255
            elif method == 3:
                row[x] = (row[x]+((a+b)//2)) & 255
            elif method == 4:
                p = a+b-c
                distances = [abs(p-a), abs(p-b), abs(p-c)]
                row[x] = (row[x]+[a,b,c][distances.index(min(distances))]) & 255
            else:
                assert method == 0
        rows.append(row)
        previous = row
    return width, height, rows

pages = sorted(pathlib.Path(sys.argv[1]).glob('notes-page-*.png'))
assert pages, 'No rendered note pages'
for path in pages:
    width, height, rows = png_rgb(path)
    green = []
    for y in range(int(height*.34),int(height*.66)):
        for x in range(int(width*.27),int(width*.73)):
            r,g,b = rows[y][x*3:x*3+3]
            if g > r+2 and g > b+2:
                green.append((r,g,b))
    assert len(green) >= 50, f'{path.name}: centre crest is not visibly rendered'
    median_red = statistics.median(r for r,g,b in green)
    spans = sorted(max(p)-min(p) for p in green)
    contrast_95 = spans[int((len(spans)-1)*.95)]
    print(f'{path.name}: median green-region red={median_red}, 95th-percentile chroma={contrast_95}')
    # Median/95th percentile exclude dark body-text edge pixels over the watermark.
    assert median_red >= 220, f'{path.name}: watermark is too opaque ({median_red})'
    assert contrast_95 <= 25, f'{path.name}: watermark lacks subtle contrast ({contrast_95})'
    print(f'PASS {path.name}: visible low-contrast centred crest ({len(green)} green pixels)')
