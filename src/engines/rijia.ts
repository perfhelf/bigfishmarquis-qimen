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
 * 日家奇门引擎
 * 复杂度：★★★★ | 阴阳遁动态 | 甲子跃迁定局
 *
 * 算法参考: 奇门算法校准.md 日家章节 (5盘面100%验证通过)
 *
 * 核心:
 *   定局 = 甲子跃迁法则 (二至定阴阳 + 甲子日计数)
 *   地盘 = 阴/阳遁标准布
 *   值符/值使 = 日干支旬首六仪
 *   天星 = 值符星飞日干落宫 + YANG_ORDER
 *   八门 = 值使门飞日干落宫 (与星同宫!) + YANG_ORDER
 *   八神 = 值符落宫起 + 阳顺阴逆
 *   暗干支 = 齿轮旋转法 (同年家/月家)
 *   地八神 = 旬首仪定位法 (共享)
 */

import { Solar } from 'lunar-typescript';
import type { QimenChart } from '../types';
import {
  STEMS, BRANCHES,
  resolveZhiFuShi,
  findXunShou,
  layoutEarthPlate,
  layoutSkyStars,
  layoutDiGods,
  assemblePalaces,
  getKongWang,
  findStemOnEarth,
} from './shared';

// ─── 常量 ─────────────────────────────────────
const YANG_ORDER = [1, 8, 3, 4, 9, 2, 7, 6];
const DOOR_ORDER = ['休门', '生门', '伤门', '杜门', '景门', '死门', '惊门', '开门'];
const GOD_ORDER_YANG = ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
const GOD_ORDER_YIN = ['值符', '九天', '九地', '玄武', '白虎', '六合', '太阴', '螣蛇'];
const DOOR_HOME_PALACE: Record<string, number> = {
  '休门': 1, '生门': 8, '伤门': 3, '杜门': 4,
  '景门': 9, '死门': 2, '惊门': 7, '开门': 6,
};
const PALACE_ORIGINAL_STAR: Record<number, string> = {
  1: '天蓬', 2: '天芮', 3: '天冲', 4: '天辅', 5: '天禽',
  6: '天心', 7: '天柱', 8: '天任', 9: '天英',
};
const STAR_ORDER = ['天蓬', '天任', '天冲', '天辅', '天英', '天芮', '天柱', '天心'];

// ─── 日干支计算 ────────────────────────────────

const JIAZIANCHOR = new Date(2000, 0, 7); // 2000-01-07 = 甲子日 (anchor)

/** 计算某日的六十甲子序号 (0=甲子, 1=乙丑, ...) */
function dayGzIdx(y: number, m: number, d: number): number {
  const target = new Date(y, m - 1, d);
  const diff = Math.round((target.getTime() - JIAZIANCHOR.getTime()) / 86400000);
  return ((diff % 60) + 60) % 60;
}

/** 获取某日的干支 */
function getDayGanZhi(y: number, m: number, d: number) {
  const idx = dayGzIdx(y, m, d);
  return {
    stem: STEMS[idx % 10],
    branch: BRANCHES[idx % 12],
    stemIdx: idx % 10,
    branchIdx: idx % 12,
    gzIdx: idx,
  };
}

// ─── 甲子跃迁定局法 ──────────────────────────

/**
 * 甲子跃迁定局法 (论藏甲·金函玉镜法)
 *
 * 规则:
 *   1. 冬至→夏至前: 阳遁, 序列 [1, 7, 4]
 *   2. 夏至→冬至前: 阴遁, 序列 [9, 3, 6]
 *   3. N = 最近二至日之后到排盘日(含)经历的甲子日数
 *   4. 局数 = 序列[N % 3]
 */
