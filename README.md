# 团团桌宠 (Tuantuan Pet)

一只圆滚滚的橘白胖橘猫 Electron 桌面宠物。

![团团](src/assets/pet/core-ip.png)

## 角色档案

- **名字**：团团
- **物种**：橘白胖猫
- **性格**：贪吃、慵懒、黏人、好奇心旺盛
- **风格**：轻度卡通贴纸风

## 功能

- **8 个动画状态**：待机呼吸、眨眼、点击开心、摸头、喂小鱼干、逗猫棒、提醒呼叫、贴边偷看
- **3 个互动**：摸头 😻、喂小鱼干 🐟、逗猫棒 🪶
- **基础功能**：透明窗口、拖拽、托盘、贴边吸附、提醒、好感度面板、关系数据

## 快速开始

```bash
# 安装依赖
npm ci

# 启动开发预览
npm run dev
```

需要 [Node.js](https://nodejs.org/) 18+ 版本。

## 项目结构

```
├── src/
│   ├── main.ts              # Electron 主进程
│   ├── preload.ts           # 预加载脚本
│   ├── renderer/
│   │   ├── pet/             # 桌宠渲染页面
│   │   ├── dashboard/      # 面板页面
│   │   └── reminder/        # 提醒页面
│   └── assets/
│       ├── pet/             # 处理后的动画帧
│       └── tray/            # 托盘图标
├── incoming-assets/         # 原始素材
├── tools/                   # 构建和 QA 工具
├── tests/                   # 单元测试
└── pet-spec.json            # 角色配置
```

## 技术栈

- Electron + Electron Forge
- TypeScript
- Webpack
