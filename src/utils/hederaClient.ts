import {
  Client,
  TopicMessageSubmitTransaction,
  AccountId,
  PrivateKey,
} from '@hashgraph/sdk';
import * as dotenv from 'dotenv';

dotenv.config();

export class HederaClient {
  private client: Client | null = null;
  private topicId: string;

  constructor() {
    this.topicId = process.env.HEDERA_TOPIC_ID || '';
  }

  async initialize(): Promise<void> {
    const accountId = process.env.HEDERA_ACCOUNT_ID;
    const privateKey = process.env.HEDERA_PRIVATE_KEY;

    if (!accountId || !privateKey) {
      throw new Error(
        'Missing Hedera credentials. Please set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY in .env file'
      );
    }

    if (!this.topicId) {
      throw new Error('Missing HEDERA_TOPIC_ID in .env file');
    }

    const network = process.env.HEDERA_NETWORK || 'testnet';
    
    if (network === 'testnet') {
      this.client = Client.forTestnet();
    } else if (network === 'mainnet') {
      this.client = Client.forMainnet();
    } else {
      throw new Error(`Unsupported network: ${network}`);
    }

    this.client.setOperator(
      AccountId.fromString(accountId),
      PrivateKey.fromString(privateKey)
    );
  }

  async submitMessage(message: string): Promise<string> {
    if (!this.client) {
      throw new Error('Hedera client not initialized');
    }

    const transaction = new TopicMessageSubmitTransaction({
      topicId: this.topicId,
      message: message,
    });

    const response = await transaction.execute(this.client);
    const receipt = await response.getReceipt(this.client);

    return `${this.topicId}@${receipt.topicSequenceNumber}`;
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }
}
