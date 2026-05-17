const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const name = 'index.yaml'
const IMAGE_DIR = path.join(__dirname, 'images');

const CDN_PREFIX =
  'https://cdn.jsdmirror.com/gh/RurSer/Pixo@main/';

const EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.avif'
]);

const TARGET_RATIO = 16 / 9;

// 允许误差
const TOLERANCE = 0.03;

const results = [];

async function scan(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      await scan(fullPath);
      continue;
    }

    const ext = path.extname(file).toLowerCase();

    if (!EXTENSIONS.has(ext)) continue;

    try {
      const metadata = await sharp(fullPath).metadata();

      const width = metadata.width || 0;
      const height = metadata.height || 0;

      if (!width || !height) continue;

      const ratio = width / height;

      // 判断是否接近 16:9
      if (Math.abs(ratio - TARGET_RATIO) <= TOLERANCE) {

        // 转为相对路径
        let relativePath = path.relative(
          process.cwd(),
          fullPath
        );

        // Windows 路径兼容
        relativePath = relativePath.replace(/\\/g, '/');

        results.push(
          `${CDN_PREFIX}${relativePath}`
        );

        console.log(`✓ ${relativePath}`);
      }

    } catch (err) {
      console.log(`跳过损坏图片: ${fullPath}`);
    }
  }
}

(async () => {
  await scan(IMAGE_DIR);

  // YAML 格式
  const yamlContent =
    results.map(url => `- ${url}`).join('\n');

  fs.writeFileSync(
    name,
    yamlContent
  );

  console.log('\n========================');
  console.log(`共找到 ${results.length} 张 16:9 图片`);
  console.log('========================');

  console.log(`\n已生成: ${name}`);
})();