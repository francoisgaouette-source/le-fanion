  // ---------------- Lecture de la carte (photo ou PDF) ----------------
  const loadScript = (() => { const done = {}; return src => done[src] || (done[src] = new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => { delete done[src]; ko(new Error('connexion requise pour lire la carte')); }; document.head.appendChild(s); })); })();
  async function fileToCanvas(file, max = 2200) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('image illisible')); i.src = url; });
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); return cv;
    } finally { URL.revokeObjectURL(url); }
  }
  // Agrandit, passe en noir et blanc et efface les lignes du quadrillage (elles nuisent à la lecture des chiffres)
  function cleanForOcr(src) {
    const k = Math.max(1, Math.min(2.5, 2400 / src.width));
    const W = Math.round(src.width * k), H = Math.round(src.height * k);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true }); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, W, H);
    const im = g.getImageData(0, 0, W, H), d = im.data, n = W * H, lum = new Uint8Array(n);
    for (let i = 0; i < n; i++) lum[i] = (d[i * 4] * 299 + d[i * 4 + 1] * 587 + d[i * 4 + 2] * 114) / 1000;
    // seuil local (moyenne sur un bloc) : tolère l'ombre et l'éclairage inégal d'une photo
    const B = Math.max(15, Math.round(W / 60)), ii = new Float64Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++) { let r = 0; for (let x = 0; x < W; x++) { r += lum[y * W + x]; ii[(y + 1) * (W + 1) + x + 1] = ii[y * (W + 1) + x + 1] + r; } }
    const dark = new Uint8Array(n);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const x0 = Math.max(0, x - B), x1 = Math.min(W, x + B), y0 = Math.max(0, y - B), y1 = Math.min(H, y + B);
      const m = (ii[y1 * (W + 1) + x1] - ii[y0 * (W + 1) + x1] - ii[y1 * (W + 1) + x0] + ii[y0 * (W + 1) + x0]) / ((x1 - x0) * (y1 - y0));
      dark[y * W + x] = lum[y * W + x] < m * 0.82 ? 1 : 0;
    }
    const kill = new Uint8Array(n), hMin = Math.round(W * 0.06), vMin = Math.round(H * 0.045);
    for (let y = 0; y < H; y++) { let s = -1; for (let x = 0; x <= W; x++) { const on = x < W && dark[y * W + x]; if (on && s < 0) s = x; if (!on && s >= 0) { if (x - s >= hMin) for (let j = s; j < x; j++) kill[y * W + j] = 1; s = -1; } } }
    for (let x = 0; x < W; x++) { let s = -1; for (let y = 0; y <= H; y++) { const on = y < H && dark[y * W + x]; if (on && s < 0) s = y; if (!on && s >= 0) { if (y - s >= vMin) for (let j = s; j < y; j++) kill[j * W + x] = 1; s = -1; } } }
    for (let i = 0; i < n; i++) { const v = dark[i] && !kill[i] ? 0 : 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0); return cv;
  }
  async function ocrCanvas(cv, status) {
    status('Chargement du lecteur de texte…');
    await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
    const w = await Tesseract.createWorker(['fra', 'eng'], 1, { logger: m => { if (m.status === 'recognizing text') status(`Lecture de la carte… ${Math.round(m.progress * 100)} %`); } });
    try {
      await w.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: '6' });
      const { data } = await w.recognize(cleanForOcr(cv));
      window.__cardText = (window.__cardText || '') + '\n' + (data.text || '');
      return data.text || '';
    }
    finally { await w.terminate(); }
  }
  async function readPdf(file, status) {
    status('Ouverture du PDF…');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const out = [];
    for (let n = 1; n <= Math.min(pdf.numPages, 4); n++) {
      const page = await pdf.getPage(n);
      const vp = page.getViewport({ scale: Math.min(3, 2200 / page.getViewport({ scale: 1 }).width) });
      const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
      await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      (S.cardImgs = S.cardImgs || []).push(cv.toDataURL('image/jpeg', .7)); render();
      const tc = await page.getTextContent(); const rows = {};
      tc.items.forEach(it => { const y = Math.round(it.transform[5] / 4); (rows[y] = rows[y] || []).push(it); });
      const text = Object.keys(rows).sort((a, b) => b - a).map(y => rows[y].sort((a, b) => a.transform[4] - b.transform[4]).map(i => i.str).join(' ')).join('\n');
      out.push(text.replace(/\s/g, '').length > 40 ? text : await ocrCanvas(cv, status));
    }
    return out;
  }

  // =====================================================================
  // Interactions
  // =====================================================================