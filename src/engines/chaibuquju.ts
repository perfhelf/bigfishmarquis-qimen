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
 * 拆补取局法 — 自研引擎
 * 复杂度：★★★ | 精确节气交节 + 符头定元
 *
 * 算法原理:
 * 1. 以精确节气交节时刻为分界 (lunar-javascript 精确到分钟)
 * 2. 从当前日干支往前找最近的符头 (甲/己日)
 * 3. 根据符头地支确定上/中/下元:
 *    - 子午卯酉 → 上元
 *    - 寅申巳亥 → 中元
 *    - 辰戌丑未 → 下元
 * 4. 查节气局数表得到具体局数
 *
 * 拆补法 vs 茅山法:
 * - 茅山法: 按精确时辰偏移量分为3段(每段60时辰=5天)
 * - 拆补法: 按干支符头确定元, 允许"残元补局"
 *
 * 拆补法 vs 置闰法:
 * - 置闰法: 符头可超越节气(超神), 需在芒种/大雪置闰
 * - 拆补法: 严格以节气交节为界, 直接切换新节气局数
 */

import { isYangDunTerm } from './maoshan';

// ─── 节气 ↔ 局数表 (与 maoshan/zhirun 共用) ────────────

/** 阳遁节气局数表 (冬至→芒种) */
const YANG_DUN_TABLE: Record<string, [number, number, number]> = {
  // [上元, 中元, 下元]
  '冬至': [1, 7, 4], '惊蛰': [1, 7, 4],
  '小寒': [2, 8, 5],
  '大寒': [3, 9, 6], '春分': [3, 9, 6],
  '立春': [8, 5, 2],
  '雨水': [9, 6, 3],
  '清明': [4, 1, 7], '立夏': [4, 1, 7],
  '谷雨': [5, 2, 8], '小满': [5, 2, 8],
  '芒种': [6, 3, 9],
};

/** 阴遁节气局数表 (夏至→大雪) */
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

// ─── 符头与三元 ──────────────────────────────────

/** 十天干 */
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
/** 十二地支 */
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/**
 * 确定符头地支对应的元
 * - 子午卯酉 → 上元 (index 0)
 * - 寅申巳亥 → 中元 (index 1)
 * - 辰戌丑未 → 下元 (index 2)
 */
function getYuanFromBranch(branch: string): number {
  const SHANG = new Set(['子', '午', '卯', '酉']);
  const ZHONG = new Set(['寅', '申', '巳', '亥']);
  // const XIA = new Set(['辰', '戌', '丑', '未']);
  if (SHANG.has(branch)) return 0; // 上元
  if (ZHONG.has(branch)) return 1; // 中元
  return 2; // 下元
}

/**
 * 从日干支往前找最近的符头 (甲/己日)
 * 符头 = 天干为甲(0)或己(5)的日柱
 *
 * @param dayStemIdx 日天干在STEMS中的序号 (0-9)
 * @param dayBranchIdx 日地支在BRANCHES中的序号 (0-11)
 * @returns { offset: 回溯天数 (0=当天即是符头), branch: 符头地支 }
 */
function findFuTou(dayStemIdx: number, dayBranchIdx: number): { offset: number; branch: string } {
  // 甲=0, 己=5 → 需要天干序号 % 5 === 0
  const stemOffset = dayStemIdx % 5; // 距最近的甲或己的天数
  const branchIdx = ((dayBranchIdx - stemOffset) % 12 + 12) % 12;
  return {
    offset: stemOffset,
    branch: BRANCHES[branchIdx]!,
  };
}

// ─── 拆补法主函数 ─────────────────────────────────

export interface ChaiBuResult {
  isYangDun: boolean;
  juNumber: number;
  yuan: string;
}

/**
 * 拆补法取局
 *
 * @param solarTerm 当前所在节气名 (由 lunar.getPrevJieQi() 获取)
 * @param dayStemIdx 当天日天干序号 (0-9, 甲=0...癸=9)
 * @param dayBranchIdx 当天日地支序号 (0-11, 子=0...亥=11)
 * @param hour 当前小时 (0-23), 用于23:00换日处理
 */
export function chaiBuJu(
  solarTerm: string,
  dayStemIdx: number,
  dayBranchIdx: number,
  hour?: number,
): ChaiBuResult {
  // 23:00+ 换日: 日干支向前推一位
  let effectiveStemIdx = dayStemIdx;
  let effectiveBranchIdx = dayBranchIdx;
  if (hour !== undefined && hour >= 23) {
    effectiveStemIdx = (dayStemIdx + 1) % 10;
    effectiveBranchIdx = (dayBranchIdx + 1) % 12;
  }

  // 1. 找符头
  const fuTou = findFuTou(effectiveStemIdx, effectiveBranchIdx);

  // 2. 由符头地支确定上/中/下元
  const yuanIdx = getYuanFromBranch(fuTou.branch);
  const yuanNames = ['上', '中', '下'];
  const yuan = yuanNames[yuanIdx]!;

  // 3. 查节气局数表
  const isYangDun = isYangDunTerm(solarTerm);
  const table = isYangDun ? YANG_DUN_TABLE[solarTerm] : YIN_DUN_TABLE[solarTerm];

  if (!table) {
    return { isYangDun: true, juNumber: 1, yuan: '上' };
  }

  const juNumber = table[yuanIdx]!;

  return { isYangDun, juNumber, yuan };
}

/**
 * 便捷函数: 直接传入日干支字符串
 * @param hour 当前小时 (0-23), 用于23:00换日处理
 */
export function chaiBuJuByGanZhi(
  solarTerm: string,
  dayGan: string,
  dayZhi: string,
  hour?: number,
): ChaiBuResult {
  const sIdx = STEMS.indexOf(dayGan);
  const bIdx = BRANCHES.indexOf(dayZhi);
  if (sIdx < 0 || bIdx < 0) {
    return { isYangDun: true, juNumber: 1, yuan: '上' };
  }
  return chaiBuJu(solarTerm, sIdx, bIdx, hour);
}
