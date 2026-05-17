const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const yaml = require("js-yaml");
const { fetch, ProxyAgent } = require("undici");

const CONFIG = {
  imagesRoot: path.join(__dirname, "images"),

  indexYaml: path.join(__dirname, "index.yaml"),

  concurrency: 8,

  retry: 3,

  delay: 300,

  proxy: "http://127.0.0.1:7890",

  webp: {
    quality: 80,
    effort: 4,
  },

  cdnPrefix: "https://cdn.jsdmirror.com/gh/RurSer/Pixo@main/images/",
};

const HEADERS = {
  Referer: "https://www.pixiv.net/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
};

sharp.concurrency(0);

const proxyAgent = new ProxyAgent(CONFIG.proxy);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeFileName(name = "") {
  return String(name)
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

function getOutputPath(item, outputRoot) {
  const safeTitle = sanitizeFileName(item.title || "无题")
    .slice(0, 80);

  const fileName =
    `${item.idNum}_${safeTitle}_p${item.index}.webp`;

  return {
    dir: outputRoot,
    file: fileName,
    full: path.join(outputRoot, fileName),
  };
}

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: HEADERS,
    dispatcher: proxyAgent,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function withRetry(fn, retry = CONFIG.retry) {
  let lastError;

  for (let i = 1; i <= retry; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      console.warn(`[重试 ${i}/${retry}] ${err.message}`);

      if (i < retry) {
        await sleep(1000 * i);
      }
    }
  }

  throw lastError;
}

async function processItem(item, current, total, outputRoot) {
  if (!item?.original) {
    console.log(`[${current}/${total}] 跳过: 无 original`);
    return;
  }

  const output = getOutputPath(item, outputRoot);

  try {
    await fs.access(output.full);

    console.log(`[${current}/${total}] 已存在: ${output.file}`);

    return;
  } catch {}

  await fs.mkdir(output.dir, {
    recursive: true,
  });

  console.log(`[${current}/${total}] 下载: ${item.id}`);

  const buffer = await withRetry(() => fetchBuffer(item.original));

  await sharp(buffer)
    .rotate()
    .webp(CONFIG.webp)
    .toFile(output.full);

  console.log(`[${current}/${total}] 完成: ${output.file}`);

  await sleep(CONFIG.delay);
}

async function runPool(items, limit, outputRoot) {
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      const item = items[index];

      try {
        await processItem(
          item,
          index + 1,
          items.length,
          outputRoot,
        );
      } catch (err) {
        console.error(
          `[${index + 1}/${items.length}] 失败: ${item?.id}`,
          err.message,
        );
      }
    }
  }

  await Promise.all(
    Array.from(
      {
        length: limit,
      },
      worker,
    ),
  );
}

async function scanWebp(dir, result = []) {
  const entries = await fs.readdir(dir, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await scanWebp(fullPath, result);
      continue;
    }

    if (
      entry.isFile() &&
      path.extname(entry.name).toLowerCase() === ".webp"
    ) {
      const relative = path
        .relative(CONFIG.imagesRoot, fullPath)
        .replace(/\\/g, "/");

      result.push(CONFIG.cdnPrefix + relative);
    }
  }

  return result;
}

async function scanJsonFiles(dir, result = []) {
  const entries = await fs.readdir(dir, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await scanJsonFiles(fullPath, result);
      continue;
    }

    if (
      entry.isFile() &&
      path.extname(entry.name).toLowerCase() === ".json"
    ) {
      result.push(fullPath);
    }
  }

  return result;
}

async function processJsonFile(jsonPath) {
  const jsonName = path.parse(jsonPath).name;

  const outputRoot = path.join(CONFIG.imagesRoot, jsonName);

  console.log(`\n==========`);
  console.log(`处理 JSON: ${jsonName}`);
  console.log(`==========\n`);

  const raw = await fs.readFile(jsonPath, "utf8");

  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new TypeError(`${jsonName} JSON 必须是数组`);
  }

  console.log(`读取 ${data.length} 条数据`);

  await runPool(
    data,
    CONFIG.concurrency,
    outputRoot,
  );
}

async function main() {
  await fs.mkdir(CONFIG.imagesRoot, {
    recursive: true,
  });

  const jsonFiles = await scanJsonFiles(CONFIG.imagesRoot);

  if (jsonFiles.length === 0) {
    console.log("images 目录下没有 JSON 文件");
    return;
  }

  console.log(`发现 ${jsonFiles.length} 个 JSON 文件`);

  for (const jsonFile of jsonFiles) {
    try {
      await processJsonFile(jsonFile);
    } catch (err) {
      console.error(
        `处理失败: ${path.basename(jsonFile)}`,
        err.message,
      );
    }
  }

  const allImages = await scanWebp(CONFIG.imagesRoot);

  await fs.writeFile(
    CONFIG.indexYaml,
    yaml.dump(allImages, {
      lineWidth: -1,
    }),
    "utf8",
  );

  console.log(`\n生成 index.yaml (${allImages.length} 张)`);

  console.log("全部完成");
}

main().catch((err) => {
  console.error("程序异常:", err);
  process.exitCode = 1;
});