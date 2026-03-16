/**
 * @license MIT
 * @package bigfishmarquis-qimen
 * @name 鲲侯 · 星河易道 奇门排盘引擎
 * @see https://github.com/perfhelf/bigfishmarquis-qimen
 *
 * ⚠️ OPEN-SOURCE COPY — 此文件为开源副本，请勿在此修改。
 * 原始代码位于 metaphysics-app/src/qimen/
 */
/**
 * 奇门遁甲 — 共享引擎工具库
 * 所有自建引擎的基础设施：查表、遍历、排盘核心函数
 *
 * 参考: engine_algorithms.md §共享基础数据
 */

import type { DunType, QimenPalace } from '../types';

// ═══════════════════════════════════════════════════
//  A. 天干地支基础
// ═══════════════════════════════════════════════════

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

/** 干支序号(0-59): n = (stemIdx * 6 + (branchIdx - stemIdx + 12) % 12) / 2 ... 简化为直接查 */
export function gzIndex(stem: string, branch: string): number {
  const si = STEMS.indexOf(stem as any);
  const bi = BRANCHES.indexOf(branch as any);
  if (si === -1 || bi === -1) return -1;
  // 甲子=0, 乙丑=1, ... 癸亥=59
  // 公式: (si % 10) 和 (bi % 12) 配对，同奇同偶才成干支
  // 简单: 遍历60甲子找匹配
  for (let n = 0; n < 60; n++) {
    if (n % 10 === si && n % 12 === bi) return n;
  }
  return -1;
}

/** 由序号(0-59)还原干支 */
export function gzFromIndex(n: number): { stem: string; branch: string } {
  return {
    stem: STEMS[n % 10]!,
    branch: BRANCHES[n % 12]!,
  };
}

// ═══════════════════════════════════════════════════
//  B. 六甲旬首 ↔ 六仪 ↔ 九星 ↔ 八门
// ═══════════════════════════════════════════════════

export interface XunShouInfo {
  /** 旬首名 (甲子/甲戌/甲申/甲午/甲辰/甲寅) */
  xunShou: string;
  /** 遁甲六仪 (戊/己/庚/辛/壬/癸) */
  liuYi: string;
  /** 本宫编号 */
  palace: number;
  /** 值符九星 */
  zhiFuStar: string;
  /** 值使八门 */
  zhiShiDoor: string;
}

const XUN_SHOU_TABLE: XunShouInfo[] = [
  { xunShou: '甲子', liuYi: '戊', palace: 1, zhiFuStar: '天蓬', zhiShiDoor: '休门' },
  { xunShou: '甲戌', liuYi: '己', palace: 2, zhiFuStar: '天芮', zhiShiDoor: '死门' },
  { xunShou: '甲申', liuYi: '庚', palace: 3, zhiFuStar: '天冲', zhiShiDoor: '伤门' },
  { xunShou: '甲午', liuYi: '辛', palace: 4, zhiFuStar: '天辅', zhiShiDoor: '杜门' },
  { xunShou: '甲辰', liuYi: '壬', palace: 5, zhiFuStar: '天禽', zhiShiDoor: '死门' }, // 天禽寄坤2,值使寄死门
  { xunShou: '甲寅', liuYi: '癸', palace: 6, zhiFuStar: '天心', zhiShiDoor: '开门' },
];

/** 查找干支所在的旬首信息 */
export function findXunShou(stem: string, branch: string): XunShouInfo {
  const idx = gzIndex(stem, branch);
  if (idx === -1) return XUN_SHOU_TABLE[0]!;
  const xunIdx = Math.floor(idx / 10); // 0-5
  return XUN_SHOU_TABLE[xunIdx]!;
}

/** 宫号→本位九星 */
const PALACE_TO_STAR: Record<number, string> = {
  1: '天蓬', 2: '天芮', 3: '天冲', 4: '天辅',
  5: '天禽', 6: '天心', 7: '天柱', 8: '天任', 9: '天英',
};

