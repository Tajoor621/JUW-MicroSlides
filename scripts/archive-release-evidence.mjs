import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
// Fixed historical source, never a current qualification certificate.
const commit = 'b95ff43a9d59bc33a1004b26c1146d5a2c722713';
const root = 'qualification-results/historical';
await mkdir(root, { recursive: true });
const paths = execFileSync('git', ['ls-tree', '-r', '--name-only', commit], {encoding:'utf8'})
  .split('\n').filter(p => /^docs\/(?:qualification\/|WORKFLOW-REPORT-)/.test(p));
for (const path of paths) {
 const output = join(root, path.replaceAll('/', '_'));
 await writeFile(output, execFileSync('git', ['show', `${commit}:${path}`]));
}
await writeFile(join(root, 'provenance.json'), JSON.stringify({commit, paths, status:'Historical evidence only; preserve failed and incomplete results.'},null,2));
