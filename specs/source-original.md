---
title: ShareLens — Premium Guard + Dividend Lens
type: build-spec
quest: Base Builder Quests — Coinbase Tokenized Stocks
deadline: 2026-09-09 23:59 EST
status: ready-to-build
stack: Next.js App Router, TypeScript, viem, wagmi, Base mainnet
tags:
  - base
  - b20
  - tokenized-stocks
  - builder-quest
---

# ShareLens

หน้าเดียวสำหรับดูหุ้น B20 ก่อนซื้อ

ตอบ 2 คำถามเท่านั้น

1. โทเค็นที่ถืออยู่ตอนนี้เท่ากับกี่หุ้นจริง
2. ราคาในพูล Aerodrome แพงหรือถูกกว่ามูลค่าอ้างอิงแค่ไหน

ไม่ใช่โบรกเกอร์ ไม่ใช่เอเจนต์ ไม่ใช่ onramp

---

## เป้าหมาย Quest

แคมเปญ: Builder Quests ของ `@buildonbase`  
โจทย์: สร้างของที่ช่วยคนเทรดหรือใช้ Coinbase Tokenized Stocks บน Base  
รางวัล: $2,000 อันดับ 1 + $3,000 แบ่ง 5 finalists  
ปิดรับ: 9 ก.ย. 2026 23:59 EST  
ส่งงาน: โพสต์ Loom บน X แท็ก `@buildonbase` + Google Form

กติกาที่ออกแบบเข้าไปในแอป

- ใช้หุ้น Coinbase B20 จริง ไม่ใช่ synthetic
- โปรเจกต์ที่เปิดให้คนสหรัฐฯ เทรดได้ = นอกขอบเขต
- คนเห็นตัวเลขและเซ็นธุรกรรมเอง
- ไม่ใช่คำแนะนำการลงทุน

ลิงก์ส่งฟอร์ม

https://docs.google.com/forms/d/e/1FAIpQLSfru57ZLO9AQ-hgWX_G5ZAzmAKkzFLZCyqe5wTyBSwACFX5tg/viewform

---

## สโคปที่ล็อกแล้ว

### P0 ต้องมีใน Loom

- เลือกได้ 4 ตัว: NVDAc, AAPLc, METAc, GOOGLc
- โชว์ multiplier แล้วแปลเป็นภาษาคน
- โชว์ราคาอ้างอิง vs ราคาพูล + พรีเมียมเป็น %
- สถานะเขียว / เหลือง / แดง
- โชว์เวลาที่ฟีดราคาอัปเดตล่าสุด
- แบนเนอร์ non-US only
- ลิงก์ Basescan ของสัญญา

### P1 ถ้ายังมีเวลา

- ต่อวอลเล็ต แล้วโชว์ยอดดิบ + ยอดเทียบเท่าหุ้น
- ปุ่มซื้อ USDC → หุ้น ผ่านพูล Aerodrome ที่ลึกสุด
- ปิดปุ่มซื้อถ้าพรีเมียมแดง หรือประเทศเป็น US หรือฟีด stale

### P2 ห้ามทำรอบนี้

- PromptPay / fiat onramp
- เอเจนต์จัดพอร์ต
- ของขวัญ / time-lock
- ดัชนีอัตโนมัติ
- limit order / keeper
- ประวัติปันผลย้อนหลังยาว
- aggregator อย่าง 0x / 1inch เป็นแหล่งราคาหรือเส้นสวอป

เกณฑ์ตัดของ: ถ้าสวอปยังพังตอนเช้าวันที่ 9 ส่ง P0 อย่างเดียว

---

## สูตร ห้ามคำนวณผิด

### Multiplier

ค่าบนเชนเป็น WAD (1e18)

```text
m = multiplier() / WAD_PRECISION()
```

ปกติ `WAD_PRECISION()` คืน `1e18`

```text
หุ้นเทียบเท่า = จำนวนโทเค็นดิบ × m
```

ใช้ helper ของ B20 ก่อน อย่าคูณเองถ้าเรียกฟังก์ชันได้

