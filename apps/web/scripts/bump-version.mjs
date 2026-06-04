#!/usr/bin/env node
/**
 * 统一修改项目三处版本号
 * Usage: node scripts/bump-version.mjs <version>
 * Example: node scripts/bump-version.mjs 0.2.0
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const newVersion = process.argv[2];

if (!newVersion) {
  console.error('Usage: node scripts/bump-version.mjs <version>');
  console.error('Example: node scripts/bump-version.mjs 0.2.0');
  process.exit(1);
}

// 简单的 semver 验证
const semverRegex = /^\d+\.\d+\.\d+$/;
if (!semverRegex.test(newVersion)) {
  console.error(`Invalid version format: "${newVersion}". Expected format: x.y.z`);
  process.exit(1);
}

const files = [
  {
    path: join(root, 'package.json'),
    regex: /"version":\s*"[^"]+"/,
    replacement: `"version": "${newVersion}"`,
    name: 'package.json',
  },
];

console.log(`Bumping version to ${newVersion}\n`);

let allSuccess = true;
const results = [];

for (const file of files) {
  try {
    const content = readFileSync(file.path, 'utf-8');
    const oldMatch = content.match(file.regex);
    const oldVersion = oldMatch ? oldMatch[0] : 'NOT FOUND';

    if (!file.regex.test(content)) {
      console.error(`  ✗ ${file.name}: version field not found`);
      allSuccess = false;
      continue;
    }

    const newContent = content.replace(file.regex, file.replacement);
    writeFileSync(file.path, newContent, 'utf-8');

    // 验证写入成功
    const verifyContent = readFileSync(file.path, 'utf-8');
    const verifyMatch = verifyContent.match(file.regex);
    const verifyVersion = verifyMatch ? verifyMatch[0] : 'NOT FOUND';

    if (verifyVersion.includes(newVersion)) {
      console.log(`  ✓ ${file.name}: ${oldVersion} → ${verifyVersion}`);
      results.push({ name: file.name, old: oldVersion, new: verifyVersion });
    } else {
      console.error(`  ✗ ${file.name}: verification failed`);
      allSuccess = false;
    }
  } catch (err) {
    console.error(`  ✗ ${file.name}: ${err.message}`);
    allSuccess = false;
  }
}

console.log('');

if (allSuccess) {
  console.log('✅ All version numbers updated successfully!');
  console.log(`\nNext steps:`);
  console.log(`  git add package.json`);
  console.log(`  git commit -m "chore: bump version to ${newVersion}"`);
  process.exit(0);
} else {
  console.error('❌ Some files failed to update. Please check manually.');
  process.exit(1);
}
