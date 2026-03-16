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
 * 年家奇门引擎
 * 复杂度：★★ | 最简单 | 统一阴遁 | 180年(三元九运)周期
 *
 * 算法参考: engine_algorithms.md §④
 *
 * 2026丙午年验证: 阴遁7局，天冲值符，伤门值使
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

/**
 * 确定年家三元与局数
 * 180年大周期: 上元(坎1) / 中元(巽4) / 下元(兑7)
 * 起点: 1864年(甲子年) = 上元起始
 */
function getNianJiaJu(year: number): { yuan: string; juNumber: number } {
  // 1864=上元甲子年起点 (近代周期)
  const offset = ((year - 1864) % 180 + 180) % 180; // 确保正数

  if (offset < 60) return { yuan: '上', juNumber: 1 };
  if (offset < 120) return { yuan: '中', juNumber: 4 };
  return { yuan: '下', juNumber: 7 };
}

/**
 * 获取年干支 (基于立春换年)
 * 简化: 近似公式, 精确版应查 lunar-javascript
 */
function getYearGanZhi(year: number): { stem: string; branch: string; stemIdx: number; branchIdx: number } {
  // 公元年 → 干支索引
  // 公元4年=甲子年(idx=0), so: idx = (year - 4) % 60
  const idx = ((year - 4) % 60 + 60) % 60;
  const stemIdx = idx % 10;
  const branchIdx = idx % 12;
  return {
    stem: STEMS[stemIdx]!,
    branch: BRANCHES[branchIdx]!,
    stemIdx,
    branchIdx,
  };
}

/**
 * 年家奇门排盘 (转盘式)
 *
 * 与时家不同的核心规则:
 * 1. 地盘: 按宫号顺序逆排 (已修复 layoutEarthPlate)
 * 2. 天盘九星: 值符星飞到年干落宫, 沿 YANG_ORDER 遍历 (与时家一致)
 * 3. 人盘八门: 值使门从旬首宫出发, 按地支距离走宫(包含中5), 然后沿 YANG_ORDER 遍历
 * 4. 天盘八神: 值符神落值符星宫, 用 YIN 神序 + YANG_ORDER 遍历
 * 5. 地八神: 旬首仪定位法 (已正确)
 *
 * @param year 公历年份 (e.g. 2026)
 */
