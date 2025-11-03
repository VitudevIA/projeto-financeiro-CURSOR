import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* Optimizations */
  
  // Code Splitting
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog'],
  },

  // Compressão
  compress: true,

  // Otimização de imagens
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  // Headers de segurança
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },

  // Configuração do Turbopack (Next.js 16+ usa Turbopack por padrão)
  turbopack: {},
  
  // Pacotes externos para server components (evita bundle no servidor)
  // pdf-parse deve ser tratado como externo pois usa módulos nativos do Node.js
  serverExternalPackages: ['pdf-parse'],

  // Configuração do webpack (fallback quando --webpack é usado)
  webpack: (config: any, { isServer }: any) => {
    // Bundle analyzer (apenas em build)
    if (process.env.ANALYZE === 'true' && !isServer) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: '../analyze/client.html',
        })
      )
    }

    // Garante que pdf-parse só seja usado no servidor
    // pdf-parse usa bibliotecas nativas do Node.js e não pode ser bundlado no cliente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
      
      // Exclui pdf-parse do bundle do cliente
      config.externals = config.externals || []
      if (typeof config.externals === 'function') {
        const originalExternals = config.externals
        config.externals = [
          originalExternals,
          ({ request }: any) => {
            if (request === 'pdf-parse') {
              return 'commonjs pdf-parse'
            }
          },
        ]
      } else {
        config.externals.push('pdf-parse')
      }
    }
    
    // No servidor, permite require de módulos CommonJS
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }
    
    return config
  },
}

export default nextConfig
