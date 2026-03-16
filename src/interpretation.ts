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
 * 奇门遁甲 — 断语匹配引擎
 * 提供十干克应、格局断语、用神属性、值符克应的查询API
 */
import shiGanKeYing from './data/shi_gan_ke_ying.json';
import geJuDuanYu from './data/ge_ju_duan_yu.json';
import yongShen from './data/yong_shen.json';
import zhiFuKeYing from './data/zhi_fu_ke_ying.json';

// ─── 十干克应 ────────────────────────────
export interface KeYingResult {
  key: string;       // e.g. "甲加丙"
  name: string;      // e.g. "青龙返首"
  type: string;      // 大吉/吉/平/凶/大凶
  desc: string;      // 详细断语
  source?: '天盘' | '寄宫' | '暗干';  // 来源标注
}

/**
 * 查询天盘干+地盘干的十干克应
 */
export function getShiGanKeYing(skyStem: string, earthStem: string): KeYingResult | null {
  const key = `${skyStem}加${earthStem}`;
  const data = (shiGanKeYing as Record<string, any>)[key];
  if (!data) return null;
  return { key, name: data.name, type: data.type, desc: data.desc };
}

/**
 * 获取一个宫位的所有十干克应
 * 注意: 在当前代码库中, earthStem=天盘干, skyStem=地盘干 (字段名反直觉)
 * 十干克应规则: 天盘干+地盘干
 */
export function getPalaceKeYing(
  skyStem: string,
  earthStem: string,
  hiddenStems: string[] = [],
  jiGanStem?: string
): KeYingResult[] {
  const results: KeYingResult[] = [];
  // 字段映射: earthStem=天盘干, skyStem=地盘干
  const tianStem = earthStem;  // 天盘干
  const diStem = skyStem;      // 地盘干
  // 天盘干 + 地盘干
  const main = getShiGanKeYing(tianStem, diStem);
  if (main) results.push({ ...main, source: '天盘' });
  // 寄宫干 + 地盘干 (寄干相当于额外的天盘干)
  if (jiGanStem) {
    const ji = getShiGanKeYing(jiGanStem, diStem);
    if (ji) results.push({ ...ji, source: '寄宫' });
  }
  // 暗干 + 地盘干
  for (const hs of hiddenStems) {
    const r = getShiGanKeYing(hs, diStem);
    if (r) results.push({ ...r, source: '暗干' });
  }
  return results;
}

// ─── 十二长生 ─────────────────────────────
const TWELVE_STAGES = ['长生','沐浴','冠带','临官','帝旺','衰','病','死','墓','绝','胎','养'] as const;
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

/** 宫位 → 地支 (后天八卦) */
const PALACE_BRANCHES: Record<number, string[]> = {
  1: ['子'],        // 坎
  2: ['未','申'],   // 坤
  3: ['卯'],        // 震
  4: ['辰','巳'],   // 巽
  // 5: 中宫无地支
  6: ['戌','亥'],   // 乾
  7: ['酉'],        // 兑
  8: ['丑','寅'],   // 艮
  9: ['午'],        // 离
};

/** 天干长生起点 (地支索引) + 阴阳方向 */
const CHANGSHENG_START: Record<string, { idx: number; yang: boolean }> = {
  '甲': { idx: 11, yang: true },  // 长生在亥
  '丙': { idx: 2,  yang: true },  // 长生在寅
  '戊': { idx: 2,  yang: true },  // 长生在寅 (同丙)
  '庚': { idx: 5,  yang: true },  // 长生在巳
  '壬': { idx: 8,  yang: true },  // 长生在申
  '乙': { idx: 6,  yang: false }, // 长生在午
  '丁': { idx: 9,  yang: false }, // 长生在酉
  '己': { idx: 9,  yang: false }, // 长生在酉 (同丁)
  '辛': { idx: 0,  yang: false }, // 长生在子
  '癸': { idx: 3,  yang: false }, // 长生在卯
};

/**
 * 查询天干在某地支的十二长生阶段
 */