| ฟังก์ชัน | ความหมาย |
|---|---|
| `scaledBalanceOf(account)` | ยอดวอลเล็ตเป็นหน่วยหุ้น |
| `toScaledBalance(raw)` | แปลงจำนวนที่พิมพ์ในช่องเป็นหุ้น |
| `toRawBalance(scaled)` | แปลงจำนวนหุ้นกลับเป็นโทเค็นดิบ |

ข้อเท็จจริงจาก docs ที่ต้องเขียนบนจอ

- 1 B20 ไม่ได้เท่ากับ 1 หุ้นตลอดไป
- ปันผลเงินสดถูกแปลงเป็นหุ้นแล้วพับเข้า multiplier
- ยอดโทเค็นในวอลเล็ตไม่เปลี่ยนตอนปันผล

### ราคาอ้างอิง

ฟีด Chainlink ของ Coinbase Tokenized Stocks เป็น **total return**  
ค่าที่ได้รวมผลจาก multiplier แล้ว **ห้ามคูณ multiplier ซ้ำ**

```text
P_ref = latestRoundData.answer × 10^(-decimals)
```

ฟีดเหล่านี้คืน 8 decimals

อ่านผ่าน `latestRoundData()` แล้วต้องใช้ `updatedAt`

ถือว่า stale ถ้า `updatedAt` เก่ากว่า 36 ชั่วโมง  
เหตุผล: ฟีดเป็น 24/5 และหยุดช่วงปิดตลาด / วันหยุด / corporate action

### ราคาพูล

```text
P_pool = ราคาโทเค็นต่อ 1 หน่วย ในพูล Aerodrome คู่ USDC ที่ลึกสุด
```

แหล่งเดียวที่อนุญาตในรอบนี้: Aerodrome  
ห้ามใช้ 0x / 1inch เป็นแหล่งราคา มีทีมใน Quest เจอว่า aggregator บล็อกหุ้นเหล่านี้

### พรีเมียม

```text
premium = (P_pool - P_ref) / P_ref
```

ค่าติดลบ = พูลถูกกว่าราคาอ้างอิง

### เกณฑ์สี ล็อกไว้ อย่าจูนมั่วตอนใกล้ส่ง

| พรีเมียม | สี | ข้อความไทย | ปุ่มซื้อ |
|---|---|---|---|
| < 0.30% | เขียว | ใกล้ราคาอ้างอิง | เปิด |
| 0.30% ถึง 1.00% | เหลือง | แพงกว่านิด ดู slippage | เปิด + คำเตือน |
| > 1.00% | แดง | แพงกว่าหุ้นอ้างอิง อย่ารีบ | ปิด |
| ฟีด stale หรือ pause | เทา | ราคาอ้างอิงไม่สด ไม่ใช้ตัดสินใจ | ปิด |

---

## Config สัญญา

เครือข่าย: Base mainnet, chain id `8453`  
USDC: `0x833589fCD6eDb6E08f4c7C32D4f79b54bdA66913`  
Registry: `0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD`

ระบุโทเค็นด้วยที่อยู่เสมอ ticker เป็นแค่ป้ายบน UI

| UI label | Token | Chainlink feed |
|---|---|---|
| NVDAc | `0xb20000000000000000000078ee7ce2fE4908108C` | `0x04689a41629776563E6822F76f2e57D148d28513` |
| AAPLc | `0xb200000000000000000000C2e324d24d7eEcd1fb` | `0x787f13dEa48Db0897CbCDD985de77809D837F988` |
| METAc | `0xb2000000000000000000008bC8786B856E61707C` | `0x6526aE6797A76123638b863AeE4dD27Ba4E4b27D` |
| GOOGLc | `0xb2000000000000000000002D0BA3164cc74f58B7` | `0x5bF49E0ffA937CE2FfF033c739aD7C634c4D34F2` |

พูล Aerodrome อย่าเดาที่อยู่  
ตอนบิลด์ให้หา **Slipstream หรือพูล USDC ที่ TVL สูงสุดต่อหุ้น** จาก Aerodrome / DexScreener แล้วใส่ใน `lib/tokens.ts` พร้อมยืนยัน token0, token1, fee

