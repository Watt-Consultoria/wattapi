import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { marked } from 'marked';

@Controller('docs')
export class DocsController {
  @Get()
  async getDocs(@Res() res: Response): Promise<void> {
    const mdPath = join(process.cwd(), 'API.md');
    const markdown = readFileSync(mdPath, 'utf-8');
    const body = await marked(markdown);

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WattAPI — Documentação</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; line-height: 1.6; color: #24292f; background: #fff; padding: 40px 20px; }
    .container { max-width: 860px; margin: 0 auto; }
    h1 { font-size: 2em; border-bottom: 2px solid #e1e4e8; padding-bottom: 10px; margin-bottom: 24px; margin-top: 0; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #e1e4e8; padding-bottom: 6px; margin: 32px 0 12px; }
    h3 { font-size: 1.15em; margin: 20px 0 8px; }
    h4 { font-size: 1em; margin: 16px 0 6px; color: #57606a; }
    p { margin-bottom: 12px; }
    code { font-family: 'SFMono-Regular', Consolas, monospace; font-size: 0.875em; background: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 4px; padding: 2px 5px; }
    pre { background: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 6px; padding: 16px; overflow-x: auto; margin-bottom: 16px; }
    pre code { background: none; border: none; padding: 0; font-size: 0.85em; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    th, td { border: 1px solid #d0d7de; padding: 8px 12px; text-align: left; }
    th { background: #f6f8fa; font-weight: 600; }
    tr:nth-child(even) { background: #f9fafb; }
    ul, ol { padding-left: 24px; margin-bottom: 12px; }
    li { margin-bottom: 4px; }
    hr { border: none; border-top: 1px solid #e1e4e8; margin: 24px 0; }
    strong { font-weight: 600; }
    blockquote { border-left: 4px solid #d0d7de; padding-left: 16px; color: #57606a; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="container">
    ${body}
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  }
}
