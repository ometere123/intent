import test from 'node:test';
import assert from 'node:assert/strict';
import { actionId, canonicaliseAction, deterministicChecks, IntentGuardProvider, UINT256_MAX } from '../dist/index.js';

const addr = (char) => `0x${char.repeat(40)}`;

function provider({ chainId = 1, account = addr('a'), sendHash = `0x${'9'.repeat(64)}` } = {}) {
  let chain = chainId;
  let selected = account;
  const calls = [];
  return {
    calls,
    setAccount(next) { selected = next; },
    setChain(next) { chain = next; },
    getChain() { return chain; },
    async request({ method, params }) {
      calls.push({ method, params });
      if (method === 'eth_chainId') return `0x${chain.toString(16)}`;
      if (method === 'eth_accounts') return [selected];
      if (method === 'wallet_switchEthereumChain') {
        chain = Number.parseInt(params[0].chainId, 16);
        return null;
      }
      if (method === 'eth_sendTransaction') return sendHash;
      if (method === 'eth_blockNumber') return '0x123';
      return null;
    },
  };
}

const intent = (revision = 1) => ({ id: 'purchase', revision, statement: 'buy only cloud' });

function matching(actionId, revision = 1) {
  return {
    outcome: 'MATCHES_INTENT',
    reasonCode: 'within_mandate',
    rationale: 'Within mandate.',
    actionId,
    intentId: 'purchase',
    intentRevision: revision,
  };
}

test('canonical action ID is stable', async () => {
  const tx = { from: addr('a'), to: addr('b'), value: '0x10', data: '0x12345678' };
  const a = canonicaliseAction(tx, 8453);
  const b = canonicaliseAction({ data: '0x12345678', value: '0x10', to: addr('b'), from: addr('a') }, 8453);
  assert.equal(await actionId(a), await actionId(b));
});

test('unlimited ERC20 approval blocks locally', () => {
  const spender = addr('b').slice(2).padStart(64, '0');
  const amount = UINT256_MAX.toString(16).padStart(64, '0');
  const action = canonicaliseAction({ from: addr('a'), to: addr('c'), data: `0x095ea7b3${spender}${amount}` }, 1);
  const result = deterministicChecks({ id: 'x', revision: 1, statement: 'never unlimited', hardRules: { forbidUnlimitedApprovals: true } }, action);
  assert.equal(result.status, 'BLOCK');
});

test('local hard-rule block never asks consensus or forwards', async () => {
  const base = provider();
  let evaluations = 0;
  const spender = addr('b').slice(2).padStart(64, '0');
  const amount = UINT256_MAX.toString(16).padStart(64, '0');
  const guarded = new IntentGuardProvider(base, {
    resolveIntent: async () => ({ ...intent(), hardRules: { forbidUnlimitedApprovals: true } }),
    evaluator: { evaluate: async () => { evaluations += 1; throw new Error('should not execute'); } },
  });
  await assert.rejects(() => guarded.request({ method: 'eth_sendTransaction', params: [{ from: addr('a'), to: addr('c'), data: `0x095ea7b3${spender}${amount}` }] }), /unlimited approval/i);
  assert.equal(evaluations, 0);
  assert.equal(base.calls.filter((x) => x.method === 'eth_sendTransaction').length, 0);
});

test('does not forward when GenLayer says DOES_NOT_MATCH', async () => {
  const base = provider();
  const guarded = new IntentGuardProvider(base, {
    resolveIntent: async () => intent(),
    evaluator: {
      evaluate: async ({ actionId }) => ({ outcome: 'DOES_NOT_MATCH', reasonCode: 'wrong_purpose', rationale: 'Not authorised.', actionId, intentId: 'purchase', intentRevision: 1 }),
    },
  });
  await assert.rejects(() => guarded.request({ method: 'eth_sendTransaction', params: [{ from: addr('a'), to: addr('b'), data: '0xdeadbeef' }] }), /Not authorised/);
  assert.equal(base.calls.filter((x) => x.method === 'eth_sendTransaction').length, 0);
});

