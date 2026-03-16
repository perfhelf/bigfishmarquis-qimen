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
 * 月家奇门引擎
 * 复杂度：★★★ | 统一阴遁 | 180年三元 × 5年Block周期
 *
 * 算法参考: engine_algorithms.md §③ + 奇门算法校准.md
 *
 * 核心:
 *   定局 = (180年base + 5年Block × 3) % 9
 *   地盘 = 阴遁标准布
 *   值符/值使 = 月干支旬首六仪
 *   天星 = 值符星飞月干落宫 + YANG_ORDER
 *   八门 = 值使门从固定老家步进 N 步 (palace-1含中5) + YANG_ORDER
 *   八神 = 值符落宫起 + 阴遁逆排
 *   暗干支 = 齿轮旋转法 (同年家)
 *   地八神 = 旬首仪定位法 (共享)
 */

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
const GOD_ORDER_YIN = ['值符', '九天', '九地', '玄武', '白虎', '六合', '太阴', '螣蛇'];
const DOOR_HOME_PALACE: Record<string, number> = {
  '休门': 1, '生门': 8, '伤门': 3, '杜门': 4,
  '景门': 9, '死门': 2, '惊门': 7, '开门': 6,
};
const PALACE_ORIGINAL_STAR: Record<number, string> = {
  1: '天蓬', 2: '天芮', 3: '天冲', 4: '天辅', 5: '天禽',
  6: '天心', 7: '天柱', 8: '天任', 9: '天英',
};

// ─── 定局 ────────────────────────────────────

/**
 * 月家定局: 纯60年甲子周期 × 5年Block
 *
 * 算法: 干支序 = (year - 4) % 60
 *       block  = floor(干支序 / 5)
 *       局     = (7 + block × 3) % 9
 *
 * 12个Block的局数序列: 7,1,4,7,1,4,7,1,4,7,1,4
 * 每15年一轮完整 7→1→4 循环, 60年恰好4轮
 *
 * 校准: 论藏甲 6个盘验证 (1934 + 2058-2069) 全部匹配
 * 不需要180年三元周期, base 恒为 7 (甲子Block从兑7宫起)
 */
function getYueJiaJu(year: number): { yuan: string; juNumber: number } {
  const gzIdx = ((year - 4) % 60 + 60) % 60;
  const block = Math.floor(gzIdx / 5);
  let ju = (7 + block * 3) % 9;
  if (ju === 0) ju = 9;

  // 元名: 局7=下, 局1=上, 局4=中
  const yuanMap: Record<number, string> = { 7: '下', 1: '上', 4: '中' };
  return { yuan: yuanMap[ju] || '下', juNumber: ju };
}

// ─── 月干支计算 ────────────────────────────────

/**
 * 获取月干支 (基于节气月)
 */
function getMonthGanZhi(
  year: number,
  month: number,
  yearStem: string,
): { stem: string; branch: string } {
  // 月支固定: 正月=寅, 二月=卯, ..., 十二月=丑
  const monthBranchIdx = (month + 1) % 12; // 正月(1) → 寅(2)
  const branch = BRANCHES[monthBranchIdx]!;

  // 月干: 年上起月法 (五虎遁)
  const yearStemIdx = STEMS.indexOf(yearStem as any);
  const startStemIdx = [2, 4, 6, 8, 0][yearStemIdx % 5]!; // 丙/戊/庚/壬/甲
  const stemIdx = (startStemIdx + (month - 1)) % 10;
  const stem = STEMS[stemIdx]!;

  return { stem, branch };
}

// ─── 主引擎 ────────────────────────────────────

/**
 * 月家奇门排盘 (转盘式)
 *
 * @param year 公历年份 (干支年, 以立春换算后)
 * @param month 月份(1-12, 节气月)
 */
