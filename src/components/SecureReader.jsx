import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import * as API from '../api';
export default function SecureReader({ book, onClose }) {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const canvas = useRef(null);
  useEffect(() => {
    const abort = new AbortController();
    let task, render;
    let cancelled = false;
    async function load() {
      setBusy(true); setError('');
      try {
        const [{ data }, pdfjs, worker] = await Promise.all([
          API.fetchPage(book.customId, page, abort.signal),
          import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
        ]);
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        task = pdfjs.getDocument({ data: new Uint8Array(data), isEvalSupported: false });
        const pdfDocument = await task.promise;
        if (cancelled) return;
        const pdfPage = await pdfDocument.getPage(1);
        if (cancelled || !canvas.current) return;
        const viewport = pdfPage.getViewport({ scale: zoom * 1.5 });
        canvas.current.width = viewport.width; canvas.current.height = viewport.height;
        render = pdfPage.render({ canvasContext: canvas.current.getContext('2d'), viewport });
        await render.promise;
      } catch (e) {
        if (!cancelled && e.name !== 'RenderingCancelledException') {
          let message = 'Unable to open this page. Check your access or try again.';
          if (e.response?.data) {
            try { message = JSON.parse(new TextDecoder().decode(new Uint8Array(e.response.data))).error || message; } catch { /* Non-JSON network response. */ }
          }
          setError(message);
        }
      } finally { if (!cancelled) setBusy(false); }
    }
    load();
    return () => {
      cancelled = true; abort.abort(); render?.cancel();
      if (task) void task.destroy().catch(() => { /* Loading may already have been aborted. */ });
    };
  }, [book.customId, page, zoom]);
  return createPortal(<section role="dialog" aria-modal="true" aria-label={`Reading ${book.title}`} className="fixed inset-0 z-50 bg-slate-100 flex flex-col">
    <header className="bg-slate-900 text-white p-4 flex flex-wrap items-center gap-3">
      <h2 className="font-bold flex-1">{book.title}</h2>
      <button aria-label="Zoom out" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}><ZoomOut /></button>
      <span>{Math.round(zoom * 100)}%</span>
      <button aria-label="Zoom in" onClick={() => setZoom(z => Math.min(2, z + 0.25))}><ZoomIn /></button>
      <button aria-label="Close reader" onClick={onClose}><X /></button>
    </header>
    <div className="flex-1 overflow-auto p-4 text-center">
      {busy && <p role="status">Loading authorized page…</p>}
      {error && <p role="alert" className="p-6 text-red-800 bg-red-50">{error}</p>}
      <canvas aria-label={`Page ${page}`} ref={canvas} className={`mx-auto shadow-lg max-w-full ${error || busy ? 'hidden' : ''}`} />
    </div>
    <footer className="p-4 bg-white flex justify-center items-center gap-4">
      <button aria-label="Previous page" disabled={page === 1 || busy} onClick={() => setPage(p => p - 1)}><ChevronLeft /></button>
      <span>Page {page} of {book.totalPages}</span>
      <button aria-label="Next page" disabled={page >= book.totalPages || busy} onClick={() => setPage(p => p + 1)}><ChevronRight /></button>
    </footer>
  </section>, document.body);
}
