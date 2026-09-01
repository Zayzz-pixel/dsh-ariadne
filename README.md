# 引线 / Ariadne

DeepSeek Harness（DSH）的可视化思维决策与逐节点执行工作台：Agent 随讨论维护方向地图，用户聚焦分支、掌握取舍、审阅执行图，再按工作包推进任务。

“引线”取自阿里阿德涅交给忒修斯的线。Ariadne 在复杂讨论中保留来路，也把最终选择接到一条可执行、可检查、可恢复的路径上。

本文介绍 0.3.0 的使用方式，保留 0.2 的 Session Frame、Focus Dock 和执行准备流程。

## 安装

```sh
# 从 GitHub 安装固定版本
dsh plugin --profile web add github:Zayzz-pixel/dsh-ariadne#v0.3.0
dsh web

# 本地开发时链接当前目录
dsh plugin --profile web add "link:$(pwd)"
dsh web
```

卸载：

```sh
dsh plugin --profile web remove dsh-ariadne
```

## 探索与定案

1. 打开会话中的 `引线` 标签页，点工具栏开关启用当前会话。开关默认关闭；启用后，Agent 可使用文末列出的四个工具。
2. 空地图提供「展开一个想法」与「整理已有内容」两个入口。前者生成目标、组织口径和 4–7 个暂定一级方向；后者提取会话中已有的层级与未解决问题。
3. 在顶部 Session Frame 直接编辑本次目标和组织口径。地图以 Topic、一级方向与子树组织内容，支持拖拽、调整卡片大小、折叠分支、聚焦和小地图导航。
4. 点地图卡片切换当前节点。侧栏已关闭时，点击节点只更新当前节点并显示快捷菜单；点「专注此分支」或顶部专注按钮才重新打开侧栏。Focus Dock 以「我的笔记」为主区，结构树默认收起；工作摘要保存「当前理解 / 待解决 / 下一步」，底部固定提供展开、探索、定案和暂缓操作。
5. 继续讨论或点「继续展开」「小范围自动探索」。Agent 在新增方向、深化、整理或明确记录时维护地图；主动补点单轮最多 3 个方向，小范围探索最多新增 5 个直接子节点。
6. 切换到「执行」，在候选／已选双栏中搜索、按一级方向筛选并调整定案池，再点「生成执行方案」。准备期间 `phase` 保持 `exploring`；Agent 写入执行图后进入 `executing`，等待用户审阅。

每张会话地图归属一个轻量 Project。顶部 Project Chip 可编辑项目标题和 Goal、创建项目或切换同工作区项目。「项目总图」通过 Host 读取持久会话，展示项目统计、会话卡片、一级方向和定案节点；刷新、导航与直接编辑均无需调用模型。

「我的笔记」通过独立 `userNote` 字段保存，Agent 更新共享 `note` 时不会覆盖。输入过程不会反复追加地图事件；点击保存或按 `⌘/Ctrl + Enter` 提交一次。点击「带入本轮」才会把当前个人笔记作为用户消息发送给 Agent。

## 审阅执行图

Final Plan v2 以 `graph` 为唯一计划结构。「列表」和「图」从同一份图派生，执行顺序由连接关系决定。纯任务链默认显示列表，含判断或检查点的方案默认显示图；两种视图可随时切换。图支持平移、缩放和「适配视野」。

点击工作包可查看执行指令、所需输入、预期输出、完成条件及来源节点。来源链接可回到地图定位。在首次开始 Run 前，点「编辑工作包」可直接修改标题和上述规格；调整连线、节点类型或分支结构需要重新生成方案。

| 节点类型 | 工作方式 |
| --- | --- |
| Task／任务 | Agent 完成一个可独立验收的工作包，成功沿 `success` 边推进。 |
| Decision／判断 | Agent 根据结果返回明确的 `routeKey`，Host 选择对应路线。每个判断至少有两条不同路线。 |
| Checkpoint／检查点 | 暂停等待用户审阅，只有用户点击「批准检查点」才会推进。 |

执行图采用单节点、无环控制流，建议 5–20 个节点，硬上限 30 个。每个选中方向都要有工作包引用，或在未覆盖事项 `uncovered` 中用来源 ID 和原因说明。搜索、读取单个文件等细节由工作包内部处理。

## 逐节点执行

1. 审阅后点「确认并开始」。此动作创建 Execution Run，起始任务或判断进入「待运行」`ready`；起点为检查点时进入「待批准」`waiting`。创建 Run 本身不发送 Agent 执行请求。
2. Agent 与消息队列空闲时，点「运行当前节点」。Host 将当前节点设为 `running` 并增加执行次数，客户端发送该工作包的指令、目标、来源及已走路径上的结果上下文。
3. Agent 完成后调用 `brainstorm_execution_complete`，提交结果摘要、产物引用、证据及判断节点所需的路线。Host 校验 Run 和当前节点，持久化结果、推进位置，并结束这一轮 Agent 执行。
4. 下一任务或判断进入 `ready`，由用户再次点击运行。检查点进入 `waiting`，等待用户批准。到达所选路线的终点后 Run 完成；未选择的分支保留为「未经过」。

执行期间，检查器会显示当前状态、执行次数、摘要、证据和产物引用。刷新页面后从会话事件恢复同一 Run；每次点击只执行当前工作包。

## 阻塞、恢复与退出

