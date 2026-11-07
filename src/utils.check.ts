// Run: node src/utils.check.ts
import assert from 'node:assert/strict'
import { toWhatsAppUrl, timeAgo, displayName } from './utils.ts'

assert.equal(toWhatsAppUrl('0555 12 34 56'), 'https://wa.me/213555123456')
assert.equal(toWhatsAppUrl('+213 555 12 34 56'), 'https://wa.me/213555123456')
assert.equal(toWhatsAppUrl('00213555123456'), 'https://wa.me/213555123456')
assert.equal(toWhatsAppUrl('+86 138 0013 8000'), 'https://wa.me/8613800138000')

const now = new Date(2026, 10, 7, 12, 0)
const ago = (min: number) => timeAgo(new Date(now.getTime() - min * 60000), now)
assert.equal(ago(0), 'Just now')
assert.equal(ago(12), '12 min ago')
assert.equal(ago(180), '3h ago')
assert.equal(ago(26 * 60), 'Yesterday')
assert.equal(ago(4 * 1440), '3 Nov')

assert.equal(displayName('china@wassel.app'), 'China')

console.log('utils ok')
