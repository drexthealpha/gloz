import { test } from 'node:test'
import assert from 'node:assert/strict'
import { said } from '../app/src/core/say.ts'

test('say anything: each kind of request goes to the right tool', () => {
  assert.deepEqual(said('Add task call the bank.'), { tool: 'tasks', op: 'add', arg: 'call the bank' })
  assert.deepEqual(said('remind me to send the invoice'), { tool: 'tasks', op: 'add', arg: 'send the invoice' })
  assert.deepEqual(said('add a task to call mom'), { tool: 'tasks', op: 'add', arg: 'call mom' })
  assert.deepEqual(said('Note: ideas for the board meeting'), { tool: 'notes', op: 'add', arg: 'ideas for the board meeting' })
  assert.deepEqual(said('directions to the Ferry Building'), { tool: 'nav', arg: 'the Ferry Building' })
  assert.deepEqual(said('run uptime'), { tool: 'term', arg: 'uptime' })
  assert.deepEqual(said('teleprompter'), { tool: 'prompter' })
  assert.deepEqual(said('read On walking'), { tool: 'reader', arg: 'On walking' })
  assert.deepEqual(said('pause'), { tool: 'music', op: 'pause' })
  assert.deepEqual(said('next song'), { tool: 'music', op: 'next' })
  assert.deepEqual(said('price of AAPL'), { tool: 'stocks', arg: 'AAPL' })
  assert.deepEqual(said('my day'), { tool: 'dash' })
  assert.deepEqual(said('How tall is Mount Everest?'), { tool: 'ask', arg: 'How tall is Mount Everest?', guess: true })
  assert.deepEqual(said('Call the bank on Monday'), { tool: 'tasks', op: 'add', arg: 'Call the bank on Monday', guess: true })
  assert.deepEqual(said('tell me a joke'), { tool: 'ask', arg: 'tell me a joke', guess: true })
  assert.deepEqual(said('the weather in Lagos?'), { tool: 'ask', arg: 'the weather in Lagos?', guess: true })
  assert.equal(said('   '), null)
})
