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
 * 茅山取局法
 * 复杂度：★★ | 最简单 | 废弃符头概念 | 纯节气定局
 *
 * 算法参考: engine_algorithms.md §⑥
 *
 * 核心: 精确交节时刻 → 算时辰偏移 → 固定分元(每元60时辰) → 查表得局数
 * 输出: juNumber + isYangDun → 传给 shiJiaGenerate
 */

// ─── 节气 ↔ 局数表 ──────────────────────────────

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

/** 所有阳遁节气 */
const YANG_DUN_TERMS = new Set(Object.keys(YANG_DUN_TABLE));

/**
 * 判断节气是阳遁还是阴遁
 */
export function isYangDunTerm(solarTerm: string): boolean {
  return YANG_DUN_TERMS.has(solarTerm);
}

/**
 * 茅山法取局
 *
 * @param solarTerm 当前所在节气
 * @param elapsedHours 距该节气精确交节时刻经过的小时数
 * @returns juNumber + isYangDun
 */
export function maoShanJu(
  solarTerm: string,
  elapsedHours: number,
): { isYangDun: boolean; juNumber: number; yuan: string } {
  const isYangDun = isYangDunTerm(solarTerm);
  const table = isYangDun ? YANG_DUN_TABLE[solarTerm] : YIN_DUN_TABLE[solarTerm];

  if (!table) {
    // 兜底
    return { isYangDun: true, juNumber: 1, yuan: '上' };
  }

  // 每元60时辰 = 5天 = 120小时
  const elapsedShichen = Math.floor(elapsedHours / 2);

  let yuan: string;
  let juIdx: number;

  if (elapsedShichen < 60) {
    yuan = '上';
    juIdx = 0;
  } else if (elapsedShichen < 120) {
    yuan = '中';
    juIdx = 1;
  } else {
    // 下元延续直到新节气到来
    yuan = '下';
    juIdx = 2;
  }

  const juNumber = table[juIdx]!;
  return { isYangDun, juNumber, yuan };
}
