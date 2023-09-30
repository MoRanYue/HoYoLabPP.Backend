import { ServerType } from "src/constants/EServerType";

export default {
    port: parseInt(process.env.PORT ?? '3000'),
    host: process.env.HOST ?? "0.0.0.0",
    likeUsingHoyolabVersion: process.env.LIKE_USING_HOYOLAB_VERSION ?? '2.55.1',
    serverType: <keyof typeof ServerType>(process.env.SERVER_TYPE ?? 'rss'),
    rssheartbeatInterval: parseInt(process.env.RSS_HEARTBEAT_INTERVAL ?? '160') * 1000,
    rssTargetRmsServers: (process.env.RSS_TARGET_RMS_SERVERS ?? '').split(','),
    rssTargetRmsServerKeys: (process.env.RSS_TARGET_RMS_SERVER_KEYS ?? '').split(','),
    rssTargetLocalRmsServer: Boolean(parseInt(process.env.RSS_TARGET_LOCAL_RMS_SERVER ?? '0')),
    rssAddress: process.env.RSS_ADDRESS,
    rssName: process.env.RSS_NAME,
    rmsHeartbeatTimeout: parseInt(process.env.RMS_HEARTBEAT_TIMEOUT ?? '180') * 1000,
    rmsRegistrationKey: process.env.RMS_REGISTRATION_KEY ?? 'HOYOLABPP',
    rmsRequestRecordsClearTimeout: parseInt(process.env.RMS_REQUEST_RECORDS_CLEAR_TIMEOUT ?? '3') * 1000,
    dbHost: process.env.DB_HOST ?? '127.0.0.1',
    dbPort: parseInt(process.env.DB_PORT ?? '5432'),
    dbName: process.env.DB_NAME,
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD,
}