ไฟล์ config ที่ต้องการ

```ts
export const TOKENS = [
  {
    id: "nvdac",
    symbol: "NVDAc",
    name: "NVIDIA",
    token: "0xb20000000000000000000078ee7ce2fE4908108C",
    feed: "0x04689a41629776563E6822F76f2e57D148d28513",
    pool: "", // fill after lookup
  },
  // ...
] as const
```

อ่าน onchain อย่างน้อย

- ERC-20: `symbol`, `decimals`, `balanceOf`
- B20: `multiplier`, `WAD_PRECISION`, `scaledBalanceOf`, `toScaledBalance`, `toRawBalance`
- ถ้ามีและไม่ revert: pause / policy check
- Chainlink: `latestRoundData()`, `decimals()`

เอกสารอ้างอิง

- https://docs.base.org/specifications/b20/tokenized-stocks-on-base
- https://blog.base.org/request-for-builders-tokenized-stocks
- https://www.base.org/stocks

---

## หน้าจอ หน้าเดียว

ไม่มีเมนูย่อย ไม่มีแดชบอร์ดแน่น ตัวเลขต้องอ่านออกจาก Loom บนมือถือ

### Header

- ชื่อ ShareLens
- คำบรรยายสั้น: ดูก่อนซื้อหุ้น B20 บน Base
- ปุ่ม Connect wallet
- สลับภาษาไทย/อังกฤษ ถ้าทำทัน ไม่บังคับ P0

### แบนเนอร์คงที่

ใช้ได้เฉพาะผู้ใช้นอกสหรัฐฯ · ไม่ใช่คำแนะนำการลงทุน · Base และ Coinbase ไม่ได้รับรองแอปนี้

### แถบเลือกหุ้น

4 ปุ่ม: โลโก้หรือตัวอักษรย่อ + ticker + จุดสีพรีเมียม

### การ์ด Dividend Lens

- บรรทัดใหญ่: `1.00 NVDAc ≈ 1.00xx หุ้น NVIDIA`
- ช่องใส่จำนวนโทเค็น ค่าเริ่มต้น `1.00`
- โชว์ `m` แบบอ่านออก เช่น `multiplier = 1.000000`
- ถ้าต่อวอลเล็ต: ในกระเป๋าถือ X โทเค็น ≈ Y หุ้น
- ประโยคกำกับ: ปันผลเงินสดถูกพับเข้า multiplier ไม่ได้เข้าวอลเล็ตเป็น USDC
- ปุ่มคัดลอกที่อยู่สัญญา + ลิงก์ Basescan

### การ์ด Premium Guard

- ราคาอ้างอิง (Chainlink total return)
- ราคาพูล Aerodrome
- ส่วนต่างเป็นดอลลาร์และเป็น %
- หลอดหรือป้ายสี + ข้อความตามตารางเกณฑ์
- `updatedAt` ของฟีด เป็นเวลาท้องถิ่น
- ความลึกพูลคร่าว ๆ ถ้าดึงได้ ไม่บังคับ P0

ใต้ตัวเลขทุกช่องต้องมีที่มา เช่น

```text
Chainlink · 8 decimals · total return · updated 2h ago
Aerodrome USDC pool
```

### การ์ดซื้อ (P1)

- ใส่จำนวน USDC
- ประมาณได้กี่โทเค็น / เทียบเท่ากี่หุ้น
- slippage เริ่ม 0.50% แก้ได้
- ปุ่ม Approve USDC แล้ว Swap
- ปิดปุ่มถ้าประเทศเป็น US หรือสีแดง หรือฟีด stale
- หลังสวอปโชว์ tx hash

### Footer

ที่อยู่ 4 สัญญา · ฟีด · ตรวจที่อยู่ก่อนใช้ทุกครั้ง

### สถานะพิเศษ

