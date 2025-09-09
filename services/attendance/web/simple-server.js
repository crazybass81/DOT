const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3003;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // CORS 헤더 추가
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // API 엔드포인트 처리
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const response = {
      status: 'ok',
      message: 'DOT 근태관리 API 서버 정상 작동 중',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: 'connected',
        authentication: 'active',
        monitoring: 'enabled'
      }
    };
    res.end(JSON.stringify(response, null, 2));
    return;
  }

  // 기본 라우팅 처리
  let filePath = req.url === '/' ? '/login.html' : req.url;
  filePath = path.join(__dirname, 'public', filePath);

  // 파일 존재 확인 및 제공
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>404 - 페이지를 찾을 수 없습니다</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 50px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
                margin: 0;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
              }
              h1 { font-size: 3rem; margin-bottom: 20px; }
              p { font-size: 1.2rem; margin-bottom: 30px; }
              a { 
                color: #fff; 
                background: rgba(255,255,255,0.2); 
                padding: 10px 20px; 
                border-radius: 5px; 
                text-decoration: none;
                transition: background 0.3s;
              }
              a:hover { background: rgba(255,255,255,0.3); }
            </style>
          </head>
          <body>
            <h1>404</h1>
            <p>요청하신 페이지를 찾을 수 없습니다.</p>
            <p>사용 가능한 페이지:</p>
            <a href="/login.html">로그인 페이지</a>
            <a href="/debug.html" style="margin-left: 10px;">디버그 페이지</a>
          </body>
          </html>
        `);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('서버 오류가 발생했습니다');
      }
    } else {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 DOT 근태관리 서버가 실행 중입니다!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📱 로그인: http://localhost:${PORT}/login.html`);
  console.log(`🔧 디버그: http://localhost:${PORT}/debug.html`);
  console.log(`🏥 API: http://localhost:${PORT}/api/health`);
  console.log(`⏰ 시작 시간: ${new Date().toLocaleString('ko-KR')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('서버가 종료됩니다...');
  server.close(() => {
    console.log('서버가 정상적으로 종료되었습니다.');
  });
});

process.on('SIGINT', () => {
  console.log('\n서버가 종료됩니다...');
  server.close(() => {
    console.log('서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});