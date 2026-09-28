import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { actionId, canonicaliseAction, stableStringify } from '../../packages/wallet-guard/dist/index.js';

const address=(c)=>`0x${c.repeat(40)}`;
const fixtures=[
  canonicaliseAction({from:address('a'),to:address('b'),value:'0x0',data:'0xa9059cbb'+address('c').slice(2).padStart(64,'0')+(123n).toString(16).padStart(64,'0')},8453),
  canonicaliseAction({from:address('a'),to:address('d'),value:'0x10',data:'0x',gas:'0x5208',maxFeePerGas:'0x12',maxPriorityFeePerGas:'0x2',nonce:'0x7',chainId:'0x2105'},8453),
  canonicaliseAction({from:address('a'),to:address('e'),value:'0x0',data:'0xabcdef01',type:'0x2',accessList:[{address:address('f'),storageKeys:[`0x${'0'.repeat(64)}`]}]},1),
];

const python=`import sys,json,hashlib\nobj=json.loads(sys.stdin.read())\nraw=json.dumps(obj,sort_keys=True,separators=(",",":"),ensure_ascii=False)\nprint(hashlib.sha256(raw.encode("utf-8")).hexdigest())\n`;

for(const action of fixtures){
  const js=await actionId(action);
  const py=execFileSync('python',['-c',python],{input:stableStringify(action),encoding:'utf8'}).trim();
  assert.equal(js,py,`JS/Python action hash mismatch for ${stableStringify(action)}`);
}
console.log(`Canonical action hash parity passed for ${fixtures.length} representative requests.`);