/** 宫号→本位八门 */
const PALACE_TO_DOOR: Record<number, string> = {
  1: '休门', 2: '死门', 3: '伤门', 4: '杜门',
  6: '开门', 7: '惊门', 8: '生门', 9: '景门',
  5: '死门', // 中五寄坤二→死门
};

/**
 * 动态解析值符/值使
 *
 * 正确算法:
 * 1. 干支 → 旬首 → 六仪
 * 2. 六仪在地盘上落在第N宫
 * 3. 第N宫的本位九星 = 值符
 * 4. 第N宫的本位八门 = 值使
 *
 * 这与静态旬首表的区别: 静态表里的palace/star/door是"戊落坎一"时的本位值,
 * 但实际地盘排布随局数变化, 六仪的落宫也随之变化。
 */
export function resolveZhiFuShi(
  stem: string,
  branch: string,
  earthPlate: Map<number, string>,
): { zhiFuStar: string; zhiShiDoor: string; liuYiPalace: number; liuYi: string } {
  const xunShou = findXunShou(stem, branch);
  const liuYi = xunShou.liuYi;

  // 在地盘上找六仪落在哪个宫
  const liuYiPalace = findStemOnEarth(earthPlate, liuYi);
  const effectivePalace = liuYiPalace === 5 ? 2 : liuYiPalace; // 中五寄坤二

  const zhiFuStar = PALACE_TO_STAR[effectivePalace] || '天蓬';
  const zhiShiDoor = PALACE_TO_DOOR[effectivePalace] || '休门';

  return { zhiFuStar, zhiShiDoor, liuYiPalace, liuYi };
}

// ═══════════════════════════════════════════════════
//  C. 九宫遍历顺序
// ═══════════════════════════════════════════════════

/** 阳遁顺布: 1→8→3→4→9→2→7→6 (跳中五) */
const YANG_ORDER = [1, 8, 3, 4, 9, 2, 7, 6];
/** 阴遁逆布: 1→6→7→2→9→4→3→8 (跳中五) */
const YIN_ORDER = [1, 6, 7, 2, 9, 4, 3, 8];

/** 获取遍历序列 */
export function getTraversalOrder(dun: DunType): readonly number[] {
  return dun === 'yang' ? YANG_ORDER : YIN_ORDER;
}

/**
 * 从起始宫出发，沿遍历序前进 steps 步
 * @param startPalace 起始宫号(1-9, 5会被映射到2)
 * @param steps 前进步数
 * @param dun 阴阳遁
 * @returns 目标宫号
 */
export function traverse(startPalace: number, steps: number, dun: DunType): number {
  const order = getTraversalOrder(dun);
  // 中五宫映射到坤二
  const start = startPalace === 5 ? 2 : startPalace;
  const startIdx = order.indexOf(start);
  if (startIdx === -1) return start;
  const targetIdx = (startIdx + steps) % order.length;
  return order[targetIdx]!;
}

// ═══════════════════════════════════════════════════
//  D. 三奇六仪 & 地盘排布
// ═══════════════════════════════════════════════════

/** 三奇六仪固定序: 戊己庚辛壬癸丁丙乙 */
export const SAN_QI_LIU_YI = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'] as const;

/**
 * 布地盘三奇六仪
 *
 * 地盘按宫位数字顺序排布（非洛书飞布路径！）
 * - 阳遁: 从起宫向上数 N→N+1→N+2→... (1→2→3→4→5→6→7→8→9 循环)
 * - 阴遁: 从起宫向下数 N→N-1→N-2→... (9→8→7→6→5→4→3→2→1 循环)
 * - 中五宫: 遍历到5时跳过(干存入5但实际寄坤2)
 *
 * ⚠️ 注意: YANG_ORDER/YIN_ORDER 是洛书飞布路径, 仅用于天盘九星/人盘八门/神盘八神
 *
 * @param juNumber 局数(1-9)
 * @param dun 阴阳遁
 * @returns Map<宫号, 地盘干>
 */