function getRiJiaJu(
  year: number,
  month: number,
  day: number,
): { juNumber: number; dun: 'yang' | 'yin'; yuan: string } {
  // 找最近的冬至和夏至
  // lunar-typescript的Solar可以查节气
  const sol = Solar.fromYmd(year, month, day);
  const lunar = sol.getLunar();

  // 获取当年和去年的冬至、夏至日期
  // 策略: 取当年冬至/夏至 + 去年冬至, 找最近的二至
  const jieQiTable = lunar.getJieQiTable();

  let solsticeDate: Date;
  let isAfterDongZhi: boolean;

  // 尝试从节气表找冬至和夏至
  // 节气表可能包含prev/current/next year的节气
  const currentDate = new Date(year, month - 1, day);

  // 方法: 逐个检查可能的二至日, 找chart date之前最近的一个
  const candidates: { date: Date; type: 'dong' | 'xia' }[] = [];

  // 检查去年冬至和当年夏至/冬至
  for (const y of [year - 1, year]) {
    try {
      const testSol = Solar.fromYmd(y, 6, 21);
      const testLunar = testSol.getLunar();
      const table = testLunar.getJieQiTable();
      if (table['冬至']) {
        const dz = table['冬至'];
        candidates.push({
          date: new Date(dz.getYear(), dz.getMonth() - 1, dz.getDay()),
          type: 'dong',
        });
      }
      if (table['夏至']) {
        const xz = table['夏至'];
        candidates.push({
          date: new Date(xz.getYear(), xz.getMonth() - 1, xz.getDay()),
          type: 'xia',
        });
      }
    } catch { /* skip */ }
  }

  // Also check from the chart date's own jieqi table
  if (jieQiTable['冬至']) {
    const dz = jieQiTable['冬至'];
    candidates.push({
      date: new Date(dz.getYear(), dz.getMonth() - 1, dz.getDay()),
      type: 'dong',
    });
  }
  if (jieQiTable['夏至']) {
    const xz = jieQiTable['夏至'];
    candidates.push({
      date: new Date(xz.getYear(), xz.getMonth() - 1, xz.getDay()),
      type: 'xia',
    });
  }

  // Filter: only those <= currentDate, then pick the latest
  const validCandidates = candidates.filter(c => c.date <= currentDate);
  validCandidates.sort((a, b) => b.date.getTime() - a.date.getTime());

  if (validCandidates.length === 0) {
    // Fallback: default to yang1
    return { juNumber: 1, dun: 'yang', yuan: '上' };
  }

  const nearest = validCandidates[0]!;
  solsticeDate = nearest.date;
  isAfterDongZhi = nearest.type === 'dong';

  // 计算N: 从二至日到排盘日的60天周期数
  // 公式: N = floor(totalDays / 60)
  //   特殊规则: 若排盘日恰好是甲子日(gzIdx=0), 且不在精确60天倍数上, N+1
  //   (甲子日本身标志新周期的开始)
  const totalDays = Math.round(
    (currentDate.getTime() - solsticeDate.getTime()) / 86400000,
  );

  const chartGzIdx = dayGzIdx(year, month, day);

  let n = Math.floor(totalDays / 60);
  if (totalDays > 0 && chartGzIdx === 0 && totalDays % 60 !== 0) {
    n += 1; // 甲子日边界: 甲子日开启新周期
  }

  const yangSeq = [1, 7, 4];
  const yinSeq = [9, 3, 6];
  const seq = isAfterDongZhi ? yangSeq : yinSeq;
  const juNumber = seq[n % 3]!;
  const dun: 'yang' | 'yin' = isAfterDongZhi ? 'yang' : 'yin';
  const yuanNames = ['上', '中', '下'];
  const yuan = yuanNames[n % 3]!;

  return { juNumber, dun, yuan };
}

// ─── 排盘主函数 ──────────────────────────────

/**
 * 日家奇门排盘
 * @param year 公历年
 * @param month 公历月 (1-12)
 * @param day 公历日 (1-31)
 */
