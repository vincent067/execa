<picture>
	<source media="(prefers-color-scheme: dark)" srcset="../media/logo_dark.svg">
	<img alt="execa logo" src="../media/logo.svg" width="400">
</picture>
<br>

# 📚 Common use cases

This guide provides practical examples for common scenarios when using Execa.

## Running build tools

```js
import {$} from 'execa';

// Run npm install and capture output
const {stdout} = await $`npm install`;
console.log('Dependencies installed:', stdout);

// Run build with error handling
try {
  await $`npm run build`;
  console.log('✅ Build completed successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
```

## Git operations

```js
import {$} from 'execa';

// Get current branch
const {stdout: branch} = await $`git branch --show-current`;
console.log('Current branch:', branch);

// Get latest commit hash (short)
const {stdout: commitHash} = await $`git rev-parse --short HEAD`;

// Check if working directory is clean
const {stdout: status} = await $`git status --porcelain`;
const isClean = status === '';
```

## Docker commands

```js
import {$} from 'execa';

// Build Docker image with dynamic tag
const version = '1.0.0';
await $`docker build -t myapp:${version} .`;

// Run container and capture logs
const {stdout} = await $`docker run --rm myapp:${version}`;

// Check if container is running
const {stdout: containers} = await $`docker ps --filter name=myapp --format {{.Names}}`;
```

## File processing

```js
import {$} from 'execa';
import {promises as fs} from 'node:fs';

// Find all JavaScript files
const {stdout} = await $`find . -name "*.js" -type f`;
const files = stdout.split('\n').filter(Boolean);

// Count lines in each file
for (const file of files) {
  const {stdout: count} = await $`wc -l ${file}`;
  console.log(`${file}: ${count.trim()} lines`);
}

// Batch process with parallel execution
await Promise.all(
  files.map(file => $`eslint --fix ${file}`)
);
```

## Working with environment variables

```js
import {execa} from 'execa';

// Run with specific environment variables
await execa({
  env: {
    NODE_ENV: 'production',
    API_KEY: process.env.API_KEY,
    LOG_LEVEL: 'info'
  }
})`node server.js`;

// Override specific env vars while keeping others
await execa({
  env: {DEBUG: 'app:*'},
  extendEnv: true
})`npm start`;
```

## Piping commands

```js
import {$} from 'execa';

// Chain multiple commands
const result = await $`cat package.json`
  .pipe`grep dependencies`
  .pipe`wc -l`;

console.log('Dependency lines:', result.stdout);

// Pipe with filtering
const filtered = await $`ls -la`
  .pipe`grep -v node_modules`
  .pipe`grep -v '.git'`;
```

## Handling timeouts

```js
import {$} from 'execa';

// Kill process after timeout
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);

try {
  await $({signal: controller.signal, killSignal: 'SIGTERM'})`long-running-task`;
} finally {
  clearTimeout(timeout);
}

// Or use the simpler timeout option
await $({timeout: 5000, killSignal: 'SIGTERM'})`long-running-task`;
```

## Progress indication

```js
import {$} from 'execa';

// Stream output to console in real-time
const subprocess = $`npm run build`;

subprocess.stdout.on('data', (data) => {
  process.stdout.write(data);
});

await subprocess;
```

## Conditional execution

```js
import {$} from 'execa';
import {existsSync} from 'node:fs';

// Only install if node_modules doesn't exist
if (!existsSync('node_modules')) {
  await $`npm install`;
}

// Run tests only if source files changed
const {stdout: hasChanges} = await $`git diff --name-only src/`;
if (hasChanges) {
  await $`npm test`;
}
```

## Error handling patterns

```js
import {$} from 'execa';

// Continue on error
const results = await Promise.allSettled([
  $`npm run test:unit`,
  $`npm run test:integration`,
  $`npm run test:e2e`
]);

const failed = results.filter(r => r.status === 'rejected');
if (failed.length > 0) {
  console.error(`${failed.length} test suites failed`);
  failed.forEach((f, i) => console.error(`  - Suite ${i + 1}: ${f.reason.message}`));
}

// Retry on failure
async function runWithRetry(command, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await $`${command}`;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Attempt ${i + 1} failed, retrying...`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

await runWithRetry`npm run flaky-test`;
```

## CI/CD patterns

```js
import {$} from 'execa';
import process from 'node:process';

// CI-friendly output
const isCI = process.env.CI === 'true';

const $ci = $({
  verbose: isCI ? 'full' : 'none',
  env: {
    FORCE_COLOR: isCI ? '0' : '1'
  }
});

// Exit with proper code on failure
try {
  await $ci`npm run build`;
  await $ci`npm run test`;
} catch (error) {
  console.error('CI pipeline failed:', error.message);
  process.exit(1);
}
```

<hr>

[**Next**: 🔍 Differences with Bash and zx](bash.md)\
[**Previous**: 📎 Windows](windows.md)\
[**Top**: Table of contents](../readme.md#documentation)
