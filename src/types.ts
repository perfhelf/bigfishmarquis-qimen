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
 * 奇门遁甲类型定义
 * 所有引擎输出统一为 QimenChart 接口，确保 UI 可复用
 */

// ─── 枚举 ───────────────────────────────────────────

/** 奇门排盘类型 */
export type QimenType = 'shijia' | 'rijia' | 'yuejia' | 'nianjia';

/** 时家取局法 */
export type JuMethod = 'chaibu' | 'maoshan' | 'zhirun';

/** 阴阳遁 */
export type DunType = 'yang' | 'yin';

/** 宫位标记 */
export type PalaceMark = '空' | '时空' | '马' | '刑' | '墓' | '迫';

/** 月家起宫流派 */
export type YueJiaLineage = 'logical' | 'classical';

// ─── 单宫数据 ─────────────────────────────────────

export interface QimenPalace {
  /** 宫位编号 1-9 */
  palaceNumber: number;
  /** 宫名 (坎/坤/震/巽/中/乾/兑/艮/离) */
  palaceName: string;
  /** 宫位五行 */
  palaceElement: string;

  // 四层盘面数据
  /** 天盘干 (天干) */
  skyStem: string;
  /** 地盘干 (天干) */
  earthStem: string;
  /** 暗干 (藏干，可能多个) */
  hiddenStems: string[];
  /** 九星 */
  star: string;
  /** 九星五行 */
  starElement: string;
  /** 八门 */
  door: string;
  /** 八门五行 */
  doorElement: string;
  /** 八神 */
  god: string;
  /** 八神简称 */
  godShort: string;

  /** 宫位标记集合 (空亡/马星/击刑/入墓/门迫) */
  marks: PalaceMark[];
  /** 寄宫干专属标记 (墓/刑 — 由天禽携来的干触发) */
  jiMarks?: PalaceMark[];

  /** 需要加框的天干 (年干/月干/日干/时干) */
  highlightStem?: string;
  /** 寄干 (中5宫天禽寄到此宫的天干) */
  jiGanStem?: string;
  /** 地八神简称 */
  diGod?: string;
}

// ─── 完整盘面 ─────────────────────────────────────

export interface QimenChart {
  /** 九宫数据 (索引0-8 对应宫号1-9) */
  palaces: QimenPalace[];

  /** 值符星 */
  zhiFuStar: string;
  /** 值使门 */
  zhiShiDoor: string;
  /** 值符星所在宫号 */
  zhiFuPalace: number;
  /** 值使门所在宫号 */
  zhiShiPalace: number;

  /** 阴阳遁 */
  dun: DunType;
  /** 局数 (1-9) */
  juNumber: number;
  /** 三元 (上/中/下) */
  yuan: string;
  /** 排盘类型 */
  type: QimenType;
  /** 取局法 (仅时家有效) */
  juMethod?: JuMethod;

  /** 四柱信息 (可由外部传入) */
  fourPillars?: {
    year: { gan: string; zhi: string };
    month: { gan: string; zhi: string };
    day: { gan: string; zhi: string };
    hour: { gan: string; zhi: string };
  };

  /** 节气信息 */
  solarTerm?: string;
  /** 节气精确交节时刻 */
  solarTermTime?: Date;

  /** 时空 (空亡地支) */
  kongWang: string[];




  huangHeiDao?: string;

  /** 天乙贵人星 */
  tianYiStar?: string;
  /** 天乙落宫 */
  tianYiPalace?: number;

  /** 寄宫箭头 (中五宫寄出方向) */
  jiGongArrow?: { palace: number; color: string };


}
