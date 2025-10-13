const express = require('express');
const cors = require('cors');
const { response } = require('./utils');
const v1Routes = require('./routes/v1');
const v2Routes = require('./routes/v2');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 版本信息接口
app.get('/', (req, res) => {
  res.json(response(0, true, '智能行程后端服务运行中', {
    version: '1.0.0',
    description: '智能行程后端服务',
    endpoints: {
      v1: '/v1',
      v2: '/v2'
    }
  }));
});

app.get('/v1', (req, res) => {
  res.json(response(0, true, 'v1 API 服务运行中', {
    version: '1.0.0',
    description: '智能行程后端服务 v1',
    endpoints: {
      health: '/v1/health',
      login: '/v1/login/:code',
      verify: '/v1/verify',
      api: '/v1/api/lbs/*',
      test: '/v1/test-key'
    }
  }));
});

app.get('/v2', (req, res) => {
  res.json(response(0, true, 'v2 API 服务运行中', {
    version: '2.0.0',
    description: '智能行程后端服务 v2',
    endpoints: {
      health: '/v2/health',
      login: '/v2/login/:code',
      verify: '/v2/verify',
      api: '/v2/api/lbs/*',
      test: '/v2/test'
    }
  }));
});

// 版本路由
app.use('/v1', v1Routes);
app.use('/v2', v2Routes);

// 默认路由指向v2
app.use('/', v2Routes);

// 全局错误处理中间件
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json(response(-1, false, err.message || '服务异常', err));
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json(response(404, false, '接口不存在', { path: req.originalUrl }));
});

app.listen(PORT, () => {
  console.log(`🚀 智能行程后端服务运行在端口 ${PORT}`);
  console.log(`📡 v1 API: http://localhost:${PORT}/v1/`);
  console.log(`📡 v2 API: http://localhost:${PORT}/v2/`);
  console.log(`📡 默认API: http://localhost:${PORT}/`);
  console.log(`🔍 健康检查: http://localhost:${PORT}/health`);
  console.log(`🗺️  v1 API转发: http://localhost:${PORT}/v1/api/lbs/*`);
  console.log(`🗺️  v2 API转发: http://localhost:${PORT}/v2/api/lbs/*`);
});
