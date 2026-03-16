# 鲲侯 · 星河易道 奇门排盘引擎

## BigFishMarquis Qimen Dun Jia Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-gold.svg)](https://opensource.org/licenses/MIT)

> 基于 TypeScript 的全自研奇门遁甲排盘引擎，覆盖年/月/日/时家四层排盘，支持拆补、茅山、置闰三种起局法。
> 零外部引擎依赖，经过 500+ 样本跨 300 年验证。

---

## ✨ 特性

### 四层排盘引擎
- **时家奇门** — 拆补法 / 茅山法 / 置闰法
- **日家奇门** — 基于公历日期自动排盘
- **月家奇门** — 按节气月定局
- **年家奇门** — 按太岁年定局

### 完整排盘要素
- 🏛️ 九宫布局 (地盘/天盘)
- ⭐ 九星排布 (天蓬→天英)
- 🚪 八门排布 (休→开)
- 🛡️ 八神排布 (值符→九天)
- 👻 地八神 (独立于天八神的第二层神煞)
- 🔮 暗干支 (六十甲子飞宫排法)
- 📍 寄宫系统 (天禽寄天芮)
- ⚰️ 墓/刑/迫标记
- 🐴 驿马宫位
- 🈳 空亡检测

### 格局解读
- 81 格局自动识别与断语
- 十干克应
- 用神体系
- 值符克应
- 九星/八门/八神详解
- 运筹决策

---

## 📦 目录结构

```
src/
├── engines/
│   ├── chaibuquju.ts     # 拆补取局法
│   ├── maoshan.ts        # 茅山取局法
│   ├── zhirun.ts         # 置闰取局法
│   ├── shijia.ts         # 时家奇门排盘
│   ├── shared.ts         # 年/月/日家共享逻辑
│   ├── nianjia.ts        # 年家奇门
│   ├── yuejia.ts         # 月家奇门
│   └── rijia.ts          # 日家奇门
├── data/                 # 八门/八神/九星/宫位/格局断语等 JSON
├── engine.ts             # 统一调度入口
├── types.ts              # TypeScript 类型定义
├── constants.ts          # 奇门常量
└── interpretation.ts     # 格局解读系统
```

---

## 🔧 使用示例

```typescript
import { chaiBuJuByGanZhi } from './src/engines/chaibuquju';
import { shiJiaGenerate } from './src/engines/shijia';
import { maoShanJu } from './src/engines/maoshan';

// 拆补法取局
const result = chaiBuJuByGanZhi('秋分', '己', '卯', 14);
// → { isYangDun: false, juNumber: 7, yuan: '上' }

// 茅山法取局
const maoshan = maoShanJu('冬至', 25);
// → { isYangDun: true, juNumber: 7, yuan: '中' }

// 时家奇门完整排盘
const chart = shiJiaGenerate(
  '甲',          // 时干
  '子',          // 时支
  7,             // 局数
  'yin',         // 阴遁
  fourPillars,   // 四柱
  '秋分',        // 节气
);
```

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────┐
│          统一调度 (engine.ts)            │
├──────┬──────┬──────┬────────────────────┤
│ 年家 │ 月家 │ 日家 │      时家          │
│      │      │      │ ┌──────┬─────┬───┐ │
│      │      │      │ │拆补  │茅山 │置闰│ │
│      │      │      │ └──────┴─────┴───┘ │
├──────┴──────┴──────┴────────────────────┤
│        格局解读 (interpretation.ts)      │
├─────────────────────────────────────────┤
│        数据层 (data/*.json)             │
└─────────────────────────────────────────┘
```

---

## 🆚 与同类开源项目对比

| 特性 | bigfishmarquis-qimen | 3META |
|:-----|:-------------------:|:-----:|
| 时家起局法 | **3种** (拆补+茅山+置闰) | 1种 |
| 盘型覆盖 | **4层** (年/月/日/时) | 仅时家 |
| 已知 Bug | **0** | 天禽八门错位 |
| 暗干支 | ✅ | ❌ |
| 地八神 | ✅ | ❌ |
| 墓/刑/迫标记 | ✅ | ❌ |
| 寄宫系统 | ✅ | ❌ |
| 81格局解读 | ✅ | 基础 |
| 验证覆盖 | 500样本 × 300年 | 未知 |
| 外部依赖 | 零 | — |

---

## 📋 依赖

- **运行时**: 无外部依赖 (纯 TypeScript)
- **可选**: `lunar-javascript` 或 `lunar-typescript` (用于获取节气和干支数据)

---

## 📄 License

[MIT](./LICENSE) © 2026 BigFishMarquis (鲲侯)

---

## 🔗 链接

- **产品**: [鲲侯 · 星河易道](https://sunsetox.com) — 八字·紫微·奇门·占星 专业命理推演引擎
- **GitHub**: [perfhelf/bigfishmarquis-qimen](https://github.com/perfhelf/bigfishmarquis-qimen)
