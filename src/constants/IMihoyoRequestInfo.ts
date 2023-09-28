import { HttpRequestMethod } from "./EHttpRequestMethod";
import { SaltType, ClientType } from './DynamicSign'
import { Dict } from "./TDict";

export interface MihoyoRequestInfo {
  method: keyof typeof HttpRequestMethod
  url: string
  salt?: keyof typeof SaltType
  client?: ClientType
  ds?: 1 | 2,
  params?: Dict
  data?: any
  headers?: Dict
  cookies?: Dict
}