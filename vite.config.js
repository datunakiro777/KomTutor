import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { quizDataDir } from './scripts/archive.mjs';

// Serves the archive's PDFs at /archive/* without copying the 9 GB folder into the project.
function archiveFiles() {
  const middleware = (req, res, next) => {
    if (!req.url?.startsWith('/archive/')) return next();
    const relative = decodeURIComponent(req.url.slice('/archive/'.length).split('?')[0]);
    const file = path.resolve(quizDataDir, relative);
    if (!file.startsWith(quizDataDir + path.sep) || !file.endsWith('.pdf') || !fs.existsSync(file)) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(file).pipe(res);
  };
  return {
    name: 'archive-files',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), archiveFiles()],
});