test('UNCLEAR fails closed and never forwards', async () => {
  const base = provider();
  const guarded = new IntentGuardProvider(base, {
    resolveIntent: async () => intent(),
    evaluator: { evaluate: async ({ actionId }) => ({ outcome: 'UNCLEAR', reasonCode: 'insufficient_evidence', rationale: 'Cannot establish authority.', actionId, intentId: 'purchase', intentRevision: 1 }) },
  });
  await assert.rejects(() => guarded.request({ method: 'eth_sendTransaction', params: [{ from: addr('a'), to: addr('b'), data: '0xdeadbeef' }] }), /Cannot establish authority/);
  assert.equal(base.calls.filter((x) => x.method === 'eth_sendTransaction').length, 0);
});

test('adjudication failure fails closed', async () => {
  const base = provider();
  const guarded = new IntentGuardProvider(base, {
    resolveIntent: async () => intent(),
    evaluator: { evaluate: async () => { throw new Error('GenLayer unavailable'); } },
  });
  await assert.rejects(() => guarded.request({ method: 'eth_sendTransaction', params: [{ from: addr('a'), to: addr('b'), data: '0xdeadbeef' }] }), /GenLayer unavailable/);
  assert.equal(base.calls.filter((x) => x.method === 'eth_sendTransaction').length, 0);
});

test('decision binding mismatch never forwards', async () => {
  const base = provider();
  const guarded = new IntentGuardProvider(base, {
    resolveIntent: async () => intent(2),
    evaluator: { evaluate: async ({ actionId }) => ({ ...matching(actionId, 2), actionId: `${actionId.slice(0, -1)}0` }) },
  });
  await assert.rejects(() => guarded.request({ method: 'eth_sendTransaction', params: [{ from: addr('a'), to: addr('b'), data: '0xdeadbeef' }] }), /does not bind/);
  assert.equal(base.calls.filter((x) => x.method === 'eth_sendTransaction').length, 0);
});

test('account change during adjudication aborts after chain restoration', async () => {
  const base = provider({ chainId: 8453 });
  const guarded = new IntentGuardProvider(base, {
    resolveIntent: async () => intent(),
    evaluator: { evaluate: async ({ actionId }) => { base.setChain(61999); base.setAccount(addr('b')); return matching(actionId); } },
  });
  await assert.rejects(() => guarded.request({ method: 'eth_sendTransaction', params: [{ from: addr('a'), to: addr('c'), data: '0xabcdef01' }] }), /Selected account changed/);
  assert.equal(base.getChain(), 8453);
  assert.equal(base.calls.filter((x) => x.method === 'eth_sendTransaction').length, 0);
});

test('transaction mutation during adjudication aborts', async () => {
  const base = provider({ chainId: 8453 });
  const tx = { from: addr('a'), to: addr('b'), value: '0x0', data: '0xabcdef01' };
  const guarded = new IntentGuardProvider(base, {
    resolveIntent: async () => intent(),
    evaluator: { evaluate: async ({ actionId }) => { base.setChain(61999); tx.to = addr('c'); return matching(actionId); } },
  });
  await assert.rejects(() => guarded.request({ method: 'eth_sendTransaction', params: [tx] }), /Target transaction changed/);
  assert.equal(base.calls.filter((x) => x.method === 'eth_sendTransaction').length, 0);
});

test('forwards exact transaction after favourable bound decision', async () => {
  const base = provider({ chainId: 8453 });
  const tx = { from: addr('a'), to: addr('b'), value: '0x0', data: '0xabcdef01' };
  const guarded = new IntentGuardProvider(base, {
    resolveIntent: async () => intent(3),
    evaluator: {
      evaluate: async ({ actionId }) => { base.setChain(61999); return matching(actionId, 3); },
    },
  });
  const hash = await guarded.request({ method: 'eth_sendTransaction', params: [tx] });
  assert.equal(hash, `0x${'9'.repeat(64)}`);
  assert.equal(base.getChain(), 8453);
  const sends = base.calls.filter((x) => x.method === 'eth_sendTransaction');
  assert.equal(sends.length, 1);
  assert.deepEqual(sends[0].params, [tx]);
});

