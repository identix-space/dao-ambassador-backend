import Web3 from 'web3';

export class EvmCryptoService {
    static verifySignature(message: string, signature: string, address: string): boolean {
        const web3 = new Web3();
        const msgHash = web3.utils.soliditySha3(message);
        if (!msgHash) {
            throw new Error('Create msgHash failed');
        }
        const recovered = web3.eth.accounts.recover(msgHash, signature);
        return recovered === address;
    }
}
