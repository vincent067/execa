<picture>
	<source media="(prefers-color-scheme: dark)" srcset="../media/logo_dark.svg">
	<img alt="execa logo" src="../media/logo.svg" width="400">
</picture>
<br>

# 📎 Windows

Although each OS implements subprocesses very differently, Execa makes them cross-platform, except in a few instances.

## Shebang

On Unix, executable files can use [shebangs](https://en.wikipedia.org/wiki/Shebang_(Unix)).

```js
import {execa} from 'execa';

// If script.js starts with #!/usr/bin/env node
await execa`./script.js`;

// Then, the above is a shortcut for:
await execa`node ./script.js`;
```

Although Windows does not natively support shebangs, Execa adds support for them.

## PATHEXT support

On Windows, the [`PATHEXT`](https://ss64.com/nt/path.html#pathext) environment variable defines which file extensions can be executed without specifying the extension. For example, if `.JS` is in `PATHEXT`:

```js
// On Windows, if PATHEXT includes .JS, both work:
await execa`node script.js`;
await execa`node script`; // Automatically finds script.js
```

Execa uses [`node-which`](https://github.com/npm/node-which) internally to resolve the absolute file path of the executable, ensuring proper `PATHEXT` support on Windows.

## Commands with spaces

Windows requires files and arguments to be quoted when they contain spaces, tabs, backslashes or double quotes. Unlike Unix, this is needed even when no [shell](shell.md) is used.

When not using any shell, Execa performs that quoting automatically. This ensures files and arguments are split correctly.

```js
await execa`npm run ${'task with space'}`;
```

## How Windows execution works

Under the hood, Execa uses [`node-cross-spawn`](https://github.com/moxystudio/node-cross-spawn) to fix several Windows-specific issues. Here's what happens when you run a command on Windows:

1. **Resolve the executable**: The command name is resolved to an absolute path using `node-which`, which properly handles `PATHEXT`.

2. **Detect shebangs**: If the file is not a `.exe` or `.com` file, Execa reads the first 150 bytes to detect any shebang (e.g., `#!/usr/bin/env node`).

3. **Execute via cmd.exe**: For files with shebangs or scripts (like `.bat`, `.cmd` files), Execa runs them through `cmd.exe /d /s /c` with proper escaping, rather than using Node.js's default behavior.

This process is automatic and only applies to Windows. It is skipped when using [`shell: true`](shell.md), though using a shell has different trade-offs (see below).

## Comparison: Automatic fixes vs shell mode

When deciding whether to use a shell on Windows, consider the following:

| Feature | Automatic fixes (default) | `shell: true` |
|---------|--------------------------|---------------|
| PATHEXT support | ✅ Yes | ✅ Yes (via `cmd.exe`) |
| Shebang support | ✅ Yes | ❌ No |
| Escaping quality | ✅ Excellent (cross-spawn) | ⚠️ Good (Node.js built-in) |
| Extra overhead | Minimal | One more process |

**Recommendation**: Use the default (automatic fixes) for most cases. Use `shell: true` only when you specifically need shell features like redirection (`>`, `|`) or environment variable expansion.

```js
// Default: Uses automatic Windows fixes
await execa`./my-script.js`;

// Shell mode: Use only when you need shell features
await execa({shell: true})`echo %PATH% | findstr "Node"`;
```

## Signals

Only few [signals](termination.md#other-signals) work on Windows with Node.js: [`SIGTERM`](termination.md#sigterm), [`SIGKILL`](termination.md#sigkill), [`SIGINT`](https://en.wikipedia.org/wiki/Signal_(IPC)#SIGINT) and [`SIGQUIT`](termination.md#sigquit). Also, sending signals from other processes is [not supported](termination.md#signal-name-and-description). Finally, the [`forceKillAfterDelay`](api.md#optionsforcekillafterdelay) option [is a noop](termination.md#forceful-termination) on Windows.

## Asynchronous I/O

The default value for the [`stdin`](api.md#optionsstdin), [`stdout`](api.md#optionsstdout) and [`stderr`](api.md#optionsstderr) options is [`'pipe'`](output.md#stdout-and-stderr). This returns the output as [`result.stdout`](api.md#resultstdout) and [`result.stderr`](api.md#resultstderr) and allows for [manual streaming](streams.md#manual-streaming).

Instead of `'pipe'`, `'overlapped'` can be used instead to use [asynchronous I/O](https://learn.microsoft.com/en-us/windows/win32/fileio/synchronous-and-asynchronous-i-o) under-the-hood on Windows, instead of the default behavior which is synchronous. On other platforms, asynchronous I/O is always used, so `'overlapped'` behaves the same way as `'pipe'`.

## Escaping with shells

When using a [shell](shell.md), the user must manually perform shell-specific quoting, on both Unix and Windows. When the [`shell`](api.md#optionsshell) option is `true`, [`cmd.exe`](https://en.wikipedia.org/wiki/Cmd.exe) is used on Windows and `sh` on Unix. Unfortunately, both shells use different quoting rules. With `cmd.exe`, this mostly involves double quoting arguments and prepending double quotes with a backslash.

```js
if (isWindows) {
	await execa({shell: true})`npm run ${'"task with space"'}`;
} else {
	await execa({shell: true})`npm run ${'\'task with space\''}`;
}
```

When using other Windows shells (such as PowerShell or WSL), Execa performs `cmd.exe`-specific automatic quoting by default. This is a problem since Powershell uses different quoting rules. This can be disabled using the [`windowsVerbatimArguments: true`](api.md#optionswindowsverbatimarguments) option.

```js
if (isWindows) {
	await execa({windowsVerbatimArguments: true})`wsl ...`;
}
```

## Console window

If the [`windowsHide`](api.md#optionswindowshide) option is `false`, the subprocess is run in a new console window. This is necessary to make [`SIGINT` work](https://github.com/nodejs/node/issues/29837) on Windows, and to prevent subprocesses not being cleaned up in [some specific situations](https://github.com/sindresorhus/execa/issues/433).

## UID and GID

By default, subprocesses are run using the current [user](https://en.wikipedia.org/wiki/User_identifier) and [group](https://en.wikipedia.org/wiki/Group_identifier). The [`uid`](api.md#optionsuid) and [`gid`](api.md#optionsgid) options can be used to set a different user or group.

However, since Windows uses a different permission model, those options throw.

<hr>

[**Next**: 🔍 Differences with Bash and zx](bash.md)\
[**Previous**: 🐛 Debugging](debugging.md)\
[**Top**: Table of contents](../readme.md#documentation)
