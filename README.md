# mushroom

给自己用的法兰西岛当季蘑菇训练器：按季节 × 地点找出当季最常见的可食蘑菇，从图片、环境、细节三方面练，每个可食种都和它的危险易混种绑在一起（中英法名称，覆盖华人"老家经验"迁移风险）。练的是眼力，不是"可以吃"的许可——吃之前必须当面鉴定。

- [产品 plan](docs/product-plan.md)
- [当季常见可食种报告](docs/seasonal-edibles.md)：按季节、生境、森林片区排名，附月历和每个可食种的图片、环境、细节档案
- [调研笔记](docs/research-2026-10.md)
- [网页版](https://gogorun1.github.io/mushroom/)，按手机屏幕排版，三个页签：
  - **课表**：选月份、森林、生境，先列危险种，再列当季最常见的可食种；每个种一页，有照片、环境和识别要点。链接带参数，可以收藏，例如 [`#/deck?m=11&z=fontainebleau`](https://gogorun1.github.io/mushroom/#/deck?m=11&z=fontainebleau)
  - **自测**：从当前课表出题，一轮 10 道选择题——看图选种、看名字选图、易混种二选一、能不能吃、看特征选种、季节和生境、示意图和实物照片认部位、术语释义。按 [plan §6.2](docs/product-plan.md#62-非对称计分) 计分，把有毒种当成能吃的扣分最重。答题记录存在本机，可以只练错题
  - **术语**：菌管、菌托、菌环这类词的解释，配示意图；38 个词还配了实物照片，照片上圈出这个词说的地方，点开看整张。课表和题目里的术语都可以点开看，例如 [`#/terms/volva`](https://gogorun1.github.io/mushroom/#/terms/volva)

## 部署（GitHub Pages）

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) 在每次 push 到 `main` 时运行 `scripts/build_site.py` 和 `tests/site_test.js`，测试通过后把生成的 `site/` 发布到 GitHub Pages；PR 上只构建和测试、不发布。`site/` 不入库。

第一次需要在仓库 Settings → Pages → Build and deployment → Source 选 **GitHub Actions**。如果在这之前 `main` 上已经跑过一次失败了，到 Actions → Site → Run workflow 手动重跑。

## 内容和脚本

- [`content/species.toml`](content/species.toml)：物种档案（可食性、环境、宿主、按可靠程度排序的细节、危险易混种、不用的照片）
- [`content/zones.toml`](content/zones.toml)：森林片区（iNat place + 边界框）
- [`content/term_photos.toml`](content/term_photos.toml)：术语的实物照片——用哪张 iNat 照片、在照片上圈哪里、说明文字，以及照片题的错误选项
- [`scripts/term_photos.py`](scripts/term_photos.py)：按上一个文件拉照片的署名、授权和尺寸，检查授权（不用 ND）和鉴定（到种的必须是研究级），输出 [`data/term_photos.json`](data/term_photos.json)
- [`scripts/seasonal_edibles.py`](scripts/seasonal_edibles.py)：拉取法兰西岛全部研究级真菌观察，按季节 × 生境 × 片区排名，输出 [`data/seasonal_edibles.json`](data/seasonal_edibles.json) 和当季报告
- [`scripts/inat_stats.py`](scripts/inat_stats.py)：易混组候选种在法兰西岛 / 全法的记录数、可用照片数和月分布，输出 [`data/inat_stats.json`](data/inat_stats.json)
- [`scripts/inat_fetch.py`](scripts/inat_fetch.py)：上面两个脚本共用的 iNaturalist 请求和缓存
- [`web/`](web/) + [`scripts/build_site.py`](scripts/build_site.py)：网页源码（`app.js` 页面和路由、`deck.js` 组卷、`quiz.js` 出题和计分、`glossary.js` 术语、示意图和照片标注、`style.css`），以及把两份数据写成 `data.js`、和网页一起生成 `site/` 的脚本
- [`tests/site_test.js`](tests/site_test.js)：用生成的 `site/` 检查术语表、组卷和出题规则，比如每个月份 × 片区 × 生境都能出满一轮、示意图题不泄露答案、照片上圈的位置不出画面、照片题的错误选项不在同一处被圈出、把有毒种认成能吃的扣分最重

脚本只用 Python 3.11+ 标准库；测试只用 Node 自带的模块，不用装依赖。

```bash
python3 scripts/seasonal_edibles.py              # 第一次要拉几分钟，之后用 data/cache/ 里的缓存
python3 scripts/seasonal_edibles.py --refresh    # 重新拉取观察数据（每季开始前跑一次）
python3 scripts/seasonal_edibles.py --month 3    # 把"现在"设成 3 月，看春季的那一节
python3 scripts/term_photos.py                   # 改了 content/term_photos.toml 之后跑
python3 scripts/build_site.py                    # 本地生成 site/，浏览器直接打开 site/index.html 就能看
node tests/site_test.js                          # 改了 web/ 或数据之后跑，先跑上一行
python3 scripts/inat_stats.py > data/inat_stats.json
```

吃了蘑菇不舒服：巴黎中毒中心 01 40 05 48 48（24 小时）；昏迷或呼吸困难打 15 或 112。
