import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('app')
@Controller()
export class AppController {
  @Get('manifest.json')
  @Header('Content-Type', 'application/manifest+json; charset=utf-8')
  @ApiOperation({ summary: 'PWA manifest' })
  manifest() {
    return {
      name: 'Loyalty Wallet',
      short_name: 'Wallet',
      description: 'Digital loyalty wallet platform',
      start_url: '/app',
      display: 'standalone',
      background_color: '#000000',
      theme_color: '#000000',
      orientation: 'portrait-primary',
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    };
  }

  @Get('sw.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @ApiOperation({ summary: 'Service worker' })
  serviceWorker() {
    return `const CACHE='loyalty-v1';
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',e=>{e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});`;
  }
}