test('non-send provider methods pass through untouched', async () => {
  const base = provider({ chainId: 8453 });
  const guarded = new IntentGuardProvider(base, {
    resolveIntent: async () => { throw new Error('not expected'); },
    evaluator: { evaluate: async () => { throw new Error('not expected'); } },
  });
  assert.equal(await guarded.request({ method: 'eth_blockNumber' }), '0x123');
});

test('transaction from must match selected wallet account', async () => {
  const base = provider({ account: addr('a') });
  const guarded = new IntentGuardProvider(base, {
    resolveIntent: async () => intent(),
    evaluator: { evaluate: async () => { throw new Error('not expected'); } },
  });
  await assert.rejects(() => guarded.request({ method: 'eth_sendTransaction', params: [{ from: addr('b'), to: addr('c'), data: '0xabcdef01' }] }), /does not match the selected wallet account/);
  assert.equal(base.calls.filter((x) => x.method === 'eth_sendTransaction').length, 0);
});

test('denied decision restores target chain before returning error', async () => {
  const base = provider({ chainId: 8453 });
  const guarded = new IntentGuardProvider(base, {
    resolveIntent: async () => intent(),
    evaluator: { evaluate: async ({ actionId }) => { base.setChain(61999); return { outcome:'DOES_NOT_MATCH', reasonCode:'conflict', rationale:'Denied.', actionId, intentId:'purchase', intentRevision:1 }; } },
  });
  await assert.rejects(() => guarded.request({ method:'eth_sendTransaction', params:[{ from:addr('a'), to:addr('b'), data:'0xabcdef01' }] }), /Denied/);
  assert.equal(base.getChain(), 8453);
});

test('adjudication error restores target chain before failing closed', async () => {
  const base = provider({ chainId: 8453 });
  const guarded = new IntentGuardProvider(base, {
    resolveIntent: async () => intent(),
    evaluator: { evaluate: async () => { base.setChain(61999); throw new Error('validator outage'); } },
  });
  await assert.rejects(() => guarded.request({ method:'eth_sendTransaction', params:[{ from:addr('a'), to:addr('b'), data:'0xabcdef01' }] }), /validator outage/);
  assert.equal(base.getChain(), 8453);
});

test('gas or fee mutation changes the action binding and aborts', async () => {
  const base = provider({ chainId: 8453 });
  const tx = { from:addr('a'), to:addr('b'), data:'0xabcdef01', maxFeePerGas:'0x10' };
  const guarded = new IntentGuardProvider(base, {
    resolveIntent: async () => intent(),
    evaluator: { evaluate: async ({ actionId }) => { base.setChain(61999); tx.maxFeePerGas='0xffff'; return matching(actionId); } },
  });
  await assert.rejects(() => guarded.request({ method:'eth_sendTransaction', params:[tx] }), /Target transaction changed/);
  assert.equal(base.calls.filter((x)=>x.method==='eth_sendTransaction').length,0);
});

test('standard ERC20 transfer is decoded deterministically without trusting an ABI label', async () => {
  const { describeKnownAction } = await import('../dist/index.js');
  const recipient = addr('b').slice(2).padStart(64,'0');
  const amount = (123n).toString(16).padStart(64,'0');
  const action = canonicaliseAction({ from:addr('a'), to:addr('c'), data:`0xa9059cbb${recipient}${amount}` },8453);
  const summary=describeKnownAction(action);
  assert.match(summary,/transfer\(address,uint256\)/);
  assert.match(summary,/raw token amount 123/);
  assert.match(summary,new RegExp(addr('b')));
});

