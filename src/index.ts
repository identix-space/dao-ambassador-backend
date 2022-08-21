/* eslint-disable new-cap */
import config from './config/config';
import express from 'express';
import {ApolloServer} from 'apollo-server-express';
import typeDefs from './schema';
import resolvers from './resolver/index.resolver';
import {getLogger} from './modules/common/logger.service';
import rateLimit from 'express-rate-limit';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import costAnalysis from 'graphql-cost-analysis';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import RequestLoggerService from './modules/common/request-logger.service';
import StatusCodes from './modules/common/status-codes';
import {prisma} from './modules/common/prisma.service';
import {mocksService} from './modules/common/mocks.service';
import {addMocksToSchema, createMockStore} from '@graphql-tools/mock';
import {makeExecutableSchema} from '@graphql-tools/schema';
import {
    ApolloServerPluginLandingPageDisabled,
    ApolloServerPluginLandingPageGraphQLPlayground
} from 'apollo-server-core';
import {AccountSession} from './generated/graphql_api';
import {GraphQLContext} from './IContext';
import path from 'path';
import multer from 'multer';
import {nanoid} from 'nanoid';
import {AddressInfo} from 'net';
import serveIndex from 'serve-index';
import basicAuth from 'express-basic-auth';
import GraphQLError from './modules/common/graphql-error';
import {AccountAdapter} from './modules/account/account.adapter';
import OneTimeCodeRepository from './modules/one-time-code.repository';
import {ChainRepository} from './modules/chain/chain.repository';
import {EvmAddress} from './modules/common/types/evm-address';
import {AccountService} from './modules/account/account.service';
import {Email} from './modules/common/types/email/email';

const log = getLogger('server');
export const app = express();

app.get('/metadata/:id', async (req, res) => {
    const id = req.params.id;
    const idNumber = parseInt(id, 10);
    if (Number.isNaN(idNumber)) {
        res.status(StatusCodes.BAD_REQUEST).json({error: 'Invalid id'});
        return;
    }
    const metadata = await prisma.metadata.findFirst({where: {id: idNumber}});
    if (!metadata) {
        res.status(StatusCodes.NOT_FOUND).json({error: 'Metadata not found'});
    } else {
        res.status(StatusCodes.OK).json(JSON.parse(metadata.valueJson));
    }
});

const logsDir = path.join(__dirname, '..', 'data', 'logs');
app.use('/logs',
    basicAuth({
        authorizeAsync: true,
        authorizer: (username, password, cb) => {
            // eslint-disable-next-line security/detect-object-injection
            const userFromConfig: string = (config.server.logsServe.users as { [index: string]: string })[username];

            // eslint-disable-next-line security/detect-possible-timing-attacks
            if (userFromConfig === password) {
                cb(null, true);
            } else {
                // delay 3000 ms to prevent brute force
                setTimeout(() => {
                    log.warn(`Failed login attempt from ${username} to logs`);
                    cb(null, false);
                    // eslint-disable-next-line no-magic-numbers
                }, 3000);
            }
        },
        challenge: true,
        realm: config.server.logsServe.realm
    }),
    express.static(logsDir), serveIndex(logsDir, {icons: true})
);

if (config.server.corsEnabled) {
    app.use(cors());
}

class CostAnalysisApolloServer extends ApolloServer {
    async createGraphQLServerOptions(req: express.Request, res: express.Response) {
        const options = await super.createGraphQLServerOptions(req, res);

        options.validationRules = options.validationRules ? options.validationRules.slice() : [];
        options.validationRules.push(costAnalysis({
            variables: req.body.variables,
            maximumCost: config.server.costAnalysis.maximumCost,
            defaultCost: config.server.costAnalysis.defaultCost,
            onComplete: (costs: number) => log.trace(`costs: ${costs} (max: ${config.server.costAnalysis.maximumCost})`)
        }));

        return options;
    }
}

let schema = makeExecutableSchema({typeDefs, resolvers});

if (config.server.graphql.mocksEnabled) {
    const store = createMockStore({schema, mocks: mocksService});
    schema = addMocksToSchema({
        store,
        schema,
        mocks: mocksService,
        preserveResolvers: config.server.graphql.mocksPreserveResolvers
    });

    const RESET_MOCK_STORE_INTERVAL = 200;
    setInterval(() => {
        store.reset();
    }, RESET_MOCK_STORE_INTERVAL);
}

const oneTimeCodeRepository = new OneTimeCodeRepository(prisma);
const chainRepository = new ChainRepository(config.nodeUrl);

