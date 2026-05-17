// server.js
// YAML 图片预览后台
//
// 使用：
// npm i express js-yaml
// node server.js
//
// 然后访问：
// http://localhost:3000

const express = require('express');
const fs = require('fs');
const yaml = require('js-yaml');

const app = express();

const YAML_FILE = './banner-images.yml';

function loadImages() {
  try {
    const content = fs.readFileSync(YAML_FILE, 'utf8');

    const data = yaml.load(content);

    if (Array.isArray(data)) {
      return data;
    }

    return [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

app.get('/', (req, res) => {
  const images = loadImages();

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<title>Banner Preview</title>

<style>
*{
  margin:0;
  padding:0;
  box-sizing:border-box;
}

body{
  background:#0f1115;
  color:#fff;
  font-family:sans-serif;
  padding:20px;
}

h1{
  margin-bottom:20px;
}

.grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(420px,1fr));
  gap:20px;
}

.card{
  background:#181c24;
  border-radius:14px;
  overflow:hidden;
  border:1px solid #2a2f3a;
}

.image{
  width:100%;
  aspect-ratio:16/9;
  object-fit:cover;
  display:block;
  background:#222;
}

.info{
  padding:12px;
}

.url{
  word-break:break-all;
  font-size:13px;
  color:#9ca3af;
  margin-top:8px;
}

.copy{
  margin-top:10px;
  border:none;
  background:#3b82f6;
  color:#fff;
  padding:8px 12px;
  border-radius:8px;
  cursor:pointer;
}

.copy:hover{
  opacity:.9;
}

.count{
  margin-bottom:20px;
  color:#aaa;
}
</style>
</head>
<body>

<h1>Banner Preview</h1>

<div class="count">
共 ${images.length} 张图片
</div>

<div class="grid">
${images.map(url => `
  <div class="card">
    <img
      class="image"
      src="${url}"
      loading="lazy"
      referrerpolicy="no-referrer"
    />

    <div class="info">
      <div class="url">${url}</div>

      <button
        class="copy"
        onclick="copyText('${url}')"
      >
        复制链接
      </button>
    </div>
  </div>
`).join('')}
</div>

<script>
function copyText(text){
  navigator.clipboard.writeText(text);
  alert('已复制');
}
</script>

</body>
</html>
`;

  res.send(html);
});

app.listen(3000, () => {
  console.log('Preview Server: http://localhost:3000');
});