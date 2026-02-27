import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'

export default defineConfig({
  plugins: [
    react(),
    createSvgIconsPlugin({
      // 指定需要缓存的图标文件夹
      iconDirs: [path.resolve(process.cwd(), 'src/asserts/svg')],
      // 指定 symbolId 格式
      symbolId: 'icon-[dir]-[name]',
      // 注入到 body 第一个
      inject: 'body-first',
      // 自定义 SVG 属性
      svgoOptions: {
        plugins: [
          {
            name: 'preset-default',
            params: {
              overrides: {
                removeViewBox: false,
              },
            },
          },
        ],
      },
    }),
  ],
  root: 'src',
  base: './',
  build: { outDir: '../dist', emptyOutDir: true },
  server: { port: 5173, strictPort: true },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@asserts': path.resolve(__dirname, 'src/asserts'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@layout': path.resolve(__dirname, 'src/components/layout'),
      '@ui': path.resolve(__dirname, 'src/components/ui'),
      '@pages': path.resolve(__dirname, 'src/components/pages'),
      '@modals': path.resolve(__dirname, 'src/components/modals'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@contexts': path.resolve(__dirname, 'src/contexts'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@config': path.resolve(__dirname, 'src/config'),
    },
  },
})