test('malformed addresses fail closed before consensus', async () => {
  const base = provider();
  let evaluations = 0;
  const guarded = new IntentGuardProvider(base, {
    resolveIntent: async () => intent(),
    evaluator: { evaluate: async () => { evaluations += 1; throw new Error('not expected'); } },
  });
  await assert.rejects(
    () => guarded.request({ method:'eth_sendTransaction', params:[{ from:addr('a'), to:'0x1234', data:'0x' }] }),
    /20-byte/i,
  );
  assert.equal(evaluations, 0);
  assert.equal(base.calls.filter((x)=>x.method==='eth_sendTransaction').length,0);
});

test('conflicting data and input fail closed', async () => {
  const base = provider();
  const guarded = new IntentGuardProvider(base, {
    resolveIntent: async () => intent(),
    evaluator: { evaluate: async () => { throw new Error('not expected'); } },
  });
  await assert.rejects(
    () => guarded.request({ method:'eth_sendTransaction', params:[{ from:addr('a'), to:addr('b'), data:'0x1234', input:'0xabcd' }] }),
    /data and transaction\.input disagree/i,
  );
});

test('declared transaction chain must match provider chain', async () => {
  const base = provider({chainId:8453});
  const guarded = new IntentGuardProvider(base, {
    resolveIntent: async () => intent(),
    evaluator: { evaluate: async () => { throw new Error('not expected'); } },
  });
  await assert.rejects(
    () => guarded.request({ method:'eth_sendTransaction', params:[{ from:addr('a'), to:addr('b'), chainId:'0x1', data:'0x' }] }),
    /does not match provider chain/i,
  );
});

test('chain allowlist blocks locally', () => {
  const action = canonicaliseAction({ from:addr('a'), to:addr('b'), data:'0x' },8453);
  const result=deterministicChecks({id:'x',revision:1,statement:'x',hardRules:{allowedTargetChainIds:[1,10]}},action);
  assert.equal(result.status,'BLOCK');
  assert.match(result.summary,/chain allowlist/i);
});

test('contract creation can be deterministically forbidden', () => {
  const action = canonicaliseAction({ from:addr('a'), to:null, data:'0x6000' },8453);
  const result=deterministicChecks({id:'x',revision:1,statement:'x',hardRules:{forbidContractCreation:true}},action);
  assert.equal(result.status,'BLOCK');
});

test('concurrent guarded sends are serialised across wallet chain switching', async () => {
  const base=provider({chainId:8453});
  let active=0;
  let maxActive=0;
  const order=[];
  const guarded=new IntentGuardProvider(base,{
    resolveIntent:async()=>intent(),
    evaluator:{
      evaluate:async({actionId})=>{
        active+=1; maxActive=Math.max(maxActive,active); order.push(`start:${actionId.slice(0,6)}`);
        base.setChain(61999);
        await new Promise((resolve)=>setTimeout(resolve,15));
        active-=1; order.push(`end:${actionId.slice(0,6)}`);
        return matching(actionId);
      },
    },
  });
  const first={from:addr('a'),to:addr('b'),data:'0x11111111'};
  const second={from:addr('a'),to:addr('c'),data:'0x22222222'};
  const [a,b]=await Promise.all([
    guarded.request({method:'eth_sendTransaction',params:[first]}),
    guarded.request({method:'eth_sendTransaction',params:[second]}),
  ]);
  assert.equal(a,`0x${'9'.repeat(64)}`);
  assert.equal(b,`0x${'9'.repeat(64)}`);
  assert.equal(maxActive,1);
  assert.equal(base.getChain(),8453);
  assert.equal(base.calls.filter((x)=>x.method==='eth_sendTransaction').length,2);
  assert.equal(order.length,4);
  assert.match(order[0],/^start:/);
  assert.match(order[1],/^end:/);
  assert.match(order[2],/^start:/);
  assert.match(order[3],/^end:/);
});

