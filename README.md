# 鲲侯 · 星河易道 奇门排盘引擎

## BigFishMarquis Qimen Dun Jia Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-gold.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/perfhelf/bigfishmarquis-qimen?style=social)](https://github.com/perfhelf/bigfishmarquis-qimen)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://xuebz.com/?chart=qimen)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/perfhelf/bigfishmarquis-qimen/pulls)

> 基于 TypeScript 的全自研奇门遁甲排盘引擎，覆盖年/月/日/时家四层排盘，支持拆补、茅山、置闰三种起局法。
> 零外部引擎依赖，经过 500+ 样本跨 300 年验证。
>
> 🎯 **在线演示**: [xuebz.com/?chart=qimen](https://xuebz.com/?chart=qimen)

### English

A fully self-developed **Qimen Dun Jia (奇门遁甲)** charting engine written in TypeScript. Qimen Dun Jia is one of the three supreme ancient Chinese divination arts (三式), used for strategic decision-making, timing analysis, and forecasting.

**Key highlights:**
- **4 charting layers**: Yearly / Monthly / Daily / Hourly Qimen
- **3 chart methods**: ChaiBu (拆补法), MaoShan (茅山法), ZhiRun (置闰法)
- **Complete elements**: Nine Stars, Eight Doors, Eight Gods, Hidden Stems, Tomb/Punishment/Pressure marks
- **81 pattern interpretation**: Automatic pattern detection with classical analysis text
- **Zero dependencies**: Pure TypeScript, no external engine required
- **Battle-tested**: 500+ samples validated across 300 years, zero known bugs

---

## ✨ 特性 | Features

### 四层排盘引擎 | Four-Layer Charting Engine
- **时家奇门** (Hourly Qimen) — 拆补法 / 茅山法 / 置闰法
- **日家奇门** (Daily Qimen) — 基于公历日期自动排盘
- **月家奇门** (Monthly Qimen) — 按节气月定局
- **年家奇门** (Yearly Qimen) — 按太岁年定局

### 完整排盘要素 | Complete Chart Elements
- 🏛️ 九宫布局 (Nine Palaces — Earth Plate / Heaven Plate)
- ⭐ 九星排布 (Nine Stars: TianPeng → TianYing)
- 🚪 八门排布 (Eight Doors: Xiu → Kai)
- 🛡️ 八神排布 (Eight Gods: ZhiFu → JiuTian)
- 👻 地八神 (Earth Eight Gods — second layer divine generals)
- 🔮 暗干支 (Hidden Stems — Sexagenary Cycle palace-flying method)
- 📍 寄宫系统 (Palace Lodging — TianQin lodges in TianRui)
- ⚰️ 墓/刑/迫标记 (Tomb / Punishment / Pressure marks)
- 🐴 驿马宫位 (Post-Horse palace)
- 🈳 空亡检测 (Void detection)

### 格局解读 | Pattern Interpretation
- 81 格局自动识别与断语 (81 patterns auto-detection with classical text)
- 十干克应 (Ten Stems Correspondences)
- 用神体系 (Deity System)
- 值符克应 (Duty Star Correspondences)
- 九星/八门/八神详解 (Detailed Star/Door/God analysis)
- 运筹决策 (Strategic Decision-Making)

---

## 🚀 快速开始 | Quick Start

```bash
# Clone the repository
git clone https://github.com/perfhelf/bigfishmarquis-qimen.git
```

```typescript
import { chaiBuJuByGanZhi } from './src/engines/chaibuquju';
import { shiJiaGenerate } from './src/engines/shijia';
import { maoShanJu } from './src/engines/maoshan';

// Step 1: Determine the chart number (局数)
const result = chaiBuJuByGanZhi('秋分', '己', '卯', 14);
// → { isYangDun: false, juNumber: 7, yuan: '上' }

// Step 2: Generate the full chart
const chart = shiJiaGenerate(
  '甲',          // Hour Stem (时干)
  '子',          // Hour Branch (时支)
  7,             // Chart Number (局数)
  'yin',         // Yin Dun (阴遁)
  fourPillars,   // Four Pillars (四柱)
  '秋分',        // Solar Term (节气)
);

// Alternative: MaoShan method
const maoshan = maoShanJu('冬至', 25);
// → { isYangDun: true, juNumber: 7, yuan: '中' }
```

---

## 📦 目录结构 | Project Structure

```
bigfishmarquis-qimen/
├── src/
│   ├── engines/
│   │   ├── chaibuquju.ts     # ChaiBu method (拆补取局法)
│   │   ├── maoshan.ts        # MaoShan method (茅山取局法)
│   │   ├── zhirun.ts         # ZhiRun method (置闰取局法)
│   │   ├── shijia.ts         # Hourly Qimen engine (时家奇门排盘)
│   │   ├── shared.ts         # Shared logic for Year/Month/Day (共享逻辑)
│   │   ├── nianjia.ts        # Yearly Qimen engine (年家奇门)
│   │   ├── yuejia.ts         # Monthly Qimen engine (月家奇门)
│   │   └── rijia.ts          # Daily Qimen engine (日家奇门)
│   ├── data/                 # JSON data (八门/八神/九星/宫位/格局断语)
│   │   ├── ba_men.json       # Eight Doors data
│   │   ├── ba_shen.json      # Eight Gods data
│   │   ├── jiu_xing.json     # Nine Stars data
│   │   ├── gong_wei.json     # Nine Palaces data
│   │   ├── ge_ju_duan_yu.json # 81 Patterns interpretation
│   │   ├── shi_gan_ke_ying.json # Ten Stems correspondences
│   │   ├── zhi_fu_ke_ying.json  # Duty Star correspondences
│   │   ├── yong_shen.json    # Deity system data
│   │   ├── yun_chou.json     # Strategic decision data
│   │   └── shi_er_shen_jiang.json # Twelve Divine Generals
│   ├── engine.ts             # Unified dispatcher (统一调度入口)
│   ├── types.ts              # TypeScript type definitions
│   ├── constants.ts          # Qimen constants (奇门常量)
│   └── interpretation.ts     # Pattern interpretation system (格局解读)
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── CHANGELOG.md
├── LICENSE                   # MIT
├── package.json
└── README.md
```

---

## 🏗️ 技术架构 | Architecture

```
┌─────────────────────────────────────────┐
│     Unified Dispatcher (engine.ts)      │
├──────┬──────┬──────┬────────────────────┤
│Yearly│Month │Daily │     Hourly         │
│      │      │      │ ┌──────┬─────┬───┐ │
│      │      │      │ │ChaiBu│MaoSh│ZhiR│ │
│      │      │      │ └──────┴─────┴───┘ │
├──────┴──────┴──────┴────────────────────┤
│   Pattern Interpretation System         │
│   (81 patterns + Ten Stems + Deities)   │
├─────────────────────────────────────────┤
│        Data Layer (data/*.json)         │
│   Stars · Doors · Gods · Palaces       │
└─────────────────────────────────────────┘
```

---

## 🆚 与同类开源项目对比 | Comparison

| Feature | bigfishmarquis-qimen | 3META |
|:--------|:-------------------:|:-----:|
| Hourly chart methods | **3** (ChaiBu+MaoShan+ZhiRun) | 1 |
| Chart layers | **4** (Year/Month/Day/Hour) | Hour only |
| Known bugs | **0** | TianQin-BaMen misalignment |
| Hidden Stems | ✅ | ❌ |
| Earth Eight Gods | ✅ | ❌ |
| Tomb/Punishment/Pressure | ✅ | ❌ |
| Palace Lodging System | ✅ | ❌ |
| 81 Pattern Interpretation | ✅ Full | Basic |
| Validation coverage | 500 samples × 300 years | Unknown |
| External dependencies | **Zero** | — |

---

## 📋 依赖 | Dependencies

- **Runtime**: Zero external dependencies (Pure TypeScript)
- **Optional**: [`lunar-javascript`](https://github.com/6tail/lunar-javascript) or `lunar-typescript` for Solar Term and GanZhi data

---

## 🤝 贡献 | Contributing

We welcome contributions! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting a Pull Request.

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for community guidelines.

---

## 📄 License

[MIT](./LICENSE) © 2026 BigFishMarquis (鲲侯)

---

## 🔗 链接 | Links

- **产品 Product**: [鲲侯 · 星河易道](https://xuebz.com) — 八字·紫微·奇门·占星 专业命理推演引擎
- **在线演示 Live Demo**: [Qimen Chart Demo](https://xuebz.com/?chart=qimen)
- **GitHub**: [perfhelf/bigfishmarquis-qimen](https://github.com/perfhelf/bigfishmarquis-qimen)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)

---

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/perfhelf">BigFishMarquis (鲲侯)</a></sub>
</p>
