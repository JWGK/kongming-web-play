/** Pure original 0x41CA0 targeting geometry and 0x41B8C occupancy/side filter. */
const CARDINAL=[[0,-1],[1,0],[0,1],[-1,0]];
const DIAGONAL=[[1,-1],[1,1],[-1,1],[-1,-1]];
const DISTANCE_TWO=[[2,0],[-2,0],[0,2],[0,-2]];
const PHYSICAL=[0,1,1,2,3,3,0,0,0,1,1,1,4,4,4,2,3,0,0,0,0,0,0,1,1,0,0,0,0,0,1,0,1,1,1,1,1,0,0,1];
function integer(n,min,max,label){if(!Number.isInteger(n)||n<min||n>max)throw new RangeError(label);return n;}
export function physicalRangeCode(classIndex){return PHYSICAL[integer(classIndex,0,39,'classIndex')];}
export function targetingCoordinates({position,rangeCode,sideMask=0,width,height,units=[]}){
 integer(rangeCode,0,255,'rangeCode');integer(sideMask,0,3,'sideMask');integer(width,1,255,'width');integer(height,1,255,'height');
 integer(position.x,0,width-1,'x');integer(position.y,0,height-1,'y');
 if(rangeCode===255)return Object.freeze([]);
 const expanded=(rangeCode&128)!==0;const kind=(rangeCode&127)+(expanded?1:0);if(kind>5)throw new RangeError('Unknown target geometry');
 const out=[];const push=(x,y)=>{x&=255;y&=255;if(x<width&&y<height)out.push(Object.freeze({x,y}));};
 const add=(dx,dy)=>push(position.x+dx,position.y+dy);
 if((sideMask&2)===0&&(sideMask&1))add(0,0);
 // Original full-field branch iterates fixed slot partitions, not actor-relative.
 if(kind===5){for(const u of [...units].sort((a,b)=>a.slotIndex-b.slotIndex))if(u.state15===2&&((sideMask&1)?u.slotIndex<15:u.slotIndex>=15))push((u.position??u).x,(u.position??u).y);}
 if((kind<=1||expanded)&&kind<=4)for(const p of CARDINAL)add(...p);
 if((kind===1||expanded)&&kind<=3)for(const p of DIAGONAL)add(...p);
 if(kind===2)for(const p of DISTANCE_TWO)add(...p);
 if(kind===3){for(let dx=-1;dx<=1;dx++){add(dx,-2);add(dx,2);}for(let dy=-1;dy<=1;dy++){add(2,dy);add(-2,dy);}}
 if(kind===4&&!expanded){for(let dx=-2;dx<=2;dx++){add(dx,-3);add(dx,3);}for(let dy=-2;dy<=2;dy++){add(-3,dy);add(3,dy);}}
 return Object.freeze(out);
}
export function enumerateTargets({actor,units,rangeCode,sideMask=0,width,height,position=actor.position??actor}){
 integer(actor.slotIndex,0,44,'actor slotIndex');if(!Array.isArray(units))throw new TypeError('Explicit units required');
 const occupied=new Map();
 for(const u of units){integer(u.slotIndex,0,44,'unit slotIndex');if(u.state15!==2)continue;integer(u.classIndex,0,255,'classIndex');const p=u.position??u;integer(p.x,0,width-1,'unit x');integer(p.y,0,height-1,'unit y');const k=`${p.x},${p.y}`;if(occupied.has(k))throw new TypeError('Duplicate occupancy');occupied.set(k,u);}
 const result=[];
 for(const p of targetingCoordinates({position,rangeCode,sideMask,width,height,units})){
  const target=occupied.get(`${p.x},${p.y}`);if(!target||target.classIndex>39)continue;
  const same=(actor.slotIndex<15)===(target.slotIndex<15);
  if(same===Boolean(sideMask&1))result.push(target.slotIndex);
 }
 return Object.freeze(result);
}