export function layoutEarthPlate(juNumber: number, dun: DunType): Map<number, string> {
  const plate = new Map<number, string>();

  // 地盘按宫位数字顺序, 非洛书飞布路径
  // 阳遁: 1→2→3→4→5→6→7→8→9
  // 阴遁: 9→8→7→6→5→4→3→2→1
  const step = dun === 'yang' ? 1 : -1;

  let palace = juNumber; // 戊起于局数宫
  for (let i = 0; i < 9; i++) {
    const stem = SAN_QI_LIU_YI[i]!;
    plate.set(palace, stem);
    // ⚠️ 中五宫不再覆写坤二宫！
    // palace 5 的干独立存储，寄坤逻辑由下游处理

    // 前进到下一宫 (1-9循环, 含中五)
    palace = palace + step;
    if (palace > 9) palace = 1;
    if (palace < 1) palace = 9;
  }

  return plate;
}

/**
 * 查找干在地盘上落在哪个宫
 */
export function findStemOnEarth(earthPlate: Map<number, string>, stem: string): number {
  const entries = Array.from(earthPlate.entries());
  for (let i = 0; i < entries.length; i++) {
    if (entries[i]![1] === stem) return entries[i]![0]!;
  }
  return 1; // fallback
}

// ═══════════════════════════════════════════════════
//  E. 九星
// ═══════════════════════════════════════════════════

/** 九星固定序 (与宫位对应) */
export const NINE_STARS = ['天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英'] as const;

/** 九星本位宫 */
export const STAR_HOME_PALACE: Record<string, number> = {
  '天蓬': 1, '天芮': 2, '天冲': 3, '天辅': 4,
  '天禽': 5, '天心': 6, '天柱': 7, '天任': 8, '天英': 9,
};

/** 九星五行 */
export const STAR_ELEMENT: Record<string, string> = {
  '天蓬': '水', '天芮': '土', '天冲': '木', '天辅': '木',
  '天禽': '土', '天心': '金', '天柱': '金', '天任': '土', '天英': '火',
};

/** 九星遍历序 (按九宫遍历布入) */
const STAR_TRAVERSE_ORDER = ['天蓬', '天任', '天冲', '天辅', '天英', '天芮', '天柱', '天心'];

/**
 * 排天盘九星
 * 值符星飞到目标干在地盘的宫位，其余按固定序遍历
 * @param zhiFuStar 值符星名
 * @param flyStem 飞布依据干 (时干/日干/月干/年干)
 * @param earthPlate 地盘
 * @param options.allowCenter 是否允许入中五宫
 */
export function layoutSkyStars(
  zhiFuStar: string,
  flyStem: string,
  earthPlate: Map<number, string>,
  options?: { allowCenter?: boolean }
): Map<number, string> {
  const skyStars = new Map<number, string>();
  const targetPalace = findStemOnEarth(earthPlate, flyStem);
  const finalTarget = (!options?.allowCenter && targetPalace === 5) ? 2 : targetPalace;

  // 值符星落目标宫
  skyStars.set(finalTarget, zhiFuStar);

  // 从值符星开始，按九星遍历序排入其余星
  const zhiFuIdx = STAR_TRAVERSE_ORDER.indexOf(zhiFuStar);
  // 天禽特殊处理: 不在遍历序中，寄坤二
  if (zhiFuIdx === -1) {
    // 值符是天禽，直接寄坤二
    skyStars.set(options?.allowCenter ? 5 : 2, zhiFuStar);
  }

  const order = YANG_ORDER; // 天盘九星始终按阳遁顺序遍历
  const startIdx = order.indexOf(finalTarget);

  for (let i = 1; i < 8; i++) {
    const starIdx = (zhiFuIdx + i) % STAR_TRAVERSE_ORDER.length;
    const star = STAR_TRAVERSE_ORDER[starIdx]!;
    const palaceIdx = (startIdx + i) % order.length;
    let palace = order[palaceIdx]!;

    // 天禽寄坤二
    if (star === '天禽' && !options?.allowCenter) {
      // 天禽不独占宫位，跳过（已寄坤二）
      continue;
    }

    skyStars.set(palace, star);
  }

  // 天禽寄坤: 坤二宫若无天禽，补上
  if (!options?.allowCenter) {
    // 天禽始终寄坤二
    if (!Array.from(skyStars.values()).includes('天禽')) {
      // 天禽跟随坤二宫的星
    }
  }

  return skyStars;
}

