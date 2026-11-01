import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import {ElementPlusResolver} from 'unplugin-vue-components/resolvers';
import {resolve} from 'path';
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        https: process.env.ADB_DEV_HTTPS === '1',
        host: '127.0.0.1',
        port: 5173,
        strictPort: true,
        open: false,
        proxy: {
            '/adb-bridge': { target: 'http://127.0.0.1:5858', ws: true, changeOrigin: true },
        },
    },
    resolve: {
        alias: {
            // @ 替代为 src
            '@': resolve(__dirname, 'src'),
            // @component 替代为 src/component
        },
    },
    plugins: [
        ...(process.env.ADB_DEV_HTTPS === '1' ? [basicSsl()] : []),
        vue(),
        AutoImport({
            resolvers: [ElementPlusResolver()],
            // 添加 Vue 相关的自动导入配置
            imports: [
                'vue',
                {
                    'vue': [
                        'reactive',
                        'ref',
                        'computed',
                        'watch',
                        'onMounted',
                        'onUnmounted'
                        // 根据需要添加更多 Vue Hook 或 API
                    ],
                },
                'vue-router',
                {'vue-router': ['createRouter', 'createWebHistory', 'useRouter', 'useRoute']},
            ],
            dts: 'src/auto-imports.d.ts',
        }),
        Components({
            resolvers: [ElementPlusResolver()],
        }),
    ],
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern-compiler',
            }
        }
    }
});
