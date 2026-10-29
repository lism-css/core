import { existsSync, lstatSync, statSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pc from 'picocolors';

export interface InitOptions {
  force: boolean;
}

/**
 * Bundled scaffold templates.
 *
 * `src/commands/init.ts` and the compiled `dist/commands/init.js` sit at the
 * same depth below the package root, so one relative URL works for both the
 * test run (from `src`) and the published build (from `dist`).
 */
const TEMPLATES_DIR = fileURLToPath(new URL('../../templates/', import.meta.url));

async function collectTemplateFiles(root: string, relative = ''): Promise<string[]> {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  const files: string[] = [];

  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await collectTemplateFiles(root, childRelative)));
    } else if (entry.isFile()) {
      files.push(childRelative);
    }
  }

  return files;
}

type PathKind = 'missing' | 'directory' | 'file' | 'symlink';

function pathKind(target: string): PathKind {
  try {
    const link = lstatSync(target, { throwIfNoEntry: false });
    if (!link) return 'missing';
    if (link.isSymbolicLink()) return 'symlink';
    return link.isDirectory() ? 'directory' : 'file';
  } catch {
    // Unreadable path: treat it as occupied instead of failing mid-write.
    return 'file';
  }
}

/**
 * Whether the target directory itself is usable. Unlike the paths below it, the
 * target (and its ancestors, e.g. macOS `/tmp` → `/private/tmp`) may legitimately
 * be a symlink, so this one follows links.
 */
function targetDirIsBlocked(targetDir: string): boolean {
  try {
    const link = lstatSync(targetDir, { throwIfNoEntry: false });
    if (!link) return false;
    // A broken or non-directory symlink still occupies the path.
    return !(statSync(targetDir, { throwIfNoEntry: false })?.isDirectory() ?? false);
  } catch {
    return true;
  }
}

function requiredDirectories(templateFiles: string[]): string[] {
  const directories = new Set<string>();

  for (const relative of templateFiles) {
    const segments = relative.split('/');
    segments.pop();

    let current = '';
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      directories.add(current);
    }
  }

  return [...directories];
}

/**
 * Paths whose type clashes with the scaffold layout: a parent that is not a
 * directory, an output file that is a directory, or any symlink below the
 * target directory. Symlinks are refused outright — following one would write
 * outside the target — and none of these can be fixed by `--force`, so they are
 * all reported before anything is written.
 */
function collectLayoutConflicts(targetDir: string, templateFiles: string[]): string[] {
  const conflicts = new Map<string, string>();
  const add = (relative: string, reason: string): void => {
    if (!conflicts.has(relative)) conflicts.set(relative, reason);
  };

  // Everything below is unreachable while the target itself is occupied, so report only that.
  if (targetDirIsBlocked(targetDir)) return ['. (not a directory)'];

  for (const relative of requiredDirectories(templateFiles)) {
    const kind = pathKind(path.join(targetDir, relative));
    if (kind === 'symlink') add(relative, 'symlink');
    else if (kind === 'file') add(relative, 'not a directory');
  }
  for (const relative of templateFiles) {
    const kind = pathKind(path.join(targetDir, relative));
    if (kind === 'symlink') add(relative, 'symlink');
    else if (kind === 'directory') add(relative, 'directory');
  }

  return [...conflicts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([relative, reason]) => `${relative} (${reason})`);
}

/**
 * Last-line defence for the gap between the check above and the write: refuse to
 * write through a symlink that appeared in the meantime.
 */
function assertNoSymlinkOnPath(targetDir: string, relative: string): void {
  let current = '';
  for (const segment of relative.split('/')) {
    current = current ? `${current}/${segment}` : segment;
    if (pathKind(path.join(targetDir, current)) === 'symlink') {
      throw new Error(`"${current}" is a symlink. The scaffold is never written through a symlink.`);
    }
  }
}

/**
 * Scaffold a data directory (sample pages + contract guide).
 *
 * Existing files are never touched without `--force`: every collision is checked
 * up front, so a single one aborts the command before anything is written.
 */
export async function initCommand(dir: string, options: InitOptions): Promise<void> {
  const targetDir = path.resolve(dir);

  let templateFiles: string[];
  try {
    templateFiles = await collectTemplateFiles(TEMPLATES_DIR);
  } catch {
    templateFiles = [];
  }
  if (templateFiles.length === 0) {
    throw new Error(`Scaffold templates are missing from the installed package (expected in ${TEMPLATES_DIR}). Reinstall @lism-css/mockup.`);
  }

  // Checked even with `--force`, because writing would otherwise fail halfway
  // through: `mkdir(targetDir/pages)` only errors after `AGENTS.md` and friends
  // have already been written.
  const layoutConflicts = collectLayoutConflicts(targetDir, templateFiles);
  if (layoutConflicts.length > 0) {
    throw new Error(
      [
        `${layoutConflicts.length} path(s) in ${targetDir} already exist as something else than the scaffold needs. Nothing was written.`,
        ...layoutConflicts.map((conflict) => `  - ${conflict}`),
        'lism-mockup init never swaps a file for a directory (or the other way around) and never writes through a symlink, not even with --force. Remove or rename them, or pick another directory.',
      ].join('\n')
    );
  }

  if (!options.force) {
    const conflicts = templateFiles.filter((relative) => existsSync(path.join(targetDir, relative)));
    if (conflicts.length > 0) {
      throw new Error(
        [
          `${conflicts.length} file(s) already exist in ${targetDir}. Nothing was written.`,
          ...conflicts.map((relative) => `  - ${relative}`),
          'Re-run with --force to overwrite them, or pick an empty directory.',
        ].join('\n')
      );
    }
  }

  const created: string[] = [];
  try {
    for (const relative of templateFiles) {
      const destination = path.join(targetDir, relative);
      // Re-checked around `mkdir` so a symlink created after the layout check
      // can neither host new directories nor receive the file (`w` would follow
      // it; `wx` already fails on its own).
      assertNoSymlinkOnPath(targetDir, relative);
      await mkdir(path.dirname(destination), { recursive: true });
      assertNoSymlinkOnPath(targetDir, relative);
      // `wx` keeps the no-overwrite guarantee even if a file appears between the
      // collision check above and this write.
      await writeFile(destination, await readFile(path.join(TEMPLATES_DIR, relative)), {
        flag: options.force ? 'w' : 'wx',
      });
      created.push(relative);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const partial =
      created.length > 0
        ? [
            `${created.length} file(s) were written before the failure and are left in place:`,
            ...created.map((relative) => `  - ${relative}`),
            `Remove them (or the whole directory) and run "lism-mockup init ${dir}" again, or re-run with --force.`,
          ]
        : ['No files were written.'];

    throw new Error([`Failed while writing the scaffold: ${reason}`, ...partial].join('\n'));
  }

  console.log(pc.green(`[lism-mockup] Created ${created.length} file(s) in ${targetDir}:`));
  for (const relative of created) {
    console.log(pc.dim(`  ${relative}`));
  }
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Read ${path.join(dir, 'README.md')} — it is the data contract for this directory.`);
  console.log('  2. Edit pages/*.jsx, mockup.config.json and tokens.json.');
  console.log(`  3. Run "lism-mockup check ${dir}" to validate (this is the self-check for agents).`);
  console.log(`  4. Run "lism-mockup dev ${dir}" to review the screens in a browser.`);
}
