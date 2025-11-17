const { Client, TopicMessageSubmitTransaction, PrivateKey } = require('@hashgraph/sdk');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

async function submitProof() {
  try {
    const accountId = process.env.HEDERA_ACCOUNT_ID;
    const privateKeyStr = process.env.HEDERA_PRIVATE_KEY;
    const topicId = process.env.HEDERA_TOPIC_ID;

    let privateKey;
    try {
      // Try ECDSA first (your account uses ECDSA)
      privateKey = PrivateKey.fromStringECDSA(privateKeyStr);
    } catch (e) {
      // Fallback to ED25519
      try {
        privateKey = PrivateKey.fromStringED25519(privateKeyStr);
      } catch (e2) {
        // Try DER format
        privateKey = PrivateKey.fromString(privateKeyStr);
      }
    }

    const client = Client.forTestnet();
    client.setOperator(accountId, privateKey);

    // Compute hash from actual file
    const filePath = 'examples/bank-a/trade-core/TradeDto.ts';
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const hash = crypto.createHash('sha256').update(fileContent).digest('hex');
    
    const message = JSON.stringify({
      type: 'schema_proof',
      hash: hash,
      file: filePath,
      timestamp: new Date().toISOString()
    });

    console.log('Submitting to Hedera topic:', topicId);
    
    const transaction = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(message)
      .execute(client);

    const receipt = await transaction.getReceipt(client);
    const txId = transaction.transactionId.toString();
    
    // Get consensus timestamp from mirror node for HashScan URL
    const txIdFormatted = txId.replace('@', '-').replace(/\.(\d+)$/, '-$1');
    const mirrorUrl = `https://testnet.mirrornode.hedera.com/api/v1/transactions/${txIdFormatted}`;
    const mirrorRes = await fetch(mirrorUrl);
    const mirrorData = await mirrorRes.json();
    const consensusTimestamp = mirrorData.transactions?.[0]?.consensus_timestamp || txId;
    
    console.log('✓ Proof submitted to Hedera');
    console.log('  Transaction ID:', txId);
    console.log('  Status:', receipt.status.toString());
    console.log('  Topic Sequence:', receipt.topicSequenceNumber?.toString() || 'N/A');
    console.log('  Consensus Timestamp:', consensusTimestamp);
    console.log('  HashScan:', `https://hashscan.io/testnet/transaction/${consensusTimestamp}`);

    // Update graph.json
    const graphPath = 'src/viewer/public/graph.json';
    const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
    
    if (graph.nodes && graph.nodes[0]) {
      // Keep existing v1 if it exists
      const v1TxId = graph.nodes[0].metadata.v1TxId || 'x@1762677739.827436664';
      const v1Consensus = graph.nodes[0].metadata.v1Consensus || '1762677746.215009000';
      
      graph.nodes[0].metadata.v1TxId = v1TxId;
      graph.nodes[0].metadata.v1Consensus = v1Consensus;
      graph.nodes[0].metadata.v2TxId = txId;
      graph.nodes[0].metadata.v2Consensus = consensusTimestamp;
      
      fs.writeFileSync(graphPath, JSON.stringify(graph, null, 2));
      console.log('✓ Updated graph.json');
      console.log('  v1 (base):', v1TxId, '→', v1Consensus);
      console.log('  v2 (head):', txId, '→', consensusTimestamp);
    }

    // Update proof.json
    const proofPath = 'src/viewer/public/proof.json';
    const proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
    proof.txId = txId;
    proof.hashscan = `https://hashscan.io/testnet/transaction/${txId}`;
    proof.timestamp = new Date().toISOString();
    fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
    console.log('✓ Updated proof.json with real transaction ID');

    client.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

submitProof();
