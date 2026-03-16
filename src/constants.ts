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
 * 奇门遁甲常量定义
 * 九宫/八门/九星/八神 的名称、五行、颜色映射
 *
 * 颜色: 100% 复用 src/utils/colors.ts 的 getElementColor()
 */

// ─── 九宫 ──────────────────────────────────────

export const PALACE_CONFIG = [
  { num: 1, name: '坎', element: '水' },
  { num: 2, name: '坤', element: '土' },
  { num: 3, name: '震', element: '木' },
  { num: 4, name: '巽', element: '木' },
  { num: 5, name: '中', element: '土' },
  { num: 6, name: '乾', element: '金' },
  { num: 7, name: '兑', element: '金' },
  { num: 8, name: '艮', element: '土' },
  { num: 9, name: '离', element: '火' },
] as const;

// ─── 八门 ──────────────────────────────────────

export const DOOR_CONFIG: Record<string, { element: string }> = {
  '开门': { element: '金' },
  '休门': { element: '水' },
  '生门': { element: '土' },
  '伤门': { element: '木' },
  '杜门': { element: '木' },
  '景门': { element: '火' },
  '死门': { element: '土' },
  '惊门': { element: '金' },
};

// ─── 九星 ──────────────────────────────────────

export const STAR_CONFIG: Record<string, { element: string }> = {
  '天蓬': { element: '水' },
  '天芮': { element: '土' },
  '天冲': { element: '木' },
  '天辅': { element: '木' },
  '天禽': { element: '土' },
  '天心': { element: '金' },
  '天柱': { element: '金' },
  '天任': { element: '土' },
  '天英': { element: '火' },
};

// ─── 八神 ──────────────────────────────────────

/** 八神简称映射 */
export const GOD_SHORT_MAP: Record<string, string> = {
  '值符': '符',
  '螣蛇': '蛇',
  '太阴': '阴',
  '六合': '合',
  '白虎': '虎',
  '玄武': '玄',
  '九地': '地',
  '九天': '天',
};

// ─── 宫位九宫格布局 (洛书顺序) ──────────────────

/**
 * 洛书九宫格布局顺序 (3行3列)
 * 用于UI渲染:
 *   [4] [9] [2]
 *   [3] [5] [7]
 *   [8] [1] [6]
 */
export const LUOSHU_GRID = [
  [4, 9, 2],
  [3, 5, 7],
  [8, 1, 6],
] as const;

// ─── 九星本位盘 ──────────────────────────────────

export const STAR_BASE_POSITION: Record<string, string> = {
  '1': '天蓬', '2': '天芮', '3': '天冲', '4': '天辅',
  '5': '天禽', '6': '天心', '7': '天柱', '8': '天任', '9': '天英',
};

// ─── 八门本位 ──────────────────────────────────

export const DOOR_BASE_POSITION: Record<string, string> = {
  '1': '休门', '2': '死门', '3': '伤门', '4': '杜门',
  '9': '景门', '6': '开门', '7': '惊门', '8': '生门',
};
