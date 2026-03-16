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
 * 时家奇门自建引擎 — 自研排盘算法
 *
 * 支持自定义局数 — 用于茅山法和置闰法（局数可能与拆补法不同）
 * 算法对齐标准奇门规则:
 *   - 地盘: arrangeDiPan (阳遁+1/阴遁-1)
 *   - 天盘: arrangeTianPan (PALACE_CLOCKWISE + STAR_SEQUENCE)
 *   - 八门: getZhiShiInfo + arrangeGates (步数法 + PALACE_CLOCKWISE)
 *   - 八神: arrangeDeities (阳顺阴逆)
 */

import type { QimenChart, QimenPalace, DunType, PalaceMark } from '../types';
import {
  STEMS, BRANCHES,
  findXunShou,
  getKongWang,
} from './shared';

// ═══════════════════════════════════════════════════
//  核心常量
// ═══════════════════════════════════════════════════

/** 三奇六仪固定序 */
const SANQI_LIUYI = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];

/** 六甲旬首→遁干 */
const LIUJIA_XUN: Record<string, string> = {
  '甲子': '戊', '甲戌': '己', '甲申': '庚',
  '甲午': '辛', '甲辰': '壬', '甲寅': '癸',
};

/** 洛书顺时针: 坤2→兑7→乾6→坎1→艮8→震3→巽4→离9 */
const PALACE_CLOCKWISE = [2, 7, 6, 1, 8, 3, 4, 9];
/** 洛书逆时针 */
const PALACE_COUNTER_CLOCKWISE = [2, 9, 4, 3, 8, 1, 6, 7];

/** 九星转盘序 (从天心开始) */
const STAR_SEQUENCE = ['天心', '天蓬', '天任', '天冲', '天辅', '天英', '天芮', '天柱'];

/** 八门转盘序 */
const GATE_SEQUENCE = ['休门', '生门', '伤门', '杜门', '景门', '死门', '惊门', '开门'];

/** 九星本位宫 */
const STAR_ORIGINAL_POSITIONS: Record<string, number> = {
  '天蓬': 1, '天芮': 2, '天冲': 3, '天辅': 4, '天禽': 5,
  '天心': 6, '天柱': 7, '天任': 8, '天英': 9,
};

/** 八门本位宫 */
const GATE_ORIGINAL_POSITIONS: Record<string, number> = {
  '休门': 1, '生门': 8, '伤门': 3, '杜门': 4,
  '景门': 9, '死门': 2, '惊门': 7, '开门': 6,
};

/** 八神序 */
const DEITIES = ['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];

/** 天干五行颜色 */
const STEM_COLORS: Record<string, string> = {
  '甲': '#228B22', '乙': '#228B22',
  '丙': '#DC143C', '丁': '#DC143C',
  '戊': '#DAA520', '己': '#DAA520',
  '庚': '#B8860B', '辛': '#B8860B',
  '壬': '#4169E1', '癸': '#4169E1',
};

/** 驿马映射表 */
const YI_MA_MAP: Record<string, string> = {
  '申': '寅', '子': '寅', '辰': '寅',
  '巳': '亥', '酉': '亥', '丑': '亥',
  '寅': '申', '午': '申', '戌': '申',
  '亥': '巳', '卯': '巳', '未': '巳',
};

/** 宫位→地支 (for post horse & 空亡) */
const PALACE_BRANCHES: Record<number, string[]> = {
  1: ['子'], 2: ['未','申'], 3: ['卯'], 4: ['辰','巳'],
  5: [], 6: ['戌','亥'], 7: ['酉'], 8: ['丑','寅'], 9: ['午'],
};

/** 地支→宫位 */
const BRANCH_TO_PALACE: Record<string, number> = {
  '子': 1, '丑': 8, '寅': 8, '卯': 3, '辰': 4, '巳': 4,
  '午': 9, '未': 2, '申': 2, '酉': 7, '戌': 6, '亥': 6,
};

/** 宫名/五行/星五行/门五行 */
const PALACE_NAMES: Record<number, string> = {
  1: '坎', 2: '坤', 3: '震', 4: '巽', 5: '中', 6: '乾', 7: '兑', 8: '艮', 9: '离',
};
const PALACE_ELEMENTS: Record<number, string> = {
  1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火',
};
const STAR_ELEMENT: Record<string, string> = {
  '天蓬': '水', '天芮': '土', '天冲': '木', '天辅': '木', '天禽': '土',
  '天心': '金', '天柱': '金', '天任': '土', '天英': '火',
};
const DOOR_ELEMENT: Record<string, string> = {
  '休门': '水', '死门': '土', '伤门': '木', '杜门': '木',
  '开门': '金', '惊门': '金', '生门': '土', '景门': '火',
};
const GOD_SHORT_NAME: Record<string, string> = {
  '值符': '符', '腾蛇': '蛇', '太阴': '阴', '六合': '合',
  '白虎': '虎', '玄武': '玄', '九地': '地', '九天': '天',
  '螣蛇': '蛇',
};

/** 天干→五行 */
const STEM_WX: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};
/** 五行→墓库宫位 */
const GRAVE_MAP: Record<string, number[]> = {
  '火': [6], '水': [4], '金': [8], '木': [2], '土': [4],
};
/** 五行相克: a克b */
function wxRestricts(a: string, b: string): boolean {
  const r: Record<string, string> = { '金':'木', '木':'土', '土':'水', '水':'火', '火':'金' };
  return r[a] === b;
}

