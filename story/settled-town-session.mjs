// An exterior action is evaluated on a detached copy. The story owner can
// reject a stale action or a failed native handoff without changing the
// existing view, source room, or carried inventory.
const savedVisits=Object.freeze(['town','world']);
export function createDetachedTownSession(open, options, city) {
  if(typeof open!=='function'||!Number.isSafeInteger(city)||city<0||city>63)
    throw new TypeError('Owned town factory and native city required');
  const issued=new WeakMap();
  const publish=(serialized, view, carry)=>{
    const token=Object.freeze({});
    issued.set(token,serialized);
    return Object.freeze({token,view,carry});
  };
  function fork(serialized=null) {
    const operations=[], requests=[], routes=[];
    const engine=open({...options,
      observeOperation:action=>operations.push(action),
      request:request=>requests.push(structuredClone(request)),
      route:(event,carry)=>{routes.push({event,carry:structuredClone(carry)});return true;},
    });
    if(serialized!==null)engine.restore(serialized);
    return {engine,operations,requests,routes};
  }
  function finish(engine) {
    const view=engine.view, carry=engine.carry;
    // Preserve only the item context that the existing UI uses, never insert
    // the controller's serialized checkpoint into a physical save.
    const checkpoint=publish(engine.serialize(),view,carry);
    return Object.freeze({...checkpoint,inventory:view.transaction?
      {transaction:view.transaction,persistentState:carry.persistentState}:null});

  }
  function read(token) {
    if(!issued.has(token))throw new RangeError('Town checkpoint does not belong to this origin');
    return issued.get(token);
  }
  const start=finish(fork().engine);
  return Object.freeze({
    start,
    saveLocation(token) {
      const {engine}=fork(read(token)), state=engine.getTownState();
      if(state.stage!=='saveSlots'||state.city!==city||state.facility!==null||
         state.transaction!==null||!savedVisits.includes(state.returnStage))
        throw new RangeError('Exact settled native Chengdu save bank required');
      return state.returnStage;
    },
    restoreLocation(visit) {
      if(!savedVisits.includes(visit))throw new RangeError('Invalid native Chengdu visit');
      if(visit==='town')return start;
      const {engine}=fork();
      engine.choose('world');
      if(engine.view.stage!==visit)throw new RangeError('Missing original Chengdu world exit');
      return finish(engine);
    },
    apply(token, action) {
      const {engine,operations,requests,routes}=fork(read(token));
      if(!action || typeof action!=='object')throw new TypeError('Town action required');
      const fields=Object.keys(action).sort().join(',');
      if(action.type==='choose'&&fields==='id,type'&&typeof action.id==='string')engine.choose(action.id);
      else if(fields==='type'&&['advance','back','openMenu','completeSave'].includes(action.type))engine[action.type]();
      else throw new RangeError('Unknown town action');
      if(routes.length+requests.length>1||operations.length>1)throw new RangeError('Town action produced multiple outcomes');
      return Object.freeze({checkpoint:finish(engine),operations,request:requests[0]??null,route:routes[0]??null});
    },
  });
}
