# Manifest 架构设计：项目创建双路径

## 两种创建方式

```mermaid
flowchart LR
    USER[用户] --> PATH_A["从开发板创建"]
    USER --> PATH_B["从示例代码创建"]

    PATH_A --> SELECT_BOARD["选板 → 拿到基础 Kconfig<br/>+ 空白模板代码"]
    PATH_B --> SELECT_DEMO["选 Demo → 列出兼容板<br/>→ 匹配 board config"]

    SELECT_BOARD --> PROJECT["项目就绪"]
    SELECT_DEMO --> PROJECT
```

---

## 路径 A：从开发板创建

```mermaid
sequenceDiagram
    participant U as 用户
    participant IDE as IDE
    participant B as boards manifest
    participant SDK as SDK

    U->>IDE: 选择开发板 (tuya-t5ai-evb)
    IDE->>B: 读取 board detail JSON
    B-->>IDE: platformId, kconfigId, scaffold 信息
    IDE->>SDK: clone/checkout SDK
    IDE->>IDE: 拷贝 scaffold.template 到项目目录
    IDE->>IDE: 写入 board Kconfig 基础配置
    IDE-->>U: 空白项目 (选中板 + 基础 main.c)
```

## 路径 B：从示例代码创建

```mermaid
sequenceDiagram
    participant U as 用户
    participant IDE as IDE
    participant D as demos manifest
    participant B as boards manifest
    participant SDK as SDK

    U->>IDE: 选择 Demo (your_chat_bot)
    IDE->>D: 读取 demo detail JSON
    D-->>IDE: compatibilityType, boards[], configs{}

    alt board-specific
        IDE-->>U: 列出兼容板
        U->>IDE: 选择 tuya-t5ai-evb
        IDE->>IDE: 取 configs["TUYA_T5AI_EVB"]
    else universal
        IDE-->>U: 列出所有板
        U->>IDE: 选择任一板
        IDE->>IDE: 使用 defaultConfig
    end

    IDE->>SDK: clone + 拷贝 source.subpath 代码
    IDE->>IDE: 写入对应 config 到项目
    IDE-->>U: Demo 项目就绪
```

---

## 新 JSON 结构设计

### Board Detail（增强版）

```jsonc
// boards-and-chips/{platform}/{board-id}.json
{
  "id": "tuya-t5ai-evb",
  "platformId": "t5ai",
  "kconfigId": "TUYA_T5AI_EVB",        // SDK Kconfig 标识符
  "name": { "en": "...", "zh-CN": "..." },
  "summary": { "en": "...", "zh-CN": "..." },

  // 从板创建时的脚手架信息
  "scaffold": {
    "template": "tools/app_template/embedded",   // SDK 内模板路径
    "baseConfig": {                               // 写入项目的基础 Kconfig
      "CONFIG_PLATFORM_CHOICE": "T5AI",
      "CONFIG_BOARD_CHOICE_TUYA_T5AI_EVB": "y"
    }
  },

  // 该板可跑的 demo 列表 (反向索引，构建时自动生成)
  "demos": ["tuya-ai-your-chat-bot", "peripherals-button", "..."],

  // 硬件外设 (现有结构保持)
  "peripheralPatterns": { ... }
}
```

### Demo Detail（增强版）

```jsonc
// demos/{demo-id}.json
{
  "id": "tuya-ai-your-chat-bot",
  "name": { "en": "...", "zh-CN": "..." },
  "summary": { "en": "...", "zh-CN": "..." },
  "tags": ["app", "ai", "chat"],

  "compatibilityType": "board-specific",  // "universal" | "board-specific"

  // 代码来源 — IDE 直接据此 clone + copy
  "source": {
    "repo": "https://github.com/tuya/TuyaOpen",
    "ref": "master",
    "subpath": "apps/tuya.ai/your_chat_bot"
  },

  // 板级配置映射 — key = kconfigId, value = 配置内容
  "configs": {
    "TUYA_T5AI_EVB": {
      "file": "config/TUYA_T5AI_EVB.config",      // SDK source 内相对路径
      "overrides": {                                // 关键 Kconfig 覆盖项
        "CONFIG_BOARD_CHOICE_TUYA_T5AI_EVB": "y",
        "CONFIG_ENABLE_GUI_CHATBOT": "y"
      }
    },
    "DNESP32S3": {
      "file": "config/DNESP32S3.config",
      "overrides": {
        "CONFIG_BOARD_CHOICE_DNESP32S3": "y"
      }
    }
  },

  // 通用默认配置 (所有板共享的基础项)
  "defaultConfig": {
    "CONFIG_PROJECT_VERSION": "1.0.0",
    "CONFIG_TUYA_PRODUCT_ID": ""
  },

  // 兼容板清单 (= configs 的 keys，冗余以便 index 快速过滤)
  "boards": ["tuya-t5ai-evb", "tuya-t5ai-board", "dnesp32s3"],

  "documentation": {
    "readme": { "en": "...", "zh-CN": "..." }
  }
}
```