// ═══════════════════════════════════════════════════
//  F. 八门
// ═══════════════════════════════════════════════════

/** 八门固定序 */
export const EIGHT_DOORS = ['休门', '生门', '伤门', '杜门', '景门', '死门', '惊门', '开门'] as const;

/** 八门本位宫 */
export const DOOR_HOME_PALACE: Record<string, number> = {
  '休门': 1, '死门': 2, '伤门': 3, '杜门': 4,
  '景门': 9, '开门': 6, '惊门': 7, '生门': 8,
};

/** 八门五行 */
export const DOOR_ELEMENT: Record<string, string> = {
  '休门': '水', '死门': '土', '伤门': '木', '杜门': '木',
  '景门': '火', '开门': '金', '惊门': '金', '生门': '土',
};

/** 八门遍历序 */
const DOOR_TRAVERSE_ORDER = ['休门', '生门', '伤门', '杜门', '景门', '死门', '惊门', '开门'];

/**
 * 排人盘八门
 * 值使门飞到目标支映射的宫位
 * @param zhiShiDoor 值使门名
 * @param flyBranch 飞布依据支 (时支/日支/月支/年支)
 * @param dun 阴阳遁
 * @param options.allowCenter 是否允许入中五宫
 */
export function layoutDoors(
  zhiShiDoor: string,
  flyBranch: string,
  dun: DunType,
  options?: { allowCenter?: boolean }
): Map<number, string> {
  const doors = new Map<number, string>();
  const targetPalace = BRANCH_TO_PALACE[flyBranch] || 1;
  const finalTarget = (!options?.allowCenter && targetPalace === 5) ? 2 : targetPalace;

  // 值使门落目标宫
  doors.set(finalTarget, zhiShiDoor);

  // 从值使门按遍历序排入
  const zhiShiIdx = DOOR_TRAVERSE_ORDER.indexOf(zhiShiDoor);
  const order = getTraversalOrder(dun);
  const startIdx = order.indexOf(finalTarget);

  for (let i = 1; i < 8; i++) {
    const doorIdx = (zhiShiIdx + i) % DOOR_TRAVERSE_ORDER.length;
    const door = DOOR_TRAVERSE_ORDER[doorIdx]!;
    const palaceIdx = (startIdx + i) % order.length;
    const palace = order[palaceIdx]!;
    doors.set(palace, door);
  }

  return doors;
}

// ═══════════════════════════════════════════════════
//  G. 八神
// ═══════════════════════════════════════════════════

/** 八神名称 */
export const EIGHT_GODS = ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'] as const;

/** 八神简称映射 */
export const GOD_SHORT_NAME: Record<string, string> = {
  '值符': '符', '螣蛇': '蛇', '太阴': '阴', '六合': '合',
  '白虎': '虎', '玄武': '玄', '九地': '地', '九天': '天',
};

/**
 * 排神盘八神
 * 值符神落在值符星所在宫，按阴阳遁方向布入
 */
export function layoutGods(zhiFuPalace: number, dun: DunType): Map<number, string> {
  const gods = new Map<number, string>();
  const palace = zhiFuPalace === 5 ? 2 : zhiFuPalace;

  // 阳遁顺排，阴遁逆排
  const godOrder = dun === 'yang'
    ? ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天']
    : ['值符', '九天', '九地', '玄武', '白虎', '六合', '太阴', '螣蛇'];

  const order = getTraversalOrder(dun);
  const startIdx = order.indexOf(palace);

  for (let i = 0; i < 8; i++) {
    const palaceIdx = (startIdx + i) % order.length;
    const p = order[palaceIdx]!;
    gods.set(p, godOrder[i]!);
  }

  return gods;
}

