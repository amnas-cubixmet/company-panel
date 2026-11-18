import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export function companyPanelWorker() {
  return {
    name: 'company-panel-pwa',
    apply: 'build',
    async writeBundle(output) {
      const directory = output.dir;
      const assets = (await readdir(resolve(directory, 'assets'), { recursive: true }))
        .filter(file => /\.(?:js|css|woff2?|png|svg|webp|jpe?g|avif|ttf|ico)$/i.test(file))
        .map(file => 'assets/' + file.replaceAll('\\', '/'));
      const files = [
        'index.html', 'manifest.webmanifest', 'favicon.png', 'icons.svg',
        'app-icon-180.png', 'app-icon-192.png', 'app-icon-512.png', 'app-icon-maskable.png',
        ...assets,
      ].sort();
      const template = await readFile(new URL('./service-worker.js', import.meta.url), 'utf8');
      const version = createHash('sha256').update(template);
      for (const file of files) version.update(file).update(await readFile(resolve(directory, file)));
      const worker = template
        .replace('__CUBIXGEAR_VERSION__', version.digest('hex').slice(0, 20))
        .replace('__CUBIXGEAR_ASSETS__', JSON.stringify(files.map(file => '/' + file)));
      await writeFile(resolve(directory, 'sw.js'), worker);
    },
  };
}
