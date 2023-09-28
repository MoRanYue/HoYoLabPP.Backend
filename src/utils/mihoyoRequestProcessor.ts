import { SaltType } from "src/constants/DynamicSign";
import { MihoyoRequestInfo } from "src/constants/IMihoyoRequestInfo";
import md5 from 'md5'
import url from 'url'
import config from "../config/config";
import { Dict } from "src/constants/TDict";
import { dictToCookie, dictToQuery, randomChar, randomMinZero, randomRange } from "./utils";

type SaltTable = Record<string, Partial<{
  k2: string,
  lk2: string,
  '4x': string,
  '6x': string,
  prod: string
}>>

export async function resolveRequest(data: Dict): Promise<MihoyoRequestInfo> {
  const info: Dict = data
  return {
    method: info.method,
    url: info.url,
    client: info.client,
    ds: info.ds,
    params: info.params,
    data: info.data,
    salt: info.salt,
    headers: info.headers,
    cookies: info.cookies
  }
}

export async function generateDs(method: 1 | 2, saltType: keyof typeof SaltType, params?: Dict | string, data?: any | string) {
  const salt: SaltTable = {
    other: {
      '4x': 'xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs',
      '6x': 't0qEgfub6cvueAPgR5m9aQWWVciEer7v',
      prod: 'JwYDpKvLj6MrMqqYU6jTKF17KNO2PXoS'
    },
    '2.57.1': {
      k2: '1XgQyjgs3iGBwEwgnqySnqtPdw0Yi2mP',
      lk2: '20k4lPpyult9CEZ2dhoEkV09lkt0Rqes',
    },
    '2.56.1': {
      k2: '4boKU9HR49XublAiGdlH6xCpjAnaix3X',
      lk2: 'wam87VdmOXIGINFFSChd4D5idFx9KGiY',
    },
  }

  const t = Math.floor(Date.now() / 1000)
  let ds: string
  
  if (method == 2) {
    let q: string = ''
    let b: string = ''

    if (typeof params == 'object') {
      q = dictToQuery(params)
    }
    else {
      q = params ?? ''
    }

    if (typeof data == 'object') {
      b = JSON.stringify(data)
    }
    else {
      b = data ?? ''
    }

    const r = randomRange(100001, 200000)

    let main: string
    if (['4x', '6x', 'prod'].includes(saltType)) {
      main = `salt=${salt.other[saltType]}&t=${t}&r=${r}&b=${b}&q=${q}`
    }
    else {
      main = `salt=${salt[config.likeUsingHoyolabVersion][saltType]}&t=${t}&r=${r}&b=${b}&q=${q}`
    }
    ds = md5(main)

    return `${t},${r},${ds}`
  }
  else {
    const r = randomChar(6)

    let main: string
    if (['4x', '6x', 'prod'].includes(saltType)) {
      main = `salt=${salt.other[saltType]}&t=${t}&r=${r}`
    }
    else {
      main = `salt=${salt[config.likeUsingHoyolabVersion][saltType]}&t=${t}&r=${r}`
    }
    ds = md5(main)

    return `${t},${r},${ds}`
  }
}

const urlConstants = {
  webStatic: 'https://webstatic.mihoyo.com/',
  appMihoyo: 'https://app.mihoyo.com/'
}
export async function getReferer(target: string) {
  const hostname = url.parse(target, false).hostname

  switch (hostname?.toLowerCase()) {
    // case 'bbs-api.miyoushe.com':
    // case 'bbs-api-static.miyoushe.com':
    //   return ''
    case 'api-takumi-record.mihoyo.com': 
    case 'api-takumi.mihoyo.com':
    case 'api-takumi.miyoushe.com':
      return urlConstants.webStatic
  
    default:
      return urlConstants.appMihoyo
  }
}

export async function constructHeaders(info: MihoyoRequestInfo) {
  const headers: Dict = info.headers ?? {}

  const androidVersion = randomRange(9, 14)
  const mobile = randomChar(7)
  const deviceId = randomChar(16)

  headers.Accept = 'application/json;charset=utf-8, text/plain;charset=utf=8, */*'
  headers['x-rpc-sys_version'] = String(androidVersion)
  headers['x-rpc-channel'] = 'xiaomi'
  headers['x-rpc-device_name'] = `Xiaomi ${mobile}`
  headers['x-rpc-device_model'] = mobile
  if (!headers['x-rpc-device_id']) {
    headers['x-rpc-device_id'] = deviceId
  }
  headers['X-Requested-With'] = 'com.mihoyo.hyperion'
  headers.Host = url.parse(info.url, false).hostname
  headers['User-Agent'] = `Mozilla/5.0 (Linux; Android ${androidVersion}; ${mobile} Build/TKQ1.220829.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0.5359.128 Mobile Safari/537.36 miHoYoBBS/${config.likeUsingHoyolabVersion}`
  if (!headers.Origin) {
    headers.Origin = await getReferer(headers.Host)
  }
  if (!headers.Referer) {
    headers.Referer = headers.Origin
  }

  if (info.client && info.salt && info.ds) {
    headers['x-rpc-app_version'] = config.likeUsingHoyolabVersion
    headers['x-rpc-client_type'] = String(info.client)
    headers['DS'] = await generateDs(info.ds, info.salt, info.params, info.data)
  }

  if (info.cookies) {
    headers.Cookie = dictToCookie(info.cookies)
  }

  console.log(headers)

  return headers
}