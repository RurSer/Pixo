const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = 3000;

const rootDir = path.join(__dirname, "images");

const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

app.use("/images", express.static(rootDir));

function getGroups() {
  const groups = [];

  const subDirs = fs
    .readdirSync(rootDir)
    .filter((dir) => {
      return fs.statSync(path.join(rootDir, dir)).isDirectory();
    })
    .sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
      }),
    );

  for (const subDir of subDirs) {
    const folderPath = path.join(rootDir, subDir);

    const files = fs.readdirSync(folderPath).filter((file) => {
      const fullPath = path.join(folderPath, file);

      return (
        fs.statSync(fullPath).isFile() &&
        IMAGE_EXT.includes(path.extname(file).toLowerCase())
      );
    });

    const images = files.map((file) => {
      const parsed = path.parse(file);

      return {
        id: parsed.name,
        original: `/images/${subDir}/${file}`,
        w400: `/images/${subDir}/400/${parsed.name}.webp`,
        w800: `/images/${subDir}/800/${parsed.name}.webp`,
      };
    });

    groups.push({
      name: subDir,
      images,
    });
  }

  return groups;
}

app.get("/api/images", (req, res) => {
  res.json(getGroups());
});

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>图片预览</title>

<script src="https://unpkg.com/imagesloaded@5/imagesloaded.pkgd.min.js"></script>

<script src="https://unpkg.com/masonry-layout@4/dist/masonry.pkgd.min.js"></script>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #111;
  color: #fff;
  font-family: sans-serif;
}

.header {
  position: sticky;
  top: 0;
  z-index: 999;
  display: flex;
  gap: 10px;
  padding: 12px;
  background: rgba(0,0,0,.85);
  backdrop-filter: blur(10px);
}

select {
  background: #222;
  color: #fff;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 8px 12px;
}

.grid {
  padding: 12px;
}

.grid-sizer,
.item {
  width: calc(20% - 10px);
}

@media (max-width: 1400px) {
  .grid-sizer,
  .item {
    width: calc(25% - 9px);
  }
}

@media (max-width: 1000px) {
  .grid-sizer,
  .item {
    width: calc(33.333% - 8px);
  }
}

@media (max-width: 700px) {
  .grid-sizer,
  .item {
    width: calc(50% - 6px);
  }
}

.item {
  margin-bottom: 12px;
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
}

.item img {
  width: 100%;
  display: block;
  cursor: pointer;
}

.info {
  padding: 10px;
}

.id {
  font-size: 13px;
  word-break: break-all;
}

.viewer {
  position: fixed;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,.95);
  z-index: 9999;
}

.viewer.show {
  display: flex;
}

.viewer img {
  max-width: 95%;
  max-height: 95%;
}

</style>

</head>

<body>

<div class="header">

  <select id="groupSelect">
    <option value="all">全部</option>
  </select>

  <select id="versionSelect">
    <option value="original">原图</option>
    <option value="w800">800</option>
    <option value="w400">400</option>
  </select>

</div>

<div class="grid" id="grid"></div>

<div class="viewer" id="viewer">
  <img id="viewerImg">
</div>

<script>

const grid = document.getElementById('grid');

const groupSelect = document.getElementById('groupSelect');

const versionSelect = document.getElementById('versionSelect');

const viewer = document.getElementById('viewer');

const viewerImg = document.getElementById('viewerImg');

let groups = [];

let msnry = null;

async function load() {

  const res = await fetch('/api/images');

  groups = await res.json();

  for (const g of groups) {

    const option = document.createElement('option');

    option.value = g.name;

    option.innerText = g.name;

    groupSelect.appendChild(option);
  }

  render();
}

function render() {

  const group = groupSelect.value;

  const version = versionSelect.value;

  let list = [];

  if (group === 'all') {

    groups.forEach(g => {
      list.push(...g.images);
    });

  } else {

    const target = groups.find(g => g.name === group);

    if (target) {
      list = target.images;
    }
  }

  grid.innerHTML =
    '<div class="grid-sizer"></div>' +

    list.map(item => {

      return \`
        <div class="item">

          <img
            loading="lazy"
            src="\${item[version]}"
            data-view="\${item[version]}"
          >

          <div class="info">
            <div class="id">\${item.id}</div>
          </div>

        </div>
      \`;

    }).join('');

  bindViewer();

  if (msnry) {
    msnry.destroy();
  }

  imagesLoaded(grid, () => {

    msnry = new Masonry(grid, {
      itemSelector: '.item',
      columnWidth: '.grid-sizer',
      percentPosition: true,
      gutter: 12
    });

  });
}

function bindViewer() {

  document.querySelectorAll('.item img').forEach(img => {

    img.onclick = () => {

      viewer.classList.add('show');

      viewerImg.src = img.dataset.view;
    };

  });
}

viewer.onclick = () => {

  viewer.classList.remove('show');
};

groupSelect.onchange = render;

versionSelect.onchange = render;

load();

</script>

</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
