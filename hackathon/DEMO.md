# 90 秒演示脚本

对观众说法语或英语均可。括号里是你自己要盯的画面。不要超时讲解架构。

目标软件一开始就要开着：`hackathon/web/index.html` 经本地 HTTP 打开，右侧已是 Marie 的 Livre de recettes。

## 0:00–0:15 困扰

「Marie 经营 Atelier du Faubourg。月底她要把三张发票写进已经在用的 livre de recettes，只做草稿、不过账。她卡在第三张：这是 SCI 的 appel de fonds，上面既有租期又有付款到期日。」

（用手指发票列表，点开 SCI。读出：期间 10 月 1–31 日，到期 11 月 5 日，TTC 1 200,00 €。）

## 0:15–0:45 关键动作

点 **1. Enter the three drafts**。

边看右侧账本边说：

「Agent 在现有软件里写三条 brouillon。金额由代码算，不让模型口算。」

等到三条草稿出现。打开 Witness 卡片：

- EDF、Moulin：match
- SCI：date **uncertain**（05/11 在发票上，但还有 31/10），category **mismatch**（Charges，发票正文是 loyer commercial）

「第一次读屏相信了到期日，又把 appel de fonds 记成 Charges。第二次独立读屏抓住了，没有相信执行模型的自述。」

## 0:45–1:10 一次纠正

纠正框里已填：

> 第三张是房租，入账日期用十月三十一日。

点 **Apply correction**。

「只改 SCI。EDF 和 Moulin 不动，金额不动，状态仍是 Brouillon。」

（右侧 SCI 一行变成 Loyer、31/10/2026。另外两行不变。上面两条 Comptabilisée 种子记录仍在「Comptabilisées」页。）

## 1:10–1:30 最终记录

切到账本 **Brouillons**：

| Tiers | Date | Catégorie | TTC | État |
|---|---|---|---:|---|
| EDF | 28/10/2026 | Énergie | 87,40 € | Brouillon |
| Moulin de Seine | 31/10/2026 | Fournitures | 142,80 € | Brouillon |
| SCI du Faubourg | 31/10/2026 | Loyer | 1 200,00 € | Brouillon |

合计 TTC **1 430,20 €**，与三张发票一致。绿色摘要：Draft TTC matches. Nothing posted.

收束句（只说这一句增量）：

「相对直接跑 H agent，我们多做了一件能检查的事：每个关键字段都有独立读屏证据，纠正不必重跑整单。」

## 评委若追问

- 周六 computer-use：用 Agents API 在同一 `ledger.html` 上真实点击；Témoin 的核验层不换。
- 语音：同一纠正句走 Gladia；键盘路径已经能完成主赛。
- 不做过账、支付、报税。种子记录 Meunerie Dupont / Orange 必须仍在 Comptabilisées。