// ═══════════════════════════════════════════════════
//  核心排盘算法
// ═══════════════════════════════════════════════════

/** 地盘排布 */
function arrangeDiPan(juShu: number, isYangdun: boolean): Map<number, string> {
  const result = new Map<number, string>();
  if (isYangdun) {
    SANQI_LIUYI.forEach((stem, i) => {
      const pos = ((juShu - 1 + i) % 9) + 1;
      result.set(pos, stem);
    });
  } else {
    SANQI_LIUYI.forEach((stem, i) => {
      let pos = juShu - i;
      while (pos < 1) pos += 9;
      result.set(pos, stem);
    });
  }
  return result;
}

/** 60甲子表 */
const JIAZI: string[] = [];
for (let i = 0; i < 60; i++) {
  JIAZI.push(STEMS[i % 10]! + BRANCHES[i % 12]!);
}

/** 旬首 */
function getXunShou3m(ganzhi: string): string {
  const idx = JIAZI.indexOf(ganzhi);
  if (idx < 0) return '甲子';
  const xunIdx = Math.floor(idx / 10) * 10;
  return JIAZI[xunIdx]!;
}

/** 地支序号 */
function getBranchIndex(branch: string): number {
  return BRANCHES.indexOf(branch as any);
}

/** 值符信息 */
function getZhiFuInfo(xunShou: string, diPan: Map<number, string>) {
  const zhiFuStem = LIUJIA_XUN[xunShou] || '戊';
  let position = 5;
  for (const [pos, stem] of diPan.entries()) {
    if (stem === zhiFuStem) { position = pos; break; }
  }
  const star = Object.keys(STAR_ORIGINAL_POSITIONS).find(s => STAR_ORIGINAL_POSITIONS[s] === position) || '天禽';
  return { star, position, heavenlyStem: zhiFuStem };
}

/** 值符落宫 */
function getZhiFuLuoGong(shiGanZhi: string, xunShou: string, diPan: Map<number, string>) {
  const timeStemRaw = shiGanZhi[0]!;
  const actualTimeStem = timeStemRaw === '甲' ? (LIUJIA_XUN[xunShou] || '戊') : timeStemRaw;
  let rawPosition = 5;
  for (const [pos, stem] of diPan.entries()) {
    if (stem === actualTimeStem) { rawPosition = pos; break; }
  }
  const position = rawPosition === 5 ? 2 : rawPosition;
  return { position, rawPosition, timeStem: actualTimeStem };
}

/** 值使门信息 — 核心门飞算法 (天禽=天芮, 从原始值符宫步进) */
function getZhiShiInfo(shiGanZhi: string, zhiFuGong: number, isYangdun: boolean) {
  // 值使门 = 值符本位宫对应的门 (中5宫→寄2=死门)
  const actualZhiFuGong = zhiFuGong === 5 ? 2 : zhiFuGong;
  const zhiShiMen = Object.keys(GATE_ORIGINAL_POSITIONS).find(
    g => GATE_ORIGINAL_POSITIONS[g] === actualZhiFuGong
  ) || '休门';

  const xunShou = getXunShou3m(shiGanZhi);
  const xunBranch = xunShou[1]!;
  const shiBranch = shiGanZhi[1]!;
  const steps = ((getBranchIndex(shiBranch) - getBranchIndex(xunBranch)) + 12) % 12;

  // 关键: 从原始值符宫步进 (包括中5宫), 而非从映射后的寄宫
  // 天禽=天芮, 始终一体。当值符仪在中5宫时, 从5出发步进才能得到正确落宫
  let position = zhiFuGong;
  for (let i = 0; i < steps; i++) {
    if (isYangdun) {
      position += 1;
      if (position > 9) position = 1;
    } else {
      position -= 1;
      if (position < 1) position = 9;
    }
  }
  // 步进后若落在中5宫, 映射到寄宫(坤2=死门本位)
  if (position === 5) position = 2;
  return { gate: zhiShiMen, position };
}