test('standalone canonicalisation requires a signer address or fallback account', () => {
  assert.throws(
    () => canonicaliseAction({ to:addr('b'), data:'0x' },8453),
    /transaction\.from must be a 20-byte/i,
  );
  const action=canonicaliseAction({to:addr('b'),data:'0x'},8453,addr('a'));
  assert.equal(action.from,addr('a'));
  assert.equal(action.request.from,addr('a'));
});

test('malformed hard-rule addresses fail closed instead of being ignored', () => {
  const action=canonicaliseAction({from:addr('a'),to:addr('b'),data:'0x'},8453);
  const result=deterministicChecks({id:'x',revision:1,statement:'x',hardRules:{forbiddenTargets:['0x1234']}},action);
  assert.equal(result.status,'BLOCK');
  assert.match(result.summary,/invalid target-address rule/i);
});

test('malformed hard-rule selectors fail closed', () => {
  const action=canonicaliseAction({from:addr('a'),to:addr('b'),data:'0x12345678'},8453);
  const result=deterministicChecks({id:'x',revision:1,statement:'x',hardRules:{forbiddenSelectors:['0x12']}},action);
  assert.equal(result.status,'BLOCK');
  assert.match(result.summary,/invalid function-selector rule/i);
});

test('malformed hard-rule chain IDs fail closed', () => {
  const action=canonicaliseAction({from:addr('a'),to:addr('b'),data:'0x'},8453);
  const result=deterministicChecks({id:'x',revision:1,statement:'x',hardRules:{allowedTargetChainIds:[8453,0]}},action);
  assert.equal(result.status,'BLOCK');
  assert.match(result.summary,/invalid target-chain rule/i);
});

test('native-value ceiling blocks above the exact wei bound', () => {
  const action=canonicaliseAction({from:addr('a'),to:addr('b'),value:'0x65',data:'0x'},8453);
  const result=deterministicChecks({id:'x',revision:1,statement:'x',hardRules:{maxNativeValueWei:'100'}},action);
  assert.equal(result.status,'BLOCK');
  assert.match(result.summary,/native value exceeds/i);
});

test('invalid native-value hard rule fails closed', () => {
  const action=canonicaliseAction({from:addr('a'),to:addr('b'),value:'0x0',data:'0x'},8453);
  const result=deterministicChecks({id:'x',revision:1,statement:'x',hardRules:{maxNativeValueWei:'1e18'}},action);
  assert.equal(result.status,'BLOCK');
  assert.match(result.summary,/invalid native-value limit/i);
});

test('oversized canonical action is rejected before consensus', async () => {
  const base=provider({chainId:8453});
  let evaluations=0;
  const guarded=new IntentGuardProvider(base,{
    resolveIntent:async()=>intent(),
    evaluator:{evaluate:async()=>{evaluations+=1;throw new Error('not expected');}},
  });
  await assert.rejects(
    () => guarded.request({method:'eth_sendTransaction',params:[{from:addr('a'),to:addr('b'),data:'0x',vendorMemo:'x'.repeat(15000)}]}),
    /14,000-character contract evidence bound/i,
  );
  assert.equal(evaluations,0);
  assert.equal(base.calls.filter((x)=>x.method==='eth_sendTransaction').length,0);
});

test('oversized deterministic-check evidence is rejected before consensus', async () => {
  const base=provider({chainId:8453});
  let evaluations=0;
  const manyTargets=Array.from({length:220},()=>addr('b'));
  const guarded=new IntentGuardProvider(base,{
    resolveIntent:async()=>({...intent(),hardRules:{allowedTargets:manyTargets}}),
    evaluator:{evaluate:async()=>{evaluations+=1;throw new Error('not expected');}},
  });
  await assert.rejects(
    () => guarded.request({method:'eth_sendTransaction',params:[{from:addr('a'),to:addr('b'),data:'0x'}]}),
    /6,000-character contract bound/i,
  );
  assert.equal(evaluations,0);
  assert.equal(base.calls.filter((x)=>x.method==='eth_sendTransaction').length,0);
});

