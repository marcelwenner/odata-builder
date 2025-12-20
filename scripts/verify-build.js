#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying build artifacts...\n');

const distDir = path.join(__dirname, '..', 'dist');
const packageJson = require('../package.json');

// Required files and their expected properties
const requiredFiles = [
    {
        file: 'odata-builder.js',
        description: 'CommonJS build',
        checks: [
            { name: 'File exists', test: (content) => content.length > 0 },
            { name: 'Contains exports', test: (content) => content.includes('exports') || content.includes('module.exports') },
            { name: 'Minified', test: (content) => !content.includes('\n  ') },
        ]
    },
    {
        file: 'odata-builder.esm.js', 
        description: 'ES Module build',
        checks: [
            { name: 'File exists', test: (content) => content.length > 0 },
            { name: 'Contains ES exports', test: (content) => content.includes('export') },
            { name: 'Minified', test: (content) => !content.includes('\n  ') },
        ]
    },
    {
        file: 'odata-builder.d.ts',
        description: 'TypeScript definitions',
        checks: [
            { name: 'File exists', test: (content) => content.length > 0 },
            { name: 'Contains type exports', test: (content) => content.includes('export') },
            { name: 'Contains main classes', test: (content) => 
                content.includes('OdataQueryBuilder') && 
                content.includes('SearchExpressionBuilder')
            },
            { name: 'Contains type definitions', test: (content) => 
                content.includes('QueryFilter') && 
                content.includes('CombinedFilter')
            },
            { name: 'No relative imports', test: (content) => 
                !content.includes('from \'src/') && 
                !content.includes('from "./') && 
                !content.includes('from "../')
            },
            { name: 'Substantial size', test: (content) => content.length > 5000 },
        ]
    }
];

const packageChecks = [
    {
        name: 'Main field points to correct file',
        test: () => packageJson.main === 'dist/odata-builder.js'
    },
    {
        name: 'Module field points to correct file', 
        test: () => packageJson.module === 'dist/odata-builder.esm.js'
    },
    {
        name: 'Types field points to correct file',
        test: () => packageJson.types === 'dist/odata-builder.d.ts'
    },
    {
        name: 'Version is valid semver',
        test: () => /^\d+\.\d+\.\d+$/.test(packageJson.version)
    }
];

let allPassed = true;
let totalChecks = 0;
let passedChecks = 0;

// Check files
console.log('📁 Checking build files:');
for (const fileSpec of requiredFiles) {
    const filePath = path.join(distDir, fileSpec.file);
    console.log(`\n  ${fileSpec.description} (${fileSpec.file}):`);
    
    if (!fs.existsSync(filePath)) {
        console.log(`    ❌ File does not exist: ${fileSpec.file}`);
        allPassed = false;
        totalChecks += fileSpec.checks.length;
        continue;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);
    
    console.log(`    📊 Size: ${stats.size} bytes`);
    
    for (const check of fileSpec.checks) {
        totalChecks++;
        try {
            if (check.test(content)) {
                console.log(`    ✅ ${check.name}`);
                passedChecks++;
            } else {
                console.log(`    ❌ ${check.name}`);
                allPassed = false;
            }
        } catch (error) {
            console.log(`    ❌ ${check.name} (Error: ${error.message})`);
            allPassed = false;
        }
    }
}

// Check package.json
console.log('\n\n📦 Checking package.json configuration:');
for (const check of packageChecks) {
    totalChecks++;
    try {
        if (check.test()) {
            console.log(`  ✅ ${check.name}`);
            passedChecks++;
        } else {
            console.log(`  ❌ ${check.name}`);
            allPassed = false;
        }
    } catch (error) {
        console.log(`  ❌ ${check.name} (Error: ${error.message})`);
        allPassed = false;
    }
}

// Additional checks
console.log('\n\n🔬 Additional quality checks:');

// Check if all files are present
const allFilesPresent = requiredFiles.every(spec => 
    fs.existsSync(path.join(distDir, spec.file))
);

totalChecks++;
if (allFilesPresent) {
    console.log('  ✅ All required files present');
    passedChecks++;
} else {
    console.log('  ❌ Some required files missing');
    allPassed = false;
}