/** 天盘九星 */
function arrangeTianPan(zhiFuStar: string, zhiFuLuoGong: number, diPan: Map<number, string>) {
  const tianPan = new Map<number, { star: string; heavenlyStem: string }>();
  const effectiveStar = zhiFuStar === '天禽' ? '天芮' : zhiFuStar;
  const zhiFuIdx = STAR_SEQUENCE.indexOf(effectiveStar);
  const startIdx = PALACE_CLOCKWISE.indexOf(zhiFuLuoGong === 5 ? 2 : zhiFuLuoGong);

  for (let i = 0; i < 8; i++) {
    const palace = PALACE_CLOCKWISE[(startIdx + i) % 8]!;
    const star = STAR_SEQUENCE[(zhiFuIdx + i) % 8]!;
    const originPalace = STAR_ORIGINAL_POSITIONS[star]!;
    const stem = diPan.get(originPalace) || '';
    tianPan.set(palace, { star, heavenlyStem: stem });
  }
  tianPan.set(5, { star: '天禽', heavenlyStem: diPan.get(5) || '' });
  return tianPan;
}

/** 八门 */
function arrangeGates(zhiShiGong: number, zhiShiGate: string) {
  const gates = new Map<number, string>();
  const startIdx = PALACE_CLOCKWISE.indexOf(zhiShiGong === 5 ? 2 : zhiShiGong);
  const gateIdx = GATE_SEQUENCE.indexOf(zhiShiGate);
  for (let i = 0; i < 8; i++) {
    gates.set(PALACE_CLOCKWISE[(startIdx + i) % 8]!, GATE_SEQUENCE[(gateIdx + i) % 8]!);
  }
  return gates;
}

/** 八神 */
function arrangeDeities(zhiFuLuoGong: number, isYangdun: boolean) {
  const deities = new Map<number, string>();
  const seq = isYangdun ? PALACE_CLOCKWISE : PALACE_COUNTER_CLOCKWISE;
  const startIdx = seq.indexOf(zhiFuLuoGong === 5 ? 2 : zhiFuLuoGong);
  DEITIES.forEach((shen, i) => {
    deities.set(seq[(startIdx + i) % 8]!, shen);
  });
  return deities;
}

// ═══════════════════════════════════════════════════
//  主函数
// ═══════════════════════════════════════════════════

