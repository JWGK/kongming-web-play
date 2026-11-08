/** Public evidence identifiers only. No original strings or source bytes.
 * Ordered units are complete source text blocks, NOT original screen/page timing.
 * Source-confirmed descriptor routes are conditional, not executed handoffs.
 */
const route = value => Object.freeze({...value, pages:Object.freeze(value.pages.map(page => Object.freeze({...page})))});
export const OPENING_ROUTES = Object.freeze({
  "game-start": route({
  "id": "game-start",
  "sequenceId": "immediate-descriptor-0.0.0.2-v1",
  "label": "立即開始遊戲",
  "descriptorId": "0.0.0.2",
  "nextDescriptorId": "0.0.7.0",
  "transferCommandOffset": "0x13372D",
  "sourceStatus": "source-confirmed-conditional",
  "pages": [
    {
      "id": "game-start-overview-01",
      "kind": "overview",
      "sourceOffset": "0x134D60",
      "sourceEndExclusive": "0x134E7D",
      "commandOffset": "0x13371B",
      "sourceByteLength": 285,
      "sourceSha256": "72d7fbd0fd47f9bfdf90a858981f7067f8b6d2ccc9b2669055bef962dca7cb77",
      "lineCount": 16,
      "glyphCount": 166,
      "textSha256": "c06914bca39213c513a0c0b9b44b80190aa6106f560532fac46e3104b2079fed",
      "speakerIdentity": null
    },
    {
      "id": "game-start-overview-02",
      "kind": "overview",
      "sourceOffset": "0x134E7E",
      "sourceEndExclusive": "0x134F7B",
      "commandOffset": "0x13371E",
      "sourceByteLength": 253,
      "sourceSha256": "a713bfda6c2a520a2669915a1a84cf58864366d449b5b8edb6ab97c31ba3415b",
      "lineCount": 12,
      "glyphCount": 129,
      "textSha256": "0666df745cc2dab2b172c97e46b1bb5d8c487884c13068243e60c90eee076a99",
      "speakerIdentity": null
    }
  ]
}),
  "prologue": route({
  "id": "prologue",
  "sequenceId": "prologue-descriptor-0.0.0.3-v1",
  "label": "觀看序章",
  "descriptorId": "0.0.0.3",
  "nextDescriptorId": "0.0.1.0",
  "transferCommandOffset": "0x133799",
  "sourceStatus": "source-confirmed-conditional",
  "pages": [
    {
      "id": "prologue-01",
      "kind": "chapter-title",
      "sourceOffset": "0x134F90",
      "sourceEndExclusive": "0x134FA0",
      "commandOffset": "0x13378D",
      "sourceByteLength": 16,
      "sourceSha256": "f1c390c5d7fbb77047b07bf6f445589746a219e08748fb86f4f68ef886f83b01",
      "lineCount": 1,
      "glyphCount": 8,
      "textSha256": "9c921a2f7f1311ca84c8a4d5e0a8f90aa34600119838ba434b9812643533dc97",
      "speakerIdentity": null
    },
    {
      "id": "prologue-02",
      "kind": "act-title",
      "sourceOffset": "0x134FA1",
      "sourceEndExclusive": "0x134FB2",
      "commandOffset": "0x133790",
      "sourceByteLength": 17,
      "sourceSha256": "576e7970f1c8baac8e96439e7ef66a9c2416f7694ab6a15414140a237ef8f5e8",
      "lineCount": 1,
      "glyphCount": 9,
      "textSha256": "ee9c85b5e0e10cbf03d9b4f7e8cebc274215e73f38b35d282879110eff8c211f",
      "speakerIdentity": null
    },
    {
      "id": "prologue-03",
      "kind": "historical-narration-1",
      "sourceOffset": "0x134FB3",
      "sourceEndExclusive": "0x1350B5",
      "commandOffset": "0x133793",
      "sourceByteLength": 258,
      "sourceSha256": "e56ffe4ec310ce492f1feb7d4ef9f38b7a1b0954611eb9d1bd56dba99017ae60",
      "lineCount": 12,
      "glyphCount": 150,
      "textSha256": "2c789b62dfdf218dba0d0a6fc2f5111143f0fbfcb17b27b512e4a16d4847c138",
      "speakerIdentity": null
    },
    {
      "id": "prologue-04",
      "kind": "historical-narration-2",
      "sourceOffset": "0x1350B6",
      "sourceEndExclusive": "0x13519C",
      "commandOffset": "0x133796",
      "sourceByteLength": 230,
      "sourceSha256": "5ec0566b1bc1cac5947ba9850e20cd3f554a6e261be95d014f92da47b8be537f",
      "lineCount": 10,
      "glyphCount": 124,
      "textSha256": "6dcba4be68b1f2bac6cd7e527ec1722f0dbc208f80d07d86ae693b5e26000095",
      "speakerIdentity": null
    }
  ]
})
});
export const ROUTE_IDS = Object.freeze(Object.keys(OPENING_ROUTES));
export const isRouteId = id => typeof id === 'string' && Object.hasOwn(OPENING_ROUTES,id);
export const firstPageId = id => OPENING_ROUTES[id].pages[0]?.id ?? null;
export const pageIndex = (routeId,pageId) => OPENING_ROUTES[routeId].pages.findIndex(page => page.id === pageId);
export const getPage = (routeId,pageId) => OPENING_ROUTES[routeId]?.pages.find(page => page.id === pageId) ?? null;
