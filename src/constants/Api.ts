import type { ApiReturnCode } from "./EApiReturnCode"

export interface ApiResponse<T extends object> {
  retcode: ApiReturnCode
  message: string
  data: T | undefined
}

export interface Statistics {
  totalMihoyoApiRequestNumber: number
  monthMihoyoApiRequestNumber: number
  dayMihoyoApiRequestNumber: number
}

export interface OnlineRequestSenderServer {
  onlineRequestSenderServerNumber: number
}