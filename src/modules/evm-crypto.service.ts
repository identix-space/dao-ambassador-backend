import Web3 from 'web3';

export class EvmCryptoService {
    static verifySignature(message: string, signature: string, address: string): boolean {
        const web3 = new Web3();
        const recovered = web3.eth.accounts.recover(message, signature);
        return recovered === address;
    }
}
