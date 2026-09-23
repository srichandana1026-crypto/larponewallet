import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'clean-urls-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url) return next();
          const [urlPath, queryString] = req.url.split('?');
          const query = queryString ? `?${queryString}` : '';

          // 1. Redirect /index.html -> /
          if (urlPath === '/index.html') {
            res.writeHead(302, { Location: `/${query}` });
            res.end();
            return;
          }

          // 2. Redirect any other *.html -> clean URL (e.g. /terms-and-conditions.html -> /terms-and-conditions)
          if (urlPath.endsWith('.html') && urlPath !== '/index.html') {
            const cleanUrl = urlPath.replace(/\.html$/, '');
            res.writeHead(302, { Location: `${cleanUrl}${query}` });
            res.end();
            return;
          }

          // 3. Rewrite extensionless URLs to their .html file internally
          if (!urlPath.includes('.') && urlPath !== '/') {
            const filePath = path.resolve(__dirname, `${urlPath.slice(1)}.html`);
            if (fs.existsSync(filePath)) {
              req.url = `${urlPath}.html${query}`;
            }
          }

          next();
        });
      }
    }
  ]
});
