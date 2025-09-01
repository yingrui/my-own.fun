# 项目目录结构

本文档提供了 my-own.fun Chrome 扩展项目结构的全面概述，帮助开发者理解代码库的组织和架构。

## 概述

my-own.fun Chrome 扩展使用现代 Web 技术构建，包括 React、TypeScript 和 Vite。项目遵循组织良好的结构，分离关注点并促进可维护性。

## 根目录结构

```
/
├── docs/                    # 文档 (docsify 管理)
├── public/                  # 静态资源
├── src/                     # 源代码
├── test-utils/             # 测试工具
├── utils/                   # 构建和开发工具
├── dist/                    # 构建输出 (生成)
├── node_modules/            # 依赖项 (生成)
├── package.json             # 项目配置
├── tsconfig.json            # TypeScript 配置
├── vite.config.ts           # Vite 构建配置
└── manifest.js              # Chrome 扩展清单
```

## 核心源代码 (`src/`)

### 主要入口点

```
src/
├── background.js            # 服务工作者入口点
├── environment.d.ts         # 环境类型定义
├── global.d.ts              # 全局类型定义
├── vite-env.d.ts            # Vite 环境类型
├── locales/                 # 国际化文件
│   ├── en-US.json          # 英文语言包
│   └── zh-CN.json          # 中文语言包
└── types/                   # TypeScript 类型定义
    └── types.d.ts           # 核心类型定义
```

### 页面组件 (`src/pages/`)

扩展包含几个主要页面，每个页面服务于不同目的：

#### 1. 弹出窗口 (`src/pages/popup/`)
```
popup/
├── index.html               # 弹出窗口 HTML 模板
├── index.css                # 弹出窗口样式
├── index.tsx                # 弹出窗口入口点
├── Popup.tsx                # 主弹出窗口组件
└── agents/                  # 弹出窗口特定代理
    └── BrowserCopilot.ts    # 浏览器副驾驶代理
```

#### 2. 侧边栏 (`src/pages/sidepanel/`)
```
sidepanel/
├── index.html               # 侧边栏 HTML 模板
├── index.css                # 侧边栏样式
├── index.tsx                # 侧边栏入口点
├── SidePanel.tsx            # 主侧边栏组件
├── agents/                  # 侧边栏代理
│   ├── BACopilotAgent.ts    # 业务分析副驾驶
│   ├── GoogleAgent.ts       # Google 搜索代理
│   ├── MyFunCopilot.ts      # 主副驾驶代理
│   └── TranslateAgent.ts    # 翻译代理
├── hooks/                   # 自定义 React 钩子
│   └── use-chat-sessions.ts # 聊天会话管理
└── store/                   # 状态管理
    └── index.ts             # 存储配置
```

#### 3. 选项页面 (`src/pages/options/`)
选项页面是一个综合的 Web 应用程序，包含多个模块：

```
options/
├── index.html               # 选项页面 HTML 模板
├── index.css                # 选项页面样式
├── index.tsx                # 选项页面入口点
├── components/              # 共享选项组件
│   ├── MoreComing.tsx       # 占位符组件
│   └── NavSearch.tsx        # 导航搜索
├── architect/               # 架构工具模块
│   ├── agents/              # 架构代理
│   ├── components/          # 架构组件
│   ├── context/             # React 上下文
│   ├── entities/            # 业务实体
│   └── repositories/        # 数据存储库
├── chatbot/                 # 聊天机器人模块
│   ├── agents/              # 聊天机器人代理
│   └── components/          # 聊天机器人组件
├── history/                 # 历史管理模块
│   └── components/          # 历史组件
├── preference/              # 首选项模块
│   └── components/          # 首选项组件
├── search/                  # 搜索模块
│   ├── agents/              # 搜索代理
│   └── components/          # 搜索组件
└── writer/                  # 写作助手模块
    ├── agents/              # 写作代理
    ├── components/          # 写作组件
    ├── context/             # 写作上下文
    └── repositories/        # 写作存储库
```

#### 4. 内容脚本 (`src/pages/content/`)
```
content/
├── injected/                # 注入的内容脚本
│   ├── listeners/           # 事件监听器
│   │   ├── common/          # 通用监听器
│   │   ├── trello/          # Trello 集成
│   │   └── utils/           # 监听器工具
│   └── utils/               # 注入工具
└── ui/                      # 内容 UI 组件
    └── FloatingBall.tsx     # 浮动操作按钮
```

### 共享组件 (`src/shared/`)

共享目录包含可重用组件和工具：

```
shared/
├── agents/                  # AI 代理系统
│   ├── core/                # 核心代理类
│   │   ├── errors/          # 错误处理
│   │   ├── ChatMessage.ts   # 聊天消息模型
│   │   ├── Conversation.ts  # 对话模型
│   │   ├── Interaction.ts   # 交互模型
│   │   ├── Step.ts          # 步骤模型
│   │   ├── Thought.ts       # 思考模型
│   │   └── ToolDefinition.ts # 工具定义模型
│   ├── decorators/          # 代理装饰器
│   │   ├── entity.ts        # 实体装饰器
│   │   └── tool.ts          # 工具装饰器
│   ├── services/            # 代理服务
│   │   ├── ContextTransformer.ts # 上下文转换
│   │   ├── DefaultModelService.ts # 基础模型服务
│   │   ├── OllamaModelService.ts  # Ollama 集成
│   │   ├── PromptChainOfThoughtService.ts # 思维链
│   │   ├── PromptTemplate.ts      # 提示模板
│   │   └── TemplateEngine.ts      # 模板引擎
│   ├── CompositeAgent.ts    # 复合代理
│   └── ThoughtAgent.ts      # 基于思考的代理
├── components/               # 可重用 UI 组件
│   ├── ChatConversation/    # 聊天对话组件
│   ├── MarkdownTextArea/    # Markdown 文本区域
│   └── Message/             # 消息组件
│       ├── MarkDownBlock/   # Markdown 块渲染
│       └── UserMessage/     # 用户消息组件
├── configurers/              # 配置工具
├── hoc/                      # 高阶组件
├── hooks/                    # 自定义 React 钩子
├── repositories/             # 数据访问层
├── services/                 # 业务服务
├── storages/                 # 存储工具
├── utils/                    # 工具函数
└── webpage/                  # 网页工具
```

