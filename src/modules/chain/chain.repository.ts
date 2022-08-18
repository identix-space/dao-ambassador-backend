import Web3 from 'web3';
import {Transaction, TransactionReceipt} from 'web3-core';
import {Log} from './transaction-receipt-log.model';
import Big from 'big.js';
import {AbiItem} from 'web3-utils';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import parseTxEvents from 'web3-parse-receipt-events';

export class ChainRepository {
    url: string;
    web3: Web3;

    constructor(url: string) {
        this.url = url;
        this.web3 = new Web3(this.url);
    }

    async getLastBlockNumber(): Promise<number> {
        return await this.web3.eth.getBlockNumber();
    }

    async getTxsFromBlock(blockNumberOrHash: number | string): Promise<Transaction[]> {
        const block = await this.web3.eth.getBlock(blockNumberOrHash);
        const transactions: Array<Transaction> = [];
        for (const transactionHash of block.transactions) {
            const transaction = await this.web3.eth.getTransaction(transactionHash);
            transactions.push(transaction);
        }
        return transactions;
    }

    async getTransaction(txHash: string): Promise<Transaction> {
        return await this.web3.eth.getTransaction(txHash);
    }

    async getTransactionReceipt(txHash: string): Promise<TransactionReceipt> {
        return await this.web3.eth.getTransactionReceipt(txHash);
    }

    async getTransactionReceiptLogs(txHash: string): Promise<Log[]> {
        const transactionReceipt = await this.web3.eth.getTransactionReceipt(txHash);
        return transactionReceipt.logs as Log[];
    }

    async getBalance(address: string): Promise<Big> {
        const result = await this.web3.eth.getBalance(address);
        return new Big(result);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async contractCall(address: string, abi: AbiItem[] | AbiItem, method: string, params: any[]): Promise<any> {
        const contract = new this.web3.eth.Contract(abi, address);
        // eslint-disable-next-line security/detect-object-injection
        return await contract.methods[method](...params).call();
    }

    async isContract(address: string): Promise<boolean> {
        const result = await this.web3.eth.getCode(address);
        return result !== '0x';
    }

    async gasPrice(): Promise<string> {
        return await this.web3.eth.getGasPrice();
    }

    async gasLimit(): Promise<string> {
        const res = await this.web3.eth.getBlock('latest', true).then(block => block.gasLimit);
        return res.toString();
    }

    async lastBlockMiner(): Promise<string> {
        return await this.web3.eth.getBlock('latest', false).then(block => block.miner);
    }

    async lastBlocksUncleCount(): Promise<number> {
        return Number(await this.web3.eth.getBlock('latest', false).then(block => block.uncles.length));
    }

    async averageBlockTimeMs(): Promise<number> {
        const lastBlock = await this.web3.eth.getBlock('latest', false);
        const preLastBlock = await this.web3.eth.getBlock(lastBlock.number - 1, false);
        // eslint-disable-next-line no-magic-numbers
        return (Number(lastBlock.timestamp) - Number(preLastBlock.timestamp)) / (lastBlock.number - preLastBlock.number) * 1000;
    }

    async parseTransactionReceiptLogs(txHash: string): Promise<object> {
        const transactionReceipt = await this.web3.eth.getTransactionReceipt(txHash);
        return parseTxEvents(transactionReceipt);
    }
}
