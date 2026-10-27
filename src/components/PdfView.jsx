import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const PDFJS_ASSETS = 'https://unpkg.com/pdfjs-dist@4.10.38';
// The archive's extracted problems keep this much margin around each region.
const PADDING = 8;

// Every problem of a quiz comes from the same paper, so it is downloaded and parsed once.
const documents = new Map();
function loadDocument(url) {
  if (!documents.has(url)) {
    const task = pdfjs.getDocument({
      url,
      cMapUrl: `${PDFJS_ASSETS}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${PDFJS_ASSETS}/standard_fonts/`,
    });
    documents.set(
      url,
      task.promise.catch((error) => {
        documents.delete(url);
        throw error;
      }),
    );
  }
  return documents.get(url);
}

// Draws the given regions of a PDF (page + rectangle in points from the top-left), stacked, once the
// view scrolls near the screen. The widest region fills the container; the rest keep the same scale.
export default function PdfView({ url, regions, label }) {
  const hostRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState('idle');

  useEffect(() => {
    const el = hostRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { rootMargin: '600px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const host = hostRef.current;
    setState('loading');

    (async () => {
      const doc = await loadDocument(url);
      const boxes = regions.map(({ page, rect: [x0, y0, x1, y1] }) => ({
        page,
        x: x0 - PADDING,
        y: y0 - PADDING,
        width: x1 - x0 + 2 * PADDING,
        height: y1 - y0 + 2 * PADDING,
      }));
      const cssScale = (host.clientWidth || 640) / Math.max(...boxes.map((b) => b.width));
      const scale = cssScale * (window.devicePixelRatio || 1);
      const canvases = [];
      for (const box of boxes) {
        const page = await doc.getPage(box.page);
        const viewport = page.getViewport({ scale, offsetX: -box.x * scale, offsetY: -box.y * scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(box.width * scale);
        canvas.height = Math.ceil(box.height * scale);
        canvas.style.width = `${box.width * cssScale}px`;
        const context = canvas.getContext('2d');
        await page.render({ canvasContext: context, viewport }).promise;
        if (cancelled) return;
        // Blank the margin, which would otherwise show the edges of neighbouring problems.
        const inner = PADDING * scale;
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, inner);
        context.fillRect(0, canvas.height - inner, canvas.width, inner);
        context.fillRect(0, 0, inner, canvas.height);
        context.fillRect(canvas.width - inner, 0, inner, canvas.height);
        canvases.push(canvas);
      }
      host.replaceChildren(...canvases);
      setState('ready');
    })().catch(() => !cancelled && setState('error'));

    return () => {
      cancelled = true;
    };
  }, [visible, url, regions]);

  return (
    <div className="pdf-view" data-state={state}>
      <div ref={hostRef} className="pdf-pages" role="img" aria-label={label} />
      {state !== 'ready' && state !== 'error' && <p className="pdf-status">Loading problem…</p>}
      {state === 'error' && (
        <p className="pdf-status">
          This problem could not be shown here.{' '}
          <a href={url} target="_blank" rel="noreferrer">
            Open the paper
          </a>
          .
        </p>
      )}
    </div>
  );
}
