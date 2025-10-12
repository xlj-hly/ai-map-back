# 智能行程后端服务

## 项目简介

这是智能行程应用的后端服务，主要用于转发腾讯位置服务的API请求，确保小程序安全调用地图相关功能。

## 功能特性

- 🔐 微信小程序登录校验
- 🗺️ 腾讯位置服务API转发
- 🚀 支持Vercel部署
- 📱 适配uni-app项目
- ⚡ 高性能转发服务

## 环境配置

### 1. 安装依赖

```bash
cd back
npm install
```

### 2. 环境变量配置

复制 `.env.example` 为 `.env` 并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 腾讯位置服务配置
WEBSERVICE_KEY=your_tencent_lbs_key_here
MINIAPP_APPPID=your_miniprogram_appid_here
MINIAPP_SECRET=your_miniprogram_secret_here

# 服务器配置
PORT=3000
NODE_ENV=development
```

### 3. 获取配置信息

#### 腾讯位置服务Key
1. 访问 [腾讯位置服务控制台](https://lbs.qq.com/console/key.html)
2. 创建应用并获取Key
3. 配置相关服务的配额

#### 小程序信息
1. 在微信公众平台获取AppID和AppSecret
2. 确保小程序已申请AI地图插件

## 本地开发

```bash
# 启动开发服务器
npm run dev

# 启动生产服务器
npm start
```

服务启动后：
- 健康检查：http://localhost:3000/health
- API转发：http://localhost:3000/api/lbs/*

## 部署到Vercel

### 1. 安装Vercel CLI

```bash
npm install -g vercel
```

### 2. 部署

```bash
cd back
vercel
```

### 3. 配置环境变量

在Vercel控制台配置以下环境变量：
- `WEBSERVICE_KEY`
- `MINIAPP_APPPID`
- `MINIAPP_SECRET`

## API接口

### 转发接口

所有腾讯位置服务API通过以下路径转发：

```
/api/lbs/*
```

### 支持的API

- 地点搜索
- 周边推荐
- 关键词输入提示
- 驾车路线规划
- 步行路线规划
- 逆地址解析
- AI文本识别

### 请求示例

```javascript
// 前端调用示例
uni.request({
  url: 'https://your-domain.vercel.app/api/lbs/ws/place/v1/search',
  method: 'GET',
  data: {
    session_code: 'your_session_code',
    keyword: '北京天安门',
    boundary: 'region(北京)',
    page_size: 10
  },
  success: (res) => {
    console.log('搜索结果:', res.data);
  }
});
```

## 错误处理

服务会返回标准化的错误信息：

```json
{
  "error": "错误描述",
  "code": "错误代码",
  "details": "详细错误信息"
}
```

常见错误代码：
- `MISSING_SESSION_CODE`: 缺少session_code参数
- `TENCENT_API_ERROR`: 腾讯API错误
- `REQUEST_TIMEOUT`: 请求超时
- `INTERNAL_ERROR`: 服务内部错误

## 注意事项

1. 确保小程序已申请AI地图插件
2. 配置正确的腾讯位置服务Key和配额
3. 确保网络环境可以访问腾讯API
4. 定期检查API调用量，避免超出配额

## 技术支持

如有问题，请检查：
1. 环境变量配置是否正确
2. 腾讯位置服务Key是否有效
3. 小程序AppID和Secret是否正确
4. 网络连接是否正常