### Demo Index（轻量查询用）

```jsonc
// demos/index.json
{
  "version": "1.0",
  "items": [
    {
      "id": "tuya-ai-your-chat-bot",
      "name": { "en": "AI Chat Bot", "zh-CN": "AI 聊天机器人" },
      "summary": { "en": "...", "zh-CN": "..." },
      "tags": ["app", "ai"],
      "compatibilityType": "board-specific",
      "boards": ["tuya-t5ai-evb", "tuya-t5ai-board", "dnesp32s3"],
      "source": { "repo": "...", "subpath": "apps/tuya.ai/your_chat_bot", "ref": "master" }
    }
    // ... 不含 configs/defaultConfig，需要时读 detail
  ]
}
```

---

## 关键设计决策

```mermaid
graph TD
    subgraph "Index 层 (列表快速加载)"
        IDX_B["boards index<br/>id · platformId · name · summary"]
        IDX_D["demos index<br/>id · name · tags · boards[] · compatibilityType"]
    end

    subgraph "Detail 层 (按需加载)"
        DET_B["board detail<br/>+ scaffold 信息<br/>+ peripheralPatterns<br/>+ demos[] 反向索引"]
        DET_D["demo detail<br/>+ configs{} 按板映射<br/>+ defaultConfig<br/>+ documentation"]
    end

    IDX_B -->|"用户点击板卡"| DET_B
    IDX_D -->|"用户点击 Demo"| DET_D

    DET_B -.->|"scaffold.baseConfig"| CREATE_A["路径A: 从板创建"]
    DET_D -.->|"configs[kconfigId]"| CREATE_B["路径B: 从Demo创建"]
```

### 查询场景

| 场景 | 读取 | 字段 |
|------|------|------|
| 列出所有 Demo | `demos/index.json` | items[] 轻量 |
| 按板过滤 Demo | index 的 `boards[]` 包含选中板 | 纯前端过滤 |
| 按标签过滤 | index 的 `tags[]` | 纯前端过滤 |
| 创建项目(从板) | board detail → `scaffold` | 模板路径 + 基础 config |
| 创建项目(从Demo) | demo detail → `configs[kconfigId]` | 板级配置文件 + 覆盖项 |
| 列出某板能跑的 Demo | board detail → `demos[]` | 反向索引 |

### 维护策略

| 操作 | 触发 | 影响文件 |
|------|------|----------|
| 新增 Demo | manifest-editor / 扫描脚本 | `demos/index.json` + `demos/{id}.json` |
| 新增 Board | manifest-editor | `boards-and-chips/index.json` + board detail |
| Demo 新增板兼容 | 编辑 demo detail | demo detail `configs` + `boards[]`；board detail `demos[]` |
| SDK 更新 | 重新扫描脚本 | 批量更新 configs 映射 |

---

## kconfigId 作为桥梁

```mermaid
graph LR
    BOARD_JSON["Board JSON<br/>kconfigId: TUYA_T5AI_EVB"] 
    DEMO_JSON["Demo JSON<br/>configs.TUYA_T5AI_EVB: {...}"]
    SDK_KCONFIG["SDK<br/>boards/T5AI/TUYA_T5AI_EVB/Kconfig"]
    SDK_CONFIG["SDK<br/>apps/.../config/TUYA_T5AI_EVB.config"]

    BOARD_JSON <-->|"同一 kconfigId"| DEMO_JSON
    BOARD_JSON <-->|"对应目录名"| SDK_KCONFIG
    DEMO_JSON <-->|"对应文件名"| SDK_CONFIG
```

`kconfigId` 是连接 Board、Demo、SDK 三者的唯一标识符：
- Board manifest 声明自己的 `kconfigId`
- Demo manifest 用 `configs[kconfigId]` 存该板的配置
- SDK 中 `boards/{PLATFORM}/{kconfigId}/` 和 `config/{kconfigId}.config` 使用同名
