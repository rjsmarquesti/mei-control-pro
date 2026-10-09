/** @type {import('next').NextConfig} */
import withPWA from 'next-pwa';
import defaultCache from 'next-pwa/cache.js';

// O cache 'apis' guardava GET de /api/* por 24h sem separar usuários: em aparelho
// compartilhado, dados financeiros do usuário anterior poderiam reaparecer sem rede.
const runtimeCaching = defaultCache.filter((rule) => rule.options?.cacheName !== 'apis');

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',  value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options',          value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options',   value: 'nosniff' },
  { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'X-XSS-Protection',        value: '1; mode=block' },
  // CSP conservador — fonts.googleapis/gstatic (Google Fonts, app/globals.css) e
  // n8n.divulgabr.com.br (fetch direto do client em app/captacao/page.tsx) liberados
  // explicitamente; nenhum outro script/fetch externo encontrado no app.
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://n8n.divulgabr.com.br; frame-ancestors 'self';" },
]

const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'app.sismeipro.com.br' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching,
  buildExcludes: [/middleware-manifest\.json$/],
})(nextConfig)
