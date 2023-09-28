import { type Response } from "express";
import { ApiResponse } from "../constants/Api";
import { ApiReturnCode } from "../constants/EApiReturnCode";

export async function apiResponse<T extends object>(res: Response, returnCode: ApiReturnCode = ApiReturnCode.success, message: string = '', data?: T) {
  res.setHeader('Content-Type', 'application/json;charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.end(JSON.stringify(<ApiResponse<T>>{
    retcode: returnCode,
    message,
    data
  }))
}