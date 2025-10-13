const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { response, asyncHandler, getAccessToken, checkSessionKey } = require('./utils');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const WECHAT_APPID = process.env.WECHAT_APPID;
const WECHAT_SECRET = process.env.WECHAT_SECRET;
const TENCENT_MAP_KEY = process.env.TENCENT_MAP_KEY;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* 路由 - 使用包装器 */

// 临时code登录 - 获取openid和session_key
app.get('/login/:code', asyncHandler(async (req, res) => {
  const { code } = req.params;
  const url = 'https://api.weixin.qq.com/sns/jscode2session';
  const params = {
    appid: WECHAT_APPID,
    secret: WECHAT_SECRET,
    js_code: code,
    grant_type: 'authorization_code'
  };
  const wxRes = await axios.get(url, { params });
  if (wxRes.data.errcode) {
    return res.status(400)
              .json(response(wxRes.data.errcode, false, '登录失败', wxRes.data));
  }
  return res.json(response(0, true, '登录成功', wxRes.data));
}));

// 验证登录态 - 使用checkSessionKey接口
app.get('/verify', asyncHandler(async (req, res) => {
  const { openid, session_key } = req.query;
  if (!openid || !session_key) {
    return res.status(400).json(response(400, false, '缺少openid或session_key参数', null));
  }
  const accessToken = await getAccessToken(WECHAT_APPID, WECHAT_SECRET);
  const checkResult = await checkSessionKey(accessToken, openid, session_key);
  return res.json(response(0, true, 'session_key验证成功', checkResult));
}));

// API转发 - 完全透传
app.all('/api/lbs/*', async (req, res) => {
  try {
    const apiPath = req.path.replace('/api/lbs', '');
    const tencentApiUrl = `https://apis.map.qq.com${apiPath}`;
    
    const response = await axios({
      method: req.method,
      url: tencentApiUrl,
      headers: { ...req.headers, host: 'apis.map.qq.com' },
      params: { ...req.query, key: TENCENT_MAP_KEY },
      data: req.body
    });
    
    res.status(response.status);
    res.set(response.headers);
    res.send(response.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).send(error.response.data);
    } else {
      res.status(500).json({ error: '服务器错误' });
    }
  }
});

// 健康检查接口
app.get('/health', asyncHandler(async (req, res) => {
  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Smart Itinerary Backend v2'
  };
  return res.json(response(0, true, '服务运行正常', healthData));
}));

// 测试腾讯位置服务Key
app.get('/test', async (req, res) => {
  try {
    const testUrl = 'https://apis.map.qq.com/ws/geocoder/v1/';
    // 从请求查询参数获得address，如无则默认北京市天安门
    const address = req.query.address ? req.query.address : '北京市天安门';
    const response = await axios.get(testUrl, {
      params: {
        key: TENCENT_MAP_KEY,
        address: address,
        output: 'json'
      }
    });
    res.json(response.data); // 直接透传腾讯API响应
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * 全局错误处理中间件
 * 统一处理所有未捕获的错误，确保API返回标准格式
 * @param {Error} err - 错误对象
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express next函数
 * @returns {void}
 * @example
 * // 当路由中抛出错误时，会自动调用此中间件
 * throw new Error('数据库连接失败');
 * // 返回: { code: -1, success: false, message: '数据库连接失败', data: {...} }
 */
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json(response(-1, false, err.message || '服务异常', err));
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: '接口不存在',
    path: req.originalUrl,
    code: 'NOT_FOUND'
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
  console.log(`腾讯位置服务Key验证: http://localhost:${PORT}/test`);
  console.log(`API转发: http://localhost:${PORT}/api/lbs/*`);
});