/**
 * 排地盘八神 (v3 — 日旬首仪定位 + 阴阳遁神序)
 *
 * 1. 起点宫 = 旬首仪(戊/己/庚/辛/壬/癸)在地盘的落宫
 * 2. 布排方向固定反时针: 乾六→坎一→艮八→震三→巽四→离九→坤二→兑七
 * 3. 八神序列:
 *    - 阳遁(顺序): 值符→螣蛇→太阴→六合→白虎→玄武→九地→九天
 *    - 阴遁(逆序): 值符→九天→九地→玄武→白虎→六合→太阴→螣蛇
 * 4. 中五宫永远无地八神
 */
export function layoutDiGods(earthPlate: Map<number, string>, xunYi: string, dun: DunType): Map<number, string> {
  const diGods = new Map<number, string>();

  // 固定反时针八宫环
  const DI_RING = [6, 1, 8, 3, 4, 9, 2, 7];
  // 阳遁顺序, 阴遁逆序
  const DI_GOD_YANG = ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
  const DI_GOD_YIN  = ['值符', '九天', '九地', '玄武', '白虎', '六合', '太阴', '螣蛇'];
  const godSeq = dun === 'yang' ? DI_GOD_YANG : DI_GOD_YIN;

  // 找旬首仪在地盘的落宫
  let startPalace = findStemOnEarth(earthPlate, xunYi);
  if (startPalace === 5) startPalace = 2; // 中五寄坤二

  const startIdx = DI_RING.indexOf(startPalace);
  if (startIdx === -1) return diGods;

  for (let i = 0; i < 8; i++) {
    const palaceIdx = (startIdx + i) % 8;
    const p = DI_RING[palaceIdx]!;
    diGods.set(p, godSeq[i]!);
  }

  return diGods;
}

// ═══════════════════════════════════════════════════
//  H. 地支 ↔ 宫位映射
// ═══════════════════════════════════════════════════

export const BRANCH_TO_PALACE: Record<string, number> = {
  '子': 1, '丑': 8, '寅': 8, '卯': 3, '辰': 4, '巳': 4,
  '午': 9, '未': 2, '申': 2, '酉': 7, '戌': 6, '亥': 6,
};

// ═══════════════════════════════════════════════════
//  I. 宫位常量
// ═══════════════════════════════════════════════════

export const PALACE_NAMES: Record<number, string> = {
  1: '坎', 2: '坤', 3: '震', 4: '巽', 5: '中', 6: '乾', 7: '兑', 8: '艮', 9: '离',
};

export const PALACE_ELEMENTS: Record<number, string> = {
  1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火',
};

/** 天干→五行 */
const STEM_ELEMENT: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

/** 五行→墓库宫位 (火墓戌→乾6, 水墓辰→巽4, 金墓丑→艮8, 木墓未→坤2, 土墓辰→巽4) */
const GRAVE_PALACE: Record<string, number[]> = {
  '火': [6], '水': [4], '金': [8], '木': [2], '土': [4],
};

/** 五行相克判断: a 克 b */
function wxRestricts(a: string, b: string): boolean {
  const table: Record<string, string> = {
    '金': '木', '木': '土', '土': '水', '水': '火', '火': '金',
  };
  return table[a] === b;
}

// ═══════════════════════════════════════════════════
//  J. 空亡计算
// ═══════════════════════════════════════════════════

/** 计算干支对的空亡地支 */
export function getKongWang(stem: string, branch: string): string[] {
  const si = STEMS.indexOf(stem as any);
  const bi = BRANCHES.indexOf(branch as any);
  if (si === -1 || bi === -1) return [];

  // 旬首地支 = (bi - si + 12) % 12 处开始的旬
  // 空亡 = 旬首地支 + 10, +11
  const xunStartBranch = (bi - si + 12) % 12;
  const kong1 = BRANCHES[(xunStartBranch + 10) % 12]!;
  const kong2 = BRANCHES[(xunStartBranch + 11) % 12]!;

  return [kong1, kong2];
}

