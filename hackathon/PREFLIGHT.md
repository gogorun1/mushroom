# 赛前杀伤验证 · 2026-11-04

目标：周五前证明「账号 / 登录态 / 真实输入 / 端到端」能跑完。Témoin 用冻死的本地账本代替 Pennylane 登录，避免 FranceConnect 和现场外设。

## 目标软件

| 项 | 状态 |
|---|---|
| 软件 | [`web/ledger.html`](web/ledger.html) · Livre de recettes, Atelier du Faubourg |
| 账号 | 不需要。页面写成 Marie Chen 已登录 |
| 登录态 | 打开即用。旧记录 Meunerie Dupont、Orange 已 Comptabilisée |
| 不可逆动作 | 演示不得点 Comptabilisée |

必须用 HTTP 打开：`python3 -m http.server 8765 --directory hackathon/web` → http://127.0.0.1:8765/  
`file://` 下 iframe 读不到账本 DOM。

## 输入材料

三张源发票在 [`web/invoices.html`](web/invoices.html)，金额在 [`web/invoices.js`](web/invoices.js)（整数分）：

| 发票 | 日期线索 | 正确类别 | TTC |
|---|---|---|---:|
| EDF F-2026-10482 | 28/10/2026 | Énergie | 87,40 € |
| Moulin de Seine FA-4417 | 31/10/2026 | Fournitures | 142,80 € |
| SCI du Faubourg AF-2026-11 | 期间 31/10 **和** 到期 05/11 | Loyer | 1 200,00 € |
| **合计** | | | **1 430,20 €** |

SCI 是故意的杀伤用例：appel de fonds 会让第一遍写成 Charges + 05/11。

## 端到端跑通（已完成）

1. `node hackathon/tests/operator_test.js` → **9 checks passed**（金额、naive 误读、独立核验、中法文纠正、纠正后合计、种子过账记录）。
2. Chrome headless 对 http://127.0.0.1:8765/ 实际点击：

| 步骤 | 结果 |
|---|---|
| 打开 operator + 账本 iframe | Marie 已登录，Brouillons 空 |
| 打开 SCI 发票 | 同时有 1er–31 octobre 和 05/11/2026，TTC 1 200,00 € |
| Enter the three drafts | 三条 Brouillon；SCI = Charges / 05/11/2026；Witness = mismatch |
| 纠正「第三张是房租，入账日期用十月三十一日。」 | 只改 SCI → Loyer / 31/10/2026；金额仍 1 200,00 € |
| 核验合计 | Draft TTC 1 430,20 € matches. Nothing posted. |
| Comptabilisées | Meunerie Dupont、Orange 仍在 |
| 390px 视口 | 左右栏改为上下堆叠，主按钮可点 |

第一遍之后，账本 TTC 已经是 1 430,20 €（金额从未错）。核验层拦住的是日期和类别，不是钱。这正是演示高潮。

## 仍未验证（周六再接）

- H Agents API 在同一 `ledger.html` 上真实点击（当前 actor 是脚本填表，接口与点击相同：日期、tiers、类别、欧元金额、Enregistrer）
- Gladia 语音进同一纠正框
- 现场投影和评委网络

这两项不阻断选题。核验层、发票和账本已经冻死。