export function nianJiaGenerate(year: number): QimenChart {
  const YANG_ORDER = [1, 8, 3, 4, 9, 2, 7, 6]; // 洛书顺时针遍历 (跳中五)

  // STEP 1: 定三元与局数
  const { yuan, juNumber } = getNianJiaJu(year);

  // STEP 2: 布地盘 (统一阴遁)
  const earthPlate = layoutEarthPlate(juNumber, 'yin');

  // STEP 3: 定值符值使 (年干支→旬首→六仪→地盘查宫→本位星门)
  const yearGz = getYearGanZhi(year);
  const yearXunShou = findXunShou(yearGz.stem, yearGz.branch);
  const { zhiFuStar, zhiShiDoor, liuYiPalace } = resolveZhiFuShi(yearGz.stem, yearGz.branch, earthPlate);

  // STEP 4: 排天盘九星 (值符星飞到年干在地盘的宫位, YANG_ORDER)
  // ⚠️ 甲不在地盘上,需要用旬首六仪代替查找
  const yearStemForFind = yearGz.stem === '甲' ? yearXunShou.liuYi : yearGz.stem;
  const skyStars = layoutSkyStars(zhiFuStar, yearStemForFind, earthPlate);

  // STEP 5: 排人盘八门 (转盘式 — 值使门从旬首宫位按地支距离走)
  //   算法: 从旬首地支到年支的距离 = steps
  //         从旬首六仪原始宫 (含中5) 向下走 steps 步 (每步-1, 含9个宫位含中5)
  //         值使门落该宫, 其余门沿 YANG_ORDER 遍历
  const xunShouBranch = yearXunShou.xunShou.charAt(1); // 旬首第二个字=地支
  const xunBranchIdx = BRANCHES.indexOf(xunShouBranch as any);
  const yearBranchIdx = BRANCHES.indexOf(yearGz.branch as any);
  const branchSteps = ((yearBranchIdx - xunBranchIdx) % 12 + 12) % 12;

  // 旬首六仪原始落宫 (含中5, 不做5→2映射)
  let zhiShiStartPalace = liuYiPalace; // findStemOnEarth 返回含5
  // 向下走 branchSteps 步 (每步palace-1, 1→9循环, 含中5)
  let zhiShiLandPalace = zhiShiStartPalace;
  for (let s = 0; s < branchSteps; s++) {
    zhiShiLandPalace--;
    if (zhiShiLandPalace < 1) zhiShiLandPalace = 9;
  }
  // 如果落在中5则寄坤2
  const zhiShiFinalPalace = zhiShiLandPalace === 5 ? 2 : zhiShiLandPalace;

  // 八门遍历序
  const DOOR_ORDER = ['休门', '生门', '伤门', '杜门', '景门', '死门', '惊门', '开门'];
  const zhiShiIdx = DOOR_ORDER.indexOf(zhiShiDoor);
  const doors = new Map<number, string>();
  const yangStartIdx = YANG_ORDER.indexOf(zhiShiFinalPalace);
  for (let i = 0; i < 8; i++) {
    const doorIdx = (zhiShiIdx + i) % 8;
    const door = DOOR_ORDER[doorIdx]!;
    const palaceIdx = (yangStartIdx + i) % 8;
    const palace = YANG_ORDER[palaceIdx]!;
    doors.set(palace, door);
  }

  // STEP 6: 排天盘八神 (转盘式 — 值符神落值符星宫, YANG_ORDER + 阴遁逆序神序)
  // ⚠️ 甲同样不在地盘,用六仪代替查找
  const zhiFuPalace = findStemOnEarth(earthPlate, yearStemForFind);
  const zhiFuEffective = zhiFuPalace === 5 ? 2 : zhiFuPalace;
  const GOD_ORDER_YIN = ['值符', '九天', '九地', '玄武', '白虎', '六合', '太阴', '螣蛇'];
  const gods = new Map<number, string>();
  const godStartIdx = YANG_ORDER.indexOf(zhiFuEffective);
  for (let i = 0; i < 8; i++) {
    const palaceIdx = (godStartIdx + i) % 8;
    const palace = YANG_ORDER[palaceIdx]!;
    gods.set(palace, GOD_ORDER_YIN[i]!);
  }

  // 空亡 (年柱)
  const kongWang = getKongWang(yearGz.stem, yearGz.branch);

  // 地八神 (旬首仪定位法 — 已验证正确)
  const diGods = layoutDiGods(earthPlate, yearXunShou.liuYi, 'yin');

  // ── 年家暗干支: 齿轮旋转法 ──
  // 算法: N = 值使门从老家到当前宫位沿八宫环的步数
  //       将地盘奇仪沿八宫环前进 N 步得到各宫暗干
  //       暗支 = 暗干在当前旬中配对的地支
  const DOOR_HOME_PALACE: Record<string, number> = {
    '休门': 1, '生门': 8, '伤门': 3, '杜门': 4,
    '景门': 9, '死门': 2, '惊门': 7, '开门': 6,
  };
  const doorHomePalace = DOOR_HOME_PALACE[zhiShiDoor] || 1;
  // 当值使落中5时,实际寄坤2,使用实际落宫
  const doorCurrentPalace = zhiShiFinalPalace;

  // 沿八宫环计算步数 N
  const doorHomeIdx = YANG_ORDER.indexOf(doorHomePalace);
  const doorCurrentIdx = YANG_ORDER.indexOf(doorCurrentPalace);
  const gearSteps = ((doorCurrentIdx - doorHomeIdx) % 8 + 8) % 8;

  // 旬首→暗支映射 (stem → branch in current xun)
  const xunShouStemIdx = STEMS.indexOf(yearXunShou.xunShou.charAt(0) as any); // 甲=0
  const xunShouBranchIdx2 = BRANCHES.indexOf(yearXunShou.xunShou.charAt(1) as any);
  const branchOffset = ((xunShouBranchIdx2 - xunShouStemIdx) % 12 + 12) % 12;

  const customHiddenStems = new Map<number, string[]>();
  for (let num = 1; num <= 9; num++) {
    if (num === 5) {
      // 中5宫暗干 = 中5地盘干(庚) + 旬中配支, 不旋转(中5不参与八宫环)
      const stem5 = earthPlate.get(5);
      if (stem5) {
        const stemIdx5 = STEMS.indexOf(stem5 as any);
        const branchIdx5 = (stemIdx5 + branchOffset) % 12;
        customHiddenStems.set(5, [stem5 + BRANCHES[branchIdx5]!]);
      }
      continue;
    }
    // 该宫在八宫环中的位置
    const palaceRingIdx = YANG_ORDER.indexOf(num);
    if (palaceRingIdx === -1) continue;
    // 回退 N 步找源宫 (反向齿轮)
    const sourceRingIdx = ((palaceRingIdx - gearSteps) % 8 + 8) % 8;
    const sourcePalace = YANG_ORDER[sourceRingIdx]!;
    const hiddenStem = earthPlate.get(sourcePalace) || '';
    if (!hiddenStem) continue;
    // 暗支: 暗干在当前旬中的配对
    const stemIdx = STEMS.indexOf(hiddenStem as any);
    const matchBranchIdx = (stemIdx + branchOffset) % 12;
    customHiddenStems.set(num, [hiddenStem + BRANCHES[matchBranchIdx]!]);
  }

  // ── 驿马 (年支三合局驿马) ──
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
  const yiMaBranch = YI_MA_MAP[yearGz.branch] || '';
  const postHorsePalace = yiMaBranch ? (BRANCH_TO_PALACE[yiMaBranch] || 0) : 0;

  // ── 寄宫 (中5宫地盘干跟随天禽/芮寄到外宫) ──
  const jiGanStemValue = earthPlate.get(5) || '';
  // 天禽星的原位在中5: 找天禽(随天芮)在天盘哪个外宫
  const PALACE_ORIGINAL_STAR: Record<number, string> = {
    1: '天蓬', 2: '天芮', 3: '天冲', 4: '天辅', 5: '天禽',
    6: '天心', 7: '天柱', 8: '天任', 9: '天英',
  };
  // 天禽跟随天芮: 找天芮在天盘的落宫
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

  // 组装
  const palaces = assemblePalaces(earthPlate, skyStars, doors, gods, kongWang, undefined, undefined, diGods, customHiddenStems);

  // 后处理: 添加马星标记 + 寄宫干
  for (const p of palaces) {
    if (p.palaceNumber === postHorsePalace) {
      p.marks.push('马');
    }
    if (jiGongTargetPalace && p.palaceNumber === jiGongTargetPalace && p.palaceNumber !== 5) {
      p.jiGanStem = jiGanStemValue;
    }
  }

  // 寄宫颜色 (五行→颜色映射)
  const STEM_COLORS: Record<string, string> = {
    '甲': '#228B22', '乙': '#228B22',  // 木=绿
    '丙': '#DC143C', '丁': '#DC143C',  // 火=红
    '戊': '#DAA520', '己': '#DAA520',  // 土=黄
    '庚': '#B8860B', '辛': '#B8860B',  // 金=金
    '壬': '#4169E1', '癸': '#4169E1',  // 水=蓝
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
    type: 'nianjia',
    kongWang,
    tianYiStar,
    tianYiPalace,
    jiGongArrow: jiGongTargetPalace ? {
      palace: jiGongTargetPalace,
      color: STEM_COLORS[jiGanStemValue] || '#DAA520',
    } : undefined,
    fourPillars: {
      year: { gan: yearGz.stem, zhi: yearGz.branch },
      month: { gan: '', zhi: '' },
      day: { gan: '', zhi: '' },
      hour: { gan: '', zhi: '' },
    },
  };
}
