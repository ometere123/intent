import fs from 'node:fs';
import { createPublicClient, createWalletClient, http, encodeFunctionData, parseEventLogs } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

const EXPECTED_CHAIN = 11155111;
const fileEnv = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
  const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)];
}));
const env = { ...fileEnv, ...process.env };
if (!env.SEPOLIA_RPC_URL || !env.DEPLOYER_PRIVATE_KEY || !env.SAFE_OWNER_PRIVATE_KEY || !env.INTENT_POLICY_OWNER || !env.INTENT_POLICY_ID_HASH) throw new Error('Missing local Sepolia configuration or INTENT policy binding');
const deployer = privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY);
const owner = privateKeyToAccount(env.SAFE_OWNER_PRIVATE_KEY);
const attestors = [1, 2, 3, 4, 5].map((n) => privateKeyToAccount(env[`ATTESTOR_${n}_PRIVATE_KEY`]).address);
const publicClient = createPublicClient({ chain: sepolia, transport: http(env.SEPOLIA_RPC_URL) });
const wallet = createWalletClient({ account: deployer, chain: sepolia, transport: http(env.SEPOLIA_RPC_URL) });

function artifact(path) { return JSON.parse(fs.readFileSync(path, 'utf8')); }
const registryArtifact = artifact('protected-account/out/IntentAuthorizationRegistry.sol/IntentAuthorizationRegistry.json');
const guardArtifact = artifact('protected-account/out/IntentSafeGuard.sol/IntentSafeGuard.json');
const safeArtifact = artifact('protected-account/out/Safe.sol/Safe.json');
const factoryArtifact = artifact('protected-account/out/SafeProxyFactory.sol/SafeProxyFactory.json');
const targetArtifact = artifact('protected-account/out/IntentDemoTarget.sol/IntentDemoTarget.json');

async function deploy(abi, bytecode, args = []) {
  const normalizedBytecode = typeof bytecode === 'string' ? bytecode : bytecode.object;
  const hash = await wallet.deployContract({ abi, bytecode: normalizedBytecode, args });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error(`deployment failed: ${hash}`);
  return { address: receipt.contractAddress, hash, receipt };
}

async function main() {
  const chainId = await publicClient.getChainId();
  if (chainId !== EXPECTED_CHAIN) throw new Error(`wrong Sepolia chain: ${chainId}`);
  const balance = await publicClient.getBalance({ address: deployer.address });
  console.log(`CHAIN_ID=${chainId}`);
  console.log(`DEPLOYER=${deployer.address}`);
  console.log(`DEPLOYER_BALANCE_WEI=${balance}`);
  console.log(`SAFE_OWNER=${owner.address}`);
  console.log(`INTENT_POLICY_OWNER=${env.INTENT_POLICY_OWNER}`);
  console.log(`INTENT_POLICY_ID_HASH=${env.INTENT_POLICY_ID_HASH}`);
  attestors.forEach((address, i) => console.log(`ATTESTOR_${i + 1}=${address}`));

  const registry = await deploy(registryArtifact.abi, registryArtifact.bytecode, [
    '0x7b26BC39E2A6aB74A677E558FC53E8b3a3fBe6Bf', attestors, 3n,
  ]);
  console.log(`REGISTRY=${registry.address}`); console.log(`REGISTRY_TX=${registry.hash}`);

  const singleton = await deploy(safeArtifact.abi, safeArtifact.bytecode);
  const factory = await deploy(factoryArtifact.abi, factoryArtifact.bytecode);
  const initializer = encodeFunctionData({ abi: safeArtifact.abi, functionName: 'setup', args: [[owner.address], 1n, '0x0000000000000000000000000000000000000000', '0x', '0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000', 0n, '0x0000000000000000000000000000000000000000'] });
  const proxyTx = await wallet.writeContract({ address: factory.address, abi: factoryArtifact.abi, functionName: 'createProxyWithNonce', args: [singleton.address, initializer, 1n] });
  const proxyReceipt = await publicClient.waitForTransactionReceipt({ hash: proxyTx });
  const proxyEvents = parseEventLogs({ abi: factoryArtifact.abi, eventName: 'ProxyCreation', logs: proxyReceipt.logs });
  const safe = proxyEvents[0]?.args?.proxy;
  if (!safe) throw new Error('Safe proxy address not found');
  console.log(`SAFE_SINGLETON=${singleton.address}`); console.log(`SAFE_FACTORY=${factory.address}`);
  console.log(`SAFE=${safe}`); console.log(`SAFE_SETUP_TX=${proxyTx}`);

  const guard = await deploy(guardArtifact.abi, guardArtifact.bytecode, [safe, registry.address]);
  console.log(`GUARD=${guard.address}`); console.log(`GUARD_TX=${guard.hash}`);

  const setGuardData = encodeFunctionData({ abi: safeArtifact.abi, functionName: 'setGuard', args: [guard.address] });
  const safeNonce = await publicClient.readContract({ address: safe, abi: safeArtifact.abi, functionName: 'nonce' });
  const safeHash = await publicClient.readContract({ address: safe, abi: safeArtifact.abi, functionName: 'getTransactionHash', args: [safe, 0n, setGuardData, 0, 0n, 0n, 0n, '0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000', safeNonce] });
  const ownerSig = await owner.sign({ hash: safeHash });
  const installTx = await wallet.writeContract({ address: safe, abi: safeArtifact.abi, functionName: 'execTransaction', args: [safe, 0n, setGuardData, 0, 0n, 0n, 0n, '0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000', ownerSig] });
  await publicClient.waitForTransactionReceipt({ hash: installTx });
  console.log(`GUARD_INSTALL_TX=${installTx}`);

  const registerTx = await wallet.writeContract({ address: registry.address, abi: registryArtifact.abi, functionName: 'registerGuard', args: [safe, guard.address, env.INTENT_POLICY_OWNER, env.INTENT_POLICY_ID_HASH] });
  await publicClient.waitForTransactionReceipt({ hash: registerTx });
  console.log(`GUARD_REGISTER_TX=${registerTx}`);

  const target = await deploy(targetArtifact.abi, targetArtifact.bytecode);
  console.log(`TARGET=${target.address}`); console.log(`TARGET_TX=${target.hash}`);

  const metadata = { chainId, deployer: deployer.address, safeOwner: owner.address, attestors, registry: registry.address, registryTx: registry.hash, safeSingleton: singleton.address, safeFactory: factory.address, safe: String(safe), safeSetupTx: proxyTx, guard: guard.address, guardTx: guard.hash, guardInstallTx: installTx, guardRegisterTx: registerTx, target: target.address, targetTx: target.hash };
  fs.writeFileSync('.sepolia-deployment.json', JSON.stringify(metadata, null, 2) + '\n');
}
main().catch((error) => { console.error(`DEPLOYMENT_FAILED=${error instanceof Error ? error.message : 'unknown error'}`); process.exitCode = 1; });
