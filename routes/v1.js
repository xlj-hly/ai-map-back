const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const router = express.Router();

// 获取access_token
async function getAccessToken() {
  const url = 'https://api.weixin.qq.com/cgi-bin/token';
  const params = {
    grant_type: 'client_credential',
    appid: process.env.WECHAT_APPID,
    secret: process.env.WECHAT_SECRET
  };
  
  const response = await axios.get(url, { params });
  if (response.data.errcode) {
    throw new Error(`获取access_token失败: ${response.data.errmsg}`);
  }
  return response.data.access_token;
}

// 验证登录态 - 使用checkSessionKey接口
async function checkSessionKey(accessToken, openid, sessionKey) {
  const signature = crypto.createHmac('sha256', sessionKey).update('').digest('hex');
  
  const url = 'https://api.weixin.qq.com/wxa/checksession';
  const params = {
    access_token: accessToken,
    openid: openid,
    signature: signature,
    sig_method: 'hmac_sha256'
  };
  
  const response = await axios.get(url, { params });
  return response.data;
}

// 临时code登录 - 获取openid和session_key
router.get('/login/:code', async (req, res) => {
  try {
    const url = 'https://api.weixin.qq.com/sns/jscode2session';
    const params = {
      appid: process.env.WECHAT_APPID,
      secret: process.env.WECHAT_SECRET,
      js_code: req.params.code,
      grant_type: 'authorization_code'
    };
    
    const response = await axios.get(url, { params });
    
    if (response.data.errcode) {
      throw response.data;
    }
    
    const { openid, session_key } = response.data;
    
    res.json({
      code: 0,
      success: true,
      message: '临时code登录成功',
      data: { openid, session_key }
    });
  } catch (err) {
    res.status(400).json({
      code: err.errcode || -1,
      success: false,
      message: err.errmsg || '登录失败',
      data: err
    });
  }
});

// session_key验证
router.get('/verify', async (req, res) => {
  try {
    const { openid, session_key } = req.query;
    
    if (!openid || !session_key) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '缺少openid或session_key参数'
      });
    }
    
    const accessToken = await getAccessToken();
    const checkResult = await checkSessionKey(accessToken, openid, session_key);
    
    res.json({
      code: 0,
      success: true,
      message: 'session_key验证成功',
      data: checkResult
    });
  } catch (err) {
    res.status(400).json({
      code: err.errcode || -1,
      success: false,
      message: err.errmsg || '验证失败',
      data: err
    });
  }
});

// 微信登录校验
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
router.all('/api/lbs/*', async (req, res) => {
  try {
    console.log('收到请求:', req.method, req.path, req.query);
    
    // 1. 校验微信登录 - 支持openid或code
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
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Smart Itinerary Backend'
  });
});

// 测试腾讯位置服务Key
router.get('/test-key', async (req, res) => {
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

module.exports = router;
