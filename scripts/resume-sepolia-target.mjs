import fs from 'node:fs';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(Boolean).map((line) => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const deployer = privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY);
const publicClient = createPublicClient({ chain: sepolia, transport: http(env.SEPOLIA_RPC_URL, { retryCount: 5 }) });
const wallet = createWalletClient({ account: deployer, chain: sepolia, transport: http(env.SEPOLIA_RPC_URL, { retryCount: 5 }) });
const artifact = JSON.parse(fs.readFileSync('protected-account/out/IntentDemoTarget.sol/IntentDemoTarget.json', 'utf8'));
const normalized = typeof artifact.bytecode === 'string' ? artifact.bytecode : artifact.bytecode.object;

async function main() {
  if (await publicClient.getChainId() !== 11155111) throw new Error('wrong chain');
  const hash = await wallet.deployContract({ abi: artifact.abi, bytecode: normalized });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, retryCount: 5 });
  if (receipt.status !== 'success') throw new Error('target deployment failed');
  const metadata = { chainId: 11155111, deployer: deployer.address, safeOwner: '0x02d1cAaaa1C79Be548FD4Fd188dd7f851eCb9910', attestors: ['0x63e471E44F5E4a4BF3d98A612D3B4DEB2feC63D8','0xb2EC513545dB27b95a16Dd8db8006Bcbf65B96B0','0xD2d93c49D66639C9c5d601ca5aE1Ab5C278b46b7','0xd1bEDEEE9B3470edb179028F4E58FeB0F50AdbD6','0xec5eF3FA579f359614033e8f50C2733b0D01DAD1'], registry: '0xdca0557775d387d28b3f46a49d011a1e93ba982a', registryTx: '0x9fd9be7eab3b186818f81acdda660b066d48755d3a453a6ca5b6b0419d396a80', safeSingleton: '0xec0d3a131b4ebb570a7bee77ebad24d1a4667492', safeFactory: '0xf08f8869f56caccb20b152396618e188b4e45b7f', safe: '0xe4eB50EB02bdBd611960c0629B3C779C1645a4c7', safeSetupTx: '0x1c1e29d20c893e801dbf8f66187ddd26358fad9266e851236a159b8cf68b087d', guard: '0x9417cf657bf65e16f1eebc25b01083498ca9e703', guardTx: '0x3b9f360b7703516694f0147f572eb5b25ffc9d40d0d3920631d9a674b11ea2b7', guardInstallTx: '0x896f4a7a1af4777306ce41b3afa9969c915bba65fcc6fc3ba77626c87a7fe606', guardRegisterTx: '0x4cc99093053a08cd35f6fdb51cc57cc75d32f9773c22c506fef50a6290eb7713', target: receipt.contractAddress, targetTx: hash };
  fs.writeFileSync('.sepolia-deployment.json', JSON.stringify(metadata, null, 2) + '\n');
  console.log(`TARGET=${receipt.contractAddress}`); console.log(`TARGET_TX=${hash}`);
}
main().catch((error) => { console.error(`RESUME_FAILED=${error instanceof Error ? error.message.split('\n')[0] : 'unknown error'}`); process.exitCode = 1; });
