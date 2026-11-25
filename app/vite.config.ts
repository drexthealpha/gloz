import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

// Three builds from one code base:
//   npm run build        the Even Hub app (index.html), packed into the .ehpk
//   npm run build:demo   the live demo (demo.html) for GitHub Pages
//   npm run build:check  the phone screens with sample data (published at /phone/)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), tailwindcss()],
  // React's API on Preact (about 4 KB): shadcn/ui and Radix run unchanged, and the page stays inside the script budget.
  resolve: { alias: { '@': resolve(__dirname, 'src'), react: 'preact/compat', 'react-dom/client': 'preact/compat/client', 'react-dom': 'preact/compat', 'react/jsx-runtime': 'preact/jsx-runtime' } },
  publicDir: mode === 'demo' ? 'demo-public' : 'public',
  server: { host: true, port: 5173, fs: { allow: ['..'] } },
  // License notices are kept once each, at the end of each file.
  esbuild: { legalComments: 'eof' },
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: { compress: { passes: 2 } },
    modulePreload: false,
    outDir: mode === 'demo' ? 'dist-demo' : mode === 'check' ? 'dist-check' : 'dist',
    rollupOptions: { input: { index: resolve(__dirname, mode === 'demo' ? 'demo.html' : mode === 'check' ? 'phone-check.html' : 'index.html') } },
  },
}))