export function yueJiaGenerate(
  year: number,
  month: number,
): QimenChart {
  // ── 年干支 ──
  const yearGzIdx = ((year - 4) % 60 + 60) % 60;
  const yearStem = STEMS[yearGzIdx % 10]!;
  const yearBranch = BRANCHES[yearGzIdx % 12]!;

  // STEP 1: 定局 (180年三元 × 5年Block)
  const { yuan, juNumber } = getYueJiaJu(year);

  // STEP 2: 布地盘 (统一阴遁)
  const earthPlate = layoutEarthPlate(juNumber, 'yin');

  // STEP 3: 定值符值使 (月干支→旬首→六仪→地盘查宫→本位星门)
  const monthGz = getMonthGanZhi(year, month, yearStem);
  const monthXunShou = findXunShou(monthGz.stem, monthGz.branch);
  const { zhiFuStar, zhiShiDoor, liuYiPalace } = resolveZhiFuShi(monthGz.stem, monthGz.branch, earthPlate);

  // STEP 4: 排天盘九星 (值符星飞到月干在地盘的宫位)
  // ⚠️ 甲不在地盘上, 需用旬首六仪代替
  const monthStemForFind = monthGz.stem === '甲' ? monthXunShou.liuYi : monthGz.stem;
  const skyStars = layoutSkyStars(zhiFuStar, monthStemForFind, earthPlate);

  // STEP 5: 排人盘八门 (步进法 — 值使门从固定老家出发, palace-1含中5)
  //   N = (月支序 - 旬首地支序 + 12) % 12
  //   从门固定老家开始, 向下走 N 步 (每步palace-1, 0→9循环, 含中5)
  //   落宫5→寄坤2, 其余门沿 YANG_ORDER 遍历
  const xunShouBranch = monthXunShou.xunShou.charAt(1);
  const xunBranchIdx = BRANCHES.indexOf(xunShouBranch as any);
  const monthBranchIdx = BRANCHES.indexOf(monthGz.branch as any);
  const branchSteps = ((monthBranchIdx - xunBranchIdx) % 12 + 12) % 12;

  const doorHome = DOOR_HOME_PALACE[zhiShiDoor] || 1;
  let zhiShiLandPalace = doorHome;
  for (let s = 0; s < branchSteps; s++) {
    zhiShiLandPalace--;
    if (zhiShiLandPalace < 1) zhiShiLandPalace = 9;
  }
  const zhiShiFinalPalace = zhiShiLandPalace === 5 ? 2 : zhiShiLandPalace;

  // 八门遍历: 值使门落宫后, 沿 YANG_ORDER 顺序排入
  const zhiShiIdx = DOOR_ORDER.indexOf(zhiShiDoor);
  const doors = new Map<number, string>();
  const yangDoorStart = YANG_ORDER.indexOf(zhiShiFinalPalace);
  for (let i = 0; i < 8; i++) {
    const doorIdx = (zhiShiIdx + i) % 8;
    const door = DOOR_ORDER[doorIdx]!;
    const palaceIdx = (yangDoorStart + i) % 8;
    const palace = YANG_ORDER[palaceIdx]!;
    doors.set(palace, door);
  }

  // STEP 6: 排天盘八神 (值符神落值符星宫, YANG_ORDER + 阴遁逆序)
  // ⚠️ 甲同样不在地盘, 用六仪代替
  const zhiFuPalace = findStemOnEarth(earthPlate, monthStemForFind);
  const zhiFuEffective = zhiFuPalace === 5 ? 2 : zhiFuPalace;
  const gods = new Map<number, string>();
  const godStartIdx = YANG_ORDER.indexOf(zhiFuEffective);
  for (let i = 0; i < 8; i++) {
    const palaceIdx = (godStartIdx + i) % 8;
    const palace = YANG_ORDER[palaceIdx]!;
    gods.set(palace, GOD_ORDER_YIN[i]!);
  }

  // 空亡 (月柱)
  const kongWang = getKongWang(monthGz.stem, monthGz.branch);

  // 地八神 (旬首仪定位法)
  const diGods = layoutDiGods(earthPlate, monthXunShou.liuYi, 'yin');

  // ── 暗干支: 齿轮旋转法 (同年家) ──
  // N = 值使门从老家到当前宫位沿八宫环的步数
  // 地盘奇仪沿八宫环前进 N 步 = 各宫暗干
  // 暗支 = 暗干在当前月旬中配对的地支
  const doorCurrentPalace = zhiShiFinalPalace;
  const doorHomeIdx = YANG_ORDER.indexOf(doorHome);
  const doorCurrentIdx = YANG_ORDER.indexOf(doorCurrentPalace);
  const gearSteps = ((doorCurrentIdx - doorHomeIdx) % 8 + 8) % 8;

  // 旬首 → 暗支映射
  const xunShouStemIdx = STEMS.indexOf(monthXunShou.xunShou.charAt(0) as any);
  const xunShouBranchIdx2 = BRANCHES.indexOf(monthXunShou.xunShou.charAt(1) as any);
  const branchOffset = ((xunShouBranchIdx2 - xunShouStemIdx) % 12 + 12) % 12;

  const customHiddenStems = new Map<number, string[]>();
  for (let num = 1; num <= 9; num++) {
    if (num === 5) {
      // 中5宫暗干 = 中5地盘干, 不旋转
      const stem5 = earthPlate.get(5);
      if (stem5) {
        const stemIdx5 = STEMS.indexOf(stem5 as any);
        const branchIdx5 = (stemIdx5 + branchOffset) % 12;
        customHiddenStems.set(5, [stem5 + BRANCHES[branchIdx5]!]);
      }
      continue;
    }
    const palaceRingIdx = YANG_ORDER.indexOf(num);
    if (palaceRingIdx === -1) continue;
    // 回退 gearSteps 步找源宫 (反向齿轮)
    const sourceRingIdx = ((palaceRingIdx - gearSteps) % 8 + 8) % 8;
    const sourcePalace = YANG_ORDER[sourceRingIdx]!;
    const hiddenStem = earthPlate.get(sourcePalace) || '';
    if (!hiddenStem) continue;
    const stemIdx = STEMS.indexOf(hiddenStem as any);
    const matchBranchIdx = (stemIdx + branchOffset) % 12;
    customHiddenStems.set(num, [hiddenStem + BRANCHES[matchBranchIdx]!]);
  }

  // ── 驿马 (月支三合局驿马) ──
  const YI_MA_MAP: Record<string, string> = {
    '申': '寅', '子': '寅', '辰': '寅',
    '巳': '亥', '酉': '亥', '丑': '亥',
    '寅': '申', '午': '申', '戌': '申',
    '亥': '巳', '卯': '巳', '未': '巳',
  };
  const BRANCH_TO_PALACE: Record<string, number> = {
    '子': 1, '丑': 8, '寅': 8, '卯': 3, '辰': 4, '巳': 4,
    '午': 9, '未': 2, '申': 2, '酉': 7, '戌': 6, '亥': 6,
  };
  const yiMaBranch = YI_MA_MAP[monthGz.branch] || '';
  const postHorsePalace = yiMaBranch ? (BRANCH_TO_PALACE[yiMaBranch] || 0) : 0;

  // ── 寄宫 (中5宫地盘干跟随天禽/芮寄到外宫) ──
  const jiGanStemValue = earthPlate.get(5) || '';
  let jiGongTargetPalace = 0;
  for (const [palace, star] of skyStars.entries()) {
    if (star === '天芮' && palace !== 5) {
      jiGongTargetPalace = palace;
      break;
    }
  }

  // ── 天乙 (值符落宫的地盘本位星) ──
  const tianYiStar = PALACE_ORIGINAL_STAR[zhiFuEffective] || '';
  let tianYiPalace = 0;
  for (const [palace, star] of skyStars.entries()) {
    if (star === tianYiStar && palace !== 5) {
      tianYiPalace = palace;
      break;
    }
  }

  // ── 组装 ──
  const palaces = assemblePalaces(earthPlate, skyStars, doors, gods, kongWang, undefined, undefined, diGods, customHiddenStems);

  // 后处理: 驿马标记 + 寄宫干
  for (const p of palaces) {
    if (p.palaceNumber === postHorsePalace) {
      p.marks.push('马');
    }
    if (jiGongTargetPalace && p.palaceNumber === jiGongTargetPalace && p.palaceNumber !== 5) {
      p.jiGanStem = jiGanStemValue;
    }
  }

  const STEM_COLORS: Record<string, string> = {
    '甲': '#228B22', '乙': '#228B22',
    '丙': '#DC143C', '丁': '#DC143C',
    '戊': '#DAA520', '己': '#DAA520',
    '庚': '#B8860B', '辛': '#B8860B',
    '壬': '#4169E1', '癸': '#4169E1',
  };

  return {
    palaces,
    zhiFuStar,
    zhiShiDoor,
    zhiFuPalace: zhiFuEffective,
    zhiShiPalace: zhiShiFinalPalace,
    dun: 'yin',
    juNumber,
    yuan,
    type: 'yuejia',
    kongWang,
    tianYiStar,
    tianYiPalace,
    jiGongArrow: jiGongTargetPalace ? {
      palace: jiGongTargetPalace,
      color: STEM_COLORS[jiGanStemValue] || '#DAA520',
    } : undefined,
    fourPillars: {
      year: { gan: yearStem, zhi: yearBranch },
      month: { gan: monthGz.stem, zhi: monthGz.branch },
      day: { gan: '', zhi: '' },
      hour: { gan: '', zhi: '' },
    },
  };
}