test('guard restores target chain even when a custom receipt recorder leaves wallet on Studionet', async () => {
  const base=provider({chainId:8453});
  const guarded=new IntentGuardProvider(base,{
    resolveIntent:async()=>intent(),
    evaluator:{
      evaluate:async({actionId})=>{base.setChain(61999);return matching(actionId);},
      recordExecutionReceipt:async()=>{base.setChain(61999);},
    },
  });
  const hash=await guarded.request({method:'eth_sendTransaction',params:[{from:addr('a'),to:addr('b'),data:'0xabcdef01'}]});
  assert.equal(hash,`0x${'9'.repeat(64)}`);
  assert.equal(base.getChain(),8453);
  assert.equal(base.calls.filter((x)=>x.method==='eth_sendTransaction').length,1);
});

test('EIP-1193 event listeners are forwarded to the base wallet provider', () => {
  const listeners=new Map();
  const base=provider();
  base.on=(event,listener)=>{listeners.set(event,listener);};
  base.removeListener=(event,listener)=>{if(listeners.get(event)===listener)listeners.delete(event);};
  const guarded=new IntentGuardProvider(base,{
    resolveIntent:async()=>intent(),
    evaluator:{evaluate:async({actionId})=>matching(actionId)},
  });
  let observed=null;
  const listener=(accounts)=>{observed=accounts;};
  assert.equal(guarded.on('accountsChanged',listener),guarded);
  listeners.get('accountsChanged')?.([addr('b')]);
  assert.deepEqual(observed,[addr('b')]);
  assert.equal(guarded.removeListener('accountsChanged',listener),guarded);
  assert.equal(listeners.has('accountsChanged'),false);
});

test('separate guard instances sharing one wallet provider are serialised together', async () => {
  const base=provider({chainId:8453});
  let active=0; let maxActive=0;
  const options={
    resolveIntent:async()=>intent(),
    evaluator:{
      evaluate:async({actionId})=>{
        active+=1; maxActive=Math.max(maxActive,active);
        base.setChain(61999);
        await new Promise((resolve)=>setTimeout(resolve,15));
        active-=1;
        return matching(actionId);
      },
    },
  };
  const guardA=new IntentGuardProvider(base,options);
  const guardB=new IntentGuardProvider(base,options);
  const [first,second]=await Promise.all([
    guardA.request({method:'eth_sendTransaction',params:[{from:addr('a'),to:addr('b'),data:'0x11111111'}]}),
    guardB.request({method:'eth_sendTransaction',params:[{from:addr('a'),to:addr('c'),data:'0x22222222'}]}),
  ]);
  assert.equal(first,`0x${'9'.repeat(64)}`);
  assert.equal(second,`0x${'9'.repeat(64)}`);
  assert.equal(maxActive,1);
  assert.equal(base.getChain(),8453);
});

test('throwing telemetry callback cannot poison the shared authorisation queue', async () => {
  const base=provider({chainId:8453});
  const options={
    resolveIntent:async()=>intent(),
    evaluator:{evaluate:async({actionId})=>{base.setChain(61999);return matching(actionId);}},
    onEvent:()=>{throw new Error('telemetry broken');},
  };
  const guardA=new IntentGuardProvider(base,options);
  const guardB=new IntentGuardProvider(base,options);
  const first=await guardA.request({method:'eth_sendTransaction',params:[{from:addr('a'),to:addr('b'),data:'0x11111111'}]});
  const second=await guardB.request({method:'eth_sendTransaction',params:[{from:addr('a'),to:addr('c'),data:'0x22222222'}]});
  assert.equal(first,`0x${'9'.repeat(64)}`);
  assert.equal(second,`0x${'9'.repeat(64)}`);
  assert.equal(base.getChain(),8453);
});
