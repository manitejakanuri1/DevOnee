import { NextRequest, NextResponse } from 'next/server';
import NodeCache from 'node-cache';
import path from 'path';
import { fetchFileTree, fetchFileContent } from '@/lib/github';
import { safePath } from '@/lib/path-utils';

const flowchartCache = new NodeCache({ stdTTL: 3600 });

// ── File type classification ──
function getNodeType(filePath: string): { type: string; color: string } {
    const lower = filePath.toLowerCase();
    const name = path.posix.basename(lower);

    // Entry points
    if (
        name === 'page.tsx' || name === 'page.jsx' || name === 'page.ts' || name === 'page.js' ||
        name === 'layout.tsx' || name === 'layout.jsx' || name === 'layout.ts' ||
        name === 'main.py' || name === 'app.py' || name === 'main.go' || name === 'main.rs' ||
        name === 'main.java' || name === 'main.kt' || name === 'main.dart' || name === 'main.swift' ||
        name === 'program.cs' || name === 'main.c' || name === 'main.cpp' ||
        name === 'index.ts' || name === 'index.js' || name === 'index.tsx' || name === 'index.jsx'
    ) return { type: 'entry', color: '#f59e0b' };

    if (lower.includes('__tests__') || lower.includes('.test.') || lower.includes('.spec.') ||
        lower.includes('/test/') || lower.includes('/tests/'))
        return { type: 'test', color: '#facc15' };
    if (lower.includes('/api/') || lower.includes('/routes/') || lower.includes('/controllers/') ||
        lower.includes('/handlers/') || lower.includes('/endpoints/'))
        return { type: 'api', color: '#4ade80' };
    if (lower.includes('/components/') || lower.includes('/ui/') || lower.includes('/views/') ||
        lower.includes('/widgets/') || lower.includes('/screens/'))
        return { type: 'component', color: '#60a5fa' };
    if (lower.includes('/lib/') || lower.includes('/utils/') || lower.includes('/helpers/') ||
        lower.includes('/core/') || lower.includes('/common/') || lower.includes('/shared/'))
        return { type: 'util', color: '#c084fc' };
    if (lower.includes('/models/') || lower.includes('/entities/') || lower.includes('/schemas/') ||
        lower.includes('/types/') || lower.includes('/interfaces/'))
        return { type: 'model', color: '#f472b6' };
    if (lower.includes('/services/') || lower.includes('/providers/') ||
        lower.includes('/repositories/') || lower.includes('/repository/'))
        return { type: 'service', color: '#fb923c' };
    if (lower.includes('.config.') || lower.endsWith('.json') || lower.includes('.env') ||
        lower.endsWith('.gradle') || lower.endsWith('.xml') || lower.endsWith('.yaml') ||
        lower.endsWith('.yml') || lower.endsWith('.toml') || lower.endsWith('.properties'))
        return { type: 'config', color: '#94a3b8' };
    if (lower.endsWith('.md') || lower.includes('/docs/'))
        return { type: 'docs', color: '#22d3ee' };

    return { type: 'source', color: '#e2e8f0' };
}

