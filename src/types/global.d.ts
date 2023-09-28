import Logger from "log4node/src/logger"

declare global {
  var globalVariable: GlobalVariable
  var logger: Logger
}

export {}