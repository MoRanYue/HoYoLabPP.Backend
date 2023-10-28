import type { Dict } from "src/constants/TDict"
import { Request } from "express"
import { AnyFunc } from "src/constants/TAnyFunc"

export function getClientIp(req: Request): string {
  const ip: Dict = {
    xRealIp: req.headers['x-real-ip'],
    xForwardedFor: req.headers['x-forwarded-for'],
    xForwarded: req.headers['x-forwarded'],
    forwardedFor: req.headers['forwarded-for'],
    forwarded: req.headers['forwarded'],
    clientIp: req.headers['client-ip'],
    remoteAddress: req.socket.remoteAddress
  }

  return ip.xRealIp
  ?? ip.xForwardedFor?.split(/, */).shift() 
  ?? ip.xForwarded?.split(/, */).shift() 
  ?? ip.forwardedFor?.split(/, */).shift()
  ?? ip.forwarded?.split(/, */).shift()
  ?? ip.clientIp
  ?? ip.remoteAddress
  ?? '0.0.0.0:0'
}

export function randomMinZero(max: number) {
  return Math.floor(Math.random() * (max + 1))
}

export function randomRange(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

export function randomRgb(alpha: boolean = false) {
  return [randomRange(0, 255), randomRange(0, 255), randomRange(0, 255), alpha ? randomRange(0, 255) : 255]
}

export function randomChoice(arr: any[] | string) {
  return arr[randomMinZero(arr.length - 1)]
}

export function randomChar(length: number, collection: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
  let str: string = ''
  for (let i = 0; i < length; i++) {
    str += randomChoice(collection)
  }
  return str
}

export function randomUuid4() {
  let str: string = ''
  for (let i = 0; i < 4; i++) {
    str += randomChar(4, '0123456789abcdef')

    if (i < 3) {
      str += '-'
    }
  }
  return str
}

export function clamp(x: number, min: number, max: number) {
  return Math.min(Math.max(x, min), max)
}

export function currentTimestamp() {
  return Math.floor(Date.now() / 1000)
}

export function dictToQuery(params: Dict): string {
  const queryItems: string[] = []

  for (const k in params) {
    if (Object.prototype.hasOwnProperty.call(params, k)) {
      const v = params[k];
      
      queryItems.push(`${k}=${v}`)
    }
  }

  return queryItems.sort().join('&')
}

export function dictToCookie(cookies: Dict): string {
  let cookie: string = ''

  for (const k in cookies) {
    if (Object.prototype.hasOwnProperty.call(cookies, k)) {
      const v = cookies[k];
      
      cookie += `${k}=${v}; `
    }
  }

  return cookie
}

export function encryptIpV4(ip: string) {
  const segments = ip.split('.')
  segments[2] = '***'
  segments[3] = '***'
  return segments.join('.')
}

export function isAsyncFunc(func: AnyFunc) {
  return Object.prototype.toString.call(func).includes('AsyncFunction')
}