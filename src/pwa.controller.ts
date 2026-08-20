import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('app')
@Controller('app')
export class PwaController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'PWA entry' })
  index() {
    return this.shell('Fidélité', 'auth');
  }

  @Get('auth')
  @Header('Content-Type', 'text/html; charset=utf-8')
  auth() {
    return this.shell('Connexion', 'auth');
  }

  @Get('client')
  @Header('Content-Type', 'text/html; charset=utf-8')
  client() {
    return this.shell('Ma carte', 'client');
  }

  @Get('staff')
  @Header('Content-Type', 'text/html; charset=utf-8')
  staff() {
    return this.shell('Caisse', 'staff');
  }

  @Get('admin')
  @Header('Content-Type', 'text/html; charset=utf-8')
  admin() {
    return this.shell('Admin', 'admin');
  }

  private shell(title: string, route: string): string {
    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=1" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="theme-color" content="#0c0c0e" />
  <title>${title}</title>
  <link rel="stylesheet" href="/public/app.css" />
</head>
<body>
  <div id="app"></div>
  <script>window.__ROUTE__=${JSON.stringify(route)};</script>
  <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
  <script src="/public/app.js"></script>
</body>
</html>`;
  }
}