// Check total dist size (should be reasonable)
const totalSize = requiredFiles.reduce((total, spec) => {
    const filePath = path.join(distDir, spec.file);
    if (fs.existsSync(filePath)) {
        return total + fs.statSync(filePath).size;
    }
    return total;
}, 0);

totalChecks++;
if (totalSize > 0 && totalSize < 50000) { // Less than 50KB total
    console.log(`  ✅ Total bundle size reasonable: ${totalSize} bytes`);
    passedChecks++;
} else if (totalSize === 0) {
    console.log('  ❌ No files found or zero size');
    allPassed = false;
} else {
    console.log(`  ⚠️  Large bundle size: ${totalSize} bytes (may want to investigate)`);
    passedChecks++; // Still pass, just warn
}

// Try to load the built modules (smoke test)
totalChecks++;
try {
    const cjsPath = path.join(distDir, 'odata-builder.js');
    if (fs.existsSync(cjsPath)) {
        const cjsModule = require(cjsPath);
        if (cjsModule && cjsModule.OdataQueryBuilder) {
            console.log('  ✅ CommonJS module loads and exports main class');
            passedChecks++;
        } else {
            console.log('  ❌ CommonJS module missing main exports');
            allPassed = false;
        }
    } else {
        console.log('  ❌ CommonJS file not found for smoke test');
        allPassed = false;
    }
} catch (error) {
    console.log(`  ❌ CommonJS module failed to load: ${error.message}`);
    allPassed = false;
}

// Essential Files Check (README, LICENSE, etc.)
console.log('\n\n📄 Essential files check:');
const essentialFiles = [
    { file: '../README.md', name: 'README.md', required: true },
    { file: '../LICENSE', name: 'LICENSE', required: true },
    { file: '../CHANGELOG.md', name: 'CHANGELOG.md', required: false },
    { file: '../package.json', name: 'package.json', required: true }
];

for (const fileCheck of essentialFiles) {
    totalChecks++;
    const filePath = path.join(__dirname, fileCheck.file);
    if (fs.existsSync(filePath)) {
        console.log(`  ✅ ${fileCheck.name} exists`);
        passedChecks++;
    } else if (fileCheck.required) {
        console.log(`  ❌ ${fileCheck.name} missing (required)`);
        allPassed = false;
    } else {
        console.log(`  ⚠️  ${fileCheck.name} missing (optional)`);
        passedChecks++; // Still pass for optional files
    }
}

// Security Checks
console.log('\n\n🔒 Security checks:');

// Check for sensitive patterns in built files
const sensitivePatterns = [
    /password/i,
    /secret/i,
    /token/i,
    /api[_-]?key/i,
    /private[_-]?key/i,
    /\.env/i
];

totalChecks++;
let foundSensitiveData = false;
for (const fileSpec of requiredFiles) {
    const filePath = path.join(distDir, fileSpec.file);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pattern of sensitivePatterns) {
            if (pattern.test(content)) {
                console.log(`  ❌ Potential sensitive data found in ${fileSpec.file}: ${pattern}`);
                foundSensitiveData = true;
                allPassed = false;
            }
        }
    }
}
if (!foundSensitiveData) {
    console.log('  ✅ No sensitive data patterns detected');
    passedChecks++;
}

// Check package.json for required fields
console.log('\n\n📋 Package.json completeness:');
const requiredPackageFields = [
    { field: 'name', required: true },
    { field: 'version', required: true },
    { field: 'description', required: true },
    { field: 'author', required: true },
    { field: 'license', required: true },
    { field: 'repository', required: true },
    { field: 'keywords', required: false },
    { field: 'homepage', required: false }
];

