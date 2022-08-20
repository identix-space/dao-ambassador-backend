import {EvmCryptoService} from './evm-crypto.service';

describe('Crypto tests', () => {
    test('Recover signature', async () => {
        const data = {
            address: '0xEE33B1181003A7608021b38753947a6F718f4C1f',
            code: 'Please verify your account by signing this message. Nonce:437816',
            signature: '0x73ffbafa1a16f2c56adb06396f88a84535dac6982031da5bbb6e23bd5f560faf3cf1441a6b75bf85e8293ca4fec36eaf25bfd4edb4681e7154faf00a5069237b1c'
        };

        const recovered = EvmCryptoService.verifySignature(data.code, data.signature, data.address);
        console.log('Recovered', recovered);
    });
});
