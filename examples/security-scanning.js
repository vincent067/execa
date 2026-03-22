import { execa } from 'execa';

/**
 * Security scanning utilities using execa
 * Demonstrates running security tools and processing their output
 */

/**
 * Run npm audit and parse the results
 * Returns summary of vulnerabilities found
 */
async function runNpmAudit(options = {}) {
	const args = ['audit', '--json'];
	
	// Add audit level filter if specified
	if (options.level) {
		args.push('--audit-level', options.level);
	}
	
	try {
		const { stdout } = await execa('npm', args);
		const audit = JSON.parse(stdout);
		
		return {
			success: true,
			vulnerabilities: audit.metadata?.vulnerabilities || {},
			total: audit.metadata?.totalDependencies || 0,
			advisories: Object.keys(audit.advisories || {}).length,
		};
	} catch (error) {
		// npm audit returns exit code 1 when vulnerabilities are found
		// but still outputs valid JSON
		if (error.stdout) {
			try {
				const audit = JSON.parse(error.stdout);
				return {
					success: false,
					vulnerabilities: audit.metadata?.vulnerabilities || {},
					total: audit.metadata?.totalDependencies || 0,
					advisories: Object.keys(audit.advisories || {}).length,
					exitCode: error.exitCode,
				};
			} catch {
				// JSON parsing failed
			}
		}
		throw error;
	}
}

/**
 * Run a security linter (semgrep) on the codebase
 * Requires semgrep to be installed: pip install semgrep
 */
async function runSemgrepScan(rules = 'p/security-audit') {
	try {
		const { stdout } = await execa('semgrep', [
			'--config', rules,
			'--json',
			'--quiet',
			'.',
		]);
		
		const results = JSON.parse(stdout);
		return {
			success: true,
			findings: results.results?.length || 0,
			errors: results.errors?.length || 0,
			rules: Object.keys(results.rules || {}).length,
			details: results.results || [],
		};
	} catch (error) {
		// semgrep returns non-zero when findings exist
		if (error.stdout) {
			try {
				const results = JSON.parse(error.stdout);
				return {
					success: false,
					findings: results.results?.length || 0,
					errors: results.errors?.length || 0,
					rules: Object.keys(results.rules || {}).length,
					details: results.results || [],
					exitCode: error.exitCode,
				};
			} catch {
				// JSON parsing failed
			}
		}
		
		// semgrep not installed or other error
		if (error.message?.includes('ENOENT')) {
			return {
				success: false,
				error: 'semgrep not installed. Install with: pip install semgrep',
			};
		}
		throw error;
	}
}

/**
 * Check for secrets in git history using gitleaks
 * Requires gitleaks to be installed: https://github.com/gitleaks/gitleaks
 */
async function runSecretScan() {
	try {
		const { stdout } = await execa('gitleaks', [
			'git',
			'.',
			'--verbose',
			'--redact',
		]);
		
		return {
			success: true,
			secretsFound: false,
			message: 'No secrets detected',
		};
	} catch (error) {
		// gitleaks exits with code 1 when secrets are found
		if (error.exitCode === 1 && error.stdout) {
			const lines = error.stdout.split('\n').filter(line => line.includes('Finding:'));
			return {
				success: false,
				secretsFound: true,
				findings: lines.length,
				message: `Found ${lines.length} potential secret(s)`,
				hint: 'Run "gitleaks git . -v" for details (secrets redacted in output)',
			};
		}
		
		if (error.message?.includes('ENOENT')) {
			return {
				success: false,
				error: 'gitleaks not installed. See: https://github.com/gitleaks/gitleaks',
			};
		}
		throw error;
	}
}

/**
 * Generate a security report summary
 */
async function generateSecurityReport() {
	console.log('🔒 Running Security Scans...\n');
	
	const report = {
		timestamp: new Date().toISOString(),
		scans: {},
	};
	
	// Run npm audit
	console.log('📦 Running npm audit...');
	try {
		report.scans.npmAudit = await runNpmAudit();
		const v = report.scans.npmAudit.vulnerabilities;
		if (v.critical > 0 || v.high > 0) {
			console.log(`   ⚠️  ${v.critical} critical, ${v.high} high severity vulnerabilities`);
		} else {
			console.log(`   ✅ ${report.scans.npmAudit.total} dependencies checked`);
		}
	} catch (error) {
		console.log(`   ❌ npm audit failed: ${error.message}`);
		report.scans.npmAudit = { error: error.message };
	}
	
	// Run secret scan
	console.log('\n🔐 Scanning for secrets...');
	try {
		report.scans.secrets = await runSecretScan();
		if (report.scans.secrets.secretsFound) {
			console.log(`   ⚠️  ${report.scans.secrets.message}`);
		} else if (report.scans.secrets.error) {
			console.log(`   ℹ️  ${report.scans.secrets.error}`);
		} else {
			console.log(`   ✅ ${report.scans.secrets.message}`);
		}
	} catch (error) {
		console.log(`   ❌ Secret scan failed: ${error.message}`);
		report.scans.secrets = { error: error.message };
	}
	
	// Run semgrep
	console.log('\n🛡️  Running semgrep security audit...');
	try {
		report.scans.semgrep = await runSemgrepScan();
		if (report.scans.semgrep.findings > 0) {
			console.log(`   ⚠️  Found ${report.scans.semgrep.findings} security issue(s)`);
		} else if (report.scans.semgrep.error) {
			console.log(`   ℹ️  ${report.scans.semgrep.error}`);
		} else {
			console.log('   ✅ No security issues found');
		}
	} catch (error) {
		console.log(`   ❌ Semgrep failed: ${error.message}`);
		report.scans.semgrep = { error: error.message };
	}
	
	console.log('\n📊 Security Report Complete');
	return report;
}

// Demo
if (import.meta.url === `file://${process.argv[1]}`) {
	await generateSecurityReport();
}

export {
	runNpmAudit,
	runSemgrepScan,
	runSecretScan,
	generateSecurityReport,
};