// ═══════════════════════════════════════════════════
//  K. 盘面组装
// ═══════════════════════════════════════════════════

/**
 * 将各层 Map 数据组装为 QimenPalace[]
 */
export function assemblePalaces(
  earthPlate: Map<number, string>,
  skyStars: Map<number, string>,
  doors: Map<number, string>,
  gods: Map<number, string>,
  kongWangBranches: string[],
  hourStem?: string,
  earthPlateForHourCheck?: Map<number, string>,
  diGods?: Map<number, string>,
  customHiddenStems?: Map<number, string[]>,
): QimenPalace[] {
  const palaces: QimenPalace[] = [];

  // 宫位对应地支（用于空亡判定）
  const PALACE_BRANCHES: Record<number, string[]> = {
    1: ['子'], 2: ['未', '申'], 3: ['卯'], 4: ['辰', '巳'],
    5: [], 6: ['戌', '亥'], 7: ['酉'], 8: ['丑', '寅'], 9: ['午'],
  };

  // 六仪→暗甲具体名称
  const LIU_YI_TO_JIA: Record<string, string> = {
    '戊': '甲子', '己': '甲戌', '庚': '甲申',
    '辛': '甲午', '壬': '甲辰', '癸': '甲寅',
  };

  for (let num = 1; num <= 9; num++) {
    const actualEarthStem = earthPlate.get(num) || '';
    const actualSkyStem = num !== 5 ? getSkyPlateStems(skyStars, earthPlate, num) : (earthPlate.get(5) || earthPlate.get(2) || '');
    const star = skyStars.get(num) || (num === 5 ? '天禽' : '');
    const door = doors.get(num) || '';
    const god = gods.get(num) || '';

    // ⚠️ 历史遗留: earthStem字段=天盘干, skyStem字段=地盘干
    // 为保持 UI 一致性, 这里也遵循此约定
    const earthStem = actualSkyStem;  // 字段earthStem = 天盘干 (UI显示位置)
    const skyStem = actualEarthStem;  // 字段skyStem = 地盘干 (UI显示位置)

    // 计算暗干支：优先使用自定义暗干支，否则用默认六仪→甲子逻辑
    const hiddenStems: string[] = customHiddenStems?.get(num) || (() => {
      const hs: string[] = [];
      const jiaFromSky = LIU_YI_TO_JIA[actualSkyStem];
      const jiaFromEarth = LIU_YI_TO_JIA[actualEarthStem];
      if (jiaFromEarth) {
        hs.push(jiaFromEarth);
      } else if (jiaFromSky) {
        hs.push(jiaFromSky);
      }
      return hs;
    })();

    // 计算标记
    const marks: QimenPalace['marks'] = [];

    // 空亡：检查该宫对应地支是否在空亡列表中
    const palaceBranches = PALACE_BRANCHES[num] || [];
    if (palaceBranches.some(b => kongWangBranches.includes(b))) {
      marks.push('时空');
    }

    // 门迫 (宫克门: 宫五行克门五行)
    const doorElem = DOOR_ELEMENT[door];
    const palaceElem = PALACE_ELEMENTS[num];
    if (doorElem && palaceElem && doorElem !== palaceElem && wxRestricts(doorElem, palaceElem)) {
      marks.push('迫');
    }

    // 六仪击刑 (天盘干 = earthStem字段, 注意命名反转)
    const tianPanGan = earthStem; // 天盘干
    if ((tianPanGan === '戊' && num === 3) ||
        (tianPanGan === '己' && num === 2) ||
        (tianPanGan === '庚' && num === 8) ||
        (tianPanGan === '辛' && num === 9) ||
        (tianPanGan === '壬' && num === 4) ||
        (tianPanGan === '癸' && num === 4)) {
      marks.push('刑');
    }

    // 六仪入墓 — ① 五行墓 (天盘干六仪→墓库宫位)
    let hasMu = false;
    const stemElem = STEM_ELEMENT[tianPanGan];
    if (stemElem && GRAVE_PALACE[stemElem]?.includes(num)) {
      marks.push('墓');
      hasMu = true;
    }
    // 六仪入墓 — ② 十二长生墓 (天干→长生墓支→宫位)
    const STEM_GRAVE: Record<string, number> = {
      '甲': 2, '乙': 6, '丙': 6, '丁': 8, '戊': 6,
      '己': 8, '庚': 8, '辛': 4, '壬': 4, '癸': 2,
    };
    if (!hasMu && STEM_GRAVE[tianPanGan] === num) {
      marks.push('墓');
    }

    // ── 寄宫干的墓/刑 (天禽携来的干 — 独立存入 jiMarks, 不混入 marks) ──
    // 找天芮落宫 = 寄宫目标
    let jiGongTarget = 0;
    for (const [p, s] of skyStars.entries()) {
      if (s === '天芮' && p !== 5) { jiGongTarget = p; break; }
    }
    const jiStemVal = earthPlate.get(5) || '';
    const jiStem = (jiGongTarget && num === jiGongTarget && num !== 5) ? jiStemVal : '';
    const jiMarks: QimenPalace['marks'] = [];
    if (jiStem) {
      // 寄宫干击刑
      if ((jiStem === '戊' && num === 3) || (jiStem === '己' && num === 2) ||
          (jiStem === '庚' && num === 8) || (jiStem === '辛' && num === 9) ||
          (jiStem === '壬' && num === 4) || (jiStem === '癸' && num === 4)) {
        jiMarks.push('刑');
      }
      // 寄宫干入墓 (五行墓 + 十二长生墓, 去重)
      const jiWx = STEM_ELEMENT[jiStem];
      if (jiWx && GRAVE_PALACE[jiWx]?.includes(num)) {
        jiMarks.push('墓');
      } else if (STEM_GRAVE[jiStem] === num) {
        jiMarks.push('墓');
      }
    }

    palaces.push({
      palaceNumber: num,
      palaceName: PALACE_NAMES[num] || '',
      palaceElement: PALACE_ELEMENTS[num] || '',
      skyStem,
      earthStem,
      hiddenStems,
      star,
      starElement: STAR_ELEMENT[star] || '',
      door,
      doorElement: DOOR_ELEMENT[door] || '',
      god,
      godShort: GOD_SHORT_NAME[god] || '',
      marks,
      jiMarks: jiMarks.length > 0 ? jiMarks : undefined,
      diGod: diGods ? (GOD_SHORT_NAME[diGods.get(num) || ''] || '') : undefined,
    });
  }

  return palaces;
}

