/** Exactly six user-approved Traditional Chinese source blocks.
 * Source and translation hashes were independently reviewed. No following story,
 * Japanese source dialogue, original media, scripts or native saves are included.
 * Display blocks do not assert original screen pagination or engine timing.
 */
const pack = value => Object.freeze({...value,pages:Object.freeze(value.pages.map(page => Object.freeze({...page,lines:Object.freeze([...page.lines])})))});
export const APPROVED_OPENING_TEXT = Object.freeze({
  "game-start": pack({
  "sequenceId": "immediate-descriptor-0.0.0.2-v1",
  "language": "zh-Hant",
  "pages": [
    {
      "id": "game-start-overview-01",
      "sourceTextSha256": "c06914bca39213c513a0c0b9b44b80190aa6106f560532fac46e3104b2079fed",
      "textSha256": "623ca0186f70778c7960c956d6c58f24c4742f11d6ac4513241c8268af773b9e",
      "lines": [
        "二世紀末的中國。「黃巾之亂」",
        "與「董卓之亂」接連爆發，",
        "戰亂令漢室威信盡失，",
        "天下陷入群雄割據的",
        "亂世。",
        "",
        "從群雄之中崛起的曹操，將當時的皇帝獻帝掌握在手中，任意操縱，藉此擴張勢力，統一中國已近在眼前。",
        "",
        "然而，為了漢王朝而決心阻止曹操野心的義士劉備，擋在了他的面前。"
      ]
    },
    {
      "id": "game-start-overview-02",
      "sourceTextSha256": "0666df745cc2dab2b172c97e46b1bb5d8c487884c13068243e60c90eee076a99",
      "textSha256": "6ebbaa5217d32adac90fb3ccb072b8416dd89d29f6197549e4856b246096aa61",
      "lines": [
        "在名軍師徐庶的協助下，劉備擊敗了曹操軍。然而，曹操的計謀卻使徐庶離去。",
        "",
        "出現在失意的劉備面前的，是有「伏龍」之稱的天才軍師諸葛亮，也就是孔明……",
        "孔明究竟能否幫助劉備，阻止曹操的野心呢？"
      ]
    }
  ]
}),
  "prologue": pack({
  "sequenceId": "prologue-descriptor-0.0.0.3-v1",
  "language": "zh-Hant",
  "pages": [
    {
      "id": "prologue-01",
      "sourceTextSha256": "9c921a2f7f1311ca84c8a4d5e0a8f90aa34600119838ba434b9812643533dc97",
      "textSha256": "9c921a2f7f1311ca84c8a4d5e0a8f90aa34600119838ba434b9812643533dc97",
      "lines": [
        "第一章　三國鼎立"
      ]
    },
    {
      "id": "prologue-02",
      "sourceTextSha256": "ee9c85b5e0e10cbf03d9b4f7e8cebc274215e73f38b35d282879110eff8c211f",
      "textSha256": "743b6259e7055f55fa170376467e117f11a808acc02ad25b0e68b43fddd99179",
      "lines": [
        "第一幕　孔明出廬"
      ]
    },
    {
      "id": "prologue-03",
      "sourceTextSha256": "2c789b62dfdf218dba0d0a6fc2f5111143f0fbfcb17b27b512e4a16d4847c138",
      "textSha256": "942bbe9dd67d6e438ca167259916b7250eb27358cd25a9ff0da3178dd322f3cb",
      "lines": [
        "二世紀末的中國。「黃巾之亂」",
        "與「董卓之亂」接連爆發，",
        "戰亂令漢室威信盡失，",
        "天下陷入群雄割據的",
        "亂世。",
        "　",
        "在群雄之中崛起的曹操，",
        "挾持當時的皇帝獻帝，",
        "擴張勢力。平定中國北方",
        "的河北之後，",
        "他便將目光轉向南方的荊州，",
        "開始著手統一中國。"
      ]
    },
    {
      "id": "prologue-04",
      "sourceTextSha256": "6dcba4be68b1f2bac6cd7e527ec1722f0dbc208f80d07d86ae693b5e26000095",
      "textSha256": "23e30566cfa37dd0c9579e1c0f298731ca79930182f1366e00a8ec95d5393a01",
      "lines": [
        "然而，在荊州，一心為漢室",
        "阻止曹操野心的劉備，",
        "正以諸侯劉表客將的身份，",
        "積蓄實力。",
        "　",
        "　",
        "曹操為討伐劉備，派出麾下",
        "曹仁迎戰，卻敗在深得劉備",
        "信賴的名軍師徐庶手下，",
        "遭受慘敗。"
      ]
    }
  ]
})
});
