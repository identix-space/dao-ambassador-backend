import {PrismaClient} from '@prisma/client';
import {AuthUtilsService} from './common/auth-utils.service';

export default class OneTimeCodeRepository {
    constructor(private prisma: PrismaClient) {
    }

    async createNewOtc(address: string): Promise<string> {
        await this.clearExpiredOtcs();

        const code = AuthUtilsService.generateOneTimeCode();
        // expires in 5 minutes
        // eslint-disable-next-line no-magic-numbers
        const expiresAt = new Date(new Date().getTime() + 5 * 60 * 1000);
        await this.prisma.oneTimeCode.create({
            data: {
                address,
                code,
                expiresAt
            }
        });
        const prefix = 'Please verify your account by signing this code: ';
        return prefix + code;
    }

    async clearExpiredOtcs(): Promise<void> {
        await this.prisma.oneTimeCode.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date()
                }
            }
        });
    }

    async verifyOtc(address: string, code: string): Promise<boolean> {
        const otc = await this.prisma.oneTimeCode.findFirst({
            where: {
                address,
                code
            }
        });
        if (!otc) {
            return false;
        }
        return otc.expiresAt.getTime() >= new Date().getTime();
    }
}