export function getChangSheng(stem: string, branch: string): string | null {
  const cfg = CHANGSHENG_START[stem];
  if (!cfg) return null;
  const bi = BRANCHES.indexOf(branch);
  if (bi < 0) return null;
  const offset = cfg.yang
    ? (bi - cfg.idx + 12) % 12   // 阳干顺行
    : (cfg.idx - bi + 12) % 12;  // 阴干逆行
  return TWELVE_STAGES[offset];
}

export interface ChangShengResult {
  label: string;   // "天癸" / "地辛" / "寄庚" / "暗戊"
  stem: string;
  stages: { branch: string; stage: string }[];
}

/**
 * 获取宫位中所有天干的十二长生
 * 注意: earthStem=天盘干, skyStem=地盘干 (字段名反直觉)
 */
export function getPalaceChangSheng(
  palaceNumber: number,
  skyStem: string,      // 地盘干
  earthStem: string,    // 天盘干
  hiddenStems: string[] = [],
  jiGanStem?: string
): ChangShengResult[] {
  const branches = PALACE_BRANCHES[palaceNumber];
  if (!branches || branches.length === 0) return [];

  function lookup(stem: string): { branch: string; stage: string }[] {
    return branches.map(b => ({ branch: b, stage: getChangSheng(stem, b) || '' })).filter(r => r.stage);
  }

  const results: ChangShengResult[] = [];
  if (earthStem) results.push({ label: `天${earthStem}`, stem: earthStem, stages: lookup(earthStem) });
  if (jiGanStem) results.push({ label: `寄${jiGanStem}`, stem: jiGanStem, stages: lookup(jiGanStem) });
  if (skyStem) results.push({ label: `地${skyStem}`, stem: skyStem, stages: lookup(skyStem) });
  for (const hs of hiddenStems) {
    results.push({ label: `暗${hs}`, stem: hs, stages: lookup(hs) });
  }
  return results.filter(r => r.stages.length > 0);
}

// ─── 格局断语 ────────────────────────────
export interface GeJuResult {
  name: string;
  condition: string;
  desc: string;
  isAuspicious: boolean;
}

const geJuData = geJuDuanYu as {
  吉格: Array<{ name: string; condition: string; desc: string }>;
  凶格: Array<{ name: string; condition: string; desc: string }>;
};

/**
 * 获取所有格局 (按名称查找)
 */
export function getGeJuByName(name: string): GeJuResult | null {
  const ji = geJuData.吉格.find(g => g.name === name);
  if (ji) return { ...ji, isAuspicious: true };
  const xiong = geJuData.凶格.find(g => g.name === name);
  if (xiong) return { ...xiong, isAuspicious: false };
  return null;
}

/**
 * 获取全部吉格
 */
export function getAllJiGe(): GeJuResult[] {
  return geJuData.吉格.map(g => ({ ...g, isAuspicious: true }));
}

/**
 * 获取全部凶格
 */
export function getAllXiongGe(): GeJuResult[] {
  return geJuData.凶格.map(g => ({ ...g, isAuspicious: false }));
}

// ─── 用神万物类象 ────────────────────────
export interface YongShenInfo {
  本义: string;
  五行: string;
  阴阳: string;
  方位: string;
  星宿: string;
  性格: string;
  长生: string;
  概念: string;
  天时: string;
  地理: string;
  建筑: string;
  人物: string;
  形态: string;
  性情: string;
  人体: string;
  静物: string;
  颜色: string;
}

const yongShenData = yongShen as Record<string, YongShenInfo>;

/**
 * 获取天干的万物类象信息
 */
export function getYongShen(stem: string): YongShenInfo | null {
  return yongShenData[stem] || null;
}

// ─── 值符克应 ────────────────────────────
const zhiFuData = zhiFuKeYing as Record<string, Record<string, string>>;

/**
 * 获取值符克应 (星名 + 时支)
 */
export function getZhiFuKeYing(star: string, branch: string): string | null {
  const starData = zhiFuData[star];
  if (!starData) return null;
  return starData[branch] || null;
}

// ─── 九星 / 八门 / 八神 / 宫位 / 十二神将 详解 ─────────
import jiuXingData from './data/jiu_xing.json';
import baMenData from './data/ba_men.json';
import baShenData from './data/ba_shen.json';
import gongWeiData from './data/gong_wei.json';
import shenJiangData from './data/shi_er_shen_jiang.json';

export function getStarDetail(star: string): any {
  return (jiuXingData as any)[star] || null;
}

