import {PrismaClient} from '@prisma/client';
import express from 'express';
import {AccountSession} from './generated/graphql_api';
import OneTimeCodeRepository from './modules/one-time-code.repository';

export interface GraphQLContext {
    prisma: PrismaClient;
    request: express.Request;
    session?: AccountSession;
    oneTimeCodeRepository: OneTimeCodeRepository;
}
