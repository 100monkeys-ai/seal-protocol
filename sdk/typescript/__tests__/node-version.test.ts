/**
 * The Node lines this SDK is built and tested on, declared once.
 *
 * `.nvmrc` holds the Node major version the SDK is built on. `engines.node`
 * in package.json names the lowest Node line users may run it on. CI tests
 * on both, as a matrix. Every place that names a Node version must agree
 * with those two, or this test fails:
 *
 * - every `actions/setup-node` step reads `.nvmrc`, except the test job,
 *   which runs the matrix;
 * - the matrix holds exactly the engines floor and the `.nvmrc` line;
 * - `engines.node` and `@types/node` in package.json and the lockfile;
 * - the Node version the READMEs tell users they need.
 *
 * Before this test CI built on Node 20, which is past its end of life, the
 * audit ran on Node 22, the types described Node 25 and nothing declared
 * which Node the SDK supports.
 */
import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sdk = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(sdk, '../..');
const read = (file: string) => readFileSync(file, 'utf8');

const nvmrc = read(path.join(sdk, '.nvmrc'));
const major = nvmrc.trim();
const pkg = JSON.parse(read(path.join(sdk, 'package.json')));
const lock = JSON.parse(read(path.join(sdk, 'package-lock.json')));
const floor = String(pkg.engines?.node ?? '').replace(/^>=/, '');

describe('the Node lines', () => {
    it('.nvmrc holds a bare major version and nothing else', () => {
        expect(nvmrc).toMatch(/^\d+\n$/);
    });

    it('engines.node names a lowest major and nothing else, below or at .nvmrc', () => {
        expect(pkg.engines.node).toMatch(/^>=\d+$/);
        expect(lock.packages[''].engines.node).toBe(pkg.engines.node);
        expect(Number(floor)).toBeLessThanOrEqual(Number(major));
    });

    it('every setup-node step reads .nvmrc, and the test matrix holds the floor and .nvmrc', () => {
        const dir = path.join(repo, '.github/workflows');
        let steps = 0;
        let matrices = 0;
        for (const file of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
            const lines = read(path.join(dir, file)).split('\n');
            steps += lines.filter((l) => /uses:\s*actions\/setup-node@/.test(l)).length;
            for (const line of lines) {
                const m = line.match(/^\s*node-version(-file)?:\s*(.*?)\s*$/);
                if (!m) continue;
                if (m[1]) {
                    expect(`${file}: ${m[2]}`).toBe(`${file}: sdk/typescript/.nvmrc`);
                } else {
                    expect(`${file}: ${m[2]}`).toBe(`${file}: \${{ matrix.node }}`);
                }
            }
            for (const line of lines) {
                const m = line.match(/^\s*node:\s*\[(.*)\]\s*$/);
                if (!m) continue;
                matrices++;
                const values = m[1].split(',').map((v) => v.trim().replace(/^['"]|['"]$/g, ''));
                expect(values).toEqual([...new Set([floor, major])]);
            }
            const versions = lines.filter((l) => /^\s*node-version(-file)?:/.test(l)).length;
            expect(`${file}: ${versions} node versions`).toBe(
                `${file}: ${lines.filter((l) => /uses:\s*actions\/setup-node@/.test(l)).length} node versions`,
            );
        }
        // ci.yml has two jobs that set up Node, npm-publish.yml two and
        // security.yml one; ci.yml's test job is the one matrix.
        expect(steps).toBe(5);
        expect(matrices).toBe(1);
    });

    it('@types/node describes the .nvmrc major', () => {
        const range = pkg.devDependencies['@types/node'] as string;
        expect(range).toMatch(new RegExp(`^\\^${major}\\.\\d+\\.\\d+$`));
        expect(lock.packages[''].devDependencies['@types/node']).toBe(range);
        const resolved = lock.packages['node_modules/@types/node'].version as string;
        expect(resolved.split('.')[0]).toBe(major);
    });

    it('the READMEs name the engines floor as the Node users need', () => {
        expect(read(path.join(sdk, 'README.md'))).toContain(`- Node.js ${floor} or higher`);
        expect(read(path.join(sdk, 'README.md'))).toContain(`badge/node-${floor}%2B-blue`);
        expect(read(path.join(repo, 'README.md'))).toContain(
            `TypeScript / Node.js ${floor}+ client SDK`,
        );
        for (const file of [path.join(sdk, 'README.md'), path.join(repo, 'README.md')]) {
            for (const m of read(file).matchAll(/Node\.js (\d+)/g)) {
                expect(`${path.basename(path.dirname(file))}: ${m[1]}`).toBe(
                    `${path.basename(path.dirname(file))}: ${floor}`,
                );
            }
        }
    });
});
