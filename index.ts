import dotenv from 'dotenv'
dotenv.config({
  encoding: 'utf-8'
})

import express from 'express'
import cors from 'cors'
import history from 'connect-history-api-fallback'

import config from './src/config/config'
import router from './src/routes/router'

process.on('uncaughtException', (err) => {
  console.error(`发生错误：${err.name}\n原因：${err.cause}\n堆栈回溯：\n${err.stack}`)
})

async function init() {
  console.log('服务器开始初始化')

  const app = express();
  app.use(express.json());
  app.use(history({}))
  app.use(cors({
    credentials: true,
    origin: ['http://localhost:5174', 'http://localhost:5173'],
  }));
  app.use(router);

  // app.use(express.static('web'))

  app.listen(config.port, config.host, () => console.log(`服务器正在监听“${config.host}:${config.port}”`));
}

init().then(() => {
  console.log('服务器初始化完成')
})