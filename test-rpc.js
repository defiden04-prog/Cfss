import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

async function testScan() {
  const MAINNET_RPC = 'https://mainnet.helius-rpc.com/?api-key=2fd5f291-f1cd-4f86-8311-5254d60ff008';
  const connection = new Connection(MAINNET_RPC);
  
  // Use a random known wallet with some tokens, e.g., Binance hot wallet
  const publicKey = new PublicKey('9WzDXwBbmcg8ZXtx6B5W8S2pAM9GZfAFT2uWc952z3to');
  
  try {
    console.log(`Scanning token accounts for ${publicKey.toString()}`);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID });
    console.log(`Successfully fetched ${tokenAccounts.value.length} token accounts.`);
  } catch (err) {
    console.error('Scan failed with error:');
    console.error(err);
  }
}

testScan();
