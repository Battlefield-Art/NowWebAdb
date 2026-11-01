import { readFile, copyFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const version = '3.3.3';
const packageRoot = new URL('../node_modules/@yume-chan/fetch-scrcpy-server/', import.meta.url);
const source = new URL('server.bin', packageRoot);
const destination = new URL('../web/public/server.bin', import.meta.url);
let cached = false;
try {
    const versionFile = await readFile(new URL('version.js', packageRoot), 'utf8');
    const binary = await readFile(source);
    cached = versionFile.includes(`'${version}'`) && binary[0] === 0x50 && binary[1] === 0x4b;
} catch {}
if (!cached) {
    await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [fileURLToPath(new URL('bin/fetch-server.js', packageRoot)), version], { stdio: 'inherit' });
        child.once('error', reject);
        child.once('exit', code => code === 0 ? resolve() : reject(new Error(`scrcpy ${version} 下载失败 (${code})`)));
    });
}
const binary = await readFile(source);
if (binary.length < 1024 || binary[0] !== 0x50 || binary[1] !== 0x4b) {
    throw new Error('scrcpy 服务端不是有效的 JAR 文件');
}
await copyFile(source, destination);
console.log(`scrcpy ${version} ready: web/public/server.bin (${binary.length} bytes)`);
