const axios = require('axios');
const crypto = require('crypto');

/**
 * 统一返回函数
 * 标准化API响应格式，确保所有接口返回相同的数据结构
 * @param {number} code - 状态码，0表示成功，其他表示错误
 * @param {boolean} success - 是否成功
 * @param {string} message - 响应消息
 * @param {*} data - 响应数据
 * @returns {Object} 标准化的响应对象
 * @example
 * response(0, true, '操作成功', { userId: 123 })
 * // 返回: { code: 0, success: true, message: '操作成功', data: { userId: 123 } }
 */
const response = (code, success, message, data) => {
    return {
        code: code,
        success: success,
        message: message,
        data: data
    };
}

/**
 * 异步包装器函数
 * 自动捕获异步函数中的错误，避免在每个路由中重复写 try-catch
 * @param {Function} fn - 异步路由处理函数
 * @returns {Function} 包装后的路由处理函数
 * @example
 * app.get('/api', asyncHandler(async (req, res) => {
 *   const result = await someAsyncOperation();
 *   res.json(result);
 * }));
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};


/**
 * 获取微信小程序access_token
 * 调用微信API获取访问令牌，用于后续API调用
 * @param {string} appid - 微信小程序AppID
 * @param {string} secret - 微信小程序AppSecret
 * @returns {Promise<string>} access_token字符串
 * @throws {Object} 微信API返回的错误信息
 * @example
 * const token = await getAccessToken('wx123456', 'secret123');
 * console.log(token); // 'ACCESS_TOKEN_STRING'
 */
const getAccessToken = async (appid, secret) => {
    const url = 'https://api.weixin.qq.com/cgi-bin/token';
    const params = { grant_type: 'client_credential', appid, secret };

    const resp = await axios.get(url, { params });
    if (resp.data.errcode) {
        throw resp.data;
    }
    return resp.data.access_token;
}


/**
 * 验证微信小程序登录态
 * 通过微信API验证session_key是否有效
 * @param {string} accessToken - 微信access_token
 * @param {string} openid - 用户openid
 * @param {string} sessionKey - 用户session_key
 * @returns {Promise<Object>} 微信API返回的验证结果
 * @throws {Object} 微信API返回的错误信息
 * @example
 * const result = await checkSessionKey(token, 'openid123', 'sessionkey123');
 * console.log(result); // { valid: true, ... }
 */
const checkSessionKey = async (accessToken, openid, sessionKey) => {
    const signature = crypto.createHmac('sha256', sessionKey).update('').digest('hex');

    const url = 'https://api.weixin.qq.com/wxa/checksession';
    const params = {
        access_token: accessToken,
        openid: openid,
        signature: signature,
        sig_method: 'hmac_sha256'
    };

    const resp = await axios.get(url, { params });
    if (resp.data.errcode) {
        throw resp.data;
    }
    return resp.data;
}

// 导出所有函数
module.exports = {
    response,
    asyncHandler,
    getAccessToken,
    checkSessionKey
};