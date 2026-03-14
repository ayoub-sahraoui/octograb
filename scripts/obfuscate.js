/**
 * Post-build obfuscation script for OctoGrab extension
 * Obfuscates JavaScript files to prevent easy reverse engineering
 */

import JavaScriptObfuscator from 'javascript-obfuscator';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../.output/chrome-mv3');

console.log('🔒 Starting code obfuscation...\n');

// Obfuscation configuration
const obfuscatorConfig = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false, // Can cause issues in extensions
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: false, // Can cause issues in extensions
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['rc4'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

// Files to exclude from obfuscation (vendor libraries, etc.)
const excludePatterns = [
  /node_modules/,
  /vendor/,
  /\.map$/,
  /manifest\.json$/,
  /\.html$/,
  /\.css$/,
];

function shouldObfuscate(filePath) {
  return !excludePatterns.some(pattern => pattern.test(filePath));
}

function getAllJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllJsFiles(filePath, fileList);
    } else if (file.endsWith('.js') && shouldObfuscate(filePath)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

try {
  if (!fs.existsSync(distDir)) {
    console.error('❌ Build directory not found. Run `npm run build` first.');
    process.exit(1);
  }

  const jsFiles = getAllJsFiles(distDir);
  console.log(`Found ${jsFiles.length} JavaScript files to obfuscate\n`);

  let obfuscatedCount = 0;
  let skippedCount = 0;

  jsFiles.forEach(filePath => {
    const relativePath = path.relative(distDir, filePath);
    
    try {
      const code = fs.readFileSync(filePath, 'utf8');
      const originalSize = code.length;

      // Obfuscate
      const obfuscated = JavaScriptObfuscator.obfuscate(code, obfuscatorConfig);
      const obfuscatedCode = obfuscated.getObfuscatedCode();
      const newSize = obfuscatedCode.length;

      // Write obfuscated code back
      fs.writeFileSync(filePath, obfuscatedCode);

      const sizeChange = ((newSize - originalSize) / originalSize * 100).toFixed(1);
      console.log(`✅ ${relativePath} (${sizeChange > 0 ? '+' : ''}${sizeChange}%)`);
      obfuscatedCount++;
    } catch (error) {
      console.log(`⚠️  ${relativePath} (skipped: ${error.message})`);
      skippedCount++;
    }
  });

  console.log(`\n🎉 Obfuscation complete!`);
  console.log(`   Obfuscated: ${obfuscatedCount} files`);
  console.log(`   Skipped: ${skippedCount} files`);
  
} catch (error) {
  console.error('❌ Obfuscation failed:', error);
  process.exit(1);
}