/** 获取天盘干（值符星所在地盘干飞到值符星当前宫位） */
function getSkyPlateStems(
  skyStars: Map<number, string>,
  earthPlate: Map<number, string>,
  palaceNum: number
): string {
  // 天盘干 = 落在此宫的九星在地盘本位宫上的地盘干
  const starInPalace = skyStars.get(palaceNum);
  if (!starInPalace) return earthPlate.get(palaceNum) || '';

  const starHome = STAR_HOME_PALACE[starInPalace];
  if (!starHome) return earthPlate.get(palaceNum) || '';

  // 天禽本位在中5: 取中5宫地盘干(独立存储), 若无则回退坤2
  const homePalace = starHome === 5
    ? (earthPlate.has(5) ? 5 : 2)
    : starHome;
  return earthPlate.get(homePalace) || '';
}

// ═══════════════════════════════════════════════════
//  L. 年支分类（月家/年家通用）
// ═══════════════════════════════════════════════════

/** 四孟/四仲/四季分类 */
export function getBranchCategory(branch: string): 'upper' | 'middle' | 'lower' {
  const si_meng = ['寅', '申', '巳', '亥']; // 四孟 → 上元
  const si_zhong = ['子', '午', '卯', '酉']; // 四仲 → 中元
  // 四季: 辰戌丑未 → 下元

  if (si_meng.includes(branch)) return 'upper';
  if (si_zhong.includes(branch)) return 'middle';
  return 'lower';
}
