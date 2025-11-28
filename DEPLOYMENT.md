# 部署指南

## 环境变量配置

本项目需要配置以下环境变量：

### LIXINGER_TOKEN

用于访问理杏仁（Lixinger）开放API的认证令牌。

#### 获取Token

1. 访问 [https://open.lixinger.com](https://open.lixinger.com)
2. 注册/登录账号
3. 获取你的API Token

#### 本地开发环境

在项目根目录创建 `.env.local` 文件：

```bash
LIXINGER_TOKEN=your_actual_token_here
```

配置后重启开发服务器：
```bash
npm run dev
```

#### 生产环境部署

根据不同的部署平台设置环境变量：

##### Vercel

1. 进入项目设置页面
2. 导航到 **Settings** → **Environment Variables**
3. 添加环境变量：
   - **Name**: `LIXINGER_TOKEN`
   - **Value**: 你的token
   - **Environment**: 选择 `Production`、`Preview` 和 `Development`

##### Netlify

1. 进入项目设置页面
2. 导航到 **Site configuration** → **Environment variables**
3. 点击 **Add a variable**
4. 添加：
   - **Key**: `LIXINGER_TOKEN`
   - **Value**: 你的token

##### 其他平台

根据平台文档设置环境变量 `LIXINGER_TOKEN`

## 错误处理

### 开发环境错误

如果看到以下错误：
```
LIXINGER_TOKEN 未配置。请在项目根目录的 .env.local 文件中添加：
LIXINGER_TOKEN=your_actual_token
```

**解决方法**：
1. 在项目根目录创建 `.env.local` 文件
2. 添加你的token
3. 重启开发服务器

### 生产环境错误

如果看到以下错误：
```
LIXINGER_TOKEN environment variable is not configured.
Please set LIXINGER_TOKEN in your deployment environment.
```

**解决方法**：
1. 在部署平台的环境变量配置中添加 `LIXINGER_TOKEN`
2. 重新部署项目

## 验证配置

部署后访问以下路径验证API是否正常工作：
- `/api/lixinger` - API端点
- `/indicators` - 指标页面
- `/backtest` - 回测页面

如果页面正常加载数据，说明配置成功。

## 注意事项

1. **不要将 `.env.local` 提交到git**
   - 已在 `.gitignore` 中配置忽略
   - Token是敏感信息，不应公开

2. **Token安全**
   - 不要在代码中硬编码token
   - 不要在公开的地方分享token
   - 定期更换token

3. **API限制**
   - 理杏仁API可能有调用频率限制
   - 请查看API文档了解具体限制

## 构建和部署

### 本地构建测试

```bash
# 安装依赖
npm install

# 构建
npm run build

# 启动生产服务器
npm start
```

### 生产部署

```bash
# 确保环境变量已配置
# 推送代码到git仓库
git push origin main

# 平台会自动检测并部署
```

## 故障排查

### Token无效

**症状**：API返回401或403错误

**解决**：
1. 检查token是否正确
2. 确认token是否过期
3. 重新获取token

### 环境变量未生效

**症状**：生产环境仍然提示未配置

**解决**：
1. 确认环境变量名称拼写正确（区分大小写）
2. 确认在正确的环境（Production）中配置
3. 重新部署项目
4. 检查平台的部署日志

### API请求失败

**症状**：数据加载失败

**解决**：
1. 检查网络连接
2. 查看浏览器控制台错误
3. 检查API服务是否正常
4. 查看服务器日志

