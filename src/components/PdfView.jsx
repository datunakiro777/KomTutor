import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const PDFJS_ASSETS = 'https://unpkg.com/pdfjs-dist@4.10.38';

// Renders every page of a PDF to canvases sized to the container, once it scrolls near view.
export default function PdfView({ url, label }) {
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
    const task = pdfjs.getDocument({
      url,
      cMapUrl: `${PDFJS_ASSETS}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${PDFJS_ASSETS}/standard_fonts/`,
    });
    setState('loading');

    task.promise
      .then(async (doc) => {
        const width = host.clientWidth || 640;
        const ratio = window.devicePixelRatio || 1;
        const canvases = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (width / base.width) * ratio });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          if (cancelled) return;
          canvases.push(canvas);
        }
        host.replaceChildren(...canvases);
        setState('ready');
      })
      .catch(() => !cancelled && setState('error'));

    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [visible, url]);

  return (
    <div className="pdf-view" data-state={state}>
      <div ref={hostRef} className="pdf-pages" role="img" aria-label={label} />
      {state !== 'ready' && state !== 'error' && <p className="pdf-status">Loading problem…</p>}
      {state === 'error' && (
        <p className="pdf-status">
          This problem could not be shown here.{' '}
          <a href={url} target="_blank" rel="noreferrer">
            Open the PDF
          </a>
          .
        </p>
      )}
    </div>
  );
}
