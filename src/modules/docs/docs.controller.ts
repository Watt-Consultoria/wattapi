import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';

// Vercel's serverless bundler only ships files that are statically
// require()'d/import()'d. @nestjs/swagger's built-in UI serves
// swagger-ui-dist's JS/CSS/favicons straight off disk from node_modules
// at request time (never imported), so those assets are missing in
// production and 404. Loading swagger-ui-dist from a CDN instead sidesteps
// the bundler entirely. SwaggerModule.setup() is configured with
// `swaggerUiEnabled: false` in main.ts so it only serves /docs-json; this
// controller owns the /docs HTML page.
const SWAGGER_UI_DIST_VERSION = '5.32.8';
const SWAGGER_UI_CDN_BASE = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_UI_DIST_VERSION}`;

@Controller('docs')
export class DocsController {
  @Get()
  getDocs(@Res() res: Response): void {
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WattAPI API Docs</title>
  <link rel="stylesheet" href="${SWAGGER_UI_CDN_BASE}/swagger-ui.css">
  <style>
    body { margin: 0; background: #fafafa; }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${SWAGGER_UI_CDN_BASE}/swagger-ui-bundle.js"></script>
  <script src="${SWAGGER_UI_CDN_BASE}/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/docs-json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: 'StandaloneLayout',
      });
    };
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  }
}