// ── Generate a short purpose description for a file ──
function getFilePurpose(filePath: string, fileType: string, outCount: number, inCount: number): string {
    const lower = filePath.toLowerCase();
    const name = path.posix.basename(lower);
    const nameNoExt = name.replace(/\.[^.]+$/, '');
    const dir = path.posix.dirname(lower);

    // Specific well-known files
    if (nameNoExt === 'index' && dir === '.') return 'Root entry — bootstraps the application';
    if (nameNoExt === 'index' || nameNoExt === 'main') return 'Entry point — initializes and starts this module';
    if (nameNoExt === 'app' || nameNoExt === 'application') return 'Root component — defines the main app structure and routing';
    if (name.startsWith('page.')) return 'Page route — renders a navigable page in the app';
    if (name.startsWith('layout.')) return 'Layout wrapper — provides shared UI structure for child pages';
    if (name === 'server.ts' || name === 'server.js') return 'Server — starts and configures the HTTP server';
    if (name.startsWith('middleware.')) return 'Middleware — intercepts requests for auth, logging, or redirects';
    if (name === 'package.json') return 'Project manifest — defines dependencies and scripts';
    if (name === 'tsconfig.json') return 'TypeScript config — sets compiler options and paths';
    if (name.includes('.config.') || name.endsWith('.config.ts') || name.endsWith('.config.js')) return 'Configuration — project build or tool settings';
    if (name === 'readme.md') return 'Documentation — project overview and setup instructions';
    if (name === '.env' || name.startsWith('.env.')) return 'Environment vars — stores secrets and config values';
    if (name === 'globals.css' || name === 'global.css') return 'Global styles — base CSS applied across the entire app';
    if (name.includes('reportwebvitals')) return 'Performance monitor — tracks Core Web Vitals metrics';
    if (name.includes('setuptest') || name.includes('setup.test')) return 'Test setup — configures the testing environment';

    // Type-based descriptions
    switch (fileType) {
        case 'test':
            return `Test suite — validates ${nameNoExt.replace(/\.test|\.spec/g, '')} works correctly`;
        case 'api':
            if (lower.includes('/controllers/')) return `Controller — handles HTTP request logic for ${nameNoExt}`;
            if (lower.includes('/routes/')) return `Route definition — maps URL paths to handlers`;
            if (lower.includes('/handlers/')) return `Request handler — processes incoming API calls`;
            return `API endpoint — serves data to the frontend`;
        case 'component':
            if (lower.includes('/ui/')) return `UI primitive — reusable interface element (${nameNoExt})`;
            return `Component — renders the ${nameNoExt} section of the UI`;
        case 'util':
            if (lower.includes('/hooks/') || nameNoExt.startsWith('use')) return `Custom hook — encapsulates reusable ${nameNoExt.replace(/^use/i, '')} logic`;
            if (lower.includes('/helpers/')) return `Helper — provides ${nameNoExt} utility functions`;
            return `Utility — shared ${nameNoExt} logic used across modules`;
        case 'model':
            if (lower.includes('/types/') || lower.includes('/interfaces/')) return `Type definitions — TypeScript types for ${nameNoExt}`;
            if (lower.includes('/schemas/')) return `Schema — defines the data structure for ${nameNoExt}`;
            return `Data model — defines the ${nameNoExt} entity structure`;
        case 'service':
            if (lower.includes('/providers/')) return `Provider — supplies ${nameNoExt} context or data`;
            return `Service — handles ${nameNoExt} business logic and data access`;
        case 'config':
            return `Config file — settings for ${nameNoExt}`;
        case 'docs':
            return `Documentation — describes ${nameNoExt}`;
        case 'entry':
            if (inCount > outCount) return `Entry point — imported by ${inCount} files, central module`;
            return `Entry point — initializes and exports this module`;
        default:
            if (outCount === 0 && inCount > 0) return `Leaf module — imported by ${inCount} file${inCount > 1 ? 's' : ''}, no dependencies`;
            if (inCount === 0 && outCount > 0) return `Root module — imports ${outCount} file${outCount > 1 ? 's' : ''}, not imported elsewhere`;
            if (outCount > 0 && inCount > 0) return `Source module — connects ${outCount} imports with ${inCount} dependents`;
            return `Source file — part of the project codebase`;
    }
}

// ── Supported source code extensions ──
const ANALYZABLE_EXTS = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.mjs',
    '.java', '.kt', '.kts',
    '.py',
    '.go',
    '.rb',
    '.rs',
    '.swift',
    '.c', '.cpp', '.cc', '.h', '.hpp',
    '.php',
    '.dart',
    '.scala',
    '.cs',
]);

// ── Detect language from file extension ──
function detectLanguage(filePath: string): string {
    const ext = path.posix.extname(filePath).toLowerCase();
    switch (ext) {
        case '.ts': case '.tsx': case '.js': case '.jsx': case '.mjs': return 'javascript';
        case '.java': return 'java';
        case '.kt': case '.kts': return 'kotlin';
        case '.py': return 'python';
        case '.go': return 'go';
        case '.rb': return 'ruby';
        case '.rs': return 'rust';
        case '.swift': return 'swift';
        case '.c': case '.cpp': case '.cc': case '.h': case '.hpp': return 'cpp';
        case '.php': return 'php';
        case '.dart': return 'dart';
        case '.scala': return 'scala';
        case '.cs': return 'csharp';
        default: return 'unknown';
    }
}

