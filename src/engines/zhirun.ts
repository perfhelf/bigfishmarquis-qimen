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
 * 置闰取局法
 * 复杂度：★★★★★ | 最古老最传统 | 符头+超神接气+芒种大雪置闰
 *
 * 核心算法:
 * 1. 从节气交节日往前找上元符头 (甲子/己卯/甲午/己酉)
 * 2. daysSinceFuTou = daysSinceJieQi + 符头超神天数
 * 3. 若 daysSinceFuTou >= 15 且有下一节气 → 当前日已越过本节气三元，应归属下一节气
 * 4. 三元 = daysSinceFuTou % 15 内的 5天分段 → 查对应节气局数表
 */

import { isYangDunTerm } from './maoshan';

// ─── 局数表 ──────────────────────────────────

const YANG_DUN_TABLE: Record<string, [number, number, number]> = {
  '冬至': [1, 7, 4], '惊蛰': [1, 7, 4],
  '小寒': [2, 8, 5],
  '大寒': [3, 9, 6], '春分': [3, 9, 6],
  '立春': [8, 5, 2],
  '雨水': [9, 6, 3],
  '清明': [4, 1, 7], '立夏': [4, 1, 7],
  '谷雨': [5, 2, 8], '小满': [5, 2, 8],
  '芒种': [6, 3, 9],
};

const YIN_DUN_TABLE: Record<string, [number, number, number]> = {
  '夏至': [9, 3, 6], '白露': [9, 3, 6],
  '小暑': [8, 2, 5],
  '大暑': [7, 1, 4], '秋分': [7, 1, 4],
  '立秋': [2, 5, 8],
  '处暑': [1, 4, 7],
  '寒露': [6, 9, 3], '立冬': [6, 9, 3],
  '霜降': [5, 8, 2], '小雪': [5, 8, 2],
  '大雪': [4, 7, 1],
};

// ─── 符头查找 ──────────────────────────────────

/**
 * 上元符头条件:
 * 天干 ∈ {甲(0), 己(5)} 且 地支 ∈ {子(0), 卯(3), 午(6), 酉(9)}
 * 即: 甲子、己卯、甲午、己酉
 */
function isUpperYuanFuTou(gzIndex: number): boolean {
  const s = gzIndex % 10;
  const b = gzIndex % 12;
  return (s === 0 || s === 5) && (b === 0 || b === 3 || b === 6 || b === 9);
}

/**
 * 从指定干支序号往前查找最近的上元符头
 * @returns 回溯天数 (0=当天即是符头)
 */
function findUpperYuanFuTouOffset(gzIndex: number): number {
  for (let offset = 0; offset <= 60; offset++) {
    const idx = ((gzIndex - offset) % 60 + 60) % 60;
    if (isUpperYuanFuTou(idx)) return offset;
  }
  return 0;
}

// ─── 节气顺序 (用于查找前一节气) ──────────────────
const JIEQI_SEQUENCE = [
  '冬至','小寒','大寒','立春','雨水','惊蛰','春分','清明',
  '谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋',
  '处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪',
];

function getPrevJieQiName(term: string): string {
  const idx = JIEQI_SEQUENCE.indexOf(term);
  if (idx < 0) return '';
  return JIEQI_SEQUENCE[(idx - 1 + 24) % 24]!;
}

// ─── 置闰主函数 ─────────────────────────────────

export interface ZhiRunResult {
  isYangDun: boolean;
  juNumber: number;
  yuan: string;
  /** 超神天数 (>0=符头在节气前到来) */
  chaoShenDays: number;
  /** 是否触发置闰 */
  isZhiRun: boolean;
}

/**
 * 置闰法取局
 *
 * @param solarTerm 当前节气 (prevJieQi)
 * @param dayGzIndex 当天日干支在60甲子中的序号(0-59)
 * @param daysSinceJieQi 距当前节气交节日的天数(>=0)
 * @param nextSolarTerm 下一个节气名 (用于跨节气检测)
 * @param daysToNextJieQi 距下一个节气交节日的天数(>=0)
 */
export function zhiRunJu(
  solarTerm: string,
  dayGzIndex: number,
  daysSinceJieQi: number,
  nextSolarTerm?: string,
  daysToNextJieQi?: number,
): ZhiRunResult {
  // ─── STEP 1: 从节气交节日找上元符头 ───
  const jieQiDayGz = ((dayGzIndex - daysSinceJieQi) % 60 + 60) % 60;
  const chaoShenDays = findUpperYuanFuTouOffset(jieQiDayGz);
  // chaoShenDays = 符头比节气交节日早几天到来 (>0=超神)

  // ─── STEP 2: 从符头到今天的总天数 ───
  const daysSinceFuTou = daysSinceJieQi + chaoShenDays;

  // ─── STEP 3: 置闰判定 (需在三元越界判断之前!) ───
  // 置闰条件: 超神>9 且 节气=芒种/大雪
  // 也需要检查: 如果当前节气是夏至/冬至, 但符头回溯到了前一个节气(芒种/大雪)
  // 此时前一节气的置闰会扩展三元周期到30天, 覆盖到当前节气初期
  const prevTermName = getPrevJieQiName(solarTerm);
  const isCurrentTermZhiRun = (solarTerm === '芒种' || solarTerm === '大雪') && chaoShenDays > 9;
  const isPrevTermZhiRun = (prevTermName === '芒种' || prevTermName === '大雪') && chaoShenDays > 9;

  // 当超神>9 且前一节气是芒种/大雪时, 符头实际落在芒种/大雪区间内
  // 此时应使用前一节气的局数表, 三元周期扩展到30天
  const isZhiRunTrigger = isCurrentTermZhiRun || isPrevTermZhiRun;
  const totalCycleDays = isZhiRunTrigger ? 30 : 15;

  // ─── STEP 4: 确定生效节气 ───
  let effectiveTerm = solarTerm;
  let effectiveDays = daysSinceFuTou;

  if (isPrevTermZhiRun && !isCurrentTermZhiRun) {
    // 符头属于前一节气(芒种/大雪)的闰周期, 使用前一节气
    effectiveTerm = prevTermName;
  } else if (daysSinceFuTou >= totalCycleDays && nextSolarTerm) {
    // 已越过本节气的三元周期
    effectiveTerm = nextSolarTerm;
    effectiveDays = daysSinceFuTou - totalCycleDays;
  }

  const isYangDun = isYangDunTerm(effectiveTerm);
  const table = isYangDun ? YANG_DUN_TABLE[effectiveTerm] : YIN_DUN_TABLE[effectiveTerm];

  if (!table) {
    return { isYangDun: true, juNumber: 1, yuan: '上', chaoShenDays: 0, isZhiRun: false };
  }

  // ─── STEP 5: 确定三元 ───
  const dayInCycle = effectiveDays % totalCycleDays;
  const yuanDay = dayInCycle % 15;

  let yuan: string;
  let juIdx: number;
  if (yuanDay < 5) {
    yuan = '上';
    juIdx = 0;
  } else if (yuanDay < 10) {
    yuan = '中';
    juIdx = 1;
  } else {
    yuan = '下';
    juIdx = 2;
  }

  const juNumber = table[juIdx]!;

  return {
    isYangDun,
    juNumber,
    yuan,
    chaoShenDays,
    isZhiRun: isZhiRunTrigger,
  };
}
