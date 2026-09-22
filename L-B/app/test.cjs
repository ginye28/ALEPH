// node test.cjs — 판정 규칙이 논문대로 나오는지, 잘못된 입력에 멈추지 않는지 확인한다.
const assert = require('node:assert/strict');
const B = require('./logic.js');

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', n, name); };

// 입력 해석
t('0x1d → BE·BS 켜짐', () => { const r = B.parseInput('0x1d'); assert.equal(r.ok, true); const f = B.decodeFlags(r.flags); assert.equal(f.BE, true); assert.equal(f.BS, true); assert.equal(f.UP, true); assert.equal(f.UV, true); });
t('1d·29·0b00011101 모두 같은 바이트', () => { for (const s of ['1d', '29', '0b00011101', ' "0x1D" ']) assert.equal(B.parseInput(s).flags, 0x1d); });
t('authenticatorData base64url에서 33번째 바이트가 플래그', () => { const r = B.parseInput('-Td_nnE76Hb1-9671tqGcgHGs4jDZp695XBUSp4KOasdAAAABw'); assert.equal(r.ok, true); assert.equal(r.flags, 0x1d); assert.equal(r.signCount, 7); assert.equal(r.length, 37); });
t('authenticatorData 16진수', () => { const r = B.parseInput('00'.repeat(32) + '0d' + '0000000a'); assert.equal(r.flags, 0x0d); assert.equal(r.signCount, 10); });

// 잘못된 입력 — 예외 없이 ok:false
for (const bad of ['', '   ', null, undefined, '256', '0xzz', 'hello!!', 'AAAA', '가나다', '0x123', '1'.repeat(30000), '{"a":1}']) {
  t(`잘못된 입력 ${JSON.stringify(String(bad).slice(0, 12))} → 멈추지 않고 안내`, () => { const r = B.parseInput(bad); assert.equal(r.ok, false); assert.ok(r.error.length > 0); });
}

// 판정 — 논문 규칙
t('§7.2 단계 18: be:0, bs:1 → 거부', () => assert.equal(B.evaluate(0x15, { be: false, bs: false }, 'login').verdict, 'reject'));
t('§7.2 단계 18은 보관값이 없어도 거부', () => assert.equal(B.evaluate(0x15, {}, 'login').verdict, 'reject'));
t('§7.2 단계 19: 보관 BE=1인데 지금 BE=0 → 거부', () => assert.equal(B.evaluate(0x05, { be: true, bs: false }, 'login').verdict, 'reject'));
t('5.2절: BS 0→1 평소 로그인은 막지 않음', () => { const r = B.evaluate(0x1d, { be: true, bs: false, ever: false }, 'login'); assert.equal(r.verdict, 'pass'); assert.equal(r.transition, 'up'); assert.equal(r.next.everBackedUp, true); });
t('5.2절: BS 0→1 뒤 되돌릴 수 없는 동작 → 한 단계 더', () => assert.equal(B.evaluate(0x1d, { be: true, bs: false }, 'irreversible').verdict, 'stepup'));
t('5.2절: BS 1→0이어도 ever_backed_up은 내리지 않음', () => { const r = B.evaluate(0x0d, { be: true, bs: true, ever: true }, 'login'); assert.equal(r.transition, 'down'); assert.equal(r.next.backupState, false); assert.equal(r.next.everBackedUp, true); });
t('보관값 없음(논문 실험 A 서버) → 전이 판정 불가 경고', () => { const r = B.evaluate(0x1d, {}, 'irreversible'); assert.equal(r.transition, 'unknown'); assert.equal(r.verdict, 'pass'); assert.ok(r.findings.some((f) => f.level === 'warn')); });
t('기기 전용 키, 변화 없음 → 통과', () => { const r = B.evaluate(0x05, { be: false, bs: false, ever: false }, 'irreversible'); assert.equal(r.verdict, 'pass'); assert.equal(r.transition, 'same'); });

// 3단계 점검
t('Spring Security → 2단계에서 끊김', () => { const a = B.APPS.find((x) => x.id === 'spring'); const r = B.audit(a.answers); assert.equal(r.status, 'gap'); assert.equal(r.firstGap, 's2'); });
t('Keycloak → 1단계부터 빠짐', () => assert.equal(B.audit(B.APPS.find((x) => x.id === 'keycloak').answers).firstGap, 's1'));
t('세 단계 모두 예 → ok', () => assert.equal(B.audit({ s1: 'yes', s2: 'yes', s3: 'yes' }).status, 'ok'));
t('답이 비어도 멈추지 않음', () => assert.equal(B.audit(undefined).status, 'unknown'));
t('논문 표 14: 대조·갱신 구현 4/11', () => { assert.equal(B.LIBRARIES.length, 11); assert.equal(B.LIBRARIES.filter((l) => l.m[3] === '예').length, 4); });

console.log(`\n${n}개 모두 통과`);