for (const fieldCheck of requiredPackageFields) {
    totalChecks++;
    const value = packageJson[fieldCheck.field];
    if (value && (typeof value === 'string' ? value.trim() : true)) {
        console.log(`  ✅ ${fieldCheck.field}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
        passedChecks++;
    } else if (fieldCheck.required) {
        console.log(`  ❌ Missing required field: ${fieldCheck.field}`);
        allPassed = false;
    } else {
        console.log(`  ⚠️  Missing optional field: ${fieldCheck.field}`);
        passedChecks++; // Still pass for optional
    }
}

// Bundle Analysis
console.log('\n\n📊 Bundle analysis:');

// Check for duplicate exports
totalChecks++;
const dtsContent = fs.readFileSync(path.join(distDir, 'odata-builder.d.ts'), 'utf8');
const exportMatches = dtsContent.match(/export \{[^}]+\}/g) || [];
const exportedNames = new Set();
let hasDuplicateExports = false;

for (const exportMatch of exportMatches) {
    const names = exportMatch.match(/\w+/g) || [];
    for (const name of names) {
        if (name !== 'export' && exportedNames.has(name)) {
            console.log(`  ❌ Duplicate export detected: ${name}`);
            hasDuplicateExports = true;
            allPassed = false;
        }
        exportedNames.add(name);
    }
}
if (!hasDuplicateExports) {
    console.log('  ✅ No duplicate exports detected');
    passedChecks++;
}

// Check TypeScript compatibility
console.log('\n\n⚙️  TypeScript compatibility:');
totalChecks++;
try {
    // Check if d.ts file has proper TypeScript syntax
    if (dtsContent.includes('declare ') && dtsContent.includes('export ')) {
        console.log('  ✅ TypeScript declarations properly structured');
        passedChecks++;
    } else {
        console.log('  ❌ TypeScript declarations malformed');
        allPassed = false;
    }
} catch (error) {
    console.log(`  ❌ TypeScript check failed: ${error.message}`);
    allPassed = false;
}

// Performance checks
console.log('\n\n⚡ Performance checks:');

// Check bundle sizes are reasonable
const sizeChecks = [
    { file: 'odata-builder.js', maxSize: 50000, name: 'CommonJS bundle' },
    { file: 'odata-builder.esm.js', maxSize: 50000, name: 'ES Module bundle' },
    { file: 'odata-builder.d.ts', maxSize: 100000, name: 'TypeScript definitions' }
];

for (const sizeCheck of sizeChecks) {
    totalChecks++;
    const filePath = path.join(distDir, sizeCheck.file);
    if (fs.existsSync(filePath)) {
        const size = fs.statSync(filePath).size;
        if (size <= sizeCheck.maxSize) {
            console.log(`  ✅ ${sizeCheck.name} size OK: ${size} bytes (limit: ${sizeCheck.maxSize})`);
            passedChecks++;
        } else {
            console.log(`  ❌ ${sizeCheck.name} too large: ${size} bytes (limit: ${sizeCheck.maxSize})`);
            allPassed = false;
        }
    } else {
        console.log(`  ❌ ${sizeCheck.name} file not found`);
        allPassed = false;
    }
}

// README quality check
console.log('\n\n📖 Documentation quality:');
totalChecks++;
const readmePath = path.join(__dirname, '../README.md');
if (fs.existsSync(readmePath)) {
    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    const readmeChecks = [
        { name: 'Has installation instructions', test: content => /npm install|yarn add/i.test(content) },
        { name: 'Has usage examples', test: content => /```/.test(content) && content.length > 1000 },
        { name: 'Has API documentation', test: content => /##|###/.test(content) },
        { name: 'Mentions TypeScript', test: content => /typescript/i.test(content) }
    ];
    
    let readmePassed = 0;
    for (const check of readmeChecks) {
        if (check.test(readmeContent)) {
            readmePassed++;
        }
    }
    
    if (readmePassed >= 3) {
        console.log(`  ✅ README quality good (${readmePassed}/${readmeChecks.length} checks passed)`);
        passedChecks++;
    } else {
        console.log(`  ⚠️  README could be improved (${readmePassed}/${readmeChecks.length} checks passed)`);
        passedChecks++; // Don't fail build for this
    }
} else {
    console.log('  ❌ README.md not found');
    allPassed = false;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log(`📊 Build Verification Summary:`);
console.log(`   Checks passed: ${passedChecks}/${totalChecks}`);
console.log(`   Success rate: ${Math.round((passedChecks/totalChecks) * 100)}%`);

if (allPassed) {
    console.log('\n🎉 All build verification checks passed!');
    console.log('✅ Artifacts are ready for publishing.\n');
    process.exit(0);
} else {
    console.log('\n❌ Some build verification checks failed!');
    console.log('🚨 Please fix the issues before publishing.\n');
    process.exit(1);
}
