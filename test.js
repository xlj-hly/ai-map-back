const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');

require('dotenv').config();

const app = express();
app.use(cors());

// 从环境变量获取配置
const env = {
  appid: process.env.WECHAT_APPID,
  secret: process.env.WECHAT_SECRET
};

// 获取access_token
async function getAccessToken(appid, secret) {
    const url = 'https://api.weixin.qq.com/cgi-bin/token';
    const params = { grant_type: 'client_credential', appid, secret };
    
    const resp = await axios.get(url, { params });
    if (resp.data.errcode) {
        throw resp.data;
    }
    return resp.data.access_token;
}

// 验证登录态 - 使用checkSessionKey接口
async function checkSessionKey(accessToken, openid, sessionKey) {
    // 使用session_key对空字符串签名
    const signature = crypto.createHmac('sha256', sessionKey).update('').digest('hex');
    
    const url = 'https://api.weixin.qq.com/wxa/checksession';
    const params = {
        access_token: accessToken,
        openid: openid,
        signature: signature,
        sig_method: 'hmac_sha256'
    };
    
    const resp = await axios.get(url, { params });
    return resp.data;
}

// 接口1：临时code登录 - 获取openid和session_key
app.get('/login/:code', async (req, res) => {
  try {
    const url = 'https://api.weixin.qq.com/sns/jscode2session';
    const params = { 
      appid: env.appid, 
      secret: env.secret, 
      js_code: req.params.code, 
      grant_type: 'authorization_code' 
    };
    
    const response = await axios.get(url, { params });
    
    if (response.data.errcode) {
      throw response.data;
    }
    
    res.json({ 
      code: 0, 
      success: true, 
      message: '临时code登录成功', 
      data: response.data
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

// 接口2：session_key验证 - 验证登录态
app.get('/verify', async (req, res) => {
  try {
    const { openid, session_key } = req.query;
    
    if (!openid || !session_key) {
      return res.status(400).json({ 
        code: 400, 
        success: false, 
        message: '缺少openid或session_key参数'
      });
    }
    
    const accessToken = await getAccessToken(env.appid, env.secret);
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


app.listen(3000, () => {
  console.log('Server is running on port 3000');
  console.log('接口1 - 临时code登录: http://localhost:3000/login/YOUR_WECHAT_CODE');
  console.log('接口2 - session_key验证: http://localhost:3000/verify?openid=OPENID&session_key=SESSION_KEY');
});