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
 * 奇门遁甲 — 统一调度引擎
 *
 * 所有类型的奇门排盘统一入口
 * dispatch by type + juMethod → 各自建引擎
 */

import type { QimenChart, QimenType, JuMethod } from './types';
import { nianJiaGenerate } from './engines/nianjia';
import { yueJiaGenerate } from './engines/yuejia';
import { riJiaGenerate } from './engines/rijia';


import { maoShanJu } from './engines/maoshan';
import { zhiRunJu } from './engines/zhirun';


// ─── 调度参数 ──────────────────────────────────

export interface QimenGenerateParams {
  /** 排盘类型 */
  type: QimenType;
  /** 取局法 (仅时家有效) */
  juMethod?: JuMethod;

  // 时间参数 (根据type使用不同的子集)
  year?: number;
  month?: number;       // 节气月(1-12)
  day?: number;         // 公历日 (1-31)
  lunarMonth?: number;  // 农历月

  dayStem?: string;
  dayBranch?: string;
  hourStem?: string;
  hourBranch?: string;
  yearBranch?: string;

  solarTerm?: string;
  dayInTerm?: number;     // 节气内第几天



  elapsedHours?: number;    // 茅山用: 距节气交节小时数
  dayGzIndex?: number;      // 置闰用: 日干支序号
  daysSinceJieQi?: number;  // 置闰用: 距节气天数



  /** 时家基础盘 (茅山/置闰需要) */
  baseChart?: QimenChart;
}

/**
 * 统一排盘调度入口
 */
export function generateQimenChart(params: QimenGenerateParams): QimenChart {
  switch (params.type) {
    // ─── 完全自建引擎 ──────────
    case 'nianjia':
      return nianJiaGenerate(params.year || new Date().getFullYear());

    case 'yuejia':
      return yueJiaGenerate(
        params.year || new Date().getFullYear(),
        params.month || 1,
      );

    case 'rijia':
      return riJiaGenerate(
        params.year || new Date().getFullYear(),
        params.month || (new Date().getMonth() + 1),
        params.day || new Date().getDate(),
      );



    // ─── 时家引擎 ──────
    case 'shijia':
      return handleShiJia(params);

    default:
      throw new Error(`未知的排盘类型: ${params.type}`);
  }
}

/** 处理时家排盘的内部函数 (含取局法变体) */
function handleShiJia(params: QimenGenerateParams): QimenChart {
  switch (params.juMethod) {


    case 'maoshan': {
      // 茅山法: 计算局数
      const result = maoShanJu(params.solarTerm || '冬至', params.elapsedHours || 0);
      // 如果有baseChart，修改其局数；否则返回一个带局数信息的占位chart
      if (params.baseChart) {
        return {
          ...params.baseChart,
          juNumber: result.juNumber,
          dun: result.isYangDun ? 'yang' : 'yin',
          yuan: result.yuan,
          juMethod: 'maoshan',
        };
      }
      // 兜底：茅山法需要基础盘
      throw new Error('茅山法需要提供基础盘');
    }

    case 'zhirun': {
      const result = zhiRunJu(
        params.solarTerm || '冬至',
        params.dayGzIndex || 0,
        params.daysSinceJieQi || 0,
      );
      if (params.baseChart) {
        return {
          ...params.baseChart,
          juNumber: result.juNumber,
          dun: result.isYangDun ? 'yang' : 'yin',
          yuan: result.yuan,
          juMethod: 'zhirun',
        };
      }
      throw new Error('置闰法需要提供基础盘');
    }

    case 'chaibu':
    default:
      // 拆补法: 使用自研取局引擎
      if (params.baseChart) return { ...params.baseChart, juMethod: 'chaibu' };
      throw new Error('拆补法需要提供基础盘');
  }
}

// ─── 导出所有子模块 ────────────────────────────

export { nianJiaGenerate } from './engines/nianjia';
export { yueJiaGenerate } from './engines/yuejia';
export { riJiaGenerate } from './engines/rijia';


export { maoShanJu, isYangDunTerm } from './engines/maoshan';
export { zhiRunJu } from './engines/zhirun';


export type * from './types';
