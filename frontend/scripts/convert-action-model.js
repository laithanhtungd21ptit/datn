/**
 * Convert Keras model to TensorFlow.js format
 * Run: node scripts/convert-action-model.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MODEL_SRC = path.join(__dirname, '../../yolo-service/action-recognition/checkpoints/best_model.keras');
const MODEL_DEST = path.join(__dirname, '../public/models/action_recognition');

console.log('='.repeat(60));
console.log('Converting Action Recognition Model to TensorFlow.js');
console.log('='.repeat(60));

// Check if model exists
if (!fs.existsSync(MODEL_SRC)) {
  console.error(`❌ Model not found: ${MODEL_SRC}`);
  process.exit(1);
}

console.log(`\n📥 Source: ${MODEL_SRC}`);
console.log(`📤 Destination: ${MODEL_DEST}`);

// Create destination directory
if (!fs.existsSync(MODEL_DEST)) {
  fs.mkdirSync(MODEL_DEST, { recursive: true });
  console.log(`✅ Created directory: ${MODEL_DEST}`);
}

// Check if tensorflowjs is available
let tfjsConverter;
try {
  tfjsConverter = require.resolve('@tensorflow/tfjs-converter');
  console.log('✅ @tensorflow/tfjs-converter found');
} catch (e) {
  console.log('📦 Installing @tensorflow/tfjs-converter...');
  try {
    execSync('npm install @tensorflow/tfjs-converter --save-dev', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    tfjsConverter = require.resolve('@tensorflow/tfjs-converter');
    console.log('✅ Installed @tensorflow/tfjs-converter');
  } catch (err) {
    console.error('❌ Failed to install @tensorflow/tfjs-converter');
    console.error('   Please run: npm install @tensorflow/tfjs-converter --save-dev');
    process.exit(1);
  }
}

// Convert model
console.log('\n🔄 Converting model...');
try {
  const { execSync } = require('child_process');
  const converterPath = path.join(
    path.dirname(tfjsConverter),
    '..',
    'bin',
    'tensorflowjs_converter'
  );
  
  // Try to find converter executable
  let converterCmd;
  if (fs.existsSync(converterPath)) {
    converterCmd = `node "${converterPath}"`;
  } else {
    // Use npx
    converterCmd = 'npx @tensorflow/tfjs-converter';
  }
  
  const cmd = `${converterCmd} --input_format keras --output_format tfjs_layers_model "${MODEL_SRC}" "${MODEL_DEST}"`;
  
  console.log(`Running: ${cmd}`);
  execSync(cmd, {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  
  console.log('\n✅ Conversion successful!');
  
  // Copy metadata if not exists
  const metadataSrc = path.join(__dirname, '../../yolo-service/action-recognition/checkpoints/model_info.json');
  const metadataDest = path.join(MODEL_DEST, 'model_info.json');
  
  if (fs.existsSync(metadataSrc) && !fs.existsSync(metadataDest)) {
    fs.copyFileSync(metadataSrc, metadataDest);
    console.log('✅ Copied model_info.json');
    
    // Create metadata.json
    const modelInfo = JSON.parse(fs.readFileSync(metadataSrc, 'utf8'));
    const metadata = {
      class_labels: Object.keys(modelInfo.idx_to_class).map(i => modelInfo.idx_to_class[i])
    };
    fs.writeFileSync(
      path.join(MODEL_DEST, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    console.log('✅ Created metadata.json');
  }
  
  // List converted files
  console.log('\n📋 Converted files:');
  const files = fs.readdirSync(MODEL_DEST);
  files.forEach(file => {
    const filePath = path.join(MODEL_DEST, file);
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   ✅ ${file} (${size} MB)`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Conversion completed!');
  console.log('='.repeat(60));
  
} catch (error) {
  console.error('\n❌ Conversion failed:', error.message);
  console.error('\n💡 Alternative: Use Python script (see CONVERSION_GUIDE.md)');
  process.exit(1);
}

