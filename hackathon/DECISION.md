# 选题锁定：Témoin（Witnessed Operator）

锁定日期：2026-11-04。本届有效开发时间约 27.5 小时（周六 10:30–周日 14:00）。

## 决定

**主赛只做一条线：带独立核验的录入操作员。** 产品名 **Témoin**。

用户是小商户月底把发票变成账本草稿。Agent 在现有「Livre de recettes」里写入记录；每个关键字段留下前后对比，并由第二次读屏独立核对。用户按字段纠正，不必整段重跑。金额用确定性代码对账，不让模型口算。

本仓库里的 [`web/ledger.html`](web/ledger.html) 就是赛前冻死的目标软件：已登录、无 FranceConnect、无外设。周六用 H Agents API 替换脚本演员的点击，不替换核验层。

## 为什么不是另外三条

| 方案 | 本周末结论 | 依据 |
|---|---|---|
| 老人助手 | 不做主线 | Android「读屏 → 点击 → 再读屏」闭环未验证。欧盟无 iPhone Mirroring。Voice Access 已能完成「用声音点按钮」。 |
| 整单购物 | 不做主线 | 官方 [`add_to_cart`](https://github.com/hcompai/computer-use-agents-demos/blob/main/examples/add_to_cart/add_to_cart.py) 已覆盖加购；Honey 已覆盖试券。没有已验证的失败券改写整单决策。 |
| 行政下一步 | 备用，不锁主线 | 没有预登录的 CAF / ENT / démarches 门户。FranceConnect 不适合现场赌。 |
| **Témoin** | **锁定** | 账本 UI 可冻死；三张发票可准备；结果是账本里的三条草稿，评委能点开核对。增量是可信度，不是又一个购物/QA/3D 示例。 |

官方 [`software_qa`](https://hub.hcompany.ai/agents-api/cli/example-ui-qa) 刚于 10-27 加入。不把 Devin+QA 当主线。Devin 若使用，只写夹具或检查脚本。

## 范围冻结

做：

- 三张发票 → 三条 **Brouillon**
- 一张日期歧义 + 类别误判，由独立核验抓住
- 一次口头/文字纠正，只改那一条
- 草稿合计 TTC = **1 430,20 €**，与发票一致
- 已过账的旧记录不动

不做：

- 手机、跨店比价、行政门户、自动过账、银行同步、报税
- 通用暂停条或通用聊天壳
- 「更聪明的第二套 agent」——复核模型只许输出 `match | mismatch | uncertain` 和读到的字段

## 赞助商

- **H**：操作账本界面（周六换成真实 computer-use）
- **Gladia**：纠正指令的语音入口，可加；键盘纠正已足以完成主赛演示
- **Linkup / Stripe / Devin**：本线不需要，不硬接
