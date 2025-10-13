const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 简化的微信登录校验
async function verifyWechatLogin(sessionCode) {
  const url = 'https://api.weixin.qq.com/sns/jscode2session';
  const params = {
    appid: process.env.WECHAT_APPID,
    secret: process.env.WECHAT_SECRET,
    js_code: sessionCode,
    grant_type: 'authorization_code'
  };
  
  try {
    const response = await axios.get(url, { params });
    
    if (response.data.errcode) {
      throw new Error(`微信登录校验失败: ${response.data.errmsg}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('微信登录校验错误:', error.message);
    throw new Error('微信登录校验失败');
  }
}

// 通用API转发
app.all('/api/lbs/*', async (req, res) => {
  try {
    console.log('收到请求:', req.method, req.path, req.query);
    
    // 1. 校验微信登录
    const { session_code } = req.query;
    if (!session_code) {
      return res.status(400).json({ 
        error: '缺少session_code参数',
        code: 'MISSING_SESSION_CODE'
      });
    }
    
    // 验证微信登录
    await verifyWechatLogin(session_code);
    
    // 2. 构建腾讯位置服务API请求
    const apiPath = req.path.replace('/api/lbs', '');
    const tencentApiUrl = `https://apis.map.qq.com${apiPath}`;
    
    // 3. 透传所有参数，添加key
    const requestParams = {
      ...req.query,
      ...req.body,
      key: process.env.TENCENT_MAP_KEY
    };
    
    // 移除session_code，避免重复传递
    delete requestParams.session_code;
    
    console.log('转发到腾讯API:', tencentApiUrl, requestParams);
    
    // 4. 转发请求
    const response = await axios({
      method: req.method,
      url: tencentApiUrl,
      params: req.method === 'GET' ? requestParams : undefined,
      data: req.method === 'POST' ? requestParams : undefined,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Smart-Itinerary-Backend/1.0.0'
      },
      timeout: 10000
    });
    
    // 5. 返回结果
    res.json(response.data);
    
  } catch (error) {
    console.error('API转发错误:', error.message);
    
    if (error.response) {
      // 腾讯API返回的错误
      res.status(error.response.status).json({
        error: '腾讯位置服务API错误',
        details: error.response.data,
        code: 'TENCENT_API_ERROR'
      });
    } else if (error.code === 'ECONNABORTED') {
      // 超时错误
      res.status(408).json({
        error: '请求超时',
        code: 'REQUEST_TIMEOUT'
      });
    } else {
      // 其他错误
      res.status(500).json({
        error: '服务内部错误',
        details: error.message,
        code: 'INTERNAL_ERROR'
      });
    }
  }
});

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Smart Itinerary Backend'
  });
});

// 测试腾讯位置服务Key
app.get('/test-key', async (req, res) => {
  try {
    const testUrl = 'https://apis.map.qq.com/ws/geocoder/v1/';
    const response = await axios.get(testUrl, {
      params: {
        key: process.env.TENCENT_MAP_KEY,
        address: '北京市天安门',
        output: 'json'
      }
    });
    
    res.json({
      status: 'success',
      message: 'Key验证成功',
      data: response.data
    });
  } catch (error) {
    res.json({
      status: 'error',
      message: 'Key验证失败',
      error: error.response?.data || error.message
    });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('未处理的错误:', err);
  res.status(500).json({
    error: '服务器内部错误',
    code: 'UNHANDLED_ERROR'
  });
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
  console.log(`🚀 智能行程后端服务运行在端口 ${PORT}`);
  console.log(`📡 健康检查: http://localhost:${PORT}/health`);
  console.log(`🗺️  API转发: http://localhost:${PORT}/api/lbs/*`);
});

module.exports = app;
