# 调研笔记：蘑菇易混对训练工具值不值得做（2026-10）

这份是 [产品 plan](product-plan.md) 的依据。第一部分是调研原文，第二部分是写 plan 时补做的核实（2026-10-31）。

## 一、调研原文

**结论：值得做，但只当你自己的训练工具，而且范围要比 plan 更窄。** 普通的"看图认种 + 间隔重复"已经有免费的好工具，不必重做。真正没人做、对你又最有用的是三块：

- 中英双语的「可食 vs 有毒」易混对训练
- 按法国中毒数据和法兰西岛实际出现频率挑物种
- 针对华人"老家经验"的迁移风险

当商业产品做不值得：用户群太小，免费替代多，安全责任又重。

### plan 低估的免费替代

- [Alkas](https://alkas.app/)：完全免费，能按"法国 + 真菌"建卡组，有间隔重复，照片来自 iNaturalist，能导出 Anki。没有易混对，也没有中文。
- [FungiFind 测验](https://fungifind.org/en/mushroom-quiz/)：免费，187 种，有可食/有毒/易混题，覆盖枫丹白露和朗布依埃。没有中文，只有积分排行，不做间隔重复。
- [iNat Quiz](https://inatquiz.pages.dev/)：免费，可以按地点和类群出题。
- 没找到面向在法华人的中文训练工具。

### 为什么重点是易混对

- 据 [ANSES](https://www.anses.fr/fr/actualite/cueillette-consommation-champignons-attention-aux-risques-dintoxications)：2025 年法国有 1300 多例蘑菇中毒，1 人死亡，3 人肝移植；2026 年 9 月就有近 500 例。ANSES 明确说，不要吃靠手机 App 识别的蘑菇。
- 法国高频混淆：野蘑菇 ↔ 黄斑蘑菇，高大环柄菇 ↔ 毒鹅膏（后果最严重），鸡油菌 ↔ 类脐菇，牛肝菌 ↔ 撒旦牛肝菌，橙盖鹅膏 ↔ 毒蝇鹅膏，烟云杯伞 ↔ 毒粉褶菌。
- 华人特有风险：[美国 CDC](https://www.cdc.gov/mmwr/volumes/75/wr/mm7520a2.htm) 报告，2025–26 年北加州有 39 例鹅膏中毒，4 人死亡。患者说的语言里有普通话，很多人吃的是"和老家能吃的长得像"的蘑菇。典型陷阱是草菇 ↔ 白色鹅膏、青头菌 ↔ 毒鹅膏，而法兰西岛就有草菇的近亲黏盖草菇。

### 照片训练的边界

- 有用的部分：把相似的种交错、并排对比着练，对照片材料平均能提升约 0.35 个标准差，两个种越像收益越大（Brunmair & Richter 2019 元分析）。
- 做不到的部分：没有研究证明照片训练能直接提高野外安全采集率。照片看不到气味、孢子印、切面变色和宿主树。识别 App 在中毒中心样本上的准确率只有 35–49%（Clinical Toxicology 2023）。所以它练的是眼力，不是"可以吃"的许可证。

### 数据够用（直接查了 iNaturalist）

- 法兰西岛有 1035 种研究级真菌记录（含地衣）。高大环柄菇 104 条，美味牛肝菌 92，毒鹅膏 48，豹斑鹅膏 46，鸡油菌 22；类脐菇和鹿花菌几乎没有记录。
- 抽查了 4 个关键种，法国全境 72–84% 的照片是 CC 授权。所以物种按法兰西岛挑，照片从全法国拉就够。
- 季节上，牛肝菌 10 月最多，紫丁香蘑 11 月最多，羊肚菌在 4 月。

### plan 要改的 7 处

1. 认种部分不自己做，直接用 Alkas 或从 iNat 自动生成；自己只做易混对、中文和"吃不吃"的判断训练。
2. 每种要 8–12 张以上不同年龄、角度、光线的照片，测验用没见过的图，不要每种只放一张 Commons 图。
3. "强化学习"落到这里，就是三件事：即时反馈；加「不确定 / 不吃」选项；非对称计分，把致命种判成可食要重罚。排题算法也从 SM-2 换成 FSRS（Anki 和 Alkas 都在用）。
4. 加非照片线索题：孢子印颜色、菌托、气味、宿主树、切面变色。
5. 物种按「法国混淆频率 × 法兰西岛出现频率 × 华人迁移风险」重排。鹿花菌和类脐菇降级；加入赭盖鹅膏 ↔ 豹斑鹅膏、野蘑菇 ↔ 黄斑蘑菇、烟云杯伞 ↔ 毒粉褶菌、青头菌 ↔ 毒鹅膏、草菇类 ↔ 白色鹅膏、紫丁香蘑 ↔ 丝膜菌、蜜环菌 ↔ 纹缘盔孢伞。
6. 加一个现实闭环：先记采集日志，周一下午带去法国真菌学会 SMF 鉴定（巴黎 12 区 20 rue Rottembourg，14:30–19:00），鉴定过的自拍照再变成个人卡片。
7. 法规：布洛涅林和万森林按巴黎条例基本不能采（这是从禁止采集植物的条款推断的），ONF 国有林每人每天最多 5 升。所以 plan 里"万森林这类林地"的写法要改。

App 做好之前，这个季节可以先用 Alkas 和 FungiFind 练，周一带着篮子去 SMF。

## 二、补充核实（2026-10-31）

### iNaturalist 数据

用 [`scripts/inat_stats.py`](../scripts/inat_stats.py) 拉取，结果在 [`data/inat_stats.json`](../data/inat_stats.json)。口径：研究级观察；法兰西岛 place_id 10577，法国 6753，欧洲 97391；"可用照片"只算 CC0 / BY / BY-SA / BY-NC / BY-NC-SA（排除 ND，因为训练图要裁剪）；月分布在法兰西岛记录 ≥ 30 条时用法兰西岛，否则用全法。

| 中文名 | iNat 学名 | 法兰西岛 | 全法 | 全法可用照片 | 全欧可用照片 | 图源 | 高峰月 |
|---|---|---:|---:|---:|---:|---|---|
| 高大环柄菇 | *Macrolepiota procera* | 104 | 1252 | 813 | — | 全法 | 10 月 |
| 毒鹅膏 | *Amanita phalloides* | 48 | 443 | 358 | — | 全法 | 10 月 |
| 肉褐鳞环柄菇 | *Lepiota brunneoincarnata* | 1 | 3 | 3 | 71 | 全欧 | 5 月（全法） |
| 变绿红菇（青头菌） | *Russula virescens* | 7 | 113 | 81 | — | 全法 | 8 月（全法） |
| 黏盖草菇 | *Volvopluteus gloiocephalus* | 45 | 498 | 377 | — | 全法 | 11 月 |
| 春生鹅膏 | *Amanita verna* | 1 | 4 | 2 | 42 | 全欧 | 5 月（全法） |
| 鳞柄白鹅膏 | *Amanita virosa* | 1 | 13 | 10 | 686 | 全欧 | 10 月（全法） |
| 蜜环菌 | *Armillaria mellea* | 118 | 489 | 330 | — | 全法 | 10 月 |
| 纹缘盔孢伞 | *Galerina marginata* | 31 | 114 | 98 | — | 全法 | 11 月 |
| 毛柄库恩菇 | *Kuehneromyces mutabilis* | 14 | 131 | 105 | — | 全法 | 10 月（全法） |
| 赭盖鹅膏 | *Amanita rubescens* | 205 | 1527 | 1148 | — | 全法 | 10 月 |
| 豹斑鹅膏 | *Amanita pantherina* | 46 | 605 | 465 | — | 全法 | 10 月 |
| 野蘑菇类 † | *Agaricus campestris* | 13 | 163 | 102 | — | 全法 | 10 月（全法） |
| 野蘑菇类 † | *Agaricus arvensis* | 1 | 19 | 15 | 270 | 全欧 | 10 月（全法） |
| 黄斑蘑菇 | *Agaricus xanthodermus* | 8 | 77 | 65 | — | 全法 | 11 月（全法） |
| 美味牛肝菌 | *Boletus edulis* | 92 | 793 | 524 | — | 全法 | 10 月 |
| 撒旦牛肝菌 | *Rubroboletus satanas* | 10 | 80 | 54 | — | 全法 | 9 月（全法） |
| 红脚牛肝菌 † | *Neoboletus erythropus* | 62 | 411 | 302 | — | 全法 | 10 月 |
| 变蓝牛肝菌一种 † | *Suillellus luridus* | 28 | 161 | 118 | — | 全法 | 8 月（全法） |
| 橙盖鹅膏 | *Amanita caesarea* | 7 | 189 | 120 | — | 全法 | 9 月（全法） |
| 毒蝇鹅膏 | *Amanita muscaria* | 287 | 3131 | 2161 | — | 全法 | 10 月 |
| 烟云杯伞 | *Clitocybe nebularis* | 221 | 974 | 738 | — | 全法 | 11 月 |
| 毒粉褶菌 | *Entoloma sinuatum* | 3 | 24 | 15 | 175 | 全欧 | 10 月（全法） |
| 紫丁香蘑 | *Collybia nuda（= Lepista nuda）* | 53 | 230 | 180 | — | 全法 | 11 月 |
| 丝膜菌属 | *Cortinarius* | 105 | 599 | 468 | — | 全法 | 10 月 |
| 含奥来毒素的丝膜菌 † | *Cortinarius rubellus* | 0 | 9 | 6 | 303 | 全欧 | 7 月（全法） |
| 奥来丝膜菌 | *Cortinarius orellanus* | 1 | 2 | 1 | 39 | 全欧 | 9 月（全法） |
| 鸡油菌 | *Cantharellus cibarius* | 22 | 355 | 255 | — | 全法 | 10 月（全法） |
| 类脐菇 | *Omphalotus olearius* | 0 | 136 | 93 | — | 全法 | 10 月（全法） |
| 橙黄拟蜡伞（假鸡油菌） | *Hygrophoropsis aurantiaca* | 36 | 313 | 237 | — | 全法 | 11 月 |
| 羊肚菌属 | *Morchella* | 23 | 295 | 194 | — | 全法 | 4 月（全法） |
| 鹿花菌 | *Gyromitra esculenta* | 2 | 32 | 23 | — | 全法 | 4 月（全法） |

† 中文名待核对（见 plan §14）。记录少于 10 条的种，高峰月没有参考价值。数据拉取时间：2026-10-31 18:42（巴黎时间）。

和调研原文对得上的部分：高大环柄菇 104、美味牛肝菌 92、毒鹅膏 48、豹斑鹅膏 46、鸡油菌 22，类脐菇 0、鹿花菌 2。

新发现，已经反映在 plan 里：

- **白色鹅膏在 iNat 上几乎看不到**：春生鹅膏、鳞柄白鹅膏在法兰西岛各 1 条，全法也只有个位数到十几条。图要从全欧洲拉；出现频率很可能被低估（白色小型鹅膏不显眼、难鉴定），不能只看这个数决定去留。
- **小型环柄菇同理**：肉褐鳞环柄菇法兰西岛 1 条、全法 3 条，但它含鹅膏毒素、可致命，个头小又难鉴定到种，记录少不代表少见。
- **类脐菇在法兰西岛 0 条，但假鸡油菌（橙黄拟蜡伞）有 36 条**，所以鸡油菌的主要对照换成假鸡油菌，类脐菇留作附带。
- **会变蓝的牛肝菌在法兰西岛很常见**：红脚牛肝菌 *Neoboletus erythropus*（熟食可食）62 条、*Suillellus luridus* 28 条，而撒旦牛肝菌只有 10 条。对有云南"见手青"经验的人来说，"变蓝的牛肝菌煮熟能吃"的印象在这里会被强化——这是一个待验证的迁移风险假设。
- **春生鹅膏是春季种**（全法只有 4 条记录，集中在 5 月），和羊肚菌季节重叠，春季提醒要把两者放在一起。
- 老家一侧的对照图（iNat 全球研究级 CC 观察，含 ND 的粗略计数）：草菇 117 条，*Amanita caesareoides*（鸡蛋菌类）240 条，够用；见手青（*Lanmaoa asiatica*）只有 3 条，要以文字题为主。

### 实务信息

| 事项 | 核实结果 | 来源 |
|---|---|---|
| 巴黎中毒中心 | 01 40 05 48 48，24 小时，管法兰西岛；昏迷或呼吸困难直接打 15（SAMU）；不要催吐、不要喝水或牛奶 | [AP-HP](https://www.aphp.fr/vous-soigner/le-centre-antipoison-de-paris)、[centres-antipoison.net](https://centres-antipoison.net/capparis) |
| SMF 周一鉴定 | 20 rue Rottembourg, 75012；非节假日的周一 14:30–19:00；8 月关闭 | [mycofrance.fr 周一活动](https://www.mycofrance.fr/seance-du-lundi/)、[联系页](https://www.mycofrance.fr/contact/) |
| SMF 会员 | 会员资料写的是"每位会员可带自己的采集物来"鉴定；会员 3–12 月有周末的法兰西岛森林带队采集。非会员能否带标本鉴定，资料没写清 | [SMF 入会资料（PDF）](https://old.mycofrance.fr/wp-content/uploads/2024/11/Bulletin-dadhesion.pdf) |
| ONF 国有林限额 | 《森林法》R163-5 条：适用森林制度的林地，没有相反规定时 ≤ 5 升推定已获许可；5–10 升属四级违警罚款；超过 10 升或转卖属轻罪 | [ONF](https://www.onf.fr/vivre-la-foret/que-faire-en-foret/regles-et-bonnes-pratiques-en-foret/+/2891::conseils-precautions-comment-bien-cueillir-champignons-et-chataignes-en-foret.html)、[R163-5](https://www.doctrine.fr/l/texts/codes/LEGITEXT000025244092/articles/LEGIARTI000026127993)、[Seine-Maritime 省政府](https://www.seine-maritime.gouv.fr/Actualites/Comment-bien-cueillir-les-champignons-en-foret) |
| 大区自然空间 | Île-de-France Nature 管理的林地同样每人每天 5 升 | [Île-de-France Nature](https://www.iledefrance-nature.fr/cueillette-des-champignons-nos-conseils/) |
| 布洛涅林、万森林 | 巴黎市《布洛涅林和万森林通用条例》第 10 条：禁止未经特许"采集样本、种子、幼苗，拔除或割取苔藓、地衣、植物和花"。条文没有点名蘑菇，所以"不能采"仍是推断 | [条例 PDF](https://cdn.paris.fr/paris/2019/07/24/303a56d131260fedfb195059353488e3.pdf) |
| App 识别 | ONF 和 Île-de-France Nature 都明确建议不要用手机 App 识别，找药剂师或真菌学家 | 同上 |
