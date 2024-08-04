import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import path from 'path'
import { promises as fs } from 'fs'

const app = new Hono()

const getTextFile = async () => {
  const filePath = path.join(__dirname, '../data/langchain-test.txt')
}

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

const port = 3002
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
