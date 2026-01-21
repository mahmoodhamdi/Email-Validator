const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-font-assets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-image-assets',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:js)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-js-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:css|less)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-style-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\/api\/validate/i,
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'others',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */

/**
 * Generate CSP nonce for inline scripts (if needed in the future).
 * Currently using 'unsafe-inline' due to Next.js requirements.
 */

/**
 * CSP Report URI - set via environment variable in production.
 */
const cspReportUri = process.env.CSP_REPORT_URI || '/api/csp-report';

/**
 * Security headers to protect against common web vulnerabilities.
 * Following OWASP recommendations and modern security best practices.
 */
const securityHeaders = [
  // DNS prefetch control - enables DNS prefetching for performance
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Prevent clickjacking - use CSP frame-ancestors instead (more modern)
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // XSS protection (legacy, but still useful for older browsers)
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // Control referrer information sent with requests
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Disable browser features we don't need
  {
    key: 'Permissions-Policy',
    value: [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'interest-cohort=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
    ].join(', '),
  },
  // HTTP Strict Transport Security - enforce HTTPS
  // Note: Only enable in production with proper HTTPS setup
  ...(process.env.NODE_ENV === 'production'
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains',
        },
      ]
    : []),
  // Cross-Origin-Opener-Policy - isolate browsing context
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  // Cross-Origin-Resource-Policy - control resource sharing
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-origin',
  },
  // Content Security Policy - primary defense against XSS
  {
    key: 'Content-Security-Policy',
    value: [
      // Default fallback - restrict to same origin
      "default-src 'self'",
      // Scripts - self and inline (required for Next.js)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Styles - self and inline (required for styled-components/CSS-in-JS)
      "style-src 'self' 'unsafe-inline'",
      // Images - self, data URIs, and blob for dynamic images
      "img-src 'self' data: blob:",
      // Fonts - self only
      "font-src 'self'",
      // Connect - self and DNS API for MX lookups
      "connect-src 'self' https://dns.google",
      // Frames - none allowed
      "frame-ancestors 'none'",
      // Base URI - self only
      "base-uri 'self'",
      // Form submissions - self only
      "form-action 'self'",
      // Object/embed - none
      "object-src 'none'",
      // Upgrade insecure requests in production
      ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
      // CSP violation reporting
      `report-uri ${cspReportUri}`,
    ].join('; '),
  },
];

/**
 * Security headers specifically for API routes.
 * More restrictive than page headers.
 */
const apiSecurityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Cache-Control',
    value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
  },
  {
    key: 'Pragma',
    value: 'no-cache',
  },
  {
    key: 'Expires',
    value: '0',
  },
];

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  /**
   * Add security headers to all routes.
   */
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Additional headers for API routes
        source: '/api/:path*',
        headers: apiSecurityHeaders,
      },
      {
        // Allow the security.txt to be fetched
        source: '/.well-known/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain',
          },
        ],
      },
    ];
  },

  /**
   * Powered by header removal for security.
   */
  poweredByHeader: false,
};

module.exports = withNextIntl(withPWA(nextConfig));
