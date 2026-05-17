const express = require("express");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const app = express();

const PORT = 3000;

const YAML_FILE = path.join(
  __dirname,
  "index.yaml",
);

function loadYamlImages() {

  if (!fs.existsSync(YAML_FILE)) {
    return [];
  }

  try {

    const raw = fs.readFileSync(
      YAML_FILE,
      "utf8",
    );

    const data = yaml.load(raw);

    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter(Boolean)
      .map((url, index) => {

        const cleanUrl = String(url).trim();

        return {
          id: index + 1,
          url: cleanUrl,
          name: path.basename(
            cleanUrl.split("?")[0],
          ),
        };
      });

  } catch (err) {

    console.error(err);

    return [];
  }
}

app.get("/api/images", (req, res) => {

  const images = loadYamlImages();

  res.json(images);
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
/>

<title>YAML 图片预览</title>

<script src="https://unpkg.com/imagesloaded@5/imagesloaded.pkgd.min.js"></script>

<script src="https://unpkg.com/masonry-layout@4/dist/masonry.pkgd.min.js"></script>

<style>

*{
  box-sizing:border-box;
}

body{
  margin:0;
  background:#0f1115;
  color:#fff;
  font-family:
    Inter,
    "PingFang SC",
    sans-serif;
}

.header{

  position:sticky;
  top:0;
  z-index:999;

  display:flex;
  align-items:center;
  justify-content:space-between;

  padding:14px 18px;

  background:rgba(15,17,21,.85);

  backdrop-filter:blur(16px);

  border-bottom:1px solid #222;
}

.title{
  font-size:18px;
  font-weight:700;
}

.count{
  color:#999;
  font-size:14px;
}

.grid{
  padding:14px;
}

.grid-sizer,
.item{
  width:calc(20% - 10px);
}

@media (max-width: 1600px){

  .grid-sizer,
  .item{
    width:calc(25% - 9px);
  }
}

@media (max-width: 1200px){

  .grid-sizer,
  .item{
    width:calc(33.333% - 8px);
  }
}

@media (max-width: 800px){

  .grid-sizer,
  .item{
    width:calc(50% - 6px);
  }
}

@media (max-width: 500px){

  .grid-sizer,
  .item{
    width:100%;
  }
}

.item{

  overflow:hidden;

  border-radius:16px;

  background:#181c24;

  border:1px solid #252b36;

  margin-bottom:12px;

  transition:.2s;
}

.item:hover{
  transform:translateY(-3px);
}

.thumb{

  width:100%;

  display:block;

  background:#222;

  cursor:pointer;
}

.info{
  padding:12px;
}

.name{

  font-size:13px;

  line-height:1.5;

  word-break:break-all;

  color:#d1d5db;
}

.url{

  margin-top:8px;

  font-size:12px;

  color:#6b7280;

  word-break:break-all;
}

.actions{

  display:flex;

  gap:8px;

  margin-top:10px;
}

.btn{

  border:none;

  padding:8px 10px;

  border-radius:10px;

  background:#2563eb;

  color:#fff;

  cursor:pointer;

  font-size:12px;
}

.btn:hover{
  opacity:.9;
}

.viewer{

  position:fixed;

  inset:0;

  z-index:99999;

  display:none;

  align-items:center;

  justify-content:center;

  background:rgba(0,0,0,.96);
}

.viewer.show{
  display:flex;
}

.viewer img{

  max-width:95%;

  max-height:95%;

  border-radius:10px;
}

.close{

  position:absolute;

  top:20px;

  right:20px;

  width:44px;

  height:44px;

  border:none;

  border-radius:50%;

  background:#fff;

  color:#000;

  font-size:22px;

  cursor:pointer;
}

.empty{

  padding:60px 20px;

  text-align:center;

  color:#777;
}

.loading{

  padding:40px;

  text-align:center;

  color:#888;
}

</style>

</head>

<body>

<div class="header">

  <div class="title">
    YAML 图片预览
  </div>

  <div
    class="count"
    id="count"
  >
    加载中...
  </div>

</div>

<div
  class="grid"
  id="grid"
>
  <div class="loading">
    Loading...
  </div>
</div>

<div
  class="viewer"
  id="viewer"
>

  <button
    class="close"
    id="closeBtn"
  >
    ×
  </button>

  <img id="viewerImg">

</div>

<script>

const grid =
  document.getElementById("grid");

const countEl =
  document.getElementById("count");

const viewer =
  document.getElementById("viewer");

const viewerImg =
  document.getElementById("viewerImg");

const closeBtn =
  document.getElementById("closeBtn");

let masonry = null;

async function loadImages(){

  try{

    const res =
      await fetch("/api/images");

    const images =
      await res.json();

    render(images);

  }catch(err){

    console.error(err);

    grid.innerHTML = \`
      <div class="empty">
        加载失败
      </div>
    \`;
  }
}

function render(images){

  countEl.innerText =
    \`共 \${images.length} 张图片\`;

  if(images.length === 0){

    grid.innerHTML = \`
      <div class="empty">
        index.yaml 没有图片
      </div>
    \`;

    return;
  }

  grid.innerHTML =

    '<div class="grid-sizer"></div>' +

    images.map(item => {

      return \`
        <div class="item">

          <img
            class="thumb"
            loading="lazy"
            src="\${item.url}"
            data-url="\${item.url}"
          >

          <div class="info">

            <div class="name">
              \${item.name}
            </div>

            <div class="url">
              \${item.url}
            </div>

            <div class="actions">

              <button
                class="btn copy-btn"
                data-copy="\${item.url}"
              >
                复制链接
              </button>

              <button
                class="btn open-btn"
                data-open="\${item.url}"
              >
                新窗口打开
              </button>

            </div>

          </div>

        </div>
      \`;

    }).join("");

  bindEvents();

  if(masonry){
    masonry.destroy();
  }

  imagesLoaded(grid, () => {

    masonry = new Masonry(grid, {

      itemSelector: ".item",

      columnWidth: ".grid-sizer",

      percentPosition: true,

      gutter: 12
    });

  });
}

function bindEvents(){

  document
    .querySelectorAll(".thumb")
    .forEach(img => {

      img.onclick = () => {

        viewer.classList.add("show");

        viewerImg.src =
          img.dataset.url;
      };
    });

  document
    .querySelectorAll(".copy-btn")
    .forEach(btn => {

      btn.onclick = async () => {

        const text =
          btn.dataset.copy;

        await navigator
          .clipboard
          .writeText(text);

        btn.innerText = "已复制";

        setTimeout(() => {

          btn.innerText =
            "复制链接";

        }, 1000);
      };
    });

  document
    .querySelectorAll(".open-btn")
    .forEach(btn => {

      btn.onclick = () => {

        window.open(
          btn.dataset.open,
          "_blank",
        );
      };
    });
}

viewer.onclick = (e) => {

  if(
    e.target === viewer ||
    e.target === closeBtn
  ){

    viewer.classList.remove(
      "show",
    );

    viewerImg.src = "";
  }
};

document.addEventListener(
  "keydown",
  (e) => {

    if(e.key === "Escape"){

      viewer.classList.remove(
        "show",
      );

      viewerImg.src = "";
    }
  }
);

loadImages();

</script>

</body>

</html>
  `);
});

app.listen(PORT, () => {

  console.log(
    `http://localhost:${PORT}`
  );
});