## 构建和开发工具 (`utils/`)

```
utils/
├── manifest-parser/          # 清单解析工具
├── plugins/                  # 构建插件
│   ├── add-hmr.ts           # 热模块替换
│   ├── custom-dynamic-import.ts # 动态导入处理
│   ├── inline-vite-preload-script.ts # 预加载脚本注入
│   ├── make-manifest.ts     # 清单生成
│   └── watch-rebuild.ts     # 监视和重建
├── reload/                   # 开发重载系统
│   ├── injections/          # 注入脚本
│   ├── interpreter/         # 解释器工具
│   ├── initReloadClient.ts  # 重载客户端
│   ├── initReloadServer.js  # 重载服务器
│   ├── rollup.config.mjs    # Rollup 配置
│   └── utils.ts             # 重载工具
└── vite.ts                  # Vite 配置工具
```

## 测试 (`test-utils/`)

```
test-utils/
└── vitest.setup.js          # Vitest 测试设置
```

## 静态资源 (`public/`)

```
public/
└── icons/                   # 扩展图标
    ├── logo.png             # 主标志
    ├── logo.svg             # 矢量标志
    └── user-icon.png        # 用户头像
```

## 文档 (`docs/`)

```
docs/
├── _navbar.md               # 导航栏配置
├── _sidebar.md              # 侧边栏导航
├── index.html               # 文档入口点
├── README.md                # 文档概述
├── concepts/                # 概念文档
├── images/                  # 文档图像
├── tasking/                 # 任务相关文档
├── tutorial/                # 教程文档
└── zh-cn/                   # 中文文档
```

## 配置文件

### 包管理
- **`package.json`**: 项目依赖和脚本
- **`pnpm-lock.yaml`**: 依赖锁定文件

### 构建配置
- **`vite.config.ts`**: Vite 构建配置
- **`tsconfig.json`**: TypeScript 编译器选项
- **`manifest.js`**: Chrome 扩展清单生成

### 代码质量
- **`.eslintrc.js`**: ESLint 配置
- **`.prettierrc`**: Prettier 格式化规则
- **`.husky/`**: Git 钩子用于预提交检查

## 关键架构模式

### 1. 基于代理的架构
项目使用基于代理的架构，其中不同的 AI 代理处理特定任务：
- **CompositeAgent**: 编排其他代理
- **ThoughtAgent**: 实现思维链推理
- **Specialized Agents**: 处理特定领域 (搜索、翻译、写作)

### 2. 服务层
服务提供业务逻辑和外部集成：
- **Model Services**: 处理不同的 AI 模型提供者
- **Context Transformation**: 将对话转换为聊天消息
- **Template Engine**: 处理提示模板

### 3. 组件架构
React 组件按以下方式组织：
- **页面级组件**: 主应用程序视图
- **共享组件**: 可重用 UI 元素
- **特定功能组件**: 特定领域功能

### 4. 数据流
```
用户输入 → 代理 → 服务 → 模型 → 响应 → UI 更新
```

## 开发工作流

### 构建
```bash
# 开发构建，支持热重载
pnpm dev

# 生产构建
pnpm build

# Firefox 特定构建
pnpm build:firefox
```

### 测试
```bash
# 运行测试
pnpm test

# 监视模式运行测试
pnpm test --watch
```

### 代码质量
```bash
# 代码检查
pnpm lint

# 修复检查问题
pnpm lint:fix

# 代码格式化
pnpm prettier
```

## 文件命名约定

- **组件**: PascalCase (例如 `Popup.tsx`)
- **工具**: camelCase (例如 `manifest-parser`)
- **常量**: UPPER_SNAKE_CASE (例如 `__FIREFOX__`)
- **目录**: kebab-case (例如 `content-injected`)

## 依赖项

### 核心技术
- **React 18.2.0**: UI 框架
- **TypeScript 5.2.2**: 类型安全
- **Vite 5.0.12**: 构建工具和开发服务器

### UI 库
- **Ant Design 5.16.5**: 组件库
- **Bootstrap 5.3.3**: CSS 框架
- **Emotion**: CSS-in-JS 样式

### AI 和集成
- **OpenAI 4.39.0**: AI 模型集成
- **Mermaid 11.4.0**: 图表渲染
- **LiquidJS**: 模板引擎

### 开发工具
- **Vitest**: 测试框架
- **ESLint**: 代码检查
- **Prettier**: 代码格式化
- **Husky**: Git 钩子

## 浏览器兼容性

扩展设计为与以下浏览器兼容：
- **Chrome**: 主要目标
- **Firefox**: 次要目标 (特定构建)
- **Edge**: Chrome 兼容浏览器

## 性能考虑

- **代码分割**: Vite 自动将代码分割成块
- **树摇**: 构建期间消除未使用的代码
- **懒加载**: 按需加载组件
- **包优化**: Rollup 优化最终包

这个目录结构为可维护和可扩展的 Chrome 扩展提供了坚实的基础，具有清晰的关注点分离和现代开发实践。
