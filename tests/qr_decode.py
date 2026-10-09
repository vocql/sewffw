# Decodes every QR matrix produced by tests/qr.test.js with OpenCV and checks it equals the input text.
import json, sys, numpy as np, cv2
cases = json.load(open('/tmp/qr-cases.json')); ok = bad = 0
for c in cases:
    if 'error' in c: continue
    m = np.array(c['modules'], dtype=np.uint8); n, s, q = m.shape[0], 8, 4
    img = np.full(((n + 2 * q) * s,) * 2, 255, np.uint8)
    for y, x in zip(*np.nonzero(m)): img[(y + q) * s:(y + q + 1) * s, (x + q) * s:(x + q + 1) * s] = 0
    txt = cv2.QRCodeDetector().detectAndDecode(img)[0]
    if txt == c['text']: ok += 1
    else: bad += 1; print('FAIL', c['version'], c['ecc'], repr(c['text'][:30]))
print(f'qr-decode: {ok} decoded correctly, {bad} failed'); sys.exit(1 if bad or not ok else 0)