export function getDoorDetail(door: string): any {
  return (baMenData as any)[door] || null;
}

export function getGodDetail(god: string): any {
  return (baShenData as any)[god] || null;
}

export function getPalaceDetail(palaceNumber: number): any {
  return (gongWeiData as any)[String(palaceNumber)] || null;
}

/** 查询十二神将详情 (by 地支) */
export function getShenJiangDetail(branch: string): any {
  return (shenJiangData as any)[branch] || null;
}

// ─── 运筹: 三诈五假九遁 检测 ─────────
import yunChouData from './data/yun_chou.json';

export interface YunChouResult {
  类别: string;   // '三诈' | '五假' | '九遁'
  名称: string;   // e.g. '真诈', '天遁'
  描述: string;
}

/**
 * 检测宫位是否命中三诈五假九遁格局
 * @param door 八门
 * @param skyStem 天盘干 (earthStem字段, 遗留反转)
 * @param earthStem 地盘干 (skyStem字段, 遗留反转)
 * @param god 八神
 * @param palaceNumber 宫位编号
 */
export function getYunChouPatterns(
  door: string,
  skyStem: string,
  earthStem: string,
  god: string,
  palaceNumber: number,
): YunChouResult[] {
  const results: YunChouResult[] = [];
  const data = yunChouData as any;

  for (const category of ['三诈', '五假', '九遁']) {
    const patterns = data[category] || [];
    for (const p of patterns) {
      const cond = p.条件;
      let matched = true;

      // 门 条件
      if (cond.门) {
        if (!cond.门.includes(door)) { matched = false; }
      }
      // 天盘干 条件
      if (cond.天盘干 && matched) {
        if (!cond.天盘干.includes(skyStem)) { matched = false; }
      }
      // 地盘干 条件
      if (cond.地盘干 && matched) {
        if (!cond.地盘干.includes(earthStem)) { matched = false; }
      }
      // 八神 条件
      if (cond.八神 && matched) {
        if (!cond.八神.includes(god)) { matched = false; }
      }
      // 宫位 条件
      if (cond.宫位 && matched) {
        if (!cond.宫位.includes(palaceNumber)) { matched = false; }
      }

      if (matched) {
        results.push({
          类别: category,
          名称: p.名称,
          描述: p.描述,
        });
      }
    }
  }
  return results;
}

// ─── 特殊格局检测引擎 ────────────────────

/** 宫位五行 */
function palaceElement(p: number): string {
  const m: Record<number, string> = { 1:'水', 2:'土', 3:'木', 4:'木', 6:'金', 7:'金', 8:'土', 9:'火' };
  return m[p] || '';
}
/** 门五行 */
function doorElement(door: string): string {
  const m: Record<string, string> = {
    '休门':'水', '生门':'土', '伤门':'木', '杜门':'木',
    '景门':'火', '死门':'土', '惊门':'金', '开门':'金',
  };
  return m[door] || '';
}
/** 星五行 */
function starElement(star: string): string {
  const m: Record<string, string> = {
    '天蓬':'水', '天芮':'土', '天冲':'木', '天辅':'木', '天禽':'土',
    '天心':'金', '天柱':'金', '天任':'土', '天英':'火',
  };
  return m[star] || '';
}
function wxGenerates(a: string, b: string): boolean {
  const g: Record<string, string> = { '木':'火', '火':'土', '土':'金', '金':'水', '水':'木' };
  return g[a] === b;
}
function wxRestricts(a: string, b: string): boolean {
  const r: Record<string, string> = { '木':'土', '土':'水', '水':'火', '火':'金', '金':'木' };
  return r[a] === b;
}
function gravePalace(elem: string): number[] {
  const m: Record<string, number[]> = { '火':[6], '水':[4], '金':[8], '木':[2], '土':[4] };
  return m[elem] || [];
}

/**
 * 检测宫位特殊格局 (不含天干克应, 不含三诈五假九遁)
 * @param skyStem 天盘干 (QimenView中 p.earthStem)
 * @param earthStem 地盘干 (QimenView中 p.skyStem)
 */
