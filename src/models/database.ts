import pg from 'pg'
import config from '../config/config'
import schedule from 'node-schedule'

const cl = new pg.Pool({
  database: config.dbName,
  user: config.dbUser,
  password: config.dbPassword,
  host: config.dbHost,
  port: config.dbPort
})

async function init() {
  console.log('开始尝试初始化数据库')
  await cl.connect()

  await cl.query(`CREATE TABLE IF NOT EXISTS statistic (
    "totalMihoyoApiRequestNumber" INT NOT NULL,
    "monthMihoyoApiRequestNumber" INT NOT NULL,
    "dayMihoyoApiRequestNumber" INT NOT NULL
  );`)
  
  if ((await cl.query(`SELECT * FROM statistic;`)).rowCount == 0) {
    await cl.query(`INSERT INTO statistic VALUES (0, 0, 0);`)
  }

  schedule.scheduleJob('createDayStatistic', '0 1 0 * * *', async () => {
    console.log('清除每日请求数量')
    await cl.query(`UPDATE statistic SET "dayMihoyoApiRequestNumber" = 0;`)
  })

  schedule.scheduleJob('createMonthStatistic', '0 1 0 1 * *', async () => {
    console.log('清除每月请求数量')
    await cl.query(`UPDATE statistic SET "monthMihoyoApiRequestNumber" = 0;`)
  })
}
init().then(() => console.log('数据库初始化完成'))

export default cl