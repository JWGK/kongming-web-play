// Source-verified portraits for the original campaign roster, extracted by definition ID
// from the Jieting/Chencang field tables and Baxi portrait manifest.
// Delivery paths resolve to the same bytes as the original field assets.
// This is a presentation fallback only; it never admits an officer to the roster.
const CAMPAIGN_PREPARATION_PORTRAITS = Object.freeze({
  0: "assets/zhuge-portrait.png", // 諸葛亮
  1: "assets/baxi-field/portraits/face-0.png", // 劉備
  2: "assets/baxi-field/portraits/face-1.png", // 関羽
  3: "assets/baxi-field/portraits/face-2.png", // 張飛
  4: "assets/map16-field/portraits/face-153.png", // 姜維
  5: "assets/baxi-field/portraits/face-24.png", // 馬謖
  6: "assets/first-battle/portraits/face-3.png", // 趙雲
  7: "assets/story-portraits/portraits/face-7.png", // 魏延
  8: "assets/baxi-field/portraits/face-27.png", // 関興
  9: "assets/map10-field/portraits/face-28.png", // 張苞
  10: "assets/baxi-field/portraits/face-32.png", // 馬岱
  11: "assets/baxi-field/portraits/face-33.png", // 王平
  13: "assets/baxi-field/portraits/face-8.png", // 統
  14: "assets/baxi-field/portraits/face-31.png", // 馬超
  15: "assets/fengming-story/portraits/face-29.png", // 蒋
  16: "assets/fengming-story/portraits/face-30.png", // 費
  17: "assets/baxi-field/portraits/face-204.png", // 諸葛瞻
  18: "assets/map16-field/portraits/face-151.png", // 楊儀
  19: "assets/map10-field/portraits/face-147.png", // 芝
  20: "assets/map10-field/portraits/face-16.png", // 廖化
  21: "assets/map10-field/portraits/face-144.png", // 関索
  24: "assets/baxi-field/portraits/face-36.png", // 呉懿
  25: "assets/baxi-field/portraits/face-35.png", // 呉班
  26: "assets/baxi-field/portraits/face-155.png", // 張翼
  27: "assets/baxi-field/portraits/face-278.png", // 張嶷
  28: "assets/map10-field/portraits/face-255.png", // 馬忠
  29: "assets/baxi-field/portraits/face-154.png", // 高翔
  30: "assets/baxi-field/portraits/face-34.png", // 李厳
  32: "assets/baxi-field/portraits/face-157.png", // 李恢
  34: "assets/baxi-field/portraits/face-22.png", // 陳式
  37: "assets/baxi-field/portraits/face-23.png", // 馬良
  38: "assets/chengdu-interlude-story/portraits/face-136.png", // 楊蘭
  40: "assets/baxi-field/portraits/face-143.png", // 孟達
  43: "assets/baxi-field/portraits/face-273.png", // 呂凱
  47: "assets/baxi-field/portraits/face-6.png", // 黄忠
  51: "assets/baxi-field/portraits/face-12.png", // 孫乾
  52: "assets/baxi-field/portraits/face-13.png", // 糜竺
  53: "assets/baxi-field/portraits/face-14.png", // 糜芳
  55: "assets/baxi-field/portraits/face-17.png", // 劉封
  56: "assets/baxi-field/portraits/face-18.png", // 関平
  57: "assets/baxi-field/portraits/face-19.png", // 周倉
  58: "assets/baxi-field/portraits/face-21.png", // 厳顔
  59: "assets/map10-field/portraits/face-25.png", // 王甫
});

export function campaignPreparationPortrait(definitionIndex) {
  return Number.isInteger(definitionIndex) && Object.hasOwn(CAMPAIGN_PREPARATION_PORTRAITS, definitionIndex)
    ? CAMPAIGN_PREPARATION_PORTRAITS[definitionIndex]
    : null;
}
