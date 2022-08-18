import config from '../../config/config';
import {ChainRepository} from './chain.repository';

describe('Chain Repository', () => {
    test('Should call some functions', async () => {
        const chainRepository = new ChainRepository(config.nodeUrl);
        const lastBlockNumber = await chainRepository.getLastBlockNumber();
        console.log(lastBlockNumber);
        const txs = await chainRepository.getTxsFromBlock(lastBlockNumber);
        console.log(txs);
    });

});
