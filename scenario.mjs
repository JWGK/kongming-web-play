// Original diagnostic content. No original-game fidelity is asserted.
export const RULESET = Object.freeze({id:'diagnostic-v1',damageMinimum:1,forestCost:2,plainCost:1,attackRange:1});
export const SCENARIO = Object.freeze({
  id:'rebuild-training-v1',title:'重建演練',width:8,height:8,
  terrain:['........','..ff....','...w....','...w.f..','...w.f..','........','..ff....','........'].join('').split('').map(c=>({'.':'plain',f:'forest',w:'water'})[c]),
  units:[
    {id:'p1',name:'諸葛亮',side:'player',x:1,y:5,hp:30,maxHp:30,attack:12,defense:4,move:4},
    {id:'p2',name:'趙雲',side:'player',x:2,y:5,hp:36,maxHp:36,attack:14,defense:5,move:4},
    {id:'e1',name:'演練敵將甲',side:'enemy',x:5,y:2,hp:25,maxHp:25,attack:10,defense:3,move:3},
    {id:'e2',name:'演練敵將乙',side:'enemy',x:6,y:3,hp:25,maxHp:25,attack:10,defense:3,move:3},
  ],
});
