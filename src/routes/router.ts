import { Router } from "express";
import url from 'url'
import axios from 'axios'
import * as mihoyoRequest from '../utils/mihoyoRequestProcessor'
import { currentTimestamp, getClientIp, randomChoice, randomUuid4 } from "../utils/utils";
import { apiResponse } from "../utils/apiResponseConstructor";
import { ApiReturnCode } from "../constants/EApiReturnCode";
import config from "../config/config";
import { ServerType } from "../constants/EServerType";
import db from "../models/database";
import { HttpRequestMethod } from "src/constants/EHttpRequestMethod";
import { MihoyoRequestInfo } from "src/constants/IMihoyoRequestInfo";

const router = Router({})

router.use(async (req, res, next) => {
    const ip = getClientIp(req)

    if (ip.includes('127.0.0.1') || ip.includes('localhost') || ip.includes('::1')) {
        return next()
    }

    console.log(`接收到“${ip}”连接：${req.url}`)

    next()
})

// 请求分配服务器（Request Matcher Server，RMS）
const registeredRss: Record<string, {
    name?: string
    protocol?: 'http:' | 'https:'
    serverType: ServerType
    address: string
    port: number
    lastHeartbeatTime: number
    requests: Record<string, {
        client: string[]
        number: number
    }>
}> = {}
if (config.serverType == 'rms' || config.serverType == 'hybrid') {
    async function sendJobToRss(requestInfo: string, targetUrl: string, client: string, rssId: string) {
        const rss = registeredRss[rssId]
        const rssServer = `${rss.protocol}//${rss.address}:${rss.port}`

        const res = await axios.post(`${rssServer}/api/rss/requestMihoyo`, requestInfo, {
            responseEncoding: 'utf-8',
            responseType: 'text'
        })

        if (res.data.retcode == ApiReturnCode.success) {
            if (!Object.prototype.hasOwnProperty.call(registeredRss[rssId].requests, targetUrl)) {
                registeredRss[rssId].requests[targetUrl] = {
                    client: [client],
                    number: 1
                }
            }
            else {
                registeredRss[rssId].requests[targetUrl].number++
                registeredRss[rssId].requests[targetUrl].client.push(client)
            }
        }

        return res.data
    }

    setInterval(async () => {
        for (const id in registeredRss) {
            if (Object.prototype.hasOwnProperty.call(registeredRss, id)) {
                const rss = registeredRss[id];
                
                if (currentTimestamp() - rss.lastHeartbeatTime > config.rmsHeartbeatTimeout / 1000) {
                    console.warn(`RSS服务器“${rss.name ?? id}”（ID：${id}，地址：${rss.address}:${rss.port}）因心跳超时而被移除`)
                    delete registeredRss[id]
                }
            }
        }
    }, config.rmsHeartbeatTimeout)
    setInterval(async () => {
        for (const id in registeredRss) {
            if (Object.prototype.hasOwnProperty.call(registeredRss, id)) {
                registeredRss[id].requests = {}
            }
        }
    }, config.rmsRequestRecordsClearTimeout)

    router.post('/api/rms/requestMihoyo', async (req, res) => {
        const info = await mihoyoRequest.resolveRequest(req.body)

        const targetUrl = new url.URL(info.url).hostname
        const cl = getClientIp(req)
        let leastRequestNumber: number = Infinity
        let selectedRssServer: string | undefined = undefined
        for (const id in registeredRss) {
            if (Object.prototype.hasOwnProperty.call(registeredRss, id)) {
                const rss = registeredRss[id];
                
                if (Object.prototype.hasOwnProperty.call(rss.requests, targetUrl)) {
                    if (rss.requests[targetUrl].number < leastRequestNumber) {
                        leastRequestNumber = rss.requests[targetUrl].number
                        selectedRssServer = id
                    }
                }
            }
        }

        let result = ''
        if ([Infinity, 0].includes(leastRequestNumber) || !selectedRssServer) {
            const rssId = randomChoice(Object.keys(registeredRss))

            result = await sendJobToRss(req.body, targetUrl, cl, rssId)
            res.end(result)
        }
        else {
            result = await sendJobToRss(req.body, targetUrl, cl, selectedRssServer)
            res.end(result)
        }

        const content = JSON.parse(result)
        if (content.retcode == ApiReturnCode.success) {
            await db.query(`UPDATE statistic SET "totalMihoyoApiRequestNumber" = (SELECT "totalMihoyoApiRequestNumber" + 1);`)
            await db.query(`UPDATE statistic SET "monthMihoyoApiRequestNumber" = (SELECT "monthMihoyoApiRequestNumber" + 1);`)
            await db.query(`UPDATE statistic SET "dayMihoyoApiRequestNumber" = (SELECT "dayMihoyoApiRequestNumber" + 1);`)
        }
    })
    router.post('/api/rms/registerRss', async (req, res) => {
        if (config.rmsRegistrationKey == req.body.key) {
            console.log(`“${getClientIp(req)}”正在尝试注册RSS服务器`)

            const rssId = randomUuid4()
            const protocol = req.body.protocol
            const address = req.body.address
            const port = req.body.port
            const serverType = req.body.serverType
            const name = req.body.name

            if (!address || !port) {
                return await apiResponse(res, ApiReturnCode.failure, '未指定地址或端口')
            }

            try {
                await axios.post(`${protocol ?? 'http:'}//${address}:${port}/api/rss/ping`)
            } catch (e) {
                console.error(e)
                return await apiResponse(res, ApiReturnCode.failure, '无法连接')
            }
            
            registeredRss[rssId] = {
                address,
                port,
                name,
                protocol,
                serverType,
                lastHeartbeatTime: currentTimestamp(),
                requests: {}
            }

            await apiResponse(res, undefined, undefined, {
                id: rssId,
                heartbeatTimeout: config.rmsHeartbeatTimeout,
            })
            console.log(`“${name || address}”成功注册RSS服务器，分配ID为“${rssId}”，详细信息：\n${JSON.stringify(registeredRss[rssId], undefined, 2)}`)
        }
        else {
            await apiResponse(res, ApiReturnCode.denied, '密钥不正确')
        }
    })
    router.post('/api/rms/heartbeat', async (req, res) => {
        const rssId = <string>req.body.id

        if (config.rmsRegistrationKey == req.body.key && Object.keys(registeredRss).includes(rssId)) {
            registeredRss[rssId].lastHeartbeatTime = currentTimestamp()
            await apiResponse(res, undefined, undefined, {
                id: rssId
            })
        }
        else {
            await apiResponse(res, ApiReturnCode.notFound, '该RSS服务器未注册')
        }
    })

    // 统计信息
    router.post('/api/rms/statistic', async (req, res) => {
        const statistic = (await db.query(`SELECT * FROM statistic;`)).rows[0]
        res.end(await apiResponse(res, undefined, undefined, statistic))
    })
    router.post('/api/rms/statistic/rss/online', async (req, res) => {
        res.end(await apiResponse(res, undefined, undefined, {
            onlineRssServers: Object.keys(registeredRss).length
        }))
    })

    console.log('已开启RMS服务器')
}