export function shiJiaGenerate(
  hourStem: string,
  hourBranch: string,
  juNumber: number,
  dun: DunType,
  fourPillars: {
    year: { gan: string; zhi: string };
    month: { gan: string; zhi: string };
    day: { gan: string; zhi: string };
    hour: { gan: string; zhi: string };
  },
  solarTerm?: string,
): QimenChart {
  const isYangdun = dun === 'yang';
  const shiGanZhi = hourStem + hourBranch;

  // ─── STEP 1: 地盘 ───
  const earthPlate = arrangeDiPan(juNumber, isYangdun);

  // ─── STEP 2: 旬首 + 值符 ───
  const xunShou = getXunShou3m(shiGanZhi);
  const zhiFuInfo = getZhiFuInfo(xunShou, earthPlate);
  const zhiFuLuoGong = getZhiFuLuoGong(shiGanZhi, xunShou, earthPlate);

  // ─── STEP 3: 值使门 ───
  const zhiShiInfo = getZhiShiInfo(shiGanZhi, zhiFuInfo.position, isYangdun);

  // ─── STEP 4: 天盘九星 ───
  const tianPan = arrangeTianPan(zhiFuInfo.star, zhiFuLuoGong.position, earthPlate);

  // ─── STEP 5: 八门 ───
  const gates = arrangeGates(zhiShiInfo.position, zhiShiInfo.gate);

  // ─── STEP 6: 八神 ───
  const gods = arrangeDeities(zhiFuLuoGong.position, isYangdun);

  // ─── STEP 7: 空亡 ───
  const kongWang = getKongWang(hourStem, hourBranch);

  // ─── STEP 8: 暗干支 (八门携带暗干法 — 自研算法) ───
  // 暗干 = 当前宫的门 → 门本位宫 → 地盘干
  // 暗支 = 旬首地支 + 暗干天干序号
  const xunBranchOffset = getBranchIndex(xunShou[1]!);
  const TEN_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  function getDarkBranch(stem: string): string {
    const idx = TEN_STEMS.indexOf(stem);
    return idx >= 0 ? BRANCHES[((xunBranchOffset + idx) % 12)]! : '';
  }

  // ─── STEP 9: 驿马 ───
  const yiMaBranch = YI_MA_MAP[hourBranch] || '';
  const postHorsePalace = yiMaBranch ? (BRANCH_TO_PALACE[yiMaBranch] || 0) : 0;

  // ─── STEP 10: 地八神 (DI_RING — 自研算法) ───
  const DI_RING = [6, 1, 8, 3, 4, 9, 2, 7]; // 固定反时针
  const DI_GOD_YANG = ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
  const DI_GOD_YIN  = ['值符', '九天', '九地', '玄武', '白虎', '六合', '太阴', '螣蛇'];
  const diGodOrder = isYangdun ? DI_GOD_YANG : DI_GOD_YIN;
  const timeXunYi = LIUJIA_XUN[xunShou] || '戊';
  let diStartPalace = 1;
  for (const [pos, stem] of earthPlate.entries()) {
    if (stem === timeXunYi) {
      diStartPalace = pos === 5 ? 2 : pos;
      break;
    }
  }
  const diStartIdx = DI_RING.indexOf(diStartPalace);
  const diGodMap: Record<number, string> = {};
  for (let g = 0; g < 8; g++) {
    const palaceIdx = (diStartIdx + g) % 8;
    diGodMap[DI_RING[palaceIdx]!] = GOD_SHORT_NAME[diGodOrder[g]!] || '';
  }

  // ─── STEP 11: 寄宫 (天禽寄天芮) ───
  let jiGongTargetPalace = 0;
  const jiGanStemValue = earthPlate.get(5) || '';
  for (const [palace, info] of tianPan.entries()) {
    if (info.star === '天芮' && palace !== 5) {
      jiGongTargetPalace = palace;
      break;
    }
  }

  // ─── STEP 12: 天乙 = 值符落宫(原始位置, 不映射5→2)的本位星 ───
  const PALACE_ORIGINAL_STAR: Record<number, string> = {
    1: '天蓬', 2: '天芮', 3: '天冲', 4: '天辅', 5: '天禽',
    6: '天心', 7: '天柱', 8: '天任', 9: '天英',
  };
  const tianYiStar = PALACE_ORIGINAL_STAR[zhiFuLuoGong.rawPosition] || '';
  const tianYiSearch = tianYiStar === '天禽' ? '天芮' : tianYiStar;
  let tianYiPalace = 0;
  for (const [palace, info] of tianPan.entries()) {
    if (info.star === tianYiSearch && palace !== 5) {
      tianYiPalace = palace;
      break;
    }
  }

  // ─── STEP 13: 构建宫位 (直接构建) ───
  const palaces: QimenPalace[] = [];
  for (let i = 1; i <= 9; i++) {
    const isCenterPalace = i === 5;
    const eStem = earthPlate.get(i) || '';   // 地盘干
    const tInfo = tianPan.get(i);
    const hStem = tInfo?.heavenlyStem || '';  // 天盘干
    const star = tInfo?.star || (isCenterPalace ? '天禽' : '');
    const door = isCenterPalace ? '' : (gates.get(i) || '');
    const god = isCenterPalace ? '' : (gods.get(i) || '');

    // 暗干支: 门→本位宫→地盘干
    let hiddenStems: string[] = [];
    if (isCenterPalace) {
      const darkStem = eStem;
      if (darkStem) {
        hiddenStems = [darkStem, getDarkBranch(darkStem)];
      }
    } else if (door) {
      const originalPalace = GATE_ORIGINAL_POSITIONS[door];
      const darkStem = originalPalace ? (earthPlate.get(originalPalace) || '') : '';
      if (darkStem) {
        hiddenStems = [darkStem, getDarkBranch(darkStem)];
      }
    }

    // 标记
    const marks: PalaceMark[] = [];
    const palaceBranches = PALACE_BRANCHES[i] || [];
    if (palaceBranches.some(b => kongWang.includes(b))) {
      marks.push('空');
    }
    if (i === postHorsePalace) {
      marks.push('马');
    }

    // 门迫 (宫克门)
    const dElem = DOOR_ELEMENT[door];
    const pElem = PALACE_ELEMENTS[i];
    if (dElem && pElem && dElem !== pElem && wxRestricts(dElem, pElem)) {
      marks.push('迫');
    }

    // 六仪击刑 (天盘干 = hStem)
    if (!isCenterPalace && hStem &&
        ((hStem === '戊' && i === 3) || (hStem === '己' && i === 2) ||
         (hStem === '庚' && i === 8) || (hStem === '辛' && i === 9) ||
         (hStem === '壬' && i === 4) || (hStem === '癸' && i === 4))) {
      marks.push('刑');
    }

    // 六仪入墓 — ① 五行墓 (天盘干五行→墓库宫位)
    let hasMu = false;
    if (!isCenterPalace && hStem) {
      const sElem = STEM_WX[hStem];
      if (sElem && GRAVE_MAP[sElem]?.includes(i)) {
        marks.push('墓');
        hasMu = true;
      }
    }
    // 六仪入墓 — ② 十二长生墓 (天干→长生墓支→宫位)
    const STEM_GRAVE: Record<string, number> = {
      '甲': 2, '乙': 6, '丙': 6, '丁': 8, '戊': 6,
      '己': 8, '庚': 8, '辛': 4, '壬': 4, '癸': 2,
    };
    if (!hasMu && !isCenterPalace && hStem && STEM_GRAVE[hStem] === i) {
      marks.push('墓');
    }

    // ── 寄宫干的墓/刑 (天禽携来的干 — 独立存入 jiMarks, 不混入 marks) ──
    const jiStem = (jiGongTargetPalace && i === jiGongTargetPalace && !isCenterPalace)
      ? jiGanStemValue : '';
    const jiMarks: PalaceMark[] = [];
    if (jiStem) {
      // 寄宫干击刑
      if ((jiStem === '戊' && i === 3) || (jiStem === '己' && i === 2) ||
          (jiStem === '庚' && i === 8) || (jiStem === '辛' && i === 9) ||
          (jiStem === '壬' && i === 4) || (jiStem === '癸' && i === 4)) {
        jiMarks.push('刑');
      }
      // 寄宫干入墓 (五行墓 + 十二长生墓, 去重)
      const jiWx = STEM_WX[jiStem];
      if (jiWx && GRAVE_MAP[jiWx]?.includes(i)) {
        jiMarks.push('墓');
      } else if (STEM_GRAVE[jiStem] === i) {
        jiMarks.push('墓');
      }
    }

    palaces.push({
      palaceNumber: i,
      palaceName: PALACE_NAMES[i] || '',
      palaceElement: PALACE_ELEMENTS[i] || '',
      // 历史遗留: skyStem字段 = 地盘干, earthStem字段 = 天盘干
      skyStem: eStem,
      earthStem: isCenterPalace ? '' : hStem,
      hiddenStems,
      star,
      starElement: STAR_ELEMENT[star] || '',
      door,
      doorElement: DOOR_ELEMENT[door] || '',
      god,
      godShort: GOD_SHORT_NAME[god] || '',
      marks,
      jiMarks: jiMarks.length > 0 ? jiMarks : undefined,
      jiGanStem: (jiGongTargetPalace && i === jiGongTargetPalace && !isCenterPalace)
        ? jiGanStemValue : undefined,
      diGod: isCenterPalace ? undefined : (diGodMap[i] || undefined),
    });
  }

  return {
    palaces,
    zhiFuStar: zhiFuInfo.star,
    zhiShiDoor: zhiShiInfo.gate,
    zhiFuPalace: zhiFuLuoGong.position,
    zhiShiPalace: zhiShiInfo.position,
    dun,
    juNumber,
    yuan: '',
    type: 'shijia',
    kongWang,
    solarTerm,
    tianYiStar,
    tianYiPalace,
    jiGongArrow: jiGongTargetPalace ? {
      palace: jiGongTargetPalace,
      color: STEM_COLORS[jiGanStemValue] || '#DAA520',
    } : undefined,
    fourPillars,
  };
}