export function detectSpecialPatterns(
  palaceNumber: number,
  skyStem: string,
  earthStem: string,
  door: string,
  star: string,
  god: string,
  zhiShiDoor?: string,
  dayGan?: string,
  yearGan?: string,
  monthGan?: string,
): string[] {
  const results: string[] = [];

  // ── 三奇升殿 ──
  if ((skyStem === '乙' && palaceNumber === 3) ||
      (skyStem === '丙' && (palaceNumber === 9 || palaceNumber === 3)) ||
      (skyStem === '丁' && palaceNumber === 7)) {
    results.push('三奇升殿');
  }

  // ── 奇游禄位 ──
  if ((skyStem === '乙' && (palaceNumber === 3 || palaceNumber === 4)) ||
      (skyStem === '丙' && (palaceNumber === 4 || palaceNumber === 9)) ||
      (skyStem === '丁' && palaceNumber === 9)) {
    results.push('奇游禄位');
  }

  // ── 三奇得使 ── (值使门所在宫的天盘干为三奇)
  if (zhiShiDoor && door === zhiShiDoor &&
      (skyStem === '乙' || skyStem === '丙' || skyStem === '丁')) {
    results.push('三奇得使');
  }

  // ── 玉女守门 ── (值使门落宫 + 地盘丁)
  if (zhiShiDoor && door === zhiShiDoor && earthStem === '丁') {
    results.push('玉女守门');
  }

  // ── 奇仪相合 ──
  const hePairs = [['乙','庚'],['丙','辛'],['丁','壬'],['戊','癸']];
  for (const [a, b] of hePairs) {
    if ((skyStem === a && earthStem === b) || (skyStem === b && earthStem === a)) {
      results.push('奇仪相合');
      break;
    }
  }

  // ── 门生宫 / 宫生门 / 门迫宫 / 宫迫门 ──
  const dElem = doorElement(door);
  const pElem = palaceElement(palaceNumber);
  if (dElem && pElem && dElem !== pElem) {
    if (wxGenerates(dElem, pElem)) results.push('门生宫');
    if (wxGenerates(pElem, dElem)) results.push('宫生门');
    if (wxRestricts(dElem, pElem)) results.push('门迫宫');
    if (wxRestricts(pElem, dElem)) results.push('宫迫门');
  }

  // ── 三奇入墓 ──
  if (skyStem === '乙' && palaceNumber === 2) results.push('乙奇入墓');
  if (skyStem === '丙' && palaceNumber === 6) results.push('丙奇入墓');
  if (skyStem === '丁' && palaceNumber === 8) results.push('丁奇入墓');

  // ── 三奇受制 ──
  if ((skyStem === '乙' && earthStem === '庚') ||
      (skyStem === '丙' && earthStem === '壬') ||
      (skyStem === '丁' && earthStem === '癸')) {
    results.push('三奇受制');
  }

  // ── 六仪击刑 ──
  if ((skyStem === '戊' && palaceNumber === 3) ||
      (skyStem === '己' && palaceNumber === 2) ||
      (skyStem === '庚' && palaceNumber === 8) ||
      (skyStem === '辛' && palaceNumber === 9) ||
      (skyStem === '壬' && palaceNumber === 4) ||
      (skyStem === '癸' && palaceNumber === 4)) {
    results.push('六仪击刑');
  }

  // ── 星入墓 ──
  const sElem = starElement(star);
  if (sElem && gravePalace(sElem).includes(palaceNumber)) results.push('星入墓');

  // ── 门入墓 ──
  if (dElem && gravePalace(dElem).includes(palaceNumber)) results.push('门入墓');

  // ── 飞干格 / 伏干格 ──
  if (dayGan) {
    if (skyStem === '庚' && earthStem === dayGan) results.push('飞干格');
    if (earthStem === '庚' && skyStem === dayGan) results.push('伏干格');
  }

  // ── 岁格 / 月格 ──
  if (yearGan && skyStem === '庚' && earthStem === yearGan) results.push('岁格');
  if (monthGan && skyStem === '庚' && earthStem === monthGan) results.push('月格');

  // ── 奇格 (庚+乙) ──
  if (skyStem === '庚' && earthStem === '乙') results.push('奇格');

  // ── 悖格 ──
  if (skyStem === '丙' && earthStem === '辛') {
    results.push('悖格');
  }

  return results;
}