export const server = new CostAnalysisApolloServer({
    schema,
    introspection: config.server.graphql.introspection,
    persistedQueries: false,
    debug: config.server.graphql.debug,
    formatError: (err) => {
        if (err.extensions?.internalData === undefined) {
            delete err.extensions?.internalData; // remove "undefined" field from logs
        }
        const SPACES = 2;
        log.debug(JSON.stringify(err, null, SPACES));
        if (!config.server.graphql.debug && err.extensions?.stacktrace) {
            err.extensions.stacktrace = undefined;
        }
        if (err.extensions?.internalData) {
            err.extensions.internalData = undefined;
        }
        return err;
    },
    // eslint-disable-next-line complexity,sonarjs/cognitive-complexity
    context: async ({req}): Promise<GraphQLContext> => {
        RequestLoggerService.logGraphQL(req);
        const address = req.header('address');

        if (!address) {
            throw new GraphQLError({
                message: 'Address is required',
                code: StatusCodes.BAD_REQUEST
            });
        }

        let account = await prisma.account.findUnique({where: {address: new EvmAddress(address).value}});
        if (!account) {
            log.trace('Creating new account, address: ', address);
            account = await AccountService.createAccount({
                password: '',
                email: new Email(`${address}@fake.mail`),
                address: new EvmAddress(address)
            });
        }

        return {
            prisma,
            request: req,
            session: {
                account: AccountAdapter.dbToGraphQL(account)
            } as AccountSession,
            oneTimeCodeRepository,
            chainRepository
        };
    },
    plugins: [
        config.server.graphql.playground
            ? ApolloServerPluginLandingPageGraphQLPlayground({
                settings: {
                    'tracing.hideTracingResponse': !config.server.graphql.debug,
                    'queryPlan.hideQueryPlanResponse': !config.server.graphql.debug,
                    'editor.theme': 'light'
                }
            })
            : ApolloServerPluginLandingPageDisabled(),
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        config.server.graphql.tracing ? require('apollo-tracing').plugin() : {}
    ]
});

app.use(RequestLoggerService.logHttp);
app.use(rateLimit(config.server.rateLimit));
app.use(compression(config.server.compression));
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use((req, res, next) => {
    if (!config.server.maintenanceMode.enabled) {
        next();
        return;
    }
    const ip: string = req.socket.remoteAddress || 'unknown';

    if (config.server.maintenanceMode.allowedHosts.indexOf(ip) >= 0) {
        log.info(`Maintenance mode enabled. Disable it in config. Got request from: [${ip}]`);
        next();
    } else {
        res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
            status: config.server.maintenanceMode.message
        });
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'data', 'uploads'));
    },
    filename: (req, file, cb) => {
        const ext = file.originalname.split('.');
        const RANDOM_SUFFIX_SIZE = 12;
        const fileName = `${Date.now()}-${nanoid(RANDOM_SUFFIX_SIZE)}.${ext[ext.length - 1]}`;
        log.trace(`Upload file "${file.originalname}": ${fileName}`);
        cb(null, fileName);
    }
});

const upload = multer({
    storage,
    fileFilter(req: Express.Request, file: Express.Multer.File, callback: multer.FileFilterCallback) {
        const fileExt = path.extname(file.originalname).toLowerCase();
        if (config.server.uploadAllowedFileTypes.indexOf(fileExt) >= 0) {
            return callback(null, true);
        } else {
            return callback(new Error(`Allowed file types to upload: ${config.server.uploadAllowedFileTypes.join(', ')}`));
        }
    },
    limits: {
        fileSize: config.server.maxUploadFileSizeBytes,
        fieldSize: config.server.maxUploadFileSizeBytes
    },
    dest: path.join(__dirname, '..', 'data', 'uploads')
}).single('file');

app.post('/upload',
    (req, res) => {
        upload(req, res, async (err) => {
            log.trace(`Upload file: ${req.file}`);

            if (err) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: 'error',
                    message: err.message
                });
            }

            if (!req?.file) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: 'error',
                    message: 'Field "file" not provided'
                });
            }

            await prisma.upload.create({
                data: {
                    originalFilename: req.file.originalname,
                    filename: req.file.filename,
                    size: req.file.size,
                    mimetype: req.file.mimetype,
                    extension: path.extname(req.file.originalname).toLowerCase(),
                    uploaderIp: (<AddressInfo>req.socket.address()).address
                }
            });

            return res.status(StatusCodes.OK).json({
                status: 'ok',
                filePath: `/uploads/${req.file.filename}`,
                originalName: req.file.originalname
            });
        });
    }
);
app.use('/uploads', express.static(path.join(__dirname, '..', 'data', 'uploads')));

