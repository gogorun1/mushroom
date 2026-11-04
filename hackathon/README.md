# Témoin — H Company × 42AI 周末夹具

锁定选题、输入材料、目标软件和 90 秒演示。主文档：

- [选题决定](DECISION.md)
- [赛前杀伤验证](PREFLIGHT.md)
- [90 秒脚本](DEMO.md)

## 运行

必须走 HTTP。浏览器对 `file://` 下的 iframe 会拦住父页读账本 DOM。

```bash
python3 -m http.server 8765 --directory hackathon/web
```

打开 http://127.0.0.1:8765/

1. 点 **1. Enter the three drafts**
2. 看 SCI 卡片的 `uncertain` / `mismatch`
3. 点 **Apply correction**（默认中文纠正句）
4. 在右侧账本核三条 Brouillon，合计 1 430,20 €

```bash
node hackathon/tests/operator_test.js
```

## 角色分工

| 组件 | 现在 | 周六 |
|---|---|---|
| [`web/ledger.html`](web/ledger.html) | 已登录的现有软件 | 不改，给 H 点 |
| [`web/invoices.html`](web/invoices.html) | 三张源发票 | 不改 |
| [`web/verify.js`](web/verify.js) | 金额、naive 草稿、独立核验、字段纠正 | 不改 |
| [`web/operator.js`](web/operator.js) 里的 actor | 脚本写入，便于赛前跑通 | 换成 H Agents API 的点击 |

复核只输出 `match | mismatch | uncertain` 和读到的字段。
