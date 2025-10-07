// server.js

const http = require('http');
const fs = require('fs/promises');
const path = require('path');

// 定义服务器的端口
const PORT = 3000;
// 静态文件目录
const PUBLIC_DIR = path.join(__dirname, 'public');
// API 路径
const API_PATH = '/api/client-hints';

const SERVER_SUPPORT = {
    "acceptCH": true,
    "permissionsPolicy": true,
    "criticalCH": true,
    "https": false 
};

function getContentType(filePath) {
    const extname = path.extname(filePath);
    switch (extname) {
        case '.html':
            return 'text/html';
        case '.css':
            return 'text/css';
        case '.js':
            return 'application/javascript';
        case '.json':
            return 'application/json';
        case '.png':
            return 'image/png';
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        default:
            return 'application/octet-stream';
    }
}


/**
 * 辅助函数：去除 Client Hints 值首尾的引号。
 * Client Hints 头部值在 HTTP 标准中可能包含引号（例如 "Windows"），
 * Node.js 读到的是带引号的字符串。
 * @param {string | null} value 原始的 Client Hint 字符串值
 * @returns {string | null} 清理后的值
 */
function cleanClientHintValue(value) {
    if (typeof value === 'string') {
        // 使用正则表达式移除字符串开头和结尾可能存在的引号 (包括空格)
        return value.trim().replace(/^"|"$/g, '');
    }
    return value;
}


/**
 * 从 HTTP 请求头中提取 Client Hints 数据，并将其格式化为您需要的结构
 * **关键修改：使用 cleanClientHintValue 清理了有引号的字段。**
 * @param {http.IncomingMessage} req 请求对象
 * @returns {object} 格式化后的 clientHints 对象
 */
function extractClientHints(req) {
    const headers = req.headers;

    // 清理后的 Client Hints 对象
    const clientHints = {
        // --- 低熵提示 (Low-Entropy Hints) ---
        // userAgent 和 fullVersionList 不去除内部引号
        "userAgent": headers['sec-ch-ua'] || req.headers['user-agent'] || null, 
        "mobile": headers['sec-ch-ua-mobile'] === '?1', 
        "platform": cleanClientHintValue(headers['sec-ch-ua-platform']),

        // --- 高熵提示 (High-Entropy Hints) ---
        "platformVersion": cleanClientHintValue(headers['sec-ch-ua-platform-version']),
        "arch": cleanClientHintValue(headers['sec-ch-ua-arch']),
        "model": cleanClientHintValue(headers['sec-ch-ua-model']),
        "fullVersion": cleanClientHintValue(headers['sec-ch-ua-full-version']),
        "fullVersionList": headers['sec-ch-ua-full-version-list'] || null, // 不去除内部引号
    };
    
    // 基础 user-agent 解析 (使用清理后的值)
    const isMobile = clientHints.mobile; 
    const detectedOS = clientHints.platform || 'Unknown'; 

    // 检查是否有任何高熵数据被发送
    const hasHighEntropyData = !!(clientHints.platformVersion || clientHints.arch || clientHints.model || clientHints.fullVersion || clientHints.fullVersionList);

    return {
        clientHints,
        detectedOS,
        isMobile,
        hasHighEntropyData
    };
}


// ... (CH_HEADERS, PERMISSIONS_POLICY, CRITICAL_CH 常量与之前版本相同) ...

const CH_HEADERS = [
    'Sec-CH-UA', 'Sec-CH-UA-Mobile', 'Sec-CH-UA-Platform', 
    'Sec-CH-UA-Platform-Version', 'Sec-CH-UA-Arch', 'Sec-CH-UA-Model', 
    'Sec-CH-UA-Full-Version', 'Sec-CH-UA-Full-Version-List'
].join(', ');

const PERMISSIONS_POLICY = 'ch-ua=*, ch-ua-arch=*, ch-ua-full-version=*, ch-ua-full-version-list=*, ch-ua-mobile=*, ch-ua-model=*, ch-ua-platform=*, ch-ua-platform-version=*';

const CRITICAL_CH = 'Sec-CH-UA-Platform, Sec-CH-UA-Mobile';


/**
 * 处理 HTTP 请求的函数 (与之前版本逻辑相同)
 */
async function requestListener(req, res) {
    const url = req.url;

    // --- 1. 处理 API 请求 ---
    if (url === API_PATH) {
        const { clientHints, detectedOS, isMobile, hasHighEntropyData } = extractClientHints(req);

        const responseData = {
            "success": true,
            "timestamp": new Date().toISOString(), 
            clientHints,
            detectedOS,
            isMobile,
            hasHighEntropyData,
            "serverSupport": SERVER_SUPPORT
        };

        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Accept-CH': CH_HEADERS,
            'Permissions-Policy': PERMISSIONS_POLICY,
            'Critical-CH': CRITICAL_CH
        });
        
        res.end(JSON.stringify(responseData, null, 2));
        return;
    }

    // --- 2. 处理静态文件请求 ---
    
    let filePath = url === '/' ? '/index.html' : url;
    const fullPath = path.join(PUBLIC_DIR, filePath);

    if (!fullPath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden: Access outside public directory is not allowed.');
        return;
    }
    
    try {
        const data = await fs.readFile(fullPath);
        const contentType = getContentType(fullPath);
        
        res.writeHead(200, { 
            'Content-Type': contentType,
            'Accept-CH': CH_HEADERS,
            'Permissions-Policy': PERMISSIONS_POLICY
        });
        res.end(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(`<h1>404 Not Found</h1><p>The requested URL ${url} was not found on this server.</p>`);
        } else {
            console.error(`Error reading file ${fullPath}:`, error);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 Internal Server Error');
        }
    }
}

// 创建 HTTP 服务器
const server = http.createServer(requestListener);

// 启动服务器
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`API endpoint: http://localhost:${PORT}${API_PATH}`);
});