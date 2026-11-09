/** Opcode01 battle caller496E0; ordinary AI's reviewed shadow path is reused. */
import {occupancyOf} from './battle-movement.mjs';
import {UnsupportedRuleError} from './abilities.mjs';
const DIRS=[[0,-1],[1,0],[0,1],[-1,0]],clone=structuredClone;
export function resolveScriptedMovement({units,board,definition,destination,rngState,configurationScale,ai,movement,searchGroup,groupCosts}){
 const out=clone(units),u=out.find(x=>x.definitionIndex===definition);if(!u)return {units:out,rngState,events:[],applied:false,reason:'actor_missing'};
 const valid=p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.y>=0&&p.x<board.width&&p.y<board.height;
 if(!valid(destination))return {units:out,rngState,events:[],applied:false,reason:'destination_out_of_bounds'};
 const occ=occupancyOf(board,out),index=p=>p.x+p.y*board.width;let goal={...destination};
 // Removed actors retain removal state. Native writes their dormant coordinates;
 // this is a cinematic field write, never revival or party recruitment.
 if(u.state15===4){if(occ[index(goal)]===255&&movement.terrainCost(u,board.terrain[index(goal)])!==255){u.aiDestination={...goal};u.followSlot=255;}return {units:out,rngState,events:[],applied:true,offGridPosition:{slotIndex:u.slotIndex,position:goal,state15:4}};}
 const oldControl=u.control17;u.flags16|=4;u.control17=0;
 if(occ[index(goal)]!==255){const costs=groupCosts?.[searchGroup];if(searchGroup===null||!Array.isArray(costs)||costs.length!==23)throw new UnsupportedRuleError('scripted_destination_search_group_unknown');
  function find(p,left){if(!valid(p))return null;if(occ[index(p)]===255&&costs[board.terrain[index(p)]]!==255)return p;if(left)for(const[dx,dy]of DIRS){const result=find({x:p.x+dx,y:p.y+dy},left-1);if(result)return result;}return null;}
  goal=find(goal,10);if(!goal)throw new UnsupportedRuleError('scripted_destination_no_free_cell');
 }
 if(occ[index(goal)]===255&&movement.terrainCost(u,board.terrain[index(goal)])!==255){u.aiDestination={...goal};u.followSlot=255;}
 const p=ai.chooseAIAction({unit:u,units:out,board,rngState,configurationScale});Object.assign(u,p.unitChanges);const events=[];
 if(p.destination&&p.path.length>1){u.position={...p.destination};u.facing18=p.finalFacing;u.flags16=p.orientationFlags|64;events.push({type:'unit_movement',slotIndex:u.slotIndex,path:p.path,directions:p.directions,source:'scenario_script'});}
 if(p.markActed)u.flags16|=128;if(oldControl===7)u.control17=7;u.flags16&=59;
 return {units:out,rngState:p.rngState,events,applied:true};
}