- **失败与阻塞**：Task 或 Decision 提交 `failed` 时，有 `failure` 边就进入对应处理节点，否则 Run 停在 `blocked`。提交 `blocked` 会停留在当前节点，等待补充输入或用户处理。
- **重试**：解决问题后点「重试当前节点」。界面先将失败／阻塞节点恢复为 `ready`，再开始新一次执行；次数在进入 `running` 时增加。
- **入队失败**：界面显示错误，并尝试把当前节点恢复为待运行，保留已有执行次数。
- **中断恢复**：Agent 和消息队列已空闲，而节点仍显示 `running` 时，点「恢复为待运行」，再按需运行。恢复只重置当前节点状态，保留次数和图上的位置。
- **取消 Run**：点「取消本次运行」保留计划；工作包仍在执行时使用「停止 Agent 并取消运行」。之后可点「重新开始运行」创建新 Run。取消不会回滚工作包已经产生的文件或外部操作。
- **返回探索**：执行视图的「返回探索」清除当前 Plan 和 Run，保留定案池，已选节点恢复为已展开。旧 Plan 和 Run 仍保留在历史会话事件中。

Run 一旦创建，工作包规格即锁定；取消或完成后仍保留该次计划规格。需要修改时先取消活动 Run 并重新生成方案，或返回探索重新选择。Run 处于 `ready`、`running`、`waiting`、`blocked` 时，引线开关保持锁定；先取消 Run 或返回探索，再关闭。

## 导出

执行视图的「导出执行图」在当前会话工作目录生成两个文件：

- `brainstorm-execution.json`：机器可读的 Plan、Graph、来源上下文、Session／Project 信息、Frame、未覆盖事项，以及存在时的 Run 与节点结果。
- `brainstorm-execution.md`：可读工作包说明、来源、执行结果和 Mermaid 流程图。

两份导出都从当前状态生成，包含已保存的规格编辑与运行结果；再次导出会更新同名文件。`brainstorm_plan` 生成方案时也会写出 Markdown，默认路径为 `brainstorm-execution.md`。

地图工具栏的「导出」继续提供完整 `brainstorm-map.md` 与 JSON Canvas 1.0 `brainstorm-map.canvas`。两种地图导出均包含个人笔记；执行图导出只包含共享记录，个人笔记需由用户显式带入 Agent。Canvas 保留当前地图卡片位置、尺寸和 Parent 连线。

## 数据与工具

地图、个人笔记、Plan 与 Run 通过完整 `brainstorm/map` 会话事件持久化，并经 Session Projection 实时推送到浏览器。`userNote` 只由 `set-user-note` Direct Op 写入；Agent 工具目录不暴露这个字段。Plan 保存工作包与连接关系；独立的 Run 保存当前节点、状态、次数与结果。开始、重试、恢复、批准和取消均由确定性的 Host Direct Ops 处理。

| Agent 工具 | 职责 |
| --- | --- |
| `brainstorm_map` | 增量维护探索地图、节点记录、Frame 和定案池。 |
| `brainstorm_project` | 从持久会话地图刷新项目总图。 |
| `brainstorm_plan` | 根据定案池生成供用户审阅的执行图，写入 Final Plan v2；Run 由用户随后创建。 |
| `brainstorm_execution_complete` | 提交当前运行工作包的 `completed`／`failed`／`blocked` 结果，由 Host 校验和推进。 |

关闭当前会话的引线后，这四个工具均从该会话的模型工具目录移除。活动 Run 中的 Agent 只执行当前节点，检查点批准、改变方案和退出执行由用户控制。

### 改名兼容

0.3.0 起产品名和安装包名为“引线 / Ariadne”与 `dsh-ariadne`。现有数据协议继续使用 `brainstorm/map`、`brainstorm/project`、`brainstorm_*` 工具名、`brainstorm-map` 设置命名空间和默认导出文件名，因此旧会话地图、项目、计划与运行记录可直接恢复。

### 旧计划兼容

旧 Final Plan v1 在读取时转换为线性 Task 图，保留步骤内容、来源与未覆盖事项，历史事件保持原样。下一次计划编辑或运行操作写入 v2，列表和图继续共享唯一结构。

旧 `done` 标记承接到兼容 Run：存在已完成步骤时，当前节点指向第一个未完成步骤；全部完成时 Run 为 `completed`；没有完成标记时暂不创建 Run。非连续的已完成步骤会被保留，后续推进时自动跳过。旧手动完成标记不增加 Agent 执行次数。

## 开发

```sh
npm run check          # 语法检查 + node --test
DSH_SESSION_JSONL=/absolute/path/session.jsonl.zstd npm run validate:map
node scripts/benchmark.mjs  # 20/30 节点执行图、31/100/200 节点地图与 50 Session 基准
```

本地测试需要解析 Web profile 内已安装的 `@deepseek-ai/*` 包。`validate:map` 从指定 Session 日志读取最新地图并检查状态不变量。

## 兼容范围

- DeepSeek Harness `0.1.1-rc.2`
- Web profile（`dsh web`）

宿主版本升级后，需要重新检查工具、队列、会话持久化与客户端加载接口。0.3.0 的执行范围为用户触发的单节点推进；连续自动运行、并行调度、循环、子图和多 Agent 路由留待后续。

版本变化见 [`CHANGELOG.md`](./CHANGELOG.md)。

## 许可证

MIT
