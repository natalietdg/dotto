require('dotenv').config();
const { Client, TopicCreateTransaction, AccountId, PrivateKey } = require('@hashgraph/sdk');

(async () => {
  try {
    console.log('🔧 Creating Hedera topic...\n');
    
    const client = Client.forTestnet();
    
    // Try to parse as ECDSA first, fallback to ED25519
    let privateKey;
    try {
      privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);
      console.log('Using ECDSA key');
    } catch {
      privateKey = PrivateKey.fromStringED25519(process.env.HEDERA_PRIVATE_KEY);
      console.log('Using ED25519 key');
    }
    
    client.setOperator(
      AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
      privateKey
    );
    
    const txResponse = await new TopicCreateTransaction()
      .setSubmitKey(client.operatorPublicKey)
      .setTopicMemo('dotto Schema Provenance')
      .execute(client);
    
    const receipt = await txResponse.getReceipt(client);
    const topicId = receipt.topicId.toString();
    
    console.log('✅ Topic created successfully!\n');
    console.log('Topic ID:', topicId);
    console.log('\nAdd this line to your .env file:');
    console.log(`HEDERA_TOPIC_ID=${topicId}`);
    console.log('\nView on HashScan:');
    console.log(`https://hashscan.io/testnet/topic/${topicId}\n`);
    
    client.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nMake sure your .env has:');
    console.log('- HEDERA_ACCOUNT_ID (your account ID)');
    console.log('- HEDERA_PRIVATE_KEY (your private key)\n');
  }
})();
