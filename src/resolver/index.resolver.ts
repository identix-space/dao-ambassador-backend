import Query from './query.resolver';
import Mutation from './mutation.resolver';
import {Resolvers} from '../generated/graphql_api';
import {GraphQLScalarType} from 'graphql';
import {AccountService} from '../modules/account/account.service';
import {AuthGuard} from './guard/auth.guard';
import GraphQLError from '../modules/common/graphql-error';
import StatusCodes from '../modules/common/status-codes';
import {AccountAdapter} from '../modules/account/account.adapter';

const resolvers: Resolvers = {
    Query: Query.Query,
    Mutation: Mutation.Mutation,
    Date: new GraphQLScalarType<Date, string>({
        name: 'Date',
        parseValue(value) {
            return new Date(value as string);
        },
        serialize(value) {
            return (value as Date).toISOString();
        }
    }),
    Account: {
        sessions: async (parent, args, {session}) => {
            if (parent.sessions) {
                return parent.sessions;
            }

            AuthGuard.assertIfNotAuthenticated(session);

            return await AccountService.getSessions(parent.id!);
        },
        collections: async (parent, {onlyMine}, {session, prisma}) => {
            AuthGuard.assertIfNotAuthenticated(session);

            if (onlyMine) {
                return await prisma.sbtCollection.findMany({where: {creator: {id: parent.id}}});
            } else {
                const tokensRelatedToAccount = await prisma.sbtToken.findMany({
                    where: {creator: {id: parent.id}},
                    include: {collection: true}
                });
                if (!tokensRelatedToAccount) {
                    return [];
                }
                const mineCollections = await prisma.sbtCollection.findMany({where: {creator: {id: parent.id}}});

                return mineCollections.concat(tokensRelatedToAccount.map(token => token.collection));
            }
        },
        souls: async (parent, args, {session, prisma}) => {
            AuthGuard.assertIfNotAuthenticated(session);

            const result = await prisma.account.findFirst({where: {id: parent.id}, include: {souls: true}});
            if (!result) {
                throw new GraphQLError({message: 'Not found', code: StatusCodes.NOT_FOUND});
            }

            return result.souls;
        }
    },
    SbtCollection: {
        tokens: async (parent, args, {session, prisma}) => {
            AuthGuard.assertIfNotAuthenticated(session);

            const result = await prisma.sbtCollection.findFirst({where: {id: parent.id}, include: {tokens: true}});
            if (!result) {
                throw new GraphQLError({message: 'Not found', code: StatusCodes.NOT_FOUND});
            }

            return result.tokens;
        },
        creator: async (parent, args, {session, prisma}) => {
            AuthGuard.assertIfNotAuthenticated(session);

            const result = await prisma.sbtCollection.findFirst({where: {id: parent.id}, include: {creator: true}});
            if (!result) {
                throw new GraphQLError({message: 'Not found', code: StatusCodes.NOT_FOUND});
            }

            return AccountAdapter.dbToGraphQL(result.creator);
        }
    },
    SbtToken: {
        collection: async (parent, args, {session, prisma}) => {
            AuthGuard.assertIfNotAuthenticated(session);

            const result = await prisma.sbtToken.findFirst({where: {id: parent.id}, include: {collection: true}});
            if (!result) {
                throw new GraphQLError({message: 'Not found', code: StatusCodes.NOT_FOUND});
            }

            return result.collection;
        },
        targetSoul: async (parent, args, {session, prisma}) => {
            AuthGuard.assertIfNotAuthenticated(session);

            const result = await prisma.sbtToken.findFirst({where: {id: parent.id}, include: {targetSoul: true}});
            if (!result) {
                throw new GraphQLError({message: 'Not found', code: StatusCodes.NOT_FOUND});
            }

            return result.targetSoul;
        },
        metadata: async (parent, args, {session, prisma}) => {
            AuthGuard.assertIfNotAuthenticated(session);

            const result = await prisma.sbtToken.findFirst({where: {id: parent.id}, include: {metadata: true}});
            if (!result) {
                throw new GraphQLError({message: 'Not found', code: StatusCodes.NOT_FOUND});
            }

            return JSON.parse(result.metadata.valueJson);
        },
        creator: async (parent, args, {session, prisma}) => {
            AuthGuard.assertIfNotAuthenticated(session);

            const result = await prisma.sbtToken.findFirst({where: {id: parent.id}, include: {creator: true}});
            if (!result) {
                throw new GraphQLError({message: 'Not found', code: StatusCodes.NOT_FOUND});
            }

            return AccountAdapter.dbToGraphQL(result.creator);
        }
    },
    Soul: {
        owner: async (parent, args, {session, prisma}) => {
            AuthGuard.assertIfNotAuthenticated(session);

            const result = await prisma.soul.findFirst({where: {id: parent.id}, include: {owner: true}});
            if (!result) {
                throw new GraphQLError({message: 'Not found', code: StatusCodes.NOT_FOUND});
            }

            return AccountAdapter.dbToGraphQL(result.owner);
        }
    }
};
export default resolvers;