// 请求发送服务器（Request Sender Server，RSS）
const serverRssIds: Record<string, string> = {}
if ((config.serverType == 'rss' || config.serverType == 'hybrid') && config.rssAddress) {
    const address = new url.URL(config.rssAddress)
    async function registerRssServer(rmsServer: string, key: string) {
        const res = await axios.post(`${rmsServer}/api/rms/registerRss`, {
            protocol: address.protocol,
            address: address.hostname,
            port: parseInt(address.port),
            serverType: config.serverType,
            name: config.rssName || undefined,
            key
        })

        if (res.data.retcode == ApiReturnCode.success) {
            serverRssIds[rmsServer] = res.data.data.id
            console.log(`成功在RMS服务器“${rmsServer}”上注册RSS服务器，分配到ID：${serverRssIds[rmsServer]}`)
        }
        else {
            console.error(`在RMS服务器“${rmsServer}”上注册RSS服务器失败，原因：${res.data.retcode}：${res.data.message}`)
        }
    }

    if (!config.rssAddress) {
        throw new Error("未配置RSS服务器地址，无法开启RSS服务器");
    }
    config.rssTargetRmsServers.forEach(async (rmsServer, i) => {
        if (!rmsServer.trim() || /127\.0\.0\.\d+|localhost|::\d+/.test(rmsServer)) {
            return
        }

        console.log(`正在尝试向RMS服务器“${rmsServer}”注册RSS服务器`)

        await registerRssServer(rmsServer, config.rssTargetRmsServerKeys[i])
    });
    if (config.rssTargetLocalRmsServer && config.serverType == 'hybrid') {
        setTimeout(async () => {
            const addr = `http://127.0.0.1:${config.port}`

            await registerRssServer(addr, config.rmsRegistrationKey)
        }, 5000)
    }
    setInterval(async () => {
        config.rssTargetRmsServers.forEach(async (rmsServer, i) => {
            if (!rmsServer.trim() || /127\.0\.0\.\d+|localhost|::\d+/.test(rmsServer)) {
                return
            }

            const heartbeat = await axios.post(`${rmsServer}/api/rms/heartbeat`, {
                id: serverRssIds[rmsServer],
                key: config.rmsRegistrationKey
            })

            if (heartbeat.data.retcode != ApiReturnCode.success) {
                console.warn(`向RMS服务器“${rmsServer}”发送心跳包时失败，原因：${heartbeat.data.retcode}：${heartbeat.data.message}`)

                await registerRssServer(rmsServer, config.rssTargetRmsServerKeys[i])
            }
        })

        if (config.rssTargetLocalRmsServer && config.serverType == 'hybrid') {
            const addr = `http://127.0.0.1:${config.port}`
            
            const heartbeat = await axios.post(`${addr}/api/rms/heartbeat`, {
                id: serverRssIds[addr],
                key: config.rmsRegistrationKey
            })

            if (heartbeat.data.retcode != ApiReturnCode.success) {
                // console.log(`向RMS服务器“${addr}”发送心跳包时失败，原因：${heartbeat.data.retcode}：${heartbeat.data.message}`)
                console.warn(`向RMS服务器“${addr}”发送心跳包时失败，原因：${heartbeat.data.retcode}：${heartbeat.data.message}`)

                await registerRssServer(addr, config.rmsRegistrationKey)
            }
        }
    }, config.rssheartbeatInterval)

    router.post('/api/rss/requestMihoyo', async (req, res) => {
        const info = await mihoyoRequest.resolveRequest(req.body)
        try {
            const result = await axios.request({
                method: info.method,
                headers: await mihoyoRequest.constructHeaders(info),
                params: info.params,
                data: JSON.stringify(info.data),
                url: info.url
            })

            res.setHeader('Content-Type', 'application/json;charset=utf-8')
            res.end(JSON.stringify({...result.data, headers: result.headers, cookies: result.headers['set-cookie']}))
        }
        catch (e) {
            console.error(e)
            await apiResponse(res, ApiReturnCode.failure, '米游社服务器连接失败')
        }
    })

    router.post('/api/rss/ping', async (req, res) => {
        await apiResponse(res, ApiReturnCode.success)
    })

    console.log('已开启RSS服务器')
}

export default router