export function riJiaGenerate(
  year: number,
  month: number,
  day: number,
): QimenChart {
  // ── 日干支 ──
  const dayGz = getDayGanZhi(year, month, day);
  const dayStem = dayGz.stem;
  const dayBranch = dayGz.branch;

  // ── STEP 1: 甲子跃迁定局 ──
  const { juNumber, dun, yuan } = getRiJiaJu(year, month, day);
  const isYang = dun === 'yang';

  // ── STEP 2: 布地盘 ──
  const earthPlate = layoutEarthPlate(juNumber, dun);

  // ── STEP 3: 旬首 + 值符/值使 ──
  const dayXunShou = findXunShou(dayStem, dayBranch);
  const { zhiFuStar, zhiShiDoor } = resolveZhiFuShi(dayStem, dayBranch, earthPlate);

  // ── STEP 4: 日干落宫 (甲干用六仪代替) ──
  const stemForFind = dayStem === '甲' ? dayXunShou.liuYi : dayStem;
  const stemPalace = findStemOnEarth(earthPlate, stemForFind);
  const stemPalaceEff = stemPalace === 5 ? 2 : stemPalace;

  // ── STEP 5: 天盘九星 (值符星飞到日干落宫) ──
  const skyStars = layoutSkyStars(zhiFuStar, stemForFind, earthPlate);

  // ── STEP 6: 人盘八门 ──
  // 日家门飞法: 值使门从老家按 palace-1含5宫(阳顺阴逆) 步进 posInXun 步
  // 然后其他门按 YANG_ORDER 从值使落宫遍历
  const dayFullIdx = (() => {
    const si = STEMS.indexOf(dayStem as any);
    const bi = BRANCHES.indexOf(dayBranch as any);
    for (let i = 0; i < 60; i++) {
      if (i % 10 === si && i % 12 === bi) return i;
    }
    return 0;
  })();
  const posInXun = dayFullIdx % 10; // 日干在旬内位置 (甲=0, 乙=1, ..., 癸=9)

  // Palace-1步进 (含5宫不跳过, 阳顺阴逆)
  const doorHomePalace = DOOR_HOME_PALACE[zhiShiDoor] || 1;
  let doorFinalPalace = doorHomePalace;
  for (let i = 0; i < posInXun; i++) {
    if (isYang) {
      doorFinalPalace = (doorFinalPalace % 9) + 1;
    } else {
      doorFinalPalace = ((doorFinalPalace - 2 + 9) % 9) + 1;
    }
  }
  const doorFinalEff = doorFinalPalace === 5 ? 2 : doorFinalPalace;

  // 从值使落宫开始, 按 YANG_ORDER 遍历排列八门
  const doorStartIdx = DOOR_ORDER.indexOf(zhiShiDoor);
  const doorYangStartIdx = YANG_ORDER.indexOf(doorFinalEff);
  const doors = new Map<number, string>();
  for (let i = 0; i < 8; i++) {
    const door = DOOR_ORDER[(doorStartIdx + i) % 8]!;
    const palace = YANG_ORDER[(doorYangStartIdx + i) % 8]!;
    doors.set(palace, door);
  }

  // ── STEP 7: 天盘八神 (值符落日干宫, 阳顺阴逆) ──
  const godSeq = isYang ? GOD_ORDER_YANG : GOD_ORDER_YIN;
  const godStartIdx = YANG_ORDER.indexOf(stemPalaceEff);
  const gods = new Map<number, string>();
  for (let i = 0; i < 8; i++) {
    gods.set(YANG_ORDER[(godStartIdx + i) % 8]!, godSeq[i]!);
  }

  // ── STEP 8: 地八神 (旬首仪定位法, 共享) ──
  const diGods = layoutDiGods(earthPlate, dayXunShou.liuYi, dun);

  // ── STEP 9: 空亡 (日柱) ──
  const kongWang = getKongWang(dayStem, dayBranch);

  // ── STEP 10: 暗干支 (齿轮旋转法) ──
  // gearSteps = 门从老家到最终落宫在YANG_ORDER上的位移
  const dHomeIdx = YANG_ORDER.indexOf(doorHomePalace === 5 ? 2 : doorHomePalace);
  const dCurrIdx = YANG_ORDER.indexOf(doorFinalEff);
  const gearSteps = ((dCurrIdx - dHomeIdx) % 8 + 8) % 8;

  // 配对暗支: 旬首甲X → branchOffset
  // xunShou is like '甲子' — extract stem[0] and branch[1]
  const xunStemIdx = STEMS.indexOf(dayXunShou.xunShou[0] as any);
  const xunBranchIdx = BRANCHES.indexOf(dayXunShou.xunShou[1] as any);
  const branchOffset = ((xunBranchIdx - xunStemIdx) % 12 + 12) % 12;

  const customHiddenStems = new Map<number, string[]>();

  // 中五宫不参与齿轮旋转, 暗干 = 地盘干
  const stem5 = earthPlate.get(5);
  if (stem5) {
    const si5 = STEMS.indexOf(stem5 as any);
    const branchIdx5 = (si5 + branchOffset) % 12;
    customHiddenStems.set(5, [stem5 + BRANCHES[branchIdx5]!]);
  }

  // 外八宫: 齿轮旋转
  for (const num of YANG_ORDER) {
    const palaceRingIdx = YANG_ORDER.indexOf(num);
    const sourceRingIdx = ((palaceRingIdx - gearSteps) % 8 + 8) % 8;
    const sourcePalace = YANG_ORDER[sourceRingIdx]!;
    const hiddenStem = earthPlate.get(sourcePalace) || '';
    const si = STEMS.indexOf(hiddenStem as any);
    const matchBranchIdx = (si + branchOffset) % 12;
    customHiddenStems.set(num, [hiddenStem + BRANCHES[matchBranchIdx]!]);
  }

  // ── STEP 11: 驿马/寄宫/天乙 ──
  const YI_MA_MAP: Record<string, string> = {
    '申': '寅', '子': '寅', '辰': '寅',
    '巳': '亥', '酉': '亥', '丑': '亥',
    '寅': '申', '午': '申', '戌': '申',
    '亥': '巳', '卯': '巳', '未': '巳',
  };
  const yiMaBranch = YI_MA_MAP[dayBranch];
  const BRANCH_PALACE: Record<string, number> = {
    '子': 1, '丑': 8, '寅': 8, '卯': 3, '辰': 4, '巳': 4,
    '午': 9, '未': 2, '申': 2, '酉': 7, '戌': 6, '亥': 6,
  };
  const postHorsePalace = yiMaBranch ? (BRANCH_PALACE[yiMaBranch] || 0) : 0;

  // 寄宫: 中5宫有地盘干时, 该干寄到天芮星所在外宫 (天禽寄天芮)
  let jiGongTargetPalace: number | undefined;
  let jiGanStemValue = '';
  if (stem5) {
    jiGanStemValue = stem5;
    for (const [p, star] of skyStars.entries()) {
      if (star === '天芮' && p !== 5) { jiGongTargetPalace = p; break; }
    }
    if (!jiGongTargetPalace) jiGongTargetPalace = 2;
  }

  // 天乙: 值符星落宫的地盘本位星
  const tianYiStar = PALACE_ORIGINAL_STAR[stemPalaceEff] || '天蓬';
  let tianYiPalace = stemPalaceEff;
  for (const [p, star] of skyStars.entries()) {
    if (star === tianYiStar) { tianYiPalace = p; break; }
  }

  // ── STEP 12: 组装盘面 ──
  const palaces = assemblePalaces(
    earthPlate, skyStars, doors, gods, kongWang,
    undefined, undefined, diGods, customHiddenStems,
  );

  // 后处理: 添加马星标记 + 寄宫干
  for (const p of palaces) {
    if (p.palaceNumber === postHorsePalace) {
      p.marks.push('马');
    }
    if (jiGongTargetPalace && p.palaceNumber === jiGongTargetPalace && p.palaceNumber !== 5) {
      p.jiGanStem = jiGanStemValue;
    }
  }

  // 寄宫颜色
  const STEM_COLORS: Record<string, string> = {
    '甲': '#228B22', '乙': '#228B22',
    '丙': '#DC143C', '丁': '#DC143C',
    '戊': '#DAA520', '己': '#DAA520',
    '庚': '#B8860B', '辛': '#B8860B',
    '壬': '#4169E1', '癸': '#4169E1',
  };

  // ── 四柱信息 ──
  const sol = Solar.fromYmd(year, month, day);
  const lunar = sol.getLunar();
  const ec = lunar.getEightChar();

  return {
    palaces,
    zhiFuStar,
    zhiShiDoor,
    zhiFuPalace: stemPalaceEff,
    zhiShiPalace: doorFinalEff, // 值使门最终落宫 (步进法)
    dun,
    juNumber,
    yuan,
    type: 'rijia',
    kongWang,
    tianYiStar,
    tianYiPalace,
    jiGongArrow: jiGongTargetPalace ? {
      palace: jiGongTargetPalace,
      color: STEM_COLORS[jiGanStemValue] || '#DAA520',
    } : undefined,
    fourPillars: {
      year: { gan: String(ec.getYearGan()), zhi: String(ec.getYearZhi()) },
      month: { gan: String(ec.getMonthGan()), zhi: String(ec.getMonthZhi()) },
      day: { gan: dayStem, zhi: dayBranch },
      hour: { gan: '', zhi: '' },
    },
  };
}
