"use strict";
// Mushroom terms used in species.toml text, with plain-language definitions and labelled diagrams.
(function () {
  const GROUPS = ["部位", "菌褶怎么连到柄上", "检查方法和性状", "生长环境", "毒素和中毒", "常见的树", "这个工具里的词"];
  // Tree names help reading the habitat text but are not mushroom vocabulary, so the quiz skips them.
  const NO_QUIZ = new Set(["常见的树"]);

  const TERMS = [
    { id: "cap", name: "菌盖", group: "部位", aliases: ["菌盖"], diagram: "anatomy", part: "cap",
      short: "蘑菇顶上撑开的伞面",
      long: "蘑菇顶上撑开的部分，像伞面。要看颜色、表面（光滑、黏、绒质、有鳞片或疣）和边缘（有没有条纹、是否内卷）。" },
    { id: "gills", name: "菌褶", group: "部位", aliases: ["菌褶", "真菌褶"], diagram: "underside", part: "gills",
      short: "菌盖下面一片片刀片状的薄片",
      long: "菌盖下面从中心向外放射排列的薄片，像书页。孢子在菌褶表面产生。要看颜色（菌褶白色的伞菌要格外小心）和它怎么连到菌柄上（见离生、直生、延生）。" },
    { id: "ridges", name: "褶棱", group: "部位", aliases: ["分叉褶棱", "褶棱"], diagram: "underside", part: "ridges",
      short: "鸡油菌那种又钝又矮、会分叉的棱",
      long: "鸡油菌、喇叭菌盖下面不是薄刀片，而是又钝又矮、会分叉的棱，像融化后流下来的蜡，一直延伸到柄上。假鸡油菌是真的薄菌褶，这是区分二者的关键。" },
    { id: "pores", name: "管孔", group: "部位", aliases: ["管孔", "菌孔", "细孔", "大孔"], diagram: "underside", part: "pores",
      short: "盖下面像海绵一样密密的小孔",
      long: "牛肝菌和多孔菌（硫磺菌、灰树花、宽鳞多孔菌）盖下面是一层海绵状的小孔，每个孔是一根小管（菌管）的开口。要看孔的颜色，以及按压后变不变色。" },
    { id: "tubes", name: "菌管", group: "部位", aliases: ["菌管", "小管"], diagram: "anatomy-bolete", part: "tubes",
      short: "管孔后面竖着排列的小管子",
      long: "管孔背后是一根根竖直排列的小管子，切开菌盖能看到菌肉下面一层海绵状的东西，就是菌管。牛舌菌的小管彼此分离，是它的特征。" },
    { id: "spines", name: "肉刺", group: "部位", aliases: ["肉刺", "长刺"], diagram: "underside", part: "spines",
      short: "盖下面垂着的一根根小刺",
      long: "齿菌（卷缘齿菌）盖下面是密密的小肉刺，不是菌褶也不是管孔；猴头菌是一团垂着的长刺。" },
    { id: "stem", name: "菌柄", group: "部位", aliases: ["菌柄"], diagram: "anatomy", part: "stem",
      short: "支撑菌盖的柄",
      long: "支撑菌盖的柄。要看颜色、表面（网纹、鳞片、蛇皮纹、细点）、是实心还是中空，以及最重要的：基部长什么样。" },
    { id: "ring", name: "菌环", group: "部位", aliases: ["菌环", "小环"], diagram: "anatomy", part: "ring",
      short: "菌柄上一圈像裙子或领子的膜",
      long: "菌柄上部一圈像裙子或领子的膜，是幼时连接菌盖边缘和菌柄的内菌幕破开后留下的。有的能上下滑动（高大环柄菇），有的很薄、容易脱落（野蘑菇）。毒鹅膏、纹缘盔孢伞都有菌环，所以有菌环不代表安全。" },
    { id: "volva", name: "菌托", group: "部位", aliases: ["菌托"], diagram: "anatomy", part: "volva",
      short: "菌柄基部包着的杯状或袋状结构",
      long: "菌柄最底部像杯子或袋子一样包着的结构，是幼时包住整朵蘑菇的外菌幕留下的。它常埋在土里，所以必须把整朵连根挖出来才看得到。有菌托是鹅膏属的标志，毒鹅膏和白色鹅膏都有。" },
    { id: "sac-volva", name: "囊状菌托", group: "部位", aliases: ["囊状菌托"], diagram: "anatomy", part: "volva",
      short: "边缘不贴着柄、像袋子一样张开的菌托",
      long: "边缘不贴着柄、像袋子一样张开的菌托。毒鹅膏、春生鹅膏、橙盖鹅膏、黏盖草菇都是这种。豹斑鹅膏的菌托则紧贴在球茎上，上缘像一圈\"袜口\"。" },
    { id: "veil", name: "菌幕", group: "部位", aliases: ["菌幕"], diagram: "veils", part: "ring",
      short: "幼时包住蘑菇的膜",
      long: "幼小的蘑菇被膜包着。包住整朵的叫外菌幕，破开后留下菌托和盖上的疣；连接盖缘和柄、遮住菌褶的叫内菌幕，破开后留下菌环。" },
    { id: "cortina", name: "蛛网状菌幕", group: "部位", aliases: ["蛛网状菌幕", "丝痕"], diagram: "veils", part: "cortina",
      short: "盖缘和柄之间像蜘蛛网的细丝",
      long: "丝膜菌幼时盖缘和菌柄之间像蜘蛛网一样的细丝，长大后消失，只在柄上留下锈褐色的丝痕。看到它就说明是丝膜菌属，其中有含奥来毒素的致命种。" },
    { id: "warts", name: "疣", group: "部位", aliases: ["疣"], diagram: "anatomy", part: "warts",
      short: "盖上一粒粒、可以擦掉的小块",
      long: "盖表面一粒粒的小块，多是外菌幕的残片，可以擦掉，雨后可能被冲掉（毒蝇鹅膏的白点、豹斑鹅膏的白色小疣）。疣柄牛肝菌柄上的黑褐色粗糙小鳞片也叫\"疣\"。" },
    { id: "scales", name: "鳞片", group: "部位", aliases: ["鳞片"],
      short: "盖或柄表面翘起或贴着的小片",
      long: "盖或柄表面的小片，是表皮自己裂开形成的，和疣不同，通常擦不掉（高大环柄菇、鸡腿菇）。" },
    { id: "reticulation", name: "网纹", group: "部位", aliases: ["网纹"], diagram: "anatomy-bolete", part: "net",
      short: "柄上像渔网一样的凸起纹路",
      long: "牛肝菌柄上像渔网一样的凸起纹路。美味牛肝菌是上部白色细网纹；撒旦牛肝菌是红色网纹；苦粉孢牛肝菌是深色粗网纹。" },
    { id: "base", name: "基部", group: "部位", aliases: ["柄基部", "球茎"], diagram: "anatomy", part: "volva",
      short: "菌柄最底下、贴近地面的部分",
      long: "菌柄最底下的部分，常膨大成球（球茎）。有没有菌托、切开会不会立刻变铬黄色（黄斑蘑菇）都要看这里，所以采的时候要整朵挖出来。" },
    { id: "latex", name: "乳汁", group: "部位", aliases: ["乳汁"],
      short: "乳菇折断或切开时流出的汁",
      long: "乳菇属折断或切开时流出的汁。颜色和会不会变色是关键：松乳菇是胡萝卜橙色、之后变绿；毛头乳菇是白色、不变色。" },
    { id: "margin", name: "内卷", group: "部位", aliases: ["向内卷", "内卷"],
      short: "菌盖边缘向下、向内卷起",
      long: "菌盖的边缘向下、向内卷起来。卷边桩菇的名字就来自这一点。" },
    { id: "striations", name: "条纹", group: "部位", aliases: ["条纹"],
      short: "盖缘或菌环上一道道细线",
      long: "盖边缘或菌环上一道道细线纹。豹斑鹅膏盖缘有条纹；赭盖鹅膏菌环上面有条纹。" },
    { id: "snakeskin", name: "蛇皮纹", group: "部位", aliases: ["蛇皮纹"],
      short: "柄上像蛇皮一样的深色花纹",
      long: "菌柄表面一段段、一圈圈的深色花纹，像蛇皮。高大环柄菇的柄上有褐色蛇皮纹；粗鳞青褶伞的柄光滑，没有。" },
    { id: "zonate", name: "同心环纹", group: "部位", aliases: ["同心环纹"],
      short: "盖上一圈套一圈、像年轮的色带",
      long: "菌盖上一圈套一圈、颜色深浅交替的环带，像树的年轮。松乳菇的橙色盖上就有。" },
    { id: "scrobicules", name: "凹斑", group: "部位", aliases: ["凹斑"],
      short: "柄上颜色较深的小凹坑",
      long: "菌柄表面一个个浅浅的小凹坑，颜色常比周围深。松乳菇柄上有橙色凹斑。" },
    { id: "lateral", name: "侧生", group: "部位", aliases: ["侧生柄", "侧生"],
      short: "柄长在盖的一边，不在正中间",
      long: "菌柄不在菌盖正中间，而是偏在一边，常常很短甚至没有。平菇就是这样，从木头侧面长出来，柄很短。" },
    { id: "forked", name: "二叉分枝", group: "部位", aliases: ["二叉分枝"],
      short: "一分为二、再一分为二地分叉",
      long: "一条分成两条，每条再分成两条。假鸡油菌的薄菌褶会反复二叉分枝；真鸡油菌的褶棱也分叉，但又钝又矮，像融化的蜡。" },

    { id: "free", name: "离生", group: "菌褶怎么连到柄上", aliases: ["离生"], diagram: "attachment", part: "free",
      short: "菌褶不碰到菌柄，中间留一圈空隙",
      long: "菌褶在靠近菌柄的地方就停了，和菌柄之间留一圈空隙。高大环柄菇、鹅膏、黏盖草菇都是离生。" },
    { id: "adnate", name: "直生", group: "菌褶怎么连到柄上", aliases: ["直生"], diagram: "attachment", part: "adnate",
      short: "菌褶直接贴到菌柄上，但不往下延伸",
      long: "菌褶的内端直接贴到菌柄上，但不顺着柄往下延伸。" },
    { id: "decurrent", name: "延生", group: "菌褶怎么连到柄上", aliases: ["微延生", "延生", "延伸到柄上", "一直延伸到"], diagram: "attachment", part: "decurrent",
      short: "菌褶贴到菌柄后还顺着柄往下延伸",
      long: "菌褶贴到菌柄后还顺着柄往下延伸一段。平菇、斜盖伞、卷边桩菇、类脐菇、白色小杯伞都是延生。" },

    { id: "spore-print", name: "孢子印", group: "检查方法和性状", aliases: ["孢子印"],
      short: "孢子掉在纸上留下的粉的颜色",
      long: "把菌盖切下来，菌褶或管孔朝下放在纸上（一半白纸一半黑纸最好），盖上碗放几个小时，掉下来的孢子会在纸上留下一层粉，看它的颜色。白色、粉色、锈褐色、紫褐色、黑色分别对应不同的类群：纹缘盔孢伞和丝膜菌是锈褐色，蜜环菌是白色。照片看不出来，只能自己做。" },
    { id: "spores", name: "孢子", group: "检查方法和性状", aliases: ["孢子粉", "孢子"],
      short: "蘑菇用来繁殖的微小颗粒",
      long: "蘑菇用来繁殖的微小颗粒，单个肉眼看不见，大量堆在一起是一层粉（见孢子印）。马勃成熟后从顶部喷出褐色的孢子粉。" },
    { id: "staining", name: "变色", group: "检查方法和性状", aliases: ["变深蓝", "变蓝", "变色", "变红", "变粉红", "变铬黄色", "变褐", "变绿", "变橙"],
      short: "切开、按压或碰伤后颜色改变",
      long: "切开、按压或碰伤后颜色发生变化，几秒到几分钟内出现。很多牛肝菌会变蓝；赭盖鹅膏伤口变红；黄斑蘑菇柄基部切开立刻变铬黄色。变不变、变成什么颜色、多快都是线索。注意：变蓝不代表有毒，不变蓝也不代表能吃。" },
    { id: "section", name: "竖切", group: "检查方法和性状", aliases: ["竖着切开", "竖切", "纵切"], diagram: "sections", part: "egg",
      short: "从顶到底对半切开看剖面",
      long: "从顶部到底部对半切开看剖面。马勃要看里面有没有伞和菌褶的轮廓（鹅膏卵）；羊肚菌里面应该是一个完整的空腔；鹿花菌里面是棉絮状的分隔。" },
    { id: "egg", name: "鹅膏卵", group: "检查方法和性状", aliases: ["鹅膏卵", "鹅膏的\"卵\"", "鹅膏的卵"], diagram: "sections", part: "egg",
      short: "还包在外膜里、像个蛋的幼小鹅膏",
      long: "幼小的鹅膏整个包在外菌幕里，外形像一个白色的蛋，和马勃很像。竖着切开能看到里面伞和菌褶的轮廓，马勃里面则是均匀的一团。所以马勃一律要竖切检查。" },
    { id: "deliquesce", name: "自溶", group: "检查方法和性状", aliases: ["自溶"],
      short: "菌褶成熟后自己化成黑色墨汁",
      long: "鬼伞类成熟后，菌褶从边缘开始自己溶化成黑色墨汁一样的液体。鸡腿菇只能吃菌褶全白的幼体。" },
    { id: "gelatinous", name: "胶质", group: "检查方法和性状", aliases: ["胶质"],
      short: "像果冻或软骨一样有弹性",
      long: "质地像果冻或软骨一样有弹性，木耳就是胶质的。" },
    { id: "viscid", name: "黏滑", group: "检查方法和性状", aliases: ["黏滑", "湿时黏", "很黏"],
      short: "表面湿滑，像涂了一层胶",
      long: "菌盖表面摸起来湿滑，像涂了一层胶，天干时可能不明显。乳牛肝菌的盖很黏，吃之前要去皮。" },
    { id: "velvety", name: "绒质", group: "检查方法和性状", aliases: ["天鹅绒状", "绒质", "细绒毛"],
      short: "表面像天鹅绒一样有细毛",
      long: "表面摸起来像天鹅绒，有一层很短的细毛。野生金针菇的柄下部、铜色牛肝菌的盖都是这样。" },
    { id: "fibrillose", name: "放射状纤维", group: "检查方法和性状", aliases: ["放射状纤维"],
      short: "盖面像从中心向外梳过的细丝",
      long: "盖表面有从中心向外放射的细丝，像梳过的头发，边缘常裂开。这是丝盖伞类的典型特征，很多种含毒蕈碱。" },
    { id: "cracked", name: "龟裂", group: "检查方法和性状", aliases: ["龟裂"],
      short: "表皮裂成一小块一小块",
      long: "菌盖表皮裂成一小块一小块，像干裂的土地。青头菌、网纹牛肝菌、红裂绒盖牛肝菌都有。" },
    { id: "hollow", name: "中空", group: "检查方法和性状", aliases: ["中空", "实心"],
      short: "柄或肉里面是空的（中空）还是满的（实心）",
      long: "把柄或肉切开，里面是空的叫中空，是满的叫实心。鸡腿菇柄中空；灰喇叭菌从喇叭口一直空到底；鸡油菌的肉是实心的。" },
    { id: "flour", name: "面粉味", group: "检查方法和性状", aliases: ["面粉味"],
      short: "像生面粉或刚和好的面团的味道",
      long: "像生面粉或刚和好的面团的味道。香杏丽蘑、斜盖伞有面粉味，但有毒的毒粉褶菌也有，所以气味只能辅助判断。" },
    { id: "phenol", name: "苯酚味", group: "检查方法和性状", aliases: ["墨水或苯酚味", "苯酚味", "墨水味"],
      short: "像医院消毒水或墨水的刺鼻味道",
      long: "像医院消毒水、碘酒或墨水的刺鼻味道。黄斑蘑菇切开柄基部就有这种味道；可以吃的野蘑菇则是茴香或杏仁味。" },
    { id: "anise", name: "茴香味", group: "检查方法和性状", aliases: ["大茴香", "茴香味"],
      short: "像八角、茴香糖的甜香",
      long: "像八角或茴香糖的甜香，可以吃的大型白蘑菇（*Agaricus arvensis*）有这种味道。" },

    { id: "mycorrhizal", name: "共生", group: "生长环境", aliases: ["共生", "菌根"],
      short: "和活树的根互相交换养分",
      long: "很多蘑菇（牛肝菌、鹅膏、红菇、鸡油菌、乳牛肝菌）和特定树木的根共生，所以只在这些树附近出现。乳牛肝菌只长在松树等针叶树下，就是这个原因。" },
    { id: "deadwood", name: "腐木", group: "生长环境", aliases: ["腐木", "枯木", "倒木", "枯枝", "树桩"],
      short: "死了、正在腐烂的木头",
      long: "倒在地上的树、树桩、枯枝等死木头。蜜环菌、平菇、木耳、野生金针菇长在这里，致命的纹缘盔孢伞也是。" },
    { id: "bracket", name: "架状", group: "生长环境", aliases: ["覆瓦状", "架状"],
      short: "像架子一样从树干侧面长出，一层层叠起",
      long: "多孔菌从树干侧面长出来，像一层层的架子；很多层叠在一起，像屋顶的瓦片，叫覆瓦状。硫磺菌、灰树花是这样。" },
    { id: "host", name: "宿主", group: "生长环境", aliases: ["宿主", "基物"],
      short: "蘑菇长在什么东西上或旁边",
      long: "蘑菇长在什么东西上或旁边：哪种活树、哪种死木头、草地还是落叶。环境只能用来排除，不能用来确认；而且宿主会改变结论，比如长在紫杉上的硫磺菌不能吃。" },
    { id: "habitat", name: "生境", group: "生长环境", aliases: ["生境类型", "生境"],
      short: "蘑菇生长的环境类型",
      long: "蘑菇生长的环境类型。这里分四类：阔叶林、针叶林、草地林缘（草地、路边、林子边缘）、树木腐木（长在活树或死木头上）。" },
    { id: "broadleaf", name: "阔叶林", group: "生长环境", aliases: ["阔叶林", "阔叶树"],
      short: "橡树、山毛榉这类宽叶子树的林子",
      long: "由橡树、山毛榉、栗树、桦树等叶子宽扁、秋天落叶的树组成的林子，法语叫 feuillus。法兰西岛的林子大多是阔叶林。" },
    { id: "conifer", name: "针叶林", group: "生长环境", aliases: ["针叶林", "针叶树"],
      short: "松、云杉这类针形叶子树的林子",
      long: "由松、云杉、落叶松等叶子像针的树组成的林子，法语叫 résineux 或 conifères。枫丹白露和朗布依埃都有成片的松林。" },
    { id: "edge", name: "林缘", group: "生长环境", aliases: ["林缘"],
      short: "树林和草地、小路交界的边缘",
      long: "树林的边缘，树林和草地、小路、田野交界的地方，比林子里亮。高大环柄菇、野蘑菇常长在这里。这个工具的生境分类把草地、路边和林缘归为一类。" },
    { id: "humus", name: "腐殖质", group: "生长环境", aliases: ["腐殖质"],
      short: "落叶枯枝烂成的黑色松软土层",
      long: "落叶、枯枝、针叶烂掉后形成的黑褐色松软土层。紫丁香蘑、小型环柄菇常长在腐殖质丰富的地方。" },
    { id: "acid-soil", name: "酸性土", group: "生长环境", aliases: ["酸性土", "偏酸性"],
      short: "偏酸的土壤，常是沙土，多苔藓和蕨",
      long: "偏酸的土壤，常是沙质土，地上多苔藓、蕨类和欧石楠。鸡油菌、褐绒盖牛肝菌、红脚牛肝菌偏爱这种土。" },
    { id: "chalk-soil", name: "石灰质土", group: "生长环境", aliases: ["石灰质土"],
      short: "含石灰岩、偏碱性的土壤",
      long: "含石灰岩、偏碱性的土壤，土里常能看到白色碎石。撒旦牛肝菌、毒粉褶菌、变红丝盖伞偏爱这种土。" },
    { id: "clustered", name: "簇生", group: "生长环境", aliases: ["大簇丛生", "丛生", "簇生", "成簇", "叠生"],
      short: "很多朵挤在一起，从同一处长出来",
      long: "很多朵从同一个点或同一块木头上挤在一起长出来。蜜环菌、簇生垂幕菇、纹缘盔孢伞都常簇生。同一个树桩上可能同时长着可食的毛柄库恩菇和致命的纹缘盔孢伞，所以每一朵都要单独看。" },
    { id: "fairy-ring", name: "蘑菇圈", group: "生长环境", aliases: ["蘑菇圈", "成圈", "排成弧形或圈"],
      short: "蘑菇在地上排成一圈或一段弧",
      long: "同一片菌丝从中心向外长，蘑菇就在地上排成一圈或一段弧，草地上的圈常能看出草色深浅不同。硬柄小皮伞、香杏丽蘑、烟云杯伞常成圈。有毒的白色小杯伞常和硬柄小皮伞长在一起，采草坪上的蘑菇圈要一朵一朵看。" },

    { id: "amatoxin", name: "鹅膏毒素", group: "毒素和中毒", aliases: ["鹅膏毒素"],
      short: "毒鹅膏等所含的致命毒素，伤肝",
      long: "毒鹅膏、春生鹅膏、鳞柄白鹅膏、小型环柄菇、纹缘盔孢伞都含有。煮、烤、晒干、冷冻都破坏不了。吃后 6–24 小时才开始呕吐腹泻，之后可能好转（假愈期），但肝脏还在被破坏。吃了可疑的蘑菇不要等症状，马上打中毒中心电话。" },
    { id: "false-recovery", name: "假愈期", group: "毒素和中毒", aliases: ["假愈期"],
      short: "症状暂时好转，内脏其实还在受损",
      long: "鹅膏毒素中毒时，最初的呕吐腹泻过去后会好转一两天，看起来像好了，其实肝脏还在被破坏。所以\"感觉好了\"不代表没事，一定要去医院。" },
    { id: "latency", name: "潜伏期", group: "毒素和中毒", aliases: ["潜伏期", "潜伏"],
      short: "吃下去到出现症状之间的时间",
      long: "从吃下去到出现症状之间的时间。经验规律是潜伏期越长越危险：半小时到几小时内发作的多是胃肠中毒；6 小时以后才发作要考虑鹅膏毒素；奥来毒素可能几天到几周后才发作。" },
    { id: "orellanine", name: "奥来毒素", group: "毒素和中毒", aliases: ["奥来毒素"],
      short: "部分丝膜菌所含的毒素，伤肾，发作很晚",
      long: "部分丝膜菌含有，损伤肾脏。症状可能在吃后几天到两三周才出现，那时很难再想到是蘑菇引起的。" },
    { id: "muscarine", name: "毒蕈碱", group: "毒素和中毒", aliases: ["毒蕈碱"],
      short: "让人大量出汗、流泪、流口水的毒素",
      long: "很多丝盖伞和白色小杯伞含有。吃后半小时到两小时内大量出汗、流泪、流口水，心跳变慢，严重时可致命，要马上就医。" },
    { id: "panther", name: "豹斑综合征", group: "毒素和中毒", aliases: ["豹斑综合征"],
      short: "豹斑鹅膏、毒蝇鹅膏引起的神经症状",
      long: "豹斑鹅膏和毒蝇鹅膏引起的中毒：吃后半小时到三小时出现头晕、意识混乱、躁动或昏睡，重症需要住院。" },
    { id: "gyromitrin", name: "鹿花菌素", group: "毒素和中毒", aliases: ["鹿花菌素"],
      short: "鹿花菌所含的毒素，伤肝和神经",
      long: "鹿花菌含有，会损伤肝脏和神经系统，煮的时候冒出的蒸汽也有毒。鹿花菌和羊肚菌有点像，要靠纵切区分。" },
    { id: "paxillus", name: "免疫性溶血", group: "毒素和中毒", aliases: ["免疫性溶血"],
      short: "反复吃卷边桩菇后，免疫系统破坏红细胞",
      long: "卷边桩菇以前被当作可食。有的人吃了很多次都没事，某一次免疫系统突然开始破坏自己的红细胞，可能致命。所以\"以前吃过没事\"不能证明安全。" },
    { id: "gastro", name: "胃肠中毒", group: "毒素和中毒", aliases: ["重症胃肠炎", "胃肠中毒", "胃肠不适"],
      short: "呕吐、腹泻、肚子痛",
      long: "最常见的蘑菇中毒：吃后半小时到几小时内呕吐、腹泻、腹痛，一般一两天恢复，严重的会脱水，需要住院。如果吃后 6 小时以上才开始呕吐腹泻，要考虑鹅膏毒素，马上就医。" },
    { id: "alcohol", name: "和酒同食", group: "毒素和中毒", aliases: ["和酒同食"],
      short: "墨汁鬼伞和酒一起吃会中毒",
      long: "墨汁鬼伞含鬼伞素：吃之前或之后几天内喝酒，会脸红、心跳快、恶心、头痛。这个工具把它当有毒种处理。" },

    { id: "beech", name: "山毛榉", group: "常见的树", aliases: ["山毛榉"],
      short: "hêtre，树皮光滑银灰",
      long: "法语 hêtre，英语 beech。树皮光滑、银灰色；叶子椭圆、边缘波浪状；秋天落下三角形的小坚果，装在带软刺的壳里。巴黎周围的林子里非常多。" },
    { id: "oak", name: "橡树", group: "常见的树", aliases: ["橡树"],
      short: "chêne，叶子有圆裂片，结橡子",
      long: "法语 chêne，英语 oak。叶子边缘有圆圆的波浪状裂片，秋天结橡子。法兰西岛最常见的树。" },
    { id: "chestnut", name: "栗树", group: "常见的树", aliases: ["栗树"],
      short: "châtaignier，叶长、边缘有尖齿",
      long: "法语 châtaignier，英语 sweet chestnut。叶子长条形，边缘有尖锯齿；秋天落下满是尖刺的栗子壳。" },
    { id: "birch", name: "桦树", group: "常见的树", aliases: ["桦树"],
      short: "bouleau，树皮白色带黑纹",
      long: "法语 bouleau，英语 birch。树皮白色、有黑色横纹，很好认。毒蝇鹅膏、疣柄牛肝菌、毛头乳菇、卷边桩菇常长在桦树下。" },
    { id: "pine", name: "松", group: "常见的树", aliases: ["松树", "松"],
      short: "pin，针叶两根或几根一束",
      long: "法语 pin，英语 pine。针叶两根或几根一束，结松果。法兰西岛林子里最多的是欧洲赤松（pin sylvestre），树干上部橙红色。乳牛肝菌和松乳菇只长在松树一类的针叶树下。" },
    { id: "spruce", name: "云杉", group: "常见的树", aliases: ["云杉"],
      short: "épicéa，像圣诞树，松果下垂",
      long: "法语 épicéa，英语 spruce。针叶短而尖、一根根单独长在枝上，树形像圣诞树，松果往下垂。" },
    { id: "larch", name: "落叶松", group: "常见的树", aliases: ["落叶松"],
      short: "mélèze，秋天针叶变黄掉光",
      long: "法语 mélèze，英语 larch。针叶一簇簇长在短枝上，秋天变黄、冬天掉光，是会落叶的针叶树。" },
    { id: "poplar", name: "杨树", group: "常见的树", aliases: ["杨树"],
      short: "peuplier，高直，叶子三角形",
      long: "法语 peuplier，英语 poplar。树干高而直，叶子三角形或心形、叶柄长，风一吹就抖；常成排种在河边和田边。" },
    { id: "ash", name: "白蜡树", group: "常见的树", aliases: ["白蜡树"],
      short: "frêne，羽状复叶，冬芽黑色",
      long: "法语 frêne，英语 ash。一根叶柄上对生很多片小叶（羽状复叶），冬芽是黑色的。羊肚菌常在它附近。" },
    { id: "elm", name: "榆树", group: "常见的树", aliases: ["榆树"],
      short: "orme，叶基左右不对称",
      long: "法语 orme，英语 elm。叶子边缘有重锯齿，叶子基部左右不对称。" },
    { id: "willow", name: "柳", group: "常见的树", aliases: ["柳树", "柳"],
      short: "saule，叶细长，多在水边",
      long: "法语 saule，英语 willow。多数种叶子细长，常长在水边和潮湿的地方。" },
    { id: "elder", name: "接骨木", group: "常见的树", aliases: ["接骨木"],
      short: "sureau，开白色大花盘，结黑浆果",
      long: "法语 sureau，英语 elder。灌木或小树，初夏开一大盘白色小花，秋天结一串串黑色小浆果。木耳最常长在它的枯枝上。" },
    { id: "lime", name: "椴树", group: "常见的树", aliases: ["椴树"],
      short: "tilleul，叶子心形，花很香",
      long: "法语 tilleul，英语 lime 或 linden。叶子心形、边缘有锯齿，初夏开有香味的淡黄色小花；公园和行道树里很多。" },
    { id: "maple", name: "槭树", group: "常见的树", aliases: ["槭树"],
      short: "érable，掌状叶，种子带翅",
      long: "法语 érable，英语 maple。叶子像手掌一样分裂，种子带翅膀、两个连在一起。" },
    { id: "robinia", name: "刺槐", group: "常见的树", aliases: ["刺槐"],
      short: "robinier，枝上有刺，开串串白花",
      long: "法语 robinier 或 faux-acacia，英语 black locust。羽状复叶，枝上有成对的刺，春末开一串串白色香花。" },
    { id: "cherry", name: "樱桃树", group: "常见的树", aliases: ["樱桃树"],
      short: "cerisier，树皮有横向条纹",
      long: "法语 cerisier，英语 cherry。树皮光亮，有一道道横向的皮孔条纹，春天开白花。" },
    { id: "apple", name: "苹果树", group: "常见的树", aliases: ["苹果树"],
      short: "pommier，果园和老花园里常见",
      long: "法语 pommier，英语 apple tree。果园和老花园里常见；羊肚菌有时长在老苹果树下。" },
    { id: "yew", name: "紫杉", group: "常见的树", aliases: ["紫杉"],
      short: "if，扁平深绿针叶，红色小果，全株有毒",
      long: "法语 if，英语 yew。深绿色扁平的针叶排成两列，结红色杯状小果，整棵树都有毒。长在紫杉上的硫磺菌不能吃。" },
    { id: "hawthorn", name: "山楂", group: "常见的树", aliases: ["山楂"],
      short: "aubépine，带刺灌木，春天开白花",
      long: "法语 aubépine，英语 hawthorn。带刺的灌木或小树，叶子深裂，春天开白花，秋天结红色小果。香杏丽蘑常长在山楂、黑刺李旁边的草地上。" },
    { id: "blackthorn", name: "黑刺李", group: "常见的树", aliases: ["黑刺李"],
      short: "prunellier，早春先开花后长叶",
      long: "法语 prunellier，英语 blackthorn。带刺灌木，早春先开满白花再长叶子，秋天结蓝黑色小果。" },
    { id: "olive", name: "橄榄树", group: "常见的树", aliases: ["橄榄树"],
      short: "olivier，地中海地区的树",
      long: "法语 olivier，英语 olive。地中海地区的树，法兰西岛野外基本没有；类脐菇在南法常长在它的树根上。" },

    { id: "observer-days", name: "人日", group: "这个工具里的词", aliases: ["人日"],
      short: "同一人同一天拍同一种只算一次",
      long: "统计常见程度的单位。同一个人同一天对同一个种拍了多条 iNaturalist 观察，只算 1 人日，这样少数拍得特别多的人不会把排名带偏。数字大说明很多人在很多天里都碰到过它。" },
    { id: "expert", name: "新手不吃", group: "这个工具里的词", aliases: ["新手不吃"],
      short: "能吃，但有致命或危险的易混种，先不吃",
      long: "本身可以吃，但有致命或危险的易混种，新手认错的代价太大，所以先不吃：鹅膏属全部、网纹马勃、野生金针菇等。在吃不吃题里选\"不确定·不吃\"拿满分。" },
    { id: "cook", name: "需煮熟", group: "这个工具里的词", aliases: ["需煮熟"],
      short: "生吃或没煮透有毒",
      long: "生吃或没煮透有毒，必须彻底煮熟，比如蜜环菌、红脚牛肝菌、紫丁香蘑、羊肚菌、硫磺菌。" },
    { id: "avoid", name: "不推荐", group: "这个工具里的词", aliases: ["不推荐"],
      short: "不算有毒，但品质差、有争议或需要保护",
      long: "不毒或可食性有争议，但品质差、容易引起胃肠不适，或者在欧洲稀有、需要保护（猴头菌）。" },
    { id: "lookalike", name: "易混种", group: "这个工具里的词", aliases: ["危险易混种", "易混种"],
      short: "长得像、容易认错的种",
      long: "长得像、容易认错的种。课表里每个可食种都和它的危险易混种绑在一起练。" },
    { id: "backfill", name: "全境补位", group: "这个工具里的词", aliases: ["全境补位"],
      short: "片区记录不够时，用全境同月的常见种补上",
      long: "某个森林片区这一季的可食种不到 8 个时，用法兰西岛全境同一个月最常见的可食种补齐，标\"全境补位\"。这些种在这片林子里不一定常见。" },
  ];

  const BY_ID = Object.fromEntries(TERMS.map((t) => [t.id, t]));
  const ALIAS = new Map();
  for (const t of TERMS) for (const a of t.aliases) ALIAS.set(a, t.id);
  // Strings that contain a term but must stay plain text, e.g. species names like 网纹牛肝菌 or 疣柄牛肝菌.
  const PROTECTED = new Set();
  let pattern = buildPattern();

  function buildPattern() {
    const keys = [...ALIAS.keys(), ...PROTECTED].sort((a, b) => b.length - a.length);
    return new RegExp(keys.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
  }

  function protect(strings) {
    const aliases = [...ALIAS.keys()];
    for (const s of strings) if (s && !ALIAS.has(s) && aliases.some((a) => s.includes(a))) PROTECTED.add(s);
    pattern = buildPattern();
  }

  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Escapes text, then turns the first mention of each known term into a tappable button.
  // skip: a term id left unlinked, e.g. the term whose own definition is being shown.
  function linkify(text, skip) {
    const raw = String(text ?? "");
    const seen = new Set(skip ? [skip] : []);
    let out = "", last = 0;
    for (const m of raw.matchAll(pattern)) {
      const id = ALIAS.get(m[0]);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out += esc(raw.slice(last, m.index));
      out += `<button type="button" class="term" data-term="${id}">${esc(m[0])}</button>`;
      last = m.index + m[0].length;
    }
    return out + esc(raw.slice(last));
  }

  // Each diagram: SVG body with parts marked data-part, and labels marked data-label.
  const LINE = 'stroke="#868e96" stroke-width="1"';
  const TXT = 'font-size="13" fill="#343a40"';

  function gillLines() {
    let s = "";
    for (let x = 58; x <= 242; x += 9) {
      const x2 = 150 + (x - 150) * 0.82;
      s += `<line x1="${x}" y1="${124 + Math.abs(x - 150) * -0.03}" x2="${x2.toFixed(1)}" y2="${137 - Math.abs(x - 150) * 0.02}" stroke="#c9a27a" stroke-width="1.2"/>`;
    }
    return s;
  }

  const DIAGRAMS = {
    anatomy: {
      title: "伞菌的各个部位（以鹅膏为例）",
      viewBox: "0 28 360 262",
      parts: ["cap", "warts", "gills", "ring", "stem", "volva"],
      body: () => `
        <rect x="0" y="250" width="360" height="40" fill="#efe4d3"/>
        <line x1="0" y1="250" x2="360" y2="250" stroke="#b08968" stroke-dasharray="4 3"/>
        <g data-part="stem"><path class="o" d="M138,136 L162,136 L165,222 Q176,232 170,246 Q150,258 130,246 Q124,232 135,222 Z" fill="#f8f1e5" stroke="#b08968" stroke-width="1.5"/></g>
        <g data-part="volva"><path class="o" d="M116,232 Q112,268 150,272 Q188,268 184,232 L175,238 Q172,258 150,260 Q128,258 125,238 Z" fill="#ffffff" stroke="#9aa0a6" stroke-width="1.5"/></g>
        <g data-part="ring"><path class="o" d="M132,150 Q150,144 168,150 L178,172 Q150,165 122,172 Z" fill="#ffffff" stroke="#9aa0a6" stroke-width="1.5"/></g>
        <g data-part="gills"><path class="o" d="M46,119 Q150,129 254,119 L236,134 Q150,143 64,134 Z" fill="#f1e3d3" stroke="#b08968" stroke-width="1.2"/>${gillLines()}</g>
        <g data-part="cap"><path class="o" d="M40,118 C55,38 245,38 260,118 Q150,128 40,118 Z" fill="#b08968" stroke="#7f5539" stroke-width="1.5"/></g>
        <g data-part="warts">
          <ellipse class="o" cx="96" cy="80" rx="9" ry="5" fill="#fff" stroke="#9aa0a6"/><ellipse class="o" cx="140" cy="62" rx="10" ry="5" fill="#fff" stroke="#9aa0a6"/>
          <ellipse class="o" cx="190" cy="68" rx="9" ry="5" fill="#fff" stroke="#9aa0a6"/><ellipse class="o" cx="228" cy="94" rx="8" ry="5" fill="#fff" stroke="#9aa0a6"/>
          <ellipse class="o" cx="70" cy="103" rx="7" ry="4" fill="#fff" stroke="#9aa0a6"/><ellipse class="o" cx="164" cy="92" rx="8" ry="5" fill="#fff" stroke="#9aa0a6"/>
        </g>
        <g data-label="cap"><line x1="238" y1="80" x2="282" y2="56" ${LINE}/><text x="286" y="60" ${TXT}>菌盖</text></g>
        <g data-label="warts"><line x1="88" y1="78" x2="38" y2="50" ${LINE}/><text x="8" y="46" ${TXT}>疣</text></g>
        <g data-label="gills"><line x1="240" y1="128" x2="282" y2="128" ${LINE}/><text x="286" y="132" ${TXT}>菌褶</text></g>
        <g data-label="ring"><line x1="174" y1="164" x2="282" y2="168" ${LINE}/><text x="286" y="172" ${TXT}>菌环</text></g>
        <g data-label="stem"><line x1="163" y1="200" x2="282" y2="206" ${LINE}/><text x="286" y="210" ${TXT}>菌柄</text></g>
        <g data-label="volva"><line x1="182" y1="256" x2="282" y2="262" ${LINE}/><text x="286" y="266" ${TXT}>菌托</text></g>
        <text x="8" y="268" font-size="11" fill="#7f5539">地面</text>`,
    },
    "anatomy-bolete": {
      title: "牛肝菌：盖下面是管孔，不是菌褶",
      viewBox: "0 22 360 228",
      parts: ["tubes", "net"],
      body: () => {
        let pores = "";
        for (let x = 64; x <= 236; x += 8) pores += `<line x1="${x}" y1="112" x2="${x}" y2="132" stroke="#9aa35b" stroke-width="1.6"/>`;
        let net = "";
        for (let y = 146; y <= 194; y += 12) {
          net += `<path class="l" d="M134,${y} L142,${y + 6} L150,${y} L158,${y + 6} L166,${y} M134,${y + 12} L142,${y + 6} L150,${y + 12} L158,${y + 6} L166,${y + 12}" fill="none" stroke="#8d6e63" stroke-width="1.2"/>`;
        }
        return `
        <rect x="0" y="232" width="360" height="18" fill="#efe4d3"/>
        <path d="M128,136 L172,136 Q186,190 178,226 Q150,240 122,226 Q114,190 128,136 Z" fill="#f3ead8" stroke="#b08968" stroke-width="1.5"/>
        <g data-part="net">${net}</g>
        <path d="M42,112 C52,34 248,34 258,112 Z" fill="#8d5a3b" stroke="#6b4226" stroke-width="1.5"/>
        <path d="M54,104 C70,58 230,58 246,104 Z" fill="#f8f1e5" stroke="none"/>
        <g data-part="tubes"><path class="o" d="M44,112 L256,112 L244,134 Q150,140 56,134 Z" fill="#e3ecb5" stroke="#9aa35b" stroke-width="1.2"/>${pores}</g>
        <g data-label="tubes"><line x1="246" y1="124" x2="284" y2="124" ${LINE}/><text x="288" y="128" ${TXT}>菌管</text></g>
        <g data-label="net"><line x1="168" y1="172" x2="284" y2="172" ${LINE}/><text x="288" y="176" ${TXT}>网纹</text></g>
        <g data-label="note"><text x="264" y="38" font-size="12" fill="#495057">切开的盖：</text>
        <text x="264" y="54" font-size="12" fill="#495057">上面是肉，</text>
        <text x="264" y="70" font-size="12" fill="#495057">下面一层是菌管</text></g>`;
      },
    },
    underside: {
      title: "翻过来看菌盖下面：四种结构",
      viewBox: "0 0 360 120",
      parts: ["gills", "ridges", "pores", "spines"],
      body: () => {
        const c = (cx, fill, stroke, inner) =>
          `<circle class="o" cx="${cx}" cy="48" r="38" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>${inner}<circle cx="${cx}" cy="48" r="8" fill="#f8f1e5" stroke="${stroke}"/>`;
        let gills = "", ridges = "", pores = "", spines = "";
        for (let a = 0; a < 360; a += 10) {
          const r = (d) => [45 + d * Math.cos((a * Math.PI) / 180), 48 + d * Math.sin((a * Math.PI) / 180)];
          const [x1, y1] = r(9), [x2, y2] = r(36);
          gills += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#b08968" stroke-width="1"/>`;
        }
        for (let a = 0; a < 360; a += 30) {
          const p = (d, da) => {
            const t = ((a + da) * Math.PI) / 180;
            return `${(135 + d * Math.cos(t)).toFixed(1)},${(48 + d * Math.sin(t)).toFixed(1)}`;
          };
          ridges += `<polyline points="${p(9, 0)} ${p(20, 2)} ${p(35, -7)}" fill="none" stroke="#d4a017" stroke-width="2.4" stroke-linecap="round"/>`;
          ridges += `<polyline points="${p(20, 2)} ${p(35, 9)}" fill="none" stroke="#d4a017" stroke-width="2.4" stroke-linecap="round"/>`;
        }
        for (let x = 190; x <= 260; x += 6) for (let y = 13; y <= 83; y += 6) {
          const d = Math.hypot(x - 225, y - 48);
          if (d < 34 && d > 10) pores += `<circle cx="${x}" cy="${y}" r="1.9" fill="#9aa35b"/>`;
        }
        for (let x = 281; x <= 349; x += 7) for (let y = 15; y <= 83; y += 7) {
          const d = Math.hypot(x - 315, y - 48);
          if (d < 33 && d > 10) spines += `<path d="M${x},${y - 3} L${x + 2.6},${y + 2} L${x - 2.6},${y + 2} Z" fill="#d6a35c"/>`;
        }
        return `
          <g data-part="gills">${c(45, "#f1e3d3", "#b08968", gills)}</g>
          <g data-part="ridges">${c(135, "#ffe8a3", "#d4a017", ridges)}</g>
          <g data-part="pores">${c(225, "#eef4cf", "#9aa35b", pores)}</g>
          <g data-part="spines">${c(315, "#fff0d6", "#d6a35c", spines)}</g>
          <g data-label="gills"><text x="45" y="104" text-anchor="middle" ${TXT}>菌褶</text></g>
          <g data-label="ridges"><text x="135" y="104" text-anchor="middle" ${TXT}>褶棱</text></g>
          <g data-label="pores"><text x="225" y="104" text-anchor="middle" ${TXT}>管孔</text></g>
          <g data-label="spines"><text x="315" y="104" text-anchor="middle" ${TXT}>肉刺</text></g>`;
      },
    },
    attachment: {
      title: "菌褶怎么连到柄上（纵切的一半）",
      viewBox: "0 0 360 130",
      parts: ["free", "adnate", "decurrent"],
      body: () => {
        const panel = (ox, gill, part, label) => `
          <rect x="${ox + 20}" y="40" width="14" height="72" fill="#f8f1e5" stroke="#b08968" stroke-width="1.2"/>
          <path d="M${ox + 20},40 C${ox + 40},8 ${ox + 92},8 ${ox + 112},40 Z" fill="#d4a373" stroke="#7f5539" stroke-width="1.2"/>
          <g data-part="${part}"><path class="o" d="${gill}" fill="#f1e3d3" stroke="#b08968" stroke-width="1.2"/></g>
          <g data-label="${part}"><text x="${ox + 66}" y="126" text-anchor="middle" ${TXT}>${label}</text></g>`;
        return panel(0, "M42,41 L108,41 L98,60 Q72,66 44,52 Z", "free", "离生") +
          panel(120, "M154,41 L228,41 L218,60 Q188,68 154,60 Z", "adnate", "直生") +
          panel(240, "M274,41 L348,41 L338,58 Q300,66 274,94 Z", "decurrent", "延生");
      },
    },
    sections: {
      title: "竖着切开：马勃、鹅膏卵、硬皮马勃",
      viewBox: "0 0 360 160",
      parts: ["puffball", "egg", "earthball"],
      body: () => `
        <g data-part="puffball"><ellipse class="o" cx="60" cy="68" rx="42" ry="52" fill="#fffdf8" stroke="#c9b79c" stroke-width="3"/></g>
        <g data-part="egg"><ellipse class="o" cx="180" cy="68" rx="42" ry="52" fill="#ffffff" stroke="#9aa0a6" stroke-width="3"/>
          <path d="M150,58 C156,26 204,26 210,58 Q180,62 150,58 Z" fill="#a9b388" stroke="#6f7d4f"/>
          <path d="M153,59 L207,59 L200,66 L160,66 Z" fill="#f1f3e8" stroke="#9aa0a6"/>
          <path d="M173,66 L187,66 L189,100 Q180,108 171,100 Z" fill="#f8f9fa" stroke="#9aa0a6"/></g>
        <g data-part="earthball"><ellipse class="o" cx="300" cy="68" rx="42" ry="52" fill="#3b2f4a" stroke="#b08968" stroke-width="6"/>
          <path d="M276,48 Q300,60 322,44 M272,78 Q296,70 326,86 M284,100 Q300,92 316,104" fill="none" stroke="#cfc4dd" stroke-width="1.2"/></g>
        <g data-label="puffball"><text x="60" y="138" text-anchor="middle" ${TXT}>马勃</text><text x="60" y="154" text-anchor="middle" font-size="11" fill="#495057">里面均匀纯白</text></g>
        <g data-label="egg"><text x="180" y="138" text-anchor="middle" ${TXT}>鹅膏卵</text><text x="180" y="154" text-anchor="middle" font-size="11" fill="#b3261e">能看到伞和菌褶的轮廓</text></g>
        <g data-label="earthball"><text x="300" y="138" text-anchor="middle" ${TXT}>硬皮马勃</text><text x="300" y="154" text-anchor="middle" font-size="11" fill="#495057">皮厚，里面很早发黑</text></g>`,
    },
    veils: {
      title: "两种内菌幕：膜质菌环 vs 蛛网状菌幕",
      viewBox: "0 0 360 160",
      parts: ["ring", "cortina"],
      body: () => {
        let web = "";
        for (let i = 0; i < 9; i++) {
          web += `<line x1="${214 + i * 3}" y1="${64 + i * 0.4}" x2="260" y2="${78 + i * 2.2}" stroke="#adb5bd" stroke-width="0.8"/>`;
          web += `<line x1="${326 - i * 3}" y1="${64 + i * 0.4}" x2="280" y2="${78 + i * 2.2}" stroke="#adb5bd" stroke-width="0.8"/>`;
        }
        return `
          <path d="M80,66 L100,66 L104,146 L76,146 Z" fill="#f8f1e5" stroke="#b08968" stroke-width="1.2"/>
          <path d="M30,64 C45,22 135,22 150,64 Q90,72 30,64 Z" fill="#b08968" stroke="#7f5539" stroke-width="1.2"/>
          <g data-part="ring"><path class="o" d="M74,84 Q90,78 106,84 L114,104 Q90,98 66,104 Z" fill="#fff" stroke="#9aa0a6" stroke-width="1.5"/></g>
          <path d="M260,66 L280,66 L284,146 L256,146 Z" fill="#f8f1e5" stroke="#b08968" stroke-width="1.2"/>
          <path d="M256,112 L284,118 M256,124 L284,128" stroke="#b5651d" stroke-width="1.4"/>
          <path d="M210,64 C225,22 315,22 330,64 Q270,72 210,64 Z" fill="#c98b4a" stroke="#8a5a2b" stroke-width="1.2"/>
          <g data-part="cortina">${web}</g>
          <g data-label="ring"><text x="90" y="160" text-anchor="middle" ${TXT}>菌环（膜质）</text></g>
          <g data-label="cortina"><text x="270" y="160" text-anchor="middle" ${TXT}>蛛网状菌幕</text></g>`;
      },
    },
  };

  // labels: whether to draw part labels; highlight: part id to emphasise.
  function svg(id, { labels = true, highlight = null } = {}) {
    const d = DIAGRAMS[id];
    let body = d.body();
    if (!labels) body = body.replace(/<g data-label="[^"]*">[\s\S]*?<\/g>/g, "");
    if (highlight) body = body.replaceAll(`data-part="${highlight}"`, `data-part="${highlight}" class="hl"`);
    return `<svg class="diagram${highlight ? " has-hl" : ""}" viewBox="${d.viewBox}" role="img" aria-label="${labels ? esc(d.title) : "示意图"}">${body}</svg>`;
  }

  window.Glossary = { GROUPS, NO_QUIZ, TERMS, BY_ID, DIAGRAMS, linkify, protect, svg, esc };
})();
