/** Opaque source campaign fields. Unknown imported history is never guessed. */
export function validateCampaignByte33(value){if(value!==null&&(!Number.isInteger(value)||value<0||value>255))throw new TypeError('Invalid source campaign byte33');return value;}
export function applyCampaignByte33(carry,operand){if(!Number.isInteger(operand)||operand<0||operand>65535)throw new TypeError('Exact source u16 operand required');return {...structuredClone(carry),sourceCampaignByte33:operand&255};}
/** Native campaign word+16 is saved as unsigned16. Its meaning is intentionally
 * opaque; an untracked imported history stays unknown until a source reset. */
export function validateCampaignWord16(value){if(value!==null&&(!Number.isInteger(value)||value<0||value>65535))throw new TypeError('Invalid source campaign word16');return value;}
export function addCampaignWord16(value,operand){validateCampaignWord16(value);if(!Number.isInteger(operand)||operand<0||operand>65535)throw new TypeError('Exact source u16 operand required');return value===null?null:Math.min(50000,value+operand);}
export function applyCampaignCurrencyGrant(carry,operand){if(!Number.isInteger(operand)||operand<0||operand>65535)throw new TypeError('Exact source u16 operand required');const out=structuredClone(carry),before=out.persistentState?.currency;if(!Number.isInteger(before)||before<0||before>50000)throw new TypeError('Exact carried currency required');out.persistentState.currency=Math.min(50000,before+operand);return out;}
