// Lightweight terminal logger (no external deps).
// Gives colored, readable output for DB operations and access/IP tracking,
// which is exactly what you asked to "see in the terminal".

const c = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
};

function ts() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

const logger = {
  info: (msg) => console.log(`${c.gray}[${ts()}]${c.reset} ${msg}`),

  success: (msg) => console.log(`${c.gray}[${ts()}]${c.reset} ${c.green}✔${c.reset} ${msg}`),

  warn: (msg) => console.log(`${c.gray}[${ts()}]${c.reset} ${c.yellow}⚠${c.reset} ${msg}`),

  error: (msg) => console.log(`${c.gray}[${ts()}]${c.reset} ${c.red}✖${c.reset} ${msg}`),

  // DB operation log: e.g. db('INSERT', 'User', 'patient john@x.com')
  db: (op, collection, detail = '') =>
    console.log(
      `${c.gray}[${ts()}]${c.reset} ${c.magenta}DB ${op}${c.reset} ${c.cyan}${collection}${c.reset} ${c.gray}${detail}${c.reset}`
    ),

  // Access log: which IP hit which route
  access: (ip, method, path) =>
    console.log(
      `${c.gray}[${ts()}]${c.reset} ${c.bold}${method}${c.reset} ${path} ${c.gray}from${c.reset} ${c.yellow}${ip}${c.reset}`
    ),
};

module.exports = logger;
