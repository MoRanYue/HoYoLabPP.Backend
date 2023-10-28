import type { NonArgumentFunc } from 'src/constants/TNonArgumentFunc'
import { isAsyncFunc } from './utils'

type GetterFunc = NonArgumentFunc | (() => Promise<any>)

class Cache {
  protected data: Record<string, {
    cache?: any
    getter: GetterFunc
    expiredTimer?: NodeJS.Timeout
    expired: boolean
  }> = {}

  register(id: string, getter: GetterFunc, expiredSeconds: number = -1, immediate: boolean = true): string | never {
    id = id.toLowerCase()
    if (Object.prototype.hasOwnProperty.call(this.data, id)) {
      throw new Error(`缓存项“${id}”已存在`);
    }
    
    this.data[id] = {
      getter,
      expired: false,
    }

    if (expiredSeconds > 0) {
      this.data[id].expiredTimer = setInterval(async () => this.data[id].expired = true, expiredSeconds * 1000)
    }

    if (immediate) {
      this.refresh(id)
    }

    return id
  }
  remove(id: string) {
    id = id.toLowerCase()
    if (Object.prototype.hasOwnProperty.call(this.data, id)) {
      if (this.data[id].expiredTimer) {
        clearInterval(this.data[id].expiredTimer)
      }
      delete this.data[id]
    }
  }
  async get(id: string) {
    id = id.toLowerCase()
    if (this.data[id].expired) {
      await this.refresh(id)
    }

    return this.data[id].cache
  }

  async refresh(id: string) {
    id = id.toLowerCase()
    if (Object.prototype.hasOwnProperty.call(this.data, id)) {
      if (isAsyncFunc(this.data[id].getter)) {
        this.data[id].cache = await this.data[id].getter()
      }
      else {
        this.data[id].cache = this.data[id].getter()
      }

      this.data[id].expired = false
    }
    else {
      throw new Error(`缓存项“${id}”不存在`);
    }
  }
}

export default Cache