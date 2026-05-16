const net = require('net');

const WHOIS_HOST = 'whois.verisign-grs.com';
const WHOIS_PORT = 43;

const chars = 'abcdefghijklmnopqrstuvwxyz';

const color = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function randomName(length = 5) {
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }

  return result;
}

function queryWhois(domain) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: WHOIS_HOST,
      port: WHOIS_PORT
    });

    let data = '';

    socket.setTimeout(10000);

    socket.on('connect', () => {
      socket.write(domain + '\r\n');
    });

    socket.on('data', chunk => {
      data += chunk.toString();
    });

    socket.on('end', () => {
      resolve(data);
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('查询超时'));
    });

    socket.on('error', err => {
      reject(err);
    });
  });
}

function isAvailable(text) {
  const lower = text.toLowerCase();

  return (
    lower.includes('no match for') ||
    lower.includes('not found')
  );
}

async function checkDomain(domain) {
  try {
    console.log(
      `${color.cyan}[查询]${color.reset} 正在查询域名：${color.blue}${domain}${color.reset}`
    );

    const result = await queryWhois(domain);

    const available = isAvailable(result);

    if (available) {
      console.log(
        `${color.green}[可注册]${color.reset} 发现未注册域名：${color.green}${domain}${color.reset}`
      );
    } else {
      console.log(
        `${color.yellow}[已注册]${color.reset} 域名已被注册：${color.gray}${domain}${color.reset}`
      );
    }

    return {
      domain,
      available,
      raw: result
    };

  } catch (err) {
    console.log(
      `${color.red}[错误]${color.reset} 查询失败：${color.red}${domain}${color.reset}`
    );

    console.log(
      `${color.red}[错误信息]${color.reset} ${err.message}`
    );

    return {
      domain,
      available: false,
      error: err.message
    };
  }
}

async function main() {
  const checked = new Set();

  console.log(
    `${color.green}开始随机扫描五位 .com 域名...${color.reset}`
  );

  console.log(
    `${color.gray}--------------------------------${color.reset}`
  );

  while (true) {
    const name = randomName(5);

    if (checked.has(name)) {
      continue;
    }

    checked.add(name);

    const domain = `${name}.com`;

    const result = await checkDomain(domain);

      console.log(
        `${color.green}--------------------------------${color.reset}`
      );

    // 防止请求过快
    await new Promise(r => setTimeout(r, 1000));
  }
}
// eoyva.com
main();