| สถานะ | UI |
|---|---|
| โหลดข้อมูล | skeleton ห้ามโชว์ 0 ปลอม |
| ฟีด stale | การ์ดเทา อธิบายว่าตลาดหุ้นปิดหรือ corporate action |
| อ่าน multiplier ไม่ได้ | error + ที่อยู่สัญญา |
| ไม่พบพูล | โชว์แค่ Lens ซ่อน Guard อย่าเดาราคา |
| วอลเล็ตคนละเชน | สลับไป Base |
| IP สหรัฐฯ | ดูตัวเลขได้ ปุ่มซื้อหาย |
| ตรวจประเทศไม่ได้ | โชว์คำเตือน อย่าเดาว่าไม่ใช่ US |

โทนจอ: พื้นเข้ม ตัวเลขใหญ่ ระยะห่างกว้าง  
อย่าทำกราฟเทียนในรอบนี้

---

## สแตกและโครงสร้างโปรเจกต์

- Next.js App Router + TypeScript
- `viem` + `wagmi`
- Base mainnet
- ไม่มี backend ถ้าไม่จำเป็น
- geo ทำที่ edge หรือเรียก IP lookup แบบหยาบ
- deploy ที่ Vercel
- ชื่อรีโป: `sharelens`

```text
app/page.tsx
lib/tokens.ts
lib/b20.ts
lib/oracle.ts
lib/pool.ts
lib/premium.ts
lib/geo.ts
components/LensCard.tsx
components/GuardCard.tsx
components/BuyCard.tsx
components/Banner.tsx
```

### หน้าที่แต่ละไฟล์

`lib/tokens.ts`  
ที่อยู่โทเค็น ฟีด พูล USDC chain id

`lib/b20.ts`  
อ่าน multiplier, WAD, scaled balance, แปลง raw ↔ scaled

`lib/oracle.ts`  
`latestRoundData`, แปลง 8 decimals, ตรวจ stale, คืน `P_ref` พร้อม `updatedAt`

`lib/pool.ts`  
อ่านราคาจากพูล Aerodrome ที่ใส่ใน config  
P1: quote และ calldata สำหรับ swap USDC → token

`lib/premium.ts`  
คำนวณ premium และคืนสถานะ `ok | warn | stop | stale`

`lib/geo.ts`  
ประเทศจาก IP หรือ header ของโฮสต์  
US = ปิดการซื้อ

### กฎโค้ด

- ตัวเลขเงิน 2 ตำแหน่ง
- จำนวนหุ้น/โทเค็น 4 ถึง 6 ตำแหน่ง
- ห้ามคูณฟีดด้วย multiplier อีก
- ทุกค่าคำนวณได้ต้องมีที่มาบนจอ
- มีเทสหน่วยอย่างน้อย 2 อัน: คำนวณ premium และแปลง raw → scaled
- ระบุโทเค็นด้วย address ไม่ผูก logic กับ ticker

---

## Geo และ compliance

- ไม่ทำ KYC
- ตรวจประเทศแบบหยาบพอสำหรับ Quest
- ยูสเซอร์สหรัฐฯ ดู Lens/Guard ได้ แต่ไม่มีปุ่มซื้อ
- ข้อความบนจอต้องบอกว่าสินทรัพย์นี้มีให้เฉพาะ eligible non-US users
- อย่าเรียกตัวเองว่าโบรกเกอร์
- อย่าโชว์คำว่า onramp

---

## แผนเวลา 48 ชั่วโมง

### คืนวันที่ 7

- scaffold Next.js
- ใส่ `lib/tokens.ts`
- อ่าน `multiplier` / `WAD` ของ 4 ตัวให้ขึ้นจอ
- การ์ด Lens ใช้ตัวเลขจริง

เสร็จเมื่อ: พิมพ์ 1 NVDAc แล้วเห็นจำนวนหุ้นที่คำนวณจากเชน

### เช้าวันที่ 8

- ต่อ Chainlink 4 ฟีด + โชว์ `updatedAt`
- หาพูล Aerodrome USDC 4 คู่ แล้วใส่ config
- การ์ด Guard + สี ทำงาน

เสร็จเมื่อ: สลับ 4 หุ้นแล้วพรีเมียมเปลี่ยนตามข้อมูลจริง

### บ่ายวันที่ 8

- ต่อวอลเล็ต + `scaledBalanceOf`
- ถ่าย Loom รอบแรกด้วย P0 เก็บไว้ก่อน
- ถ้าเส้นพูลนิ่ง ค่อยทำ Approve/Swap 1 ดอกบน NVDAc

เสร็จเมื่อ: มีเดโมที่เล่าครบโดยไม่พึ่งปุ่มซื้อ

### วันที่ 9 ก่อนปิด EST

- geo-gate ปิดปุ่มซื้อ
- disclaimer
- Loom สุดท้าย 90 วินาที
- โพสต์ X แท็ก `@buildonbase`
- ส่ง Google Form

---

## สคริปต์ Loom 90 วินาที

1. บน Base คนเห็นราคาพูล แต่ไม่รู้ว่าแพงกว่าหุ้นอ้างอิงไหม และไม่รู้ว่า 1 โทเค็นยังเท่ากับ 1 หุ้นอยู่หรือไม่
2. เปิด NVDAc ชี้ multiplier แล้วแปลเป็นจำนวนหุ้น
3. ชี้ราคาอ้างอิง vs พูล + สีพรีเมียม
4. ใส่จำนวนในช่อง โชว์เทียบเท่าหุ้น
5. ถ้ามีปุ่มซื้อ ให้กดเฉพาะตอนเขียว
6. ปิด: non-US only, คนเซ็นเอง, ไม่ใช่คำแนะนำการลงทุน

### โพสต์ X

```text
ShareLens for the @buildonbase Builder Quest.

Dividend Lens: 1 B20 token ≠ 1 share forever. We translate the onchain multiplier into shares.

Premium Guard: Aerodrome pool price vs Chainlink total-return reference, with a hard stop when the premium is too high.

Non-US only. No autonomous trading.

[app url]
[loom url]
```

---

## คำสั่งสั้นสำหรับ agent ที่จะบิลด์

สร้างเว็บหน้าเดียวบน Base ชื่อ ShareLens  
อ่าน B20 multiplier ของ NVDAc AAPLc METAc GOOGLc แล้วแปลงเป็นจำนวนหุ้น  
เทียบราคาพูล Aerodrome USDC กับ Chainlink total-return feed โดยไม่คูณ multiplier ซ้ำ  
โชว์พรีเมียมเป็นสีตามเกณฑ์ 0.30% / 1.00%  
ฟีดเก่ากว่า 36 ชั่วโมง ทำให้การ์ดเป็นเทาและปิดการซื้อ  
ยูสเซอร์สหรัฐฯ ดูได้แต่ซื้อไม่ได้  
อย่าใช้ 0x เป็นแหล่งราคาหรือเส้นสวอป  
ปุ่มซื้อเป็นของแถม เส้นอ่านตัวเลขต้องเสร็จก่อน  
ใช้ Next.js + viem + wagmi + TypeScript  
ที่อยู่สัญญาใช้ตามสเปกนี้เท่านั้น

---

## Acceptance checklist

P0 ผ่านเมื่อครบทุกข้อ

- [ ] สลับ 4 หุ้นได้
- [ ] multiplier มาจากเชน ไม่ใช่ค่าเดา
- [ ] ช่องจำนวนแปลงเป็นหุ้นถูกต้อง
- [ ] P_ref มาจาก Chainlink และไม่ถูกคูณ multiplier ซ้ำ
- [ ] P_pool มาจาก Aerodrome
- [ ] สีพรีเมียมตรงตาราง
- [ ] ฟีดเก่าขึ้นสถานะเทา
- [ ] มีที่อยู่สัญญาและลิงก์ Basescan
- [ ] มีแบนเนอร์ non-US และ disclaimer
- [ ] หน้าจออ่านออกใน Loom 90 วินาที

P1 ผ่านเมื่อครบทุกข้อเพิ่ม

- [ ] ต่อวอลเล็ตบน Base ได้
- [ ] โชว์ scaled balance
- [ ] สวอป USDC → NVDAc ได้ 1 ครั้งบน mainnet หรืออธิบายชัดว่าทำไมยังไม่เปิด
- [ ] ปุ่มซื้อปิดเมื่อแดง / stale / US
