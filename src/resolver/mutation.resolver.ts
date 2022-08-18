import {Resolvers} from '../generated/graphql_api';
import {getLogger} from '../modules/common/logger.service';
import StatusCodes from '../modules/common/status-codes';
import {AuthUtilsService} from '../modules/common/auth-utils.service';
import config from '../config/config';
import GraphQLError from '../modules/common/graphql-error';
import {SessionsService} from '../modules/sessions.service';
import {AccountService} from '../modules/account/account.service';
import {AuthGuard} from './guard/auth.guard';
import {Email} from '../modules/common/types/email/email';
import {EvmCryptoService} from '../modules/evm-crypto.service';
import {EvmAddress} from '../modules/common/types/evm-address';

const log = getLogger('mutationResolver');

const mutationResolver: Resolvers = {
    Mutation: {
        echo: (parent, args) => {
            log.trace({args});
            return args.text;
        },
        generateEmailCode: async (parent, {email}) => AccountService.generateEmailCode(new Email(email)),
        activateAccount: async (parent, {email, code}) => AccountService.activate({email: new Email(email), code}),
        resetPassword: async (parent, {email, emailCode, newPassword}) => AccountService.resetPassword({
            email: new Email(email),
            emailCode,
            newPassword
        }),
        login: async (parent, {email, password}, {prisma, request}) => {
            // todo add bruteforce protection
            const account = await prisma.account.findFirst({where: {email: email.trim().toLowerCase()}});
            if (!account) {
                throw new GraphQLError({
                    message: 'Wrong password or account not found',
                    code: StatusCodes.FORBIDDEN,
                    internalData: {email}
                });
            }
            if (await AuthUtilsService.checkHash({
                hash: account.passwordHash,
                text: password + config.server.salt
            })) {
                return await SessionsService.generateNewAuth({prisma, account, request});
            } else {
                throw new GraphQLError({
                    message: 'Wrong password or account not found',
                    code: StatusCodes.FORBIDDEN,
                    internalData: {email}
                });
            }
        },
        logout: async (parent, {sessionIds}, {session}) => {
            AuthGuard.assertIfNotAuthenticated(session);
            await AuthGuard.assertIfSessionsNotOwned(session!.id, sessionIds || [session!.id]);
            return await SessionsService.deleteSessions(sessionIds || [session!.id]);
        },
        changePassword: async (parent, {password, newPassword}, {session}) => {
            AuthGuard.assertIfNotAuthenticated(session);
            return await AccountService.changePassword(session!.account.id, password, newPassword);
        },
        generateOtc: async (parent, {address}, {oneTimeCodeRepository}) => {
            return oneTimeCodeRepository.createNewOtc(new EvmAddress(address));
        },
        verifyOtc: async (parent, {address, code, signature}, {oneTimeCodeRepository, prisma, request}) => {
            // const valid = oneTimeCodeRepository.verifyOtc(address, code);
            // if (!valid) {
            //     throw new GraphQLError({
            //         message: 'Wrong code',
            //         code: StatusCodes.FORBIDDEN,
            //         internalData: {address, code}
            //     });
            // }
            // const verified = EvmCryptoService.verifySignature(signature, code, address);
            // if (!verified) {
            //     throw new GraphQLError({
            //         message: 'Wrong signature',
            //         code: StatusCodes.FORBIDDEN,
            //         internalData: {address, code}
            //     });
            // }
            //

            const account = await prisma.account.findUnique({where: {address}});
            if (account) {
                return SessionsService.generateNewAuth({
                    prisma,
                    request,
                    account
                });
            } else {
                const newAccount = await AccountService.createAccount({
                    password: code,
                    email: new Email(`${address}@onetime.code`),
                    address: new EvmAddress(address)
                });
                return SessionsService.generateNewAuth({
                    prisma,
                    request,
                    account: newAccount
                });
            }
        },
        addEventCollectionCreate: async (parent, {txHash, contractAddress, collectionName, collectionSymbol}, {
            prisma,
            session
        }) => {
            AuthGuard.assertIfNotAuthenticated(session);

            log.trace('Add event collection create', {txHash, contractAddress, collectionName, collectionSymbol});

            await prisma.sbtCollection.create({
                data: {
                    address: contractAddress,
                    name: collectionName,
                    symbol: collectionSymbol,
                    creator: {
                        connect: {
                            id: session!.account.id
                        }
                    }
                }
            });

            return true;
        },
        addEventTokenCreate: async (parent, {
            txHash,
            collectionContractAddress,
            tokenId,
            description,
            soulAddress,
            metadata
        }, {prisma, session}) => {
            AuthGuard.assertIfNotAuthenticated(session);

            log.trace('Add event token create', {
                txHash,
                collectionContractAddress,
                tokenId,
                description,
                soulAddress,
                metadata
            });

            await prisma.sbtToken.create({
                data: {
                    idInCollection: tokenId,
                    collection: {
                        connect: {
                            address: collectionContractAddress
                        }
                    },
                    metadataJson: JSON.stringify({
                        description,
                        metadata
                    }),
                    creator: {
                        connect: {
                            id: session!.account.id
                        }
                    },
                    targetSoul: {
                        connectOrCreate: {
                            where: {
                                address: soulAddress
                            },
                            create: {
                                address: soulAddress,
                                owner: {
                                    connect: {
                                        id: session!.account.id
                                    }
                                }
                            }
                        }
                    }
                }
            });

            return true;
        },
        addEventSoulCreate: async (parent, {txHash, soulAddress}, {prisma, session}) => {
            AuthGuard.assertIfNotAuthenticated(session);

            log.trace('Add event soul create', {txHash, soulAddress});

            await prisma.soul.create({
                data: {
                    address: soulAddress,
                    owner: {
                        connect: {
                            id: session!.account.id
                        }
                    }
                }
            });

            return true;
        }
    }
};

export default mutationResolver;