// ── Check if an import specifier is an external/stdlib dependency ──
function isExternalImport(specifier: string, language: string): boolean {
    switch (language) {
        case 'javascript':
            // Relative or alias imports are local
            return !specifier.startsWith('.') && !specifier.startsWith('@/') && !specifier.startsWith('~/');

        case 'java':
            return /^(java|javax|android|androidx|com\.google\.android|org\.w3c|org\.xml|org\.json|junit|io\.reactivex|okhttp3|retrofit2|com\.squareup|com\.fasterxml|org\.apache|org\.springframework|org\.junit|org\.mockito|com\.bumptech|com\.github|io\.netty|org\.slf4j|org\.hibernate|org\.gradle)\b/.test(specifier);

        case 'kotlin':
            return /^(java|javax|android|androidx|kotlin|kotlinx|com\.google\.android|org\.jetbrains|io\.ktor|com\.squareup|okhttp3|retrofit2)\b/.test(specifier);

        case 'python':
            return /^(os|sys|re|json|math|datetime|collections|typing|pathlib|abc|io|functools|itertools|logging|unittest|pytest|argparse|subprocess|shutil|glob|hashlib|base64|random|time|http|urllib|socket|threading|multiprocessing|asyncio|pickle|copy|csv|xml|html|email|sqlite3|struct|ctypes|dis|ast|inspect|traceback|warnings|gc|weakref|operator|string|textwrap|codecs|pprint|enum|dataclasses|contextlib|decimal|fractions|numbers|statistics|secrets|tempfile|fnmatch|linecache|tokenize|pdb|profile|timeit|zipfile|tarfile|gzip|bz2|lzma|configparser|tomllib|netrc|plistlib|difflib|heapq|bisect|array|queue|types|copyreg|shelve|dbm|platform|errno|signal|select|selectors|mmap|posixpath|ntpath|posix|nt|pwd|grp|resource|syslog|venv|zipimport|importlib|builtins|__future__|site|sysconfig|distutils|setuptools|pip|pkg_resources|flask|django|fastapi|numpy|pandas|requests|scipy|matplotlib|tensorflow|torch|sklearn|celery|boto3|sqlalchemy|alembic|pydantic|httpx|aiohttp|uvicorn|gunicorn|starlette|jinja2|click|rich|typer|pytest|tox|nox|mypy|black|flake8|pylint|isort|wheel|twine|poetry)\b/.test(specifier);

        case 'go':
            // Go stdlib has no dots in path. External packages have dots (github.com, etc).
            // But internal packages in the SAME repo also have dots. We handle that in resolveImport.
            return !specifier.includes('/');

        case 'ruby':
            return /^(json|yaml|csv|net|uri|open-uri|fileutils|pathname|date|time|set|ostruct|erb|cgi|socket|logger|benchmark|optparse|securerandom|digest|base64|singleton|observer|forwardable|delegate|tempfile|stringio|strscan|webrick|minitest|test\/unit|rake|bundler|rails|activerecord|activesupport|actionpack|actionview|actionmailer|activejob|activestorage|railties|sprockets|nokogiri|puma|sidekiq|rspec|capybara|devise|cancancan|pundit|kaminari|faker|factory_bot)\b/.test(specifier);

        case 'rust':
            // Only crate-local and mod: are local, everything else is external
            return false; // We already filter in parseImports

        case 'swift':
            return /^(Foundation|UIKit|SwiftUI|Combine|CoreData|CoreGraphics|CoreLocation|MapKit|AVFoundation|Photos|WebKit|StoreKit|CloudKit|HealthKit|Metal|SpriteKit|SceneKit|ARKit|RealityKit|CryptoKit|AuthenticationServices|LocalAuthentication|UserNotifications|AppKit|Cocoa|Darwin|Dispatch|ObjectiveC|os|XCTest|Security|SystemConfiguration|CoreFoundation|CoreServices|IOKit|CoreText|CoreImage|CoreMedia|CoreVideo|CoreAudio|AudioToolbox|VideoToolbox|Accelerate|GameKit|GameplayKit|MultipeerConnectivity|NaturalLanguage|CoreML|Vision|CreateML|CoreBluetooth|ExternalAccessory|Network|LinkPresentation|BackgroundTasks|Intents|PDFKit|PencilKit|QuickLook|SafariServices|Social|MessageUI|EventKit|Contacts|ContactsUI|PassKit|WatchKit|ClockKit|WatchConnectivity|WidgetKit|ActivityKit|TipKit|SwiftData|Observation)\b/.test(specifier);

        case 'cpp':
            return false; // We only parse #include "..." (local), not <...> (system)

        case 'php':
            return /^(Illuminate|Symfony|Laravel|Doctrine|Psr|GuzzleHttp|Monolog|PhpParser|PHPUnit|Carbon|League|Ramsey|Faker|Mockery|Predis|Twig|Laminas|Nette)\b/.test(specifier.replace(/\\/g, '.'));

        case 'dart':
            return specifier.startsWith('dart:') ||
                specifier.startsWith('package:flutter/') ||
                specifier.startsWith('package:flutter_');

        case 'scala':
            return /^(scala|java|javax|akka|play|cats|zio|fs2|http4s|circe|shapeless|monix|com\.typesafe|org\.apache|org\.scalatest|org\.scalamock)\b/.test(specifier);

        case 'csharp':
            return /^(System|Microsoft|Newtonsoft|NLog|Serilog|AutoMapper|MediatR|FluentValidation|Xunit|NUnit|Moq|Bogus|Polly|Dapper|EntityFramework|Humanizer|StackExchange|RestSharp|Swashbuckle)\b/.test(specifier);
    }
    return false;
}

