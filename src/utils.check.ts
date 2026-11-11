// Run: node src/utils.check.ts
import assert from 'node:assert/strict'
import {
  toWhatsAppUrl, timeAgo, dayLabel, displayName, formatDA, parseAmount, clientMessage, matchesSearch, toCsv,
} from './utils.ts'

assert.equal(toWhatsAppUrl('0555 12 34 56', 'a b'), 'https://wa.me/213555123456?text=a%20b')

const ship = { clientName: 'Ali', type: 'parts', status: 'arrived', fullPrice: 100000, deposit: 40000 }
assert.match(clientMessage(ship), /^Bonjour Ali, votre pièce est bien arrivée\..*Reste à payer : 60\s000 DA\.$/)
assert.match(clientMessage({ ...ship, deposit: 100000 }), /Tout est payé\.$/)
assert.match(clientMessage({ ...ship, type: 'papers', status: 'pending', fullPrice: 0 }), /vos documents sont en route\. Nous vous préviendrons dès l'arrivée\.$/)
assert.match(clientMessage({ ...ship, status: 'delivered', fullPrice: 0 }), /livrée\. Merci pour votre confiance\.$/)

assert.ok(matchesSearch('', ['Ali'], ''))
assert.ok(matchesSearch(' ali ', ['Ali Benali'], ''))
assert.ok(matchesSearch('0555123', ['Ali'], '0555 12 34 56'))
assert.ok(!matchesSearch('55', ['Ali'], '0555 12 34 56')) // too few digits to count as a phone search
assert.ok(!matchesSearch('omar', ['Ali'], '0555 12 34 56'))

assert.equal(toCsv([['a', 1], ['say "hi"', '+213']]), '﻿"a","1"\r\n"say ""hi""","\'+213"')

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

assert.equal(dayLabel(new Date(2026, 10, 7, 1), now), 'Today')
assert.equal(dayLabel(new Date(2026, 10, 6, 23), now), 'Yesterday')
assert.equal(dayLabel(new Date(2026, 10, 3), now), 'Tuesday 3 Nov')

assert.equal(parseAmount('120 000'), 120000)
assert.equal(parseAmount(formatDA(1250000)), 1250000)
assert.equal(parseAmount(''), 0)
assert.match(formatDA(120000), /^120\s000 DA$/)

assert.equal(displayName('china@wassel.app'), 'China')

console.log('utils ok')
