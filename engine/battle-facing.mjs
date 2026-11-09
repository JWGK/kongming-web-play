/** Source 373B4 category -> 8C228 facing offset: arrows1, cannon2, tiger0.
 * Only individually reviewed class domains are enabled. */
import {UnsupportedRuleError} from './abilities.mjs';
export function battleFacingPair(actor,target,{physicalProfile=null}={}){
 if(![0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,35,39].includes(actor.classIndex)&&!((['fengming','nanan-tianshui','jicheng','jieting','hanzhong-retreat','chencang','second-chencang'].includes(physicalProfile)&&[34,36,37,38].includes(actor.classIndex))||(['qishan','jieting','hanzhong-retreat','chencang','second-chencang'].includes(physicalProfile)&&[33,38].includes(actor.classIndex))||(physicalProfile==='mandu'&&[36,37].includes(actor.classIndex))||(['taohuashui','panshegu'].includes(physicalProfile)&&[34,36,37].includes(actor.classIndex))))throw new UnsupportedRuleError('battle_facing_class');
 if(!actor.position||!target.position)throw new RangeError('Facing participants must be on-grid');
 const a=structuredClone(actor),b=structuredClone(target),offset=[12,13,14].includes(a.classIndex)?2:[3,4,5,15,16].includes(a.classIndex)?1:0;
 let da=null,db=null;
 if(a.position.x+offset<b.position.x){da=1;db=3;}else if(a.position.x-offset>b.position.x){da=3;db=1;}
 else if(a.position.y+offset<b.position.y){da=2;db=0;}else if(a.position.y-offset>b.position.y){da=0;db=2;}
 if(da!==null){a.facing18=da;b.facing18=db;if(da===1){a.flags16|=16;b.flags16&=~16;}else if(da===3){a.flags16&=~16;b.flags16|=16;}}
 return {actor:a,target:b};
}
