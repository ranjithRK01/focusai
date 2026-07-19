import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        {
            name: 'copy-assets',
            writeBundle: function (options, bundle) {
                // Copy manifest.json
                fs.copyFileSync(path.resolve(__dirname, 'manifest.json'), path.resolve(__dirname, 'dist', 'manifest.json'));
                // Find content CSS and copy it to content/index.css
                for (var fileName in bundle) {
                    if (fileName.includes('content') && fileName.endsWith('.css')) {
                        var contentCssDest = path.resolve(__dirname, 'dist', 'content', 'index.css');
                        var contentCssDir = path.dirname(contentCssDest);
                        if (!fs.existsSync(contentCssDir)) {
                            fs.mkdirSync(contentCssDir, { recursive: true });
                        }
                        fs.copyFileSync(path.resolve(__dirname, 'dist', fileName), contentCssDest);
                        // Update manifest.json to use the correct CSS path
                        var manifestPath = path.resolve(__dirname, 'dist', 'manifest.json');
                        var manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                        manifest.content_scripts[0].css = ['content/index.css'];
                        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
                        break;
                    }
                }
                // Copy icons folder if it exists
                var iconsSrc = path.resolve(__dirname, 'icons');
                var iconsDest = path.resolve(__dirname, 'dist', 'icons');
                if (fs.existsSync(iconsSrc)) {
                    if (!fs.existsSync(iconsDest)) {
                        fs.mkdirSync(iconsDest, { recursive: true });
                    }
                    var files = fs.readdirSync(iconsSrc);
                    files.forEach(function (file) {
                        var srcPath = path.join(iconsSrc, file);
                        var destPath = path.join(iconsDest, file);
                        if (fs.statSync(srcPath).isFile()) {
                            fs.copyFileSync(srcPath, destPath);
                        }
                    });
                }
            },
        },
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        rollupOptions: {
            input: {
                popup: path.resolve(__dirname, 'index.html'),
                background: path.resolve(__dirname, 'src/background/index.ts'),
                content: path.resolve(__dirname, 'src/content/index.ts'),
                options: path.resolve(__dirname, 'options.html'),
            },
            output: [
                // First output for popup/options (default esm)
                {
                    entryFileNames: '[name]/index.js',
                    chunkFileNames: 'assets/[name]-[hash].js',
                    assetFileNames: 'assets/[name]-[hash][extname]',
                    manualChunks: function (id) {
                        if (id.includes('node_modules'))
                            return 'vendor';
                    }
                }
            ],
        },
    },
});
