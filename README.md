# mushroom

给自己用的法兰西岛当季蘑菇训练器：按季节 × 地点找出当季最常见的可食蘑菇，从图片、环境、细节三方面练，每个可食种都和它的危险易混种绑在一起（中英法名称，覆盖华人"老家经验"迁移风险）。练的是眼力，不是"可以吃"的许可——吃之前必须当面鉴定。

- [产品 plan](docs/product-plan.md)
- [当季常见可食种报告](docs/seasonal-edibles.md)：按季节、生境、森林片区排名，附月历和每个可食种的图片、环境、细节档案
- [调研笔记](docs/research-2026-10.md)

## 内容和脚本

- [`content/species.toml`](content/species.toml)：物种档案（可食性、环境、宿主、按可靠程度排序的细节、危险易混种）
- [`content/zones.toml`](content/zones.toml)：森林片区（iNat place + 边界框）
- [`scripts/seasonal_edibles.py`](scripts/seasonal_edibles.py)：拉取法兰西岛全部研究级真菌观察，按季节 × 生境 × 片区排名，输出 [`data/seasonal_edibles.json`](data/seasonal_edibles.json) 和当季报告
- [`scripts/inat_stats.py`](scripts/inat_stats.py)：易混组候选种在法兰西岛 / 全法的记录数、可用照片数和月分布，输出 [`data/inat_stats.json`](data/inat_stats.json)
- [`scripts/inat_fetch.py`](scripts/inat_fetch.py)：上面两个脚本共用的 iNaturalist 请求和缓存

只用 Python 3.11+ 标准库。

```bash
python3 scripts/seasonal_edibles.py              # 第一次要拉几分钟，之后用 data/cache/ 里的缓存
python3 scripts/seasonal_edibles.py --refresh    # 重新拉取观察数据（每季开始前跑一次）
python3 scripts/seasonal_edibles.py --month 3    # 把"现在"设成 3 月，看春季的那一节
python3 scripts/inat_stats.py > data/inat_stats.json
```

吃了蘑菇不舒服：巴黎中毒中心 01 40 05 48 48（24 小时）；昏迷或呼吸困难打 15 或 112。