// ── Parse imports from file content ──
function parseImports(content: string, language: string): string[] {
    const imports: string[] = [];
    let match;

    switch (language) {
        case 'javascript': {
            // ES imports: import X from 'path'  |  import 'path'
            const esRe = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
            while ((match = esRe.exec(content)) !== null) imports.push(match[1]);
            // Dynamic: import('path')
            const dynRe = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
            while ((match = dynRe.exec(content)) !== null) imports.push(match[1]);
            // require('path')
            const reqRe = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
            while ((match = reqRe.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'java': {
            const javaRe = /^import\s+(?:static\s+)?([a-zA-Z0-9_.]+(?:\.\*)?)\s*;/gm;
            while ((match = javaRe.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'kotlin': {
            const ktRe = /^import\s+([a-zA-Z0-9_.]+)/gm;
            while ((match = ktRe.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'python': {
            const pyFrom = /^from\s+([a-zA-Z0-9_.]+)\s+import/gm;
            while ((match = pyFrom.exec(content)) !== null) imports.push(match[1]);
            const pyImport = /^import\s+([a-zA-Z0-9_.]+)/gm;
            while ((match = pyImport.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'go': {
            // Import block: import ( "path1" \n "path2" )
            const goBlock = /import\s*\(([\s\S]*?)\)/g;
            while ((match = goBlock.exec(content)) !== null) {
                const block = match[1];
                const pathRe = /["']([^"'\s]+)["']/g;
                let inner;
                while ((inner = pathRe.exec(block)) !== null) imports.push(inner[1]);
            }
            // Single: import "path"
            const goSingle = /^import\s+["']([^"']+)["']/gm;
            while ((match = goSingle.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'rust': {
            // Only crate-local imports: use crate::, use super::, use self::
            const rustCrate = /^use\s+crate((?:::[a-zA-Z0-9_]+)+)/gm;
            while ((match = rustCrate.exec(content)) !== null) imports.push('crate' + match[1]);
            const rustSuper = /^use\s+super((?:::[a-zA-Z0-9_]+)*)/gm;
            while ((match = rustSuper.exec(content)) !== null) imports.push('super' + match[1]);
            // mod declarations: mod my_module;
            const rustMod = /^(?:pub\s+)?mod\s+([a-zA-Z0-9_]+)\s*;/gm;
            while ((match = rustMod.exec(content)) !== null) imports.push('mod:' + match[1]);
            break;
        }
        case 'swift': {
            const swiftRe = /^import\s+(?:class\s+|struct\s+|enum\s+|protocol\s+|func\s+|var\s+)?([a-zA-Z0-9_.]+)/gm;
            while ((match = swiftRe.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'cpp': {
            // ONLY local includes: #include "header.h"  (not #include <system>)
            const cppLocal = /#include\s*"([^"]+)"/g;
            while ((match = cppLocal.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'php': {
            const phpUse = /^use\s+([a-zA-Z0-9_\\]+)/gm;
            while ((match = phpUse.exec(content)) !== null) imports.push(match[1]);
            const phpReq = /(?:require|include)(?:_once)?\s*(?:\()?\s*['"]([^'"]+)['"]/g;
            while ((match = phpReq.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'dart': {
            const dartRe = /^import\s+['"]([^'"]+)['"]/gm;
            while ((match = dartRe.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'ruby': {
            // require_relative is always local
            const rbRelRe = /^require_relative\s+['"]([^'"]+)['"]/gm;
            while ((match = rbRelRe.exec(content)) !== null) imports.push('relative:' + match[1]);
            // require might be local or gem
            const rbReqRe = /^require\s+['"]([^'"]+)['"]/gm;
            while ((match = rbReqRe.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'scala': {
            const scRe = /^import\s+([a-zA-Z0-9_.]+)/gm;
            while ((match = scRe.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'csharp': {
            const csRe = /^using\s+(?:static\s+)?([a-zA-Z0-9_.]+)\s*;/gm;
            while ((match = csRe.exec(content)) !== null) imports.push(match[1]);
            break;
        }
    }

    return imports;
}

// ── Resolve an import specifier to a real file path in the repository ──
// Returns null if the import cannot be mapped to a local repo file
function resolveImport(
    specifier: string,
    importerPath: string,
    language: string,
    allFilesArr: string[],
    allFilesSet: Set<string>
): string | null {
    // Skip known external/stdlib imports
    if (isExternalImport(specifier, language)) return null;

    const importerDir = path.posix.dirname(importerPath);

    // ── JavaScript / TypeScript ──
    if (language === 'javascript') {
        let candidate: string;
        if (specifier.startsWith('@/')) {
            candidate = specifier.slice(2);
        } else if (specifier.startsWith('.')) {
            candidate = path.posix.normalize(path.posix.join(importerDir, specifier));
        } else {
            return null; // bare package
        }
        if (candidate.startsWith('./')) candidate = candidate.slice(2);

        if (allFilesSet.has(candidate)) return candidate;
        for (const ext of ['.ts', '.tsx', '.js', '.jsx', '.mjs']) {
            if (allFilesSet.has(candidate + ext)) return candidate + ext;
        }
        for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
            if (allFilesSet.has(candidate + '/index' + ext)) return candidate + '/index' + ext;
        }
        return null;
    }

    // ── Java / Kotlin ──
    if (language === 'java' || language === 'kotlin') {
        const cleanSpec = specifier.replace(/\.\*$/, '');
        const asPath = cleanSpec.replace(/\./g, '/');
        const extensions = language === 'java' ? ['.java'] : ['.kt', '.kts', '.java'];

        for (const ext of extensions) {
            for (let i = 0; i < allFilesArr.length; i++) {
                if (allFilesArr[i].endsWith(asPath + ext)) {
                    return allFilesArr[i];
                }
            }
        }
        return null;
    }

    // ── Python ──
    if (language === 'python') {
        // Relative imports
        if (specifier.startsWith('.')) {
            const dots = specifier.match(/^\.+/)?.[0].length || 1;
            let baseDir = importerDir;
            for (let i = 1; i < dots; i++) baseDir = path.posix.dirname(baseDir);
            const rest = specifier.slice(dots).replace(/\./g, '/');
            const candidate = rest ? path.posix.join(baseDir, rest) : baseDir;
            if (allFilesSet.has(candidate + '.py')) return candidate + '.py';
            if (allFilesSet.has(candidate + '/__init__.py')) return candidate + '/__init__.py';
            return null;
        }
        // Absolute imports
        const asPath = specifier.replace(/\./g, '/');
        if (allFilesSet.has(asPath + '.py')) return asPath + '.py';
        if (allFilesSet.has(asPath + '/__init__.py')) return asPath + '/__init__.py';
        for (let i = 0; i < allFilesArr.length; i++) {
            if (allFilesArr[i].endsWith('/' + asPath + '.py')) return allFilesArr[i];
            if (allFilesArr[i].endsWith('/' + asPath + '/__init__.py')) return allFilesArr[i];
        }
        return null;
    }

    // ── Go ──
    if (language === 'go') {
        // Go imports are module paths like "github.com/user/repo/pkg/utils"
        // Internal imports share the repo's base path
        const parts = specifier.split('/');
        if (parts.length < 3 || !specifier.includes('.')) return null;

        // Strip module prefix (first 3 parts: github.com/user/repo)
        const internalPath = parts.slice(3).join('/');
        if (!internalPath) return null;

        // Find any .go file under that directory
        for (let i = 0; i < allFilesArr.length; i++) {
            const f = allFilesArr[i];
            if (f.startsWith(internalPath + '/') && f.endsWith('.go')) {
                return f;
            }
        }
        return null;
    }

    // ── Rust ──
    if (language === 'rust') {
        if (specifier.startsWith('mod:')) {
            const modName = specifier.slice(4);
            const c1 = path.posix.join(importerDir, modName + '.rs');
            const c2 = path.posix.join(importerDir, modName, 'mod.rs');
            if (allFilesSet.has(c1)) return c1;
            if (allFilesSet.has(c2)) return c2;
            return null;
        }
        if (specifier.startsWith('super')) {
            const parts = specifier.replace(/^super::/, '').split('::');
            const parentDir = path.posix.dirname(importerDir);
            const asPath = path.posix.join(parentDir, ...parts);
            if (allFilesSet.has(asPath + '.rs')) return asPath + '.rs';
            if (allFilesSet.has(asPath + '/mod.rs')) return asPath + '/mod.rs';
            return null;
        }
        // crate::module::submodule
        const parts = specifier.replace(/^crate::/, '').split('::');
        const asPath = parts.join('/');
        for (const prefix of ['src/', '']) {
            if (allFilesSet.has(prefix + asPath + '.rs')) return prefix + asPath + '.rs';
            if (allFilesSet.has(prefix + asPath + '/mod.rs')) return prefix + asPath + '/mod.rs';
        }
        return null;
    }

    // ── C / C++ ──
    if (language === 'cpp') {
        const candidate = path.posix.normalize(path.posix.join(importerDir, specifier));
        const cleaned = candidate.startsWith('./') ? candidate.slice(2) : candidate;
        if (allFilesSet.has(cleaned)) return cleaned;
        if (allFilesSet.has(specifier)) return specifier;
        for (let i = 0; i < allFilesArr.length; i++) {
            if (allFilesArr[i].endsWith('/' + specifier)) return allFilesArr[i];
        }
        return null;
    }

    // ── Ruby ──
    if (language === 'ruby') {
        if (specifier.startsWith('relative:')) {
            const relPath = specifier.slice(9);
            let candidate = path.posix.normalize(path.posix.join(importerDir, relPath));
            if (candidate.startsWith('./')) candidate = candidate.slice(2);
            if (allFilesSet.has(candidate)) return candidate;
            if (allFilesSet.has(candidate + '.rb')) return candidate + '.rb';
            return null;
        }
        if (allFilesSet.has(specifier + '.rb')) return specifier + '.rb';
        if (allFilesSet.has('lib/' + specifier + '.rb')) return 'lib/' + specifier + '.rb';
        for (let i = 0; i < allFilesArr.length; i++) {
            if (allFilesArr[i].endsWith('/' + specifier + '.rb')) return allFilesArr[i];
        }
        return null;
    }

    // ── Dart ──
    if (language === 'dart') {
        if (specifier.startsWith('package:')) {
            const afterPkg = specifier.replace(/^package:[^/]+\//, '');
            if (allFilesSet.has('lib/' + afterPkg)) return 'lib/' + afterPkg;
            if (allFilesSet.has(afterPkg)) return afterPkg;
            return null;
        }
        let candidate = path.posix.normalize(path.posix.join(importerDir, specifier));
        if (candidate.startsWith('./')) candidate = candidate.slice(2);
        if (allFilesSet.has(candidate)) return candidate;
        return null;
    }

    // ── PHP ──
    if (language === 'php') {
        if (specifier.includes('\\')) {
            const asPath = specifier.replace(/\\/g, '/');
            if (allFilesSet.has(asPath + '.php')) return asPath + '.php';
            const parts = asPath.split('/');
            parts[0] = parts[0].toLowerCase();
            const lowered = parts.join('/');
            if (allFilesSet.has(lowered + '.php')) return lowered + '.php';
            for (let i = 0; i < allFilesArr.length; i++) {
                if (allFilesArr[i].endsWith('/' + asPath + '.php') || allFilesArr[i].endsWith('/' + lowered + '.php')) {
                    return allFilesArr[i];
                }
            }
        } else {
            let candidate = path.posix.normalize(path.posix.join(importerDir, specifier));
            if (candidate.startsWith('./')) candidate = candidate.slice(2);
            if (allFilesSet.has(candidate)) return candidate;
            if (allFilesSet.has(specifier)) return specifier;
        }
        return null;
    }

    // ── Scala ──
    if (language === 'scala') {
        const cleanSpec = specifier.replace(/\{[^}]*\}/, '').replace(/\._$/, '').replace(/_$/, '');
        const asPath = cleanSpec.replace(/\./g, '/');
        if (allFilesSet.has(asPath + '.scala')) return asPath + '.scala';
        for (let i = 0; i < allFilesArr.length; i++) {
            if (allFilesArr[i].endsWith('/' + asPath + '.scala')) return allFilesArr[i];
        }
        return null;
    }

    // ── C# ──
    if (language === 'csharp') {
        const parts = specifier.split('.');
        // Try full path
        const fullPath = parts.join('/');
        if (allFilesSet.has(fullPath + '.cs')) return fullPath + '.cs';
        // Try skipping first segment (project name)
        if (parts.length >= 2) {
            const asPath = parts.slice(1).join('/');
            if (allFilesSet.has(asPath + '.cs')) return asPath + '.cs';
            for (let i = 0; i < allFilesArr.length; i++) {
                if (allFilesArr[i].endsWith('/' + asPath + '.cs')) return allFilesArr[i];
            }
        }
        return null;
    }

    return null;
}

// ── Batch-fetch file content ──
async function batchFetchContent(
    files: string[],
    owner: string,
    repo: string,
    branch: string,
    batchSize: number = 10
): Promise<Map<string, string>> {
    const resultMap = new Map<string, string>();

    for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const results = await Promise.allSettled(
            batch.map(f => fetchFileContent(owner, repo, f, branch))
        );
        results.forEach((result, j) => {
            if (result.status === 'fulfilled' && typeof result.value === 'string' && result.value.length > 0) {
                resultMap.set(batch[j], result.value);
            }
        });
    }

    return resultMap;
}

// ── Excluded directories ──
function isExcludedPath(p: string): boolean {
    const lower = p.toLowerCase();
    return lower.includes('node_modules/') ||
        lower.includes('.next/') ||
        lower.includes('dist/') ||
        lower.includes('build/output') ||
        lower.includes('.git/') ||
        lower.includes('vendor/') ||
        lower.includes('.gradle/') ||
        lower.includes('__pycache__/') ||
        lower.includes('.idea/') ||
        lower.includes('.vscode/') ||
        lower.includes('.cache/') ||
        lower.includes('.turbo/') ||
        lower.includes('target/debug/') ||
        lower.includes('target/release/') ||
        lower.includes('.dart_tool/') ||
        lower.includes('.pub-cache/') ||
        lower.includes('Pods/') ||
        lower.includes('DerivedData/') ||
        lower.includes('.build/') ||
        lower.includes('bin/Debug/') ||
        lower.includes('bin/Release/') ||
        lower.includes('obj/');
}

// ── Rank files by importance for analysis priority ──
function fileImportance(filePath: string): number {
    const lower = filePath.toLowerCase();
    const depth = filePath.split('/').length;

    let score = 100 - depth * 5; // Shallower = higher priority

    // Entry points get highest priority
    const name = path.posix.basename(lower);
    if (['page.tsx', 'page.jsx', 'page.ts', 'page.js', 'layout.tsx', 'layout.jsx',
        'index.ts', 'index.tsx', 'index.js', 'index.jsx',
        'main.py', 'app.py', 'main.go', 'main.rs', 'main.java', 'main.kt',
        'main.dart', 'main.swift', 'program.cs', 'main.c', 'main.cpp',
        'mod.rs', '__init__.py'].includes(name)) {
        score += 30;
    }

    // Source directories are more important
    if (lower.includes('/src/') || lower.includes('/lib/') || lower.includes('/app/') ||
        lower.includes('/components/') || lower.includes('/core/')) {
        score += 15;
    }

    // Test files are lower priority (they import prod code, not vice versa)
    if (lower.includes('.test.') || lower.includes('.spec.') || lower.includes('__tests__') ||
        lower.includes('/test/') || lower.includes('/tests/')) {
        score -= 20;
    }

    // Config/generated files are lowest priority
    if (lower.includes('.config.') || lower.includes('.generated.') || lower.includes('.d.ts')) {
        score -= 30;
    }

    return score;
}

// ── Build folder-structure graph as fallback ──
function buildFolderGraph(
    allFiles: string[],
    maxNodes: number = 60
): { nodes: any[]; edges: any[] } {
    const dirs = new Map<string, string[]>();

    for (const f of allFiles) {
        const dir = path.posix.dirname(f);
        if (!dirs.has(dir)) dirs.set(dir, []);
        dirs.get(dir)!.push(f);
    }

    const nodes: any[] = [];
    const edges: any[] = [];
    const nodeIds = new Set<string>();

    // Sort by depth, add as directory nodes
    const sortedDirs = Array.from(dirs.keys())
        .filter(d => d !== '.')
        .sort((a, b) => a.split('/').length - b.split('/').length)
        .slice(0, maxNodes);

    for (const dir of sortedDirs) {
        const parts = dir.split('/');
        const { type: fileType, color } = getNodeType(dir + '/');
        const fileCount = dirs.get(dir)?.length || 0;

        nodes.push({
            id: dir,
            type: 'custom',
            data: {
                label: `${parts[parts.length - 1]}/ (${fileCount})`,
                fullPath: safePath(dir),
                fileType,
                color,
                isFolder: true,
                fileCount,
                lines: 0,
            },
            position: { x: 0, y: 0 },
        });
        nodeIds.add(dir);
    }

    // Parent → child folder edges
    for (const dir of sortedDirs) {
        const parent = path.posix.dirname(dir);
        if (parent !== '.' && nodeIds.has(parent)) {
            edges.push({
                id: `${parent}->${dir}`,
                source: parent,
                target: dir,
            });
        }
    }

    // If few directories, add top-level files
    if (nodes.length < 8) {
        const topFiles = allFiles
            .filter(f => f.split('/').length <= 2)
            .slice(0, maxNodes - nodes.length);

        for (const f of topFiles) {
            const { type: fileType, color } = getNodeType(f);
            nodes.push({
                id: f,
                type: 'custom',
                data: {
                    label: path.posix.basename(f),
                    fullPath: safePath(f),
                    fileType,
                    color,
                    lines: 0,
                },
                position: { x: 0, y: 0 },
            });
            nodeIds.add(f);

            const parentDir = path.posix.dirname(f);
            if (parentDir !== '.' && nodeIds.has(parentDir)) {
                edges.push({ id: `${parentDir}->${f}`, source: parentDir, target: f });
            }
        }
    }

    return { nodes, edges };
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { owner, repo } = body;
        let branch = body.branch || 'main';

        if (!owner || !repo) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // Cache check
        const cacheKey = `flowchart_v2_${owner}_${repo}`;
        const cached = flowchartCache.get(cacheKey);
        if (cached) {
            return NextResponse.json({ success: true, ...(cached as object) });
        }

        // 1. Fetch file tree
        let treeData;
        try {
            treeData = await fetchFileTree(owner, repo, branch);
        } catch {
            try {
                branch = 'master';
                treeData = await fetchFileTree(owner, repo, 'master');
            } catch {
                return NextResponse.json({ success: true, nodes: [], edges: [], mode: 'empty' });
            }
        }

        const allFiles: string[] = treeData.tree
            .filter((f: any) => f.type === 'blob')
            .map((f: any) => f.path as string)
            .filter((p: string) => !isExcludedPath(p));

        const allFilesSet = new Set<string>(allFiles);

        // 2. Filter to analyzable source files
        const analyzableFiles = allFiles.filter((p: string) => {
            const ext = path.posix.extname(p).toLowerCase();
            return ANALYZABLE_EXTS.has(ext);
        });

        // If no source files at all, show folder structure
        if (analyzableFiles.length === 0) {
            const folderGraph = buildFolderGraph(allFiles);
            const result = { nodes: folderGraph.nodes, edges: folderGraph.edges, mode: 'structure' };
            flowchartCache.set(cacheKey, result);
            return NextResponse.json({ success: true, ...result });
        }

        // 3. Rank by importance and pick top files to analyze
        const MAX_ANALYZE = 120;
        const rankedFiles = analyzableFiles
            .map(f => ({ path: f, score: fileImportance(f) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_ANALYZE)
            .map(f => f.path);

        // 4. Batch-fetch file content
        const contentMap = await batchFetchContent(rankedFiles, owner, repo, branch);

        // 5. Parse imports and resolve to real files (TWO-PASS approach)
        const edgeSet = new Set<string>();
        const edgeList: { id: string; source: string; target: string }[] = [];
        const connectedFiles = new Set<string>(); // Files that participate in at least one edge

        for (const filePath of rankedFiles) {
            const content = contentMap.get(filePath);
            if (!content) continue;

            const language = detectLanguage(filePath);
            const importSpecs = parseImports(content, language);

            for (const spec of importSpecs) {
                const resolved = resolveImport(spec, filePath, language, allFiles, allFilesSet);
                if (resolved && resolved !== filePath) {
                    const edgeId = `${filePath}->${resolved}`;
                    if (!edgeSet.has(edgeId)) {
                        edgeSet.add(edgeId);
                        edgeList.push({ id: edgeId, source: filePath, target: resolved });
                        connectedFiles.add(filePath);
                        connectedFiles.add(resolved);
                    }
                }
            }
        }

        // 6. Build final node list
        // Include ALL files that participate in any import relationship
        // (even targets that weren't in the original analysis set)
        // Build a size lookup from tree data for estimating lines when content isn't available
        const fileSizeMap = new Map<string, number>();
        for (const f of treeData.tree) {
            if (f.type === 'blob' && typeof f.size === 'number') {
                fileSizeMap.set(f.path, f.size);
            }
        }

        let finalNodes: any[];
        let finalEdges: any[];
        let mode = 'imports';

        if (edgeList.length > 0) {
            // Create nodes for every connected file
            const MAX_NODES = 150;
            const connectedArr = Array.from(connectedFiles);

            // If too many connected files, prioritize by connection count
            let selectedFiles: string[];
            if (connectedArr.length > MAX_NODES) {
                const connectionCount = new Map<string, number>();
                for (const f of connectedArr) connectionCount.set(f, 0);
                for (const e of edgeList) {
                    connectionCount.set(e.source, (connectionCount.get(e.source) || 0) + 1);
                    connectionCount.set(e.target, (connectionCount.get(e.target) || 0) + 1);
                }
                selectedFiles = connectedArr
                    .sort((a, b) => (connectionCount.get(b) || 0) - (connectionCount.get(a) || 0))
                    .slice(0, MAX_NODES);
            } else {
                selectedFiles = connectedArr;
            }

            const selectedSet = new Set(selectedFiles);

            finalNodes = selectedFiles.map(filePath => {
                const parts = filePath.split('/');
                const fileName = parts[parts.length - 1];
                const { type: fileType, color } = getNodeType(filePath);

                // Count incoming and outgoing edges
                let inCount = 0;
                let outCount = 0;
                for (const e of edgeList) {
                    if (e.target === filePath) inCount++;
                    if (e.source === filePath) outCount++;
                }

                // Count lines: use actual content if fetched, otherwise estimate from file size
                let lines = 0;
                const content = contentMap.get(filePath);
                if (content) {
                    lines = content.split('\n').length;
                } else {
                    const fileSize = fileSizeMap.get(filePath);
                    if (fileSize) {
                        // Estimate: average ~30 bytes per line for source code
                        lines = Math.max(1, Math.round(fileSize / 30));
                    }
                }

                return {
                    id: filePath,
                    type: 'custom',
                    data: {
                        label: fileName,
                        fullPath: safePath(filePath),
                        fileType,
                        color,
                        imports: outCount,
                        importedBy: inCount,
                        lines,
                        purpose: getFilePurpose(filePath, fileType, outCount, inCount),
                    },
                    position: { x: 0, y: 0 },
                };
            });

            // Only keep edges where both endpoints are in the final node set
            finalEdges = edgeList.filter(e => selectedSet.has(e.source) && selectedSet.has(e.target));
        } else {
            // No imports resolved — fall back to folder structure
            const folderGraph = buildFolderGraph(allFiles);
            finalNodes = folderGraph.nodes;
            finalEdges = folderGraph.edges;
            mode = 'structure';
        }

        const result = {
            nodes: finalNodes,
            edges: finalEdges,
            mode,
            stats: {
                totalFiles: allFiles.length,
                analyzedFiles: contentMap.size,
                resolvedEdges: edgeList.length,
            },
        };

        flowchartCache.set(cacheKey, result);
        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        console.error('Flowchart API Error:', error);
        return NextResponse.json(
            { error: 'INTERNAL_SERVER_ERROR', message: error.message },
            { status: 500 }
        );
    }
}
