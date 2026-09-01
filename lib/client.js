// dsh-ariadne — browser half (client plugin bundle).
//
// Ariadne v2 workbench: a balanced root-partition map, persistent manual
// offsets/sizes, border-anchored orthogonal edges, Active Path, subtree focus,
// local collapse, minimap navigation, right Focus Dock, and Session composer.
window.__ModuleLoader__.load({
	id: "dsh-ariadne",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");
		const { useSyncExternalStore, useMemo, useState, useEffect, useRef } = React;

		//#region dsh-ariadne: locale
		const NS = "brainstorm";
		const zh = {
			"view.brainstorm": "引线",
			"view.project": "项目总图",
			"view.session": "会话地图",
			"phase.exploring": "探索",
			"phase.executing": "执行",
			"phase.hint": "定案后会自动滑成中央直线",
			"header.empty": "还没有地图",
			"header.emptyHint": "和 agent 聊一个主题，地图会边聊边长出来；也可以直接让它建图。",
			"backfill.title": "选择这张地图的起点",
			"backfill.hint": "只有一个念头时先搭一层暂定结构；已有讨论时保留真实出现的层级。",
			"backfill.action": "整理已有内容",
			"backfill.actionHint": "从当前对话提取已有方向，不补充新创意。",
			"backfill.current": "展开一个想法",
			"backfill.currentHint": "确定目标与拆解口径，生成 4–7 个暂定一级方向。",
			"backfill.recommended": "推荐",
			"backfill.running": "Agent 正在回看对话并整理地图…",
			"backfill.retry": "重新选择",
			"action.create": "创建地图",
			"action.organize": "整理结构",
			"action.more": "更多",
			"action.projectRefresh": "刷新总图",
			"action.resetView": "复位",
			"action.focus": "专注",
			"export.action": "导出",
			"export.markdown": "导出 Markdown",
			"export.canvas": "导出 JSON Canvas",
			"export.both": "全部导出",
			"export.done": "已导出",
			"executing.hint": "定案池为空：先在探索期点节点 →「加入定案池」，或让 agent 定案。",
			"plan.title": "执行方案",
			"plan.prepare": "从候选方向中确定执行范围",
			"plan.prepareHint": "在这里调整定案池；生成方案时 Agent 会根据真实依赖排序。",
			"plan.candidates": "候选方向",
			"plan.selected": "已选方向",
			"plan.search": "搜索标题或记录…",
			"plan.allRoots": "全部一级方向",
			"plan.emptySelected": "先从左侧选择至少一个方向。",
			"plan.noCandidates": "没有匹配的候选方向。",
			"plan.generate": "生成执行方案",
			"plan.regenerate": "重新生成计划",
			"plan.generating": "Agent 正在生成方案…",
			"plan.progress": "执行进度",
			"plan.nextStep": "具体下一步",
			"plan.sources": "来源节点",
			"plan.uncovered": "未覆盖事项",
			"plan.noGaps": "当前方案没有未覆盖事项。",
			"plan.continueExplore": "继续探索",
			"plan.export": "导出计划",
			"plan.exported": "已导出",
			"plan.edit": "编辑步骤",
			"plan.done": "标记完成",
			"plan.save": "保存步骤",
			"plan.cancel": "取消",
			"plan.complete": "全部步骤已完成",
			"plan.incomplete": "待完成",
			"plan.pool": "定案池",
			"plan.infoGap": "信息尚未充分展开",
			"execution.review": "方案审阅",
			"execution.run": "执行运行",
			"execution.list": "列表",
			"execution.graph": "图",
			"execution.confirm": "确认并开始",
			"execution.restart": "重新开始运行",
			"execution.back": "返回探索",
			"execution.export": "导出执行图",
			"execution.current": "当前节点",
			"execution.runNode": "运行当前节点",
			"execution.retry": "重试当前节点",
			"execution.reset": "恢复为待运行",
			"execution.approve": "批准检查点",
			"execution.cancel": "取消本次运行",
			"execution.stopCancel": "停止 Agent 并取消运行",
			"execution.edit": "编辑工作包",
			"execution.save": "保存工作包",
			"execution.instruction": "执行指令",
			"execution.inputs": "所需输入",
			"execution.outputs": "预期输出",
			"execution.criteria": "完成条件",
			"execution.summary": "执行结果",
			"execution.evidence": "证据",
			"execution.outputRefs": "产物引用",
			"execution.attempts": "执行次数",
			"execution.none": "无",
			"execution.agentBusy": "Agent 或队列正在工作，空闲后可运行节点。",
			"execution.reviewHint": "核对指令与完成条件，确认后逐节点执行。",
			"execution.waitingHint": "检查点等待你的批准，Agent 会停在这里。",
			"execution.frozen": "运行已开始，工作包规格保持锁定。修改方案请先取消并重新生成。",
			"execution.recoveryHint": "Agent 空闲但节点仍显示执行中时，可恢复为待运行再重试。",
			"execution.fit": "适配视野",
			"execution.completedCount": "已完成",
			"execution.task": "任务",
			"execution.decision": "判断",
			"execution.checkpoint": "检查点",
			"execution.status.pending": "待到达",
			"execution.status.ready": "待运行",
			"execution.status.running": "执行中",
			"execution.status.waiting": "待批准",
			"execution.status.completed": "已完成",
			"execution.status.failed": "失败",
			"execution.status.blocked": "阻塞",
			"execution.status.cancelled": "已取消",
			"execution.status.unvisited": "未经过",
			"menu.continue": "继续展开",
			"menu.explore": "小范围自动探索",
			"menu.status": "标记状态…",
			"menu.select": "加入定案池",
			"menu.focus": "专注此分支",
			"menu.cancel": "取消",
			"dock.title": "专注模式",
			"dock.note": "记录",
			"dock.close": "关闭",
			"dock.tree": "地图树",
			"dock.detail": "节点详情",
			"dock.noActive": "从地图或左侧树选择一个节点。",
			"dock.children": "下级节点",
			"dock.siblings": "同级方向",
			"dock.park": "搁置",
			"dock.restore": "恢复",
			"dock.removeSelected": "移出定案池",
			"dock.addSelected": "加入定案池",
			"dock.focusBranch": "聚焦分支",
			"dock.compact": "收起专注模式",
			"dock.expand": "展开专注模式",
			"dock.search": "搜索节点",
			"dock.searchPlaceholder": "搜索标题或记录…",
			"dock.results": "搜索结果",
			"dock.noResults": "没有匹配节点",
			"dock.topic": "会话主题",
			"dock.selectNode": "选择一个节点开始专注",
			"dock.roots": "一级方向",
			"dock.selectedCount": "定案池",
			"dock.editTitle": "编辑标题",
			"dock.editNote": "编辑记录",
			"dock.save": "保存",
			"dock.cancel": "取消",
			"dock.noNote": "还没有记录。",
			"dock.noteTooLong": "记录总长度不能超过 3000 个字符。",
			"dock.showMore": "展开全文",
			"dock.showLess": "收起全文",
			"dock.updated": "更新",
			"dock.sourceUser": "用户",
			"dock.sourceAgent": "Agent",
			"dock.childrenCount": "个下级",
			"dock.selectedMark": "候选",
			"dock.createChild": "新建子节点",
			"dock.childPlaceholder": "输入子节点标题",
			"dock.noChildren": "当前节点还没有下级方向。",
			"dock.noSiblings": "没有其他同层方向。",
			"dock.viewAll": "查看全部",
			"dock.currentUnderstanding": "当前理解",
			"dock.unresolved": "待解决",
			"dock.nextStep": "下一步",
			"dock.emptySection": "尚未记录",
			"dock.personalNote": "我的笔记",
			"dock.personalNotePlaceholder": "随手写下判断、疑问或联想……",
			"dock.personalNoteHint": "⌘/Ctrl + Enter 保存",
			"dock.personalNoteTooLong": "个人笔记不能超过 3000 个字符。",
			"dock.saved": "已保存",
			"dock.unsaved": "未保存",
			"dock.bringToTurn": "带入本轮",
			"dock.broughtToTurn": "已带入本轮",
			"dock.workSummary": "工作摘要",
			"dock.structure": "结构",
			"dock.showStructure": "展开结构树",
			"dock.hideStructure": "收起结构树",
			"dock.showSummary": "展开摘要",
			"dock.hideSummary": "收起摘要",
			"dock.organizeNode": "整理本节点记录",
			"dock.convergeChildren": "收敛子方向",
			"dock.compareSiblings": "比较同级方向",
			"dock.evaluateOverall": "评估整体方向",
			"dock.navigation": "结构导航",
			"frame.goal": "目标",
			"frame.organizingPrinciple": "组织口径",
			"frame.empty": "补充本次目标与拆解口径",
			"frame.edit": "编辑",
			"frame.save": "保存",
			"frame.cancel": "取消",
			"composer.context": "引线上下文",
			"composer.noActive": "在地图选择节点后，这里会带上当前分支。",
			"project.empty": "还没有项目总图",
			"project.emptyHint": "点击生成总图，Host 会读取当前 Project 的持久 Session Map。",
			"project.generate": "生成总图",
			"project.sessions": "会话数",
			"project.nodes": "节点总数",
			"project.links": "关联总数",
			"project.unexplored": "未探索",
			"project.current": "当前项目",
			"project.goal": "Project Goal",
			"project.noGoal": "还没有 Project Goal。",
			"project.edit": "编辑项目",
			"project.new": "新建 Project",
			"project.move": "移动到 Project",
			"project.save": "保存项目",
			"project.cancel": "取消",
			"project.refreshing": "正在读取历史会话…",
			"project.overview": "项目概览",
			"project.roots": "Root",
			"project.selected": "定案池",
			"project.depth": "最大深度",
			"project.openSession": "打开会话",
			"project.continueSession": "继续探索",
			"project.rootSummary": "Root 摘要",
			"project.related": "可能相关的会话",
			"project.relatedHint": "这些会话位于同一工作区，当前归属另一个 Project 或尚未归属。",
			"project.noSessions": "当前 Project 还没有可读取的 Session Map。",
			"project.showDetails": "展开结构",
			"project.hideDetails": "收起结构",
			"legend.status": "状态",
			"status.unexplored": "未探索",
			"status.exploring": "探索中",
			"status.expanded": "已展开",
			"status.parked": "搁置",
			"status.selected": "已选定",
			"stats.nodes": "节点",
			"toggle.label": "引线",
			"toggle.on": "已开启",
			"toggle.off": "已关闭",
			"toggle.loading": "…",
			"view.disabled.title": "引线未启用",
			"view.disabled.hint": "每个会话默认关闭。打开后，本轮会话的 agent 才会获得脑暴工具；关闭则立即移除。",
			"view.disabled.enable": "开启引线",
		};
		const en = {
			"view.brainstorm": "Ariadne",
			"view.project": "Project",
			"view.session": "Session map",
			"phase.exploring": "Explore",
			"phase.executing": "Execute",
			"phase.hint": "Slides into a center lane after the plan is fixed",
			"header.empty": "No map yet",
			"header.emptyHint": "Talk about a topic and the agent will grow the map here; or ask it to create one.",
			"backfill.title": "Choose how this map starts",
			"backfill.hint": "Start with one provisional layer for a new idea, or preserve the real hierarchy already discussed.",
			"backfill.action": "Organize existing content",
			"backfill.actionHint": "Extract existing directions from the conversation without adding ideas.",
			"backfill.current": "Expand one idea",
			"backfill.currentHint": "Set the goal and organizing principle, then create 4–7 provisional roots.",
			"backfill.recommended": "Recommended",
			"backfill.running": "Agent is reviewing the conversation and organizing the map…",
			"backfill.retry": "Choose again",
			"action.create": "Create map",
			"action.organize": "Organize structure",
			"action.more": "More",
			"action.projectRefresh": "Refresh overview",
			"action.resetView": "Reset",
			"action.focus": "Focus",
			"export.action": "Export",
			"export.markdown": "Export Markdown",
			"export.canvas": "Export JSON Canvas",
			"export.both": "Export both",
			"export.done": "Exported",
			"executing.hint": "Nothing fixed yet: in the explore phase, click a node → “Add to final pool”, or ask the agent to fix the plan.",
			"plan.title": "Execution plan",
			"plan.prepare": "Choose the directions that belong in execution",
			"plan.prepareHint": "Adjust the final pool here; the Agent will order it by real dependencies.",
			"plan.candidates": "Candidate directions",
			"plan.selected": "Selected directions",
			"plan.search": "Search title or note…",
			"plan.allRoots": "All root directions",
			"plan.emptySelected": "Select at least one direction from the left.",
			"plan.noCandidates": "No candidate directions match.",
			"plan.generate": "Generate execution plan",
			"plan.regenerate": "Regenerate plan",
			"plan.generating": "Agent is generating the plan…",
			"plan.progress": "Progress",
			"plan.nextStep": "Concrete next step",
			"plan.sources": "Source nodes",
			"plan.uncovered": "Uncovered",
			"plan.noGaps": "The current plan has no uncovered items.",
			"plan.continueExplore": "Continue exploring",
			"plan.export": "Export plan",
			"plan.exported": "Exported",
			"plan.edit": "Edit step",
			"plan.done": "Mark complete",
			"plan.save": "Save step",
			"plan.cancel": "Cancel",
			"plan.complete": "All steps complete",
			"plan.incomplete": "remaining",
			"plan.pool": "Final pool",
			"plan.infoGap": "Needs further exploration",
			"execution.review": "Review plan",
			"execution.run": "Execution run",
			"execution.list": "List",
			"execution.graph": "Graph",
			"execution.confirm": "Confirm and start",
			"execution.restart": "Start a new run",
			"execution.back": "Back to exploration",
			"execution.export": "Export execution graph",
			"execution.current": "Current node",
			"execution.runNode": "Run current node",
			"execution.retry": "Retry current node",
			"execution.reset": "Reset to ready",
			"execution.approve": "Approve checkpoint",
			"execution.cancel": "Cancel this run",
			"execution.stopCancel": "Stop Agent and cancel run",
			"execution.edit": "Edit work package",
			"execution.save": "Save work package",
			"execution.instruction": "Instruction",
			"execution.inputs": "Required inputs",
			"execution.outputs": "Expected outputs",
			"execution.criteria": "Completion criteria",
			"execution.summary": "Result",
			"execution.evidence": "Evidence",
			"execution.outputRefs": "Output references",
			"execution.attempts": "Attempts",
			"execution.none": "None",
			"execution.agentBusy": "Wait for the Agent and queue to become idle before running a node.",
			"execution.reviewHint": "Review instructions and completion criteria, then confirm to run one node at a time.",
			"execution.waitingHint": "The Agent stops here until you approve this checkpoint.",
			"execution.frozen": "Work package specifications stay locked after a Run starts. Cancel and regenerate to change the plan.",
			"execution.recoveryHint": "If the Agent is idle but this node is still running, reset it to ready and retry.",
			"execution.fit": "Fit view",
			"execution.completedCount": "Completed",
			"execution.task": "Task",
			"execution.decision": "Decision",
			"execution.checkpoint": "Checkpoint",
			"execution.status.pending": "Not reached",
			"execution.status.ready": "Ready",
			"execution.status.running": "Running",
			"execution.status.waiting": "Awaiting approval",
			"execution.status.completed": "Completed",
			"execution.status.failed": "Failed",
			"execution.status.blocked": "Blocked",
			"execution.status.cancelled": "Cancelled",
			"execution.status.unvisited": "Not visited",
			"menu.continue": "Continue branch",
			"menu.explore": "Auto-explore (small)",
			"menu.status": "Set status…",
			"menu.select": "Add to final pool",
			"menu.focus": "Focus this branch",
			"menu.cancel": "Cancel",
			"dock.title": "Focus mode",
			"dock.note": "Note",
			"dock.close": "Close",
			"dock.tree": "Map tree",
			"dock.detail": "Node detail",
			"dock.noActive": "Select a node on the map or in the tree.",
			"dock.children": "Child nodes",
			"dock.siblings": "Sibling directions",
			"dock.park": "Park",
			"dock.restore": "Restore",
			"dock.removeSelected": "Remove from final pool",
			"dock.addSelected": "Add to final pool",
			"dock.focusBranch": "Focus branch",
			"dock.compact": "Collapse focus mode",
			"dock.expand": "Expand focus mode",
			"dock.search": "Search nodes",
			"dock.searchPlaceholder": "Search title or note…",
			"dock.results": "Search results",
			"dock.noResults": "No matching nodes",
			"dock.topic": "Session topic",
			"dock.selectNode": "Select a node to start focusing",
			"dock.roots": "Root directions",
			"dock.selectedCount": "Final pool",
			"dock.editTitle": "Edit title",
			"dock.editNote": "Edit note",
			"dock.save": "Save",
			"dock.cancel": "Cancel",
			"dock.noNote": "No note yet.",
			"dock.noteTooLong": "The combined note must be at most 3000 characters.",
			"dock.showMore": "Show full note",
			"dock.showLess": "Collapse note",
			"dock.updated": "Updated",
			"dock.sourceUser": "User",
			"dock.sourceAgent": "Agent",
			"dock.childrenCount": "children",
			"dock.selectedMark": "candidate",
			"dock.createChild": "New child",
			"dock.childPlaceholder": "Enter child title",
			"dock.noChildren": "This node has no child direction yet.",
			"dock.noSiblings": "No other sibling direction.",
			"dock.viewAll": "View all",
			"dock.currentUnderstanding": "Current understanding",
			"dock.unresolved": "Unresolved",
			"dock.nextStep": "Next step",
			"dock.emptySection": "Nothing recorded yet",
			"dock.personalNote": "My notes",
			"dock.personalNotePlaceholder": "Write a thought, question, or judgment…",
			"dock.personalNoteHint": "⌘/Ctrl + Enter to save",
			"dock.personalNoteTooLong": "Personal notes must be at most 3000 characters.",
			"dock.saved": "Saved",
			"dock.unsaved": "Unsaved",
			"dock.bringToTurn": "Bring into this turn",
			"dock.broughtToTurn": "Added to this turn",
			"dock.workSummary": "Work summary",
			"dock.structure": "Structure",
			"dock.showStructure": "Show structure tree",
			"dock.hideStructure": "Hide structure tree",
			"dock.showSummary": "Show summary",
			"dock.hideSummary": "Hide summary",
			"dock.organizeNode": "Organize this node",
			"dock.convergeChildren": "Converge child directions",
			"dock.compareSiblings": "Compare sibling directions",
			"dock.evaluateOverall": "Evaluate overall directions",
			"dock.navigation": "Structure navigation",
			"frame.goal": "Goal",
			"frame.organizingPrinciple": "Organizing principle",
			"frame.empty": "Add this Session's goal and organizing principle",
			"frame.edit": "Edit",
			"frame.save": "Save",
			"frame.cancel": "Cancel",
			"composer.context": "Ariadne context",
			"composer.noActive": "Select a map node to carry its branch into this composer.",
			"project.empty": "No project overview yet",
			"project.emptyHint": "Generate the overview from persistent Session Maps in the current Project.",
			"project.generate": "Generate overview",
			"project.sessions": "sessions",
			"project.nodes": "nodes",
			"project.links": "links",
			"project.unexplored": "unexplored",
			"project.current": "Current project",
			"project.goal": "Project Goal",
			"project.noGoal": "No Project Goal yet.",
			"project.edit": "Edit project",
			"project.new": "New Project",
			"project.move": "Move to Project",
			"project.save": "Save project",
			"project.cancel": "Cancel",
			"project.refreshing": "Reading session history…",
			"project.overview": "Project overview",
			"project.roots": "Roots",
			"project.selected": "Final pool",
			"project.depth": "Max depth",
			"project.openSession": "Open session",
			"project.continueSession": "Continue exploring",
			"project.rootSummary": "Root summary",
			"project.related": "Possibly related sessions",
			"project.relatedHint": "These sessions share the workspace and belong to another Project or have no Project yet.",
			"project.noSessions": "This Project has no readable Session Map yet.",
			"project.showDetails": "Show structure",
			"project.hideDetails": "Hide structure",
			"legend.status": "Status",
			"status.unexplored": "unexplored",
			"status.exploring": "exploring",
			"status.expanded": "expanded",
			"status.parked": "parked",
			"status.selected": "selected",
			"stats.nodes": "nodes",
			"toggle.label": "Ariadne",
			"toggle.on": "enabled",
			"toggle.off": "disabled",
			"toggle.loading": "…",
			"view.disabled.title": "Ariadne is off",
			"view.disabled.hint": "Sessions default to off. Turning it on gives this session's agent the brainstorm tools; turning it off removes them immediately.",
			"view.disabled.enable": "Enable Ariadne",
		};
		//#endregion

		//#region dsh-ariadne: constants + stores
		const STATUSES = ["unexplored", "exploring", "expanded", "parked", "selected"];
		const STATUS_COLORS = {
			unexplored: "#9aa4b2",
			exploring: "#4f6bff",
			expanded: "#2f9b68",
			parked: "#d9802d",
			selected: "#7656d8",
		};
		const EXECUTING_COLOR = "#4d6bfe";
		const EMPTY_SESSION_SNAPSHOT = Object.freeze({ running: false, queue: [] });

		const SETTINGS_NS = "brainstorm-map";
		const enabledState = { values: new Map(), listeners: new Set(), api: null };
		let sessionsRuntime = null;
		const enabledStore = {
			getSnapshot: () => enabledState,
			subscribe(fn) {
				enabledState.listeners.add(fn);
				return () => enabledState.listeners.delete(fn);
			},
			emit() {
				for (const fn of enabledState.listeners) fn();
			},
			get(sessionId) {
				const value = enabledState.values.get(sessionId);
				return value === undefined ? "loading" : value;
			},
			set(sessionId, value) {
				enabledState.values.set(sessionId, value);
				this.emit();
			},
			async describe() {
				if (!enabledState.api) throw new Error("connection api unavailable");
				const response = await enabledState.api.settings.describe({});
				const result = response?.result;
				if (!result?.ok) throw new Error(result?.error?.message ?? "settings describe failed");
				return result.value;
			},
			async refresh(sessionId) {
				try {
					const value = await this.describe();
					const view = value?.namespaces?.find((entry) => entry.ns === SETTINGS_NS);
					const list = Array.isArray(view?.value?.enabledSessionIds) ? view.value.enabledSessionIds : [];
					this.set(sessionId, list.includes(sessionId));
				} catch (error) {
					console.error("[dsh-ariadne] refresh enabled state failed:", error);
					this.set(sessionId, "error");
				}
			},
			async toggle(sessionId) {
				const value = await this.describe();
				const view = value?.namespaces?.find((entry) => entry.ns === SETTINGS_NS);
				const list = Array.isArray(view?.value?.enabledSessionIds) ? [...view.value.enabledSessionIds] : [];
				const wasOn = list.includes(sessionId);
				const next = wasOn ? list.filter((id) => id !== sessionId) : [...list, sessionId];
				const response = await enabledState.api.settings.update({
					ns: SETTINGS_NS,
					patch: { enabledSessionIds: next },
					expectedRevision: view?.revision,
				});
				const updated = response?.result;
				if (!updated?.ok) throw new Error(updated?.error?.message ?? "settings update failed");
				this.set(sessionId, !wasOn);
			},
		};
		function useSessionEnabled(sessionId) {
			return useSyncExternalStore(enabledStore.subscribe, () => enabledStore.get(sessionId));
		}

		const WORKBENCH_DEFAULT = Object.freeze({ open: true, compact: false, treeOpen: false, width: 520, minimapOpen: true, activeNodeId: null, focusId: null, collapsedIds: [], treeExpandedIds: [], map: null, session: null });
		const workbenchStates = new Map();
		const workbenchListeners = new Map();
		function loadWorkbench(sessionId) {
			if (workbenchStates.has(sessionId)) return workbenchStates.get(sessionId);
			let saved = {};
			try {
				saved = JSON.parse(window.localStorage?.getItem(`dsh-brainstorm-workbench:${sessionId}`) ?? "{}");
			} catch {}
			const state = {
				...WORKBENCH_DEFAULT,
				open: saved.open !== false,
				treeOpen: saved.treeOpen === true,
				width: Math.max(420, Math.min(680, Number(saved.width) || 520)),
				minimapOpen: saved.minimapOpen !== false,
				activeNodeId: typeof saved.activeNodeId === "string" ? saved.activeNodeId : null,
			};
			workbenchStates.set(sessionId, state);
			return state;
		}
		const workbenchStore = {
			get: loadWorkbench,
			subscribe(sessionId, fn) {
				const listeners = workbenchListeners.get(sessionId) ?? new Set();
				listeners.add(fn);
				workbenchListeners.set(sessionId, listeners);
				return () => listeners.delete(fn);
			},
			update(sessionId, patch) {
				const current = loadWorkbench(sessionId);
				const next = { ...current, ...patch };
				workbenchStates.set(sessionId, next);
				try {
					window.localStorage?.setItem(
						`dsh-brainstorm-workbench:${sessionId}`,
						JSON.stringify({ open: next.open, treeOpen: next.treeOpen, width: next.width, minimapOpen: next.minimapOpen, activeNodeId: next.activeNodeId }),
					);
				} catch {}
				for (const fn of workbenchListeners.get(sessionId) ?? []) fn();
				return next;
			},
			setContext(session, map) {
				const sessionId = session.sessionId;
				const current = loadWorkbench(sessionId);
				let activeNodeId = current.activeNodeId;
				if (map && !map.nodes.some((node) => node.id === activeNodeId)) activeNodeId = null;
				const collapsedIds = map ? current.collapsedIds.filter((id) => map.nodes.some((node) => node.id === id)) : [];
				const treeExpandedIds = map ? current.treeExpandedIds.filter((id) => map.nodes.some((node) => node.id === id)) : [];
				if (current.session === session && current.map === map && current.activeNodeId === activeNodeId && collapsedIds.length === current.collapsedIds.length && treeExpandedIds.length === current.treeExpandedIds.length) return current;
				return this.update(sessionId, { session, map, activeNodeId, collapsedIds, treeExpandedIds });
			},
			open(sessionId, activeNodeId) {
				return this.update(sessionId, { open: true, compact: false, ...(activeNodeId ? { activeNodeId } : {}) });
			},
			close(sessionId) {
				return this.update(sessionId, { open: false });
			},
			activate(sessionId, activeNodeId) {
				const current = loadWorkbench(sessionId);
				const facts = current.map ? treeFacts(current.map) : null;
				const ancestors = new Set();
				let cursor = activeNodeId ? facts?.parentOf.get(activeNodeId) : undefined;
				while (cursor && !ancestors.has(cursor)) {
					ancestors.add(cursor);
					cursor = facts.parentOf.get(cursor);
				}
				return this.update(sessionId, { activeNodeId, collapsedIds: current.collapsedIds.filter((id) => !ancestors.has(id)) });
			},
			toggleTree(sessionId, nodeId) {
				const current = loadWorkbench(sessionId);
				const expanded = new Set(current.treeExpandedIds);
				if (expanded.has(nodeId)) expanded.delete(nodeId);
				else expanded.add(nodeId);
				return this.update(sessionId, { treeExpandedIds: [...expanded] });
			},
			setCompact(sessionId, compact) {
				return this.update(sessionId, { compact: compact === true, open: true });
			},
			toggleTreePanel(sessionId) {
				const current = loadWorkbench(sessionId);
				return this.update(sessionId, { treeOpen: !current.treeOpen });
			},
			toggleCollapse(sessionId, nodeId) {
				const current = loadWorkbench(sessionId);
				const collapsed = new Set(current.collapsedIds);
				if (collapsed.has(nodeId)) collapsed.delete(nodeId);
				else collapsed.add(nodeId);
				return this.update(sessionId, { collapsedIds: [...collapsed] });
			},
			focus(sessionId, focusId) {
				return this.update(sessionId, { focusId, ...(focusId ? { open: true, compact: false } : {}) });
			},
			resize(sessionId, width) {
				return this.update(sessionId, { width: Math.max(420, Math.min(680, Math.round(width))) });
			},
			toggleMinimap(sessionId) {
				const current = loadWorkbench(sessionId);
				return this.update(sessionId, { minimapOpen: !current.minimapOpen });
			},
		};
		//#endregion

		//#region dsh-ariadne: prompts
		function continuePrompt(node) {
			return [{ type: "text", text: `回到 Ariadne 地图分支「${node.title}」继续展开。开始时用 brainstorm_map 把该节点标为 exploring；基于当前地图状态深挖这个方向，只记录真实产生的结构变化；结束时写入新增或更新的节点，并把该节点标为 expanded。如果无法完成，恢复该节点原状态 ${node.status ?? "expanded"}，不要让它停留在 exploring。` }];
		}
		function explorePrompt(node) {
			return [{ type: "text", text: `请对 Ariadne 地图分支「${node.title}」做一次小范围自动探索（不需要我参与）：先用 brainstorm_map 把该节点标为 exploring；只探索它的下一层，最多新增 5 个有独立价值的直接子节点，新颖优先，不递归、不执行实现动作、不为凑完整度填满方向；结束后写入结果并把该节点标为 expanded。如果无法完成，恢复该节点原状态 ${node.status ?? "expanded"}，不要让它停留在 exploring。完成后用两三句话汇报。` }];
		}
		function statusPrompt(node, status) {
			return [{ type: "text", text: `请把 Ariadne 地图节点「${node.title}」（id: ${node.id}）的状态改为 ${status}，并调用 brainstorm_map 写入。${status === "parked" ? "顺带用 note 写一句搁置原因。" : ""}` }];
		}
		function selectPrompt(node) {
			return [{ type: "text", text: `请把 Ariadne 地图节点「${node.title}」（id: ${node.id}）加入定案池（selectedIds），并调用 brainstorm_map 写入。` }];
		}
		function organizePrompt() {
			return [{ type: "text", text: "请整理当前 Ariadne 地图：合并真正重复的节点，修正错误 Parent，保留所有独立方向、现有 note、parked 节点和 selectedIds；只保留 parent 树边，不补充新方向，除非修复结构确实需要一个明确中间节点；不要生成执行计划。调用 brainstorm_map 只写变化，最后用两三句话汇报。" }];
		}
		function backfillPrompt() {
			return [{ type: "text", text: "请整理当前会话已经出现的内容并生成初始 Ariadne 地图。只提取真实出现的会话主题、一级方向和纵深关系，优先保留用户原有层级与命名；保留未解决问题、未完成方向和暂缓方向。不要补充对话中没有出现的新创意，不要生成执行计划，不强行重构已有层级。节点只使用 parent 树关系，每个节点最多一个 Parent，depth 由结构派生。能够可靠判断时同时写入 Session Frame 的 goal 与 organizingPrinciple；依据不足时 Frame 留空。完成后调用 brainstorm_map，并简短说明提取了哪些一级方向。" }];
		}
		function createPrompt() {
			return [{ type: "text", text: "请把当前的一个想法展开成初始 Ariadne 地图。先识别希望形成的结果，再选择一个主要拆解口径；首次调用 brainstorm_map 时同时写入 topic 和 frame（goal、organizingPrinciple）。生成 4–7 个暂定一级方向，只生成一层，不递归展开，不生成执行计划。一级标题使用问题式或可判断式表达，并确保同一层回答同一类问题。只有目标存在实质歧义时提出一个必要澄清问题。" }];
		}
		function organizeNodePrompt(map, node) {
			return [{
				type: "text",
				text: `请只整理 Ariadne 节点「${node.title}」（id: ${node.id}）已经出现的记录。把现有信息写成三个精确 Markdown 区块：## 当前理解、## 待解决、## 下一步。不要产生新的独立方向，不修改 Parent、状态、标题或定案池。完成后只调用 brainstorm_map 更新该节点 note。\n\nSession Goal：${map.frame?.goal || "未设置"}\n当前记录：\n${node.note || "（空）"}`,
			}];
		}

		function personalNotePrompt(map, node, userNote) {
			const text = String(userNote ?? "");
			if (!text.trim()) throw new Error("a non-empty personal note is required");
			return [{
				type: "text",
				text: `BRAINSTORM_PERSONAL_NOTE node=${node.id}\n用户主动把下面这则个人笔记带入本轮。结合当前对话帮助用户澄清或推进其中的想法，保留原文，不自动改写个人笔记。只有用户明确要求记录结构变化时才调用 brainstorm_map。\n\nSession Goal：${map.frame?.goal || "未设置"}\n节点：${node.title}\n\n个人笔记：\n${text}`,
			}];
		}
		function evaluationPrompt(map, scopeLabel, nodes) {
			const childCounts = new Map(map.nodes.map((node) => [node.id, 0]));
			for (const link of map.links ?? []) if (link.kind === "parent") childCounts.set(link.from, (childCounts.get(link.from) ?? 0) + 1);
			const candidates = nodes.map((node) => `- ${node.id}｜${node.title}｜状态 ${node.status}｜下级 ${(childCounts.get(node.id) ?? 0)}${node.note ? `｜${node.note}` : ""}`).join("\n");
			const selected = (map.selectedIds ?? []).map((id) => map.nodes.find((node) => node.id === id)?.title ?? id).join("、") || "无";
			return [{
				type: "text",
				text: `请对当前 Ariadne 的「${scopeLabel}」进行评估取舍。围绕 Session Goal 判断，区分结构重复、目标相关性和验证不足；不要把信息不足等同于价值低。只在正常会话消息输出建议，不调用 brainstorm_map 或 brainstorm_plan，不修改节点、状态和定案池。\n\nSession Goal：${map.frame?.goal || "未设置"}\n组织口径：${map.frame?.organizingPrinciple || "未设置"}\n当前定案池：${selected}\n候选：\n${candidates}\n\n严格按以下五段输出：\n建议保留\n- 方向：理由\n\n建议合并\n- 方向 A + 方向 B：重合点\n\n建议暂缓\n- 方向：理由\n\n仍需验证\n- 方向：缺少的信息\n\n推荐下一步\n- 具体动作`,
			}];
		}
		function projectPrompt() {
			return [{ type: "text", text: "请生成（或刷新）本工作区的项目总图：调用 brainstorm_project 扫描所有会话地图并写入快照。" }];
		}
		function planPrompt(map, regenerate = false) {
			const selected = (map.selectedIds ?? [])
				.map((id) => map.nodes.find((node) => node.id === id))
				.filter(Boolean)
				.map((node) => `- ${node.id}｜${node.title}｜状态 ${node.status}${node.note ? `｜${node.note}` : ""}`)
				.join("\n");
			return [{
				type: "text",
				text: `${regenerate ? "请重新生成" : "请生成"}当前 Ariadne 的 Agent 可执行图。只使用下面定案池中的来源节点，按真实依赖组织有序控制流，不要根据 depth 猜顺序。每个 Task 写清 instruction、expectedOutputs、completionCriteria 和 sourceNodeIds。只有路径确实改变时创建 Decision，使用至少两条唯一 routeKey 的 route 边；只有需要用户批准时创建 Checkpoint。图必须无环、无并行、无多 Agent、全部节点从 startNodeId 可达，建议 5–20 个节点、最多 30 个。不把搜索、读取文件或单次工具调用拆为节点。每个选中节点必须被图引用；未纳入图的来源在 uncovered 中写出 sourceNodeIds 和 reason。对信息不足的来源明确安排验证或说明缺口。完成后一次性调用 brainstorm_plan，参数为 graph（startNodeId/nodes/edges）和 uncovered。不要写统一占位文本，不自动开始执行。\n\nSession Topic：${map.topic}\n目标：${map.frame?.goal || "未设置"}\n组织口径：${map.frame?.organizingPrinciple || "未设置"}\n定案池：\n${selected}`,
			}];
		}
		function executionNodePrompt(map, run, node, project) {
			if (!run || run.currentNodeId !== node?.id || run.nodeStates?.[node.id]?.status !== "running" || node.kind === "checkpoint") throw new Error("execution prompt requires the current running Task or Decision");
			const byId = new Map(map.nodes.map((item) => [item.id, item]));
			const path = executionDisplayPath(map.finalPlan.graph, run);
			const context = {
				projectGoal: project?.goal,
				frame: map.frame,
				topic: map.topic,
				runId: run.id,
				node: { id: node.id, kind: node.kind, title: node.title, instruction: node.instruction, requiredInputs: node.requiredInputs ?? [], expectedOutputs: node.expectedOutputs ?? [], completionCriteria: node.completionCriteria },
				sources: node.sourceNodeIds.map((id) => byId.get(id)).filter(Boolean).map((source) => ({ id: source.id, title: source.title, note: source.note })),
				previousResults: path.filter((id) => id !== node.id && ["completed", "failed"].includes(run.nodeStates[id]?.status)).map((id) => ({ nodeId: id, summary: run.nodeStates[id].summary, outputRefs: run.nodeStates[id].outputRefs ?? [] })),
				allowedRoutes: map.finalPlan.graph.edges.filter((edge) => edge.from === node.id && edge.condition === "route").map((edge) => ({ routeKey: edge.routeKey, label: edge.label })),
			};
			return [{ type: "text", text: `BRAINSTORM_EXECUTION run=${run.id} node=${node.id}\n你正在执行用户已确认的 Ariadne Execution Graph。只执行下面的当前节点；你负责节点内部分析、工具选择和产出。不得提前执行其他节点、改写图或定案池、批准 Checkpoint，也不得通过 brainstorm_map 返回探索。形成可检查产物后调用 brainstorm_execution_complete，精确传入 runId、nodeId、outcome（completed/failed/blocked）、非空 summary，按需提供紧凑 outputRefs/evidence。Decision 完成必须传允许列表中的精确 routeKey；Task 不传 routeKey。无法完成时诚实报告 failed 或 blocked。工具成功后本回合结束，下一节点由用户触发。\n\n${JSON.stringify(context, null, 2)}` }];
		}
		//#endregion

		async function queuePrompt(session, prompt) {
			const result = await session.prompt(prompt, "queue");
			if (!result?.ok) throw new Error(result?.error?.message ?? "Agent prompt was not accepted");
			return result.value;
		}

		async function directOp(session, ops) {
			const response = await fetch("/brainstorm-op", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ sessionId: session.sessionId, ops }),
			});
			const result = await response.json();
			if (!result?.ok) throw new Error(result?.error?.message ?? `direct op failed (${response.status})`);
			return result;
		}
		async function projectApi(session, action, payload = {}) {
			const response = await fetch("/brainstorm-project", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ sessionId: session.sessionId, action, ...payload }),
			});
			const result = await response.json();
			if (!result?.ok) throw new Error(result?.error?.message ?? `project request failed (${response.status})`);
			return result;
		}

		//#region dsh-ariadne: styles
		const STYLE_CSS = [
			".bs-root { position: relative; overflow: hidden; flex: 1; min-height: 320px; border-radius: 12px; border: 1px solid var(--dsw-alias-border-l2, #e5e7eb); background-color: var(--bs-surface, var(--dsw-alias-bg-layer-2, #fff)); background-image: radial-gradient(circle, color-mix(in srgb, var(--dsw-alias-label-secondary, #667085) 18%, transparent) 1px, transparent 1px); background-size: 20px 20px; touch-action: none; }",
			".bs-stage { position: absolute; left: 0; top: 0; transform-origin: 0 0; }",
			".bs-node { position: absolute; display: flex; flex-direction: column; align-items: stretch; justify-content: center; gap: 5px; box-sizing: border-box; border-radius: 10px; padding: 11px 13px; text-align: left; font-size: 13px; line-height: 1.3; cursor: grab; user-select: none; box-shadow: 0 1px 3px rgba(34,49,76,.10); transition: box-shadow .15s ease, opacity .16s ease, border-color .15s ease, background-color .15s ease; animation: bs-pop .14s ease both; }",
			".bs-node:hover { box-shadow: 0 6px 18px rgba(34,49,76,.14); }",
			".bs-node.bs-question { font-weight: 700; }",
			".bs-node.bs-key { box-shadow: 0 2px 8px rgba(52,77,117,.11); }",
			".bs-node.bs-active { outline: 3px solid rgba(42,103,219,.18); border-color: var(--bs-active, #2a67db) !important; box-shadow: 0 6px 18px rgba(42,103,219,.13); }",
			".bs-node.bs-path:not(.bs-active) { border-color: rgba(42,103,219,.52) !important; box-shadow: 0 4px 14px rgba(42,103,219,.10); }",
			".bs-node[data-status='exploring'] .bs-node-dot { animation: bs-exploring 1.5s ease-in-out infinite; }",
			".bs-node-title { padding-right: 14px; font-weight: 650; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; max-width: 100%; }",
			".bs-node.bs-question .bs-node-title { font-weight: 700; }",
			".bs-node-meta { display: flex; align-items: center; gap: 7px; min-width: 0; font-size: 10px; color: var(--dsw-alias-label-secondary, #667085); }",
			".bs-node-dot { width: 6px; height: 6px; border-radius: 50%; flex: 0 0 auto; }",
			".bs-candidate { margin-left: auto; color: var(--bs-active, var(--dsw-alias-state-business-primary, #4f6bff)); font-weight: 750; }",
			".bs-collapse { position: absolute; right: 7px; top: 7px; width: 18px; height: 18px; padding: 0; border: 1px solid var(--dsw-alias-border-l2, #d9dfeb); border-radius: 5px; background: var(--bs-surface, var(--dsw-alias-bg-layer-2, #fff)); color: var(--dsw-alias-label-secondary, #667085); font-size: 11px; line-height: 16px; cursor: pointer; opacity: 0; pointer-events: none; transition: opacity .14s ease; }",
			".bs-collapse:hover { color: var(--bs-active); border-color: var(--bs-active); }",
			".bs-resize { position: absolute; right: 3px; bottom: 3px; width: 12px; height: 12px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; opacity: 0; pointer-events: none; cursor: nwse-resize; border-radius: 2px; transition: opacity .14s ease; }",
			".bs-resize:hover { opacity: .8; }",
			".bs-node:hover .bs-collapse, .bs-node:hover .bs-resize, .bs-node.bs-active .bs-collapse, .bs-node.bs-active .bs-resize, .bs-node:focus-within .bs-collapse, .bs-node:focus-within .bs-resize { opacity: .7; pointer-events: auto; }",
			".bs-topic { align-items: center; text-align: center; font-size: 16px; font-weight: 750; padding: 18px 24px; border-radius: 12px; }",
			".bs-edge { stroke: color-mix(in srgb, var(--dsw-alias-label-secondary, #667085) 42%, transparent); stroke-width: 1.45; fill: none; stroke-linejoin: round; stroke-linecap: round; transition: stroke .16s ease, opacity .16s ease, stroke-width .16s ease; }",
			".bs-edge.bs-path { stroke: var(--bs-active); stroke-width: 2.5; opacity: 1; }",
			".bs-edge.bs-secondary { stroke: color-mix(in srgb, var(--bs-active) 62%, #c8d0de); stroke-width: 1.9; }",
			".bs-edge.bs-exec { stroke: var(--bs-active); stroke-width: 2; }",
			".bs-group { stroke-width: 1; }",
			".bs-node.bs-dim { opacity: .16; }",
			".bs-edge.bs-dim { opacity: .1; }",
			".bs-group.bs-dim { opacity: .12; }",
			".bs-note { font-size: 11.5px; line-height: 1.35; color: var(--dsw-alias-label-secondary, #667085); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }",
			".bs-group-label { font-weight: 700; letter-spacing: -.01em; }",
			".bs-minimap { position: absolute; left: 14px; bottom: 14px; z-index: 24; width: 140px; height: 95px; padding: 5px; border: 1px solid var(--dsw-alias-border-l2, #dfe5ef); border-radius: 9px; background: color-mix(in srgb, var(--bs-surface) 92%, transparent); box-shadow: 0 6px 18px rgba(0,0,0,.12); cursor: crosshair; backdrop-filter: blur(8px); opacity: .65; transition: opacity .15s ease; }",
			".bs-minimap:hover { opacity: 1; }",
			".bs-minimap[data-focused='true'] { opacity: .38; }",
			".bs-minimap-toggle { position: absolute; left: 14px; bottom: 14px; z-index: 24; width: 28px; height: 28px; border: 1px solid var(--dsw-alias-border-l2, #dfe5ef); border-radius: 8px; background: var(--bs-surface); color: var(--bs-muted); cursor: pointer; }",
			".bs-minimap-close { position: absolute; right: 3px; top: 3px; z-index: 1; width: 18px; height: 18px; border: 0; border-radius: 5px; background: color-mix(in srgb, var(--bs-surface) 85%, transparent); color: var(--bs-muted); cursor: pointer; }",
			".bs-minimap svg { display: block; width: 100%; height: 100%; }",
			".bs-minimap-node { fill: color-mix(in srgb, var(--dsw-alias-label-secondary, #667085) 48%, transparent); }",
			".bs-minimap-node.bs-active { fill: var(--bs-active); }",
			".bs-minimap-viewport { fill: color-mix(in srgb, var(--bs-active) 8%, transparent); stroke: var(--bs-active); stroke-width: 1.5; }",
			".bs-zoom-readout { position: absolute; left: 14px; top: 12px; z-index: 24; padding: 4px 7px; border-radius: 6px; background: color-mix(in srgb, var(--bs-surface) 90%, transparent); color: var(--dsw-alias-label-secondary, #667085); font-size: 10px; font-variant-numeric: tabular-nums; pointer-events: none; }",
			".bs-focus-exit { position: absolute; right: 14px; top: 10px; z-index: 30; padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; border: 1px solid var(--bs-active); color: var(--bs-active); background: var(--bs-surface); cursor: pointer; animation: bs-pop .2s ease both; }",
			".bs-chain-hint { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 14px 20px; border-radius: 12px; border: 1px dashed var(--dsw-alias-border-l2, #d0d5dd); color: var(--dsw-alias-label-secondary, #667085); font-size: 13px; background: var(--bs-surface, transparent); }",
			".bs-fade { animation: bs-fade .16s ease both; }",
			".bs-switch { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--dsw-alias-border-l2, #d0d5dd); background: transparent; color: var(--dsw-alias-label-primary, #1e232c); transition: background-color .18s ease, color .18s ease, border-color .18s ease, box-shadow .18s ease, transform .12s ease; }",
			".bs-switch:hover { border-color: var(--dsw-alias-brand-primary, #4d6bfe); color: var(--dsw-alias-brand-primary, #4d6bfe); }",
			".bs-switch:active { transform: scale(.96); }",
			".bs-switch[data-on='true'] { background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4d6bfe) 9%, transparent); border-color: color-mix(in srgb, var(--dsw-alias-brand-primary, #4d6bfe) 34%, var(--dsw-alias-border-l2, #d0d5dd)); color: var(--dsw-alias-brand-primary, #4d6bfe); }",
			".bs-switch[data-busy='true'] { opacity: .7; pointer-events: none; }",
			".bs-switch-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .45; transition: opacity .18s ease, transform .18s ease; }",
			".bs-switch[data-on='true'] .bs-switch-dot { opacity: 1; transform: scale(1.15); }",
			".bs-tool { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; border: 1px solid var(--dsw-alias-border-l2, #d0d5dd); background: transparent; color: var(--dsw-alias-label-primary, #1e232c); transition: background-color .15s ease, color .15s ease, border-color .15s ease, transform .12s ease; }",
			".bs-tool:hover { border-color: var(--dsw-alias-brand-primary, #4d6bfe); color: var(--dsw-alias-brand-primary, #4d6bfe); }",
			".bs-tool:active { transform: scale(.97); }",
			".bs-tool[data-kind='primary'] { border-color: var(--bs-active); background: var(--bs-active); color: #fff; }",
			".bs-tool[data-kind='icon'] { width: 30px; justify-content: center; padding-inline: 0; font-size: 15px; }",
			".bs-seg { display: inline-flex; border: 1px solid var(--dsw-alias-border-l2, #d0d5dd); border-radius: 10px; overflow: hidden; }",
			".bs-seg button { border: none; background: transparent; padding: 5px 12px; font-size: 12px; cursor: pointer; color: var(--dsw-alias-label-secondary, #667085); transition: background-color .18s ease, color .18s ease; }",
			".bs-seg button[data-active='true'] { background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4d6bfe) 10%, transparent); color: var(--dsw-alias-brand-primary, #4d6bfe); font-weight: 650; }",
			".bs-workbench { --bs-active: var(--dsw-alias-state-business-primary, #4176e6); --bs-border: var(--dsw-alias-border-l2, #dfe5ef); --bs-muted: var(--dsw-alias-label-secondary, #667085); --bs-surface: var(--dsw-alias-bg-layer-2, #fff); container-type: inline-size; position: relative; display: flex; flex-direction: column; height: 100%; min-width: 0; overflow: hidden; color: var(--dsw-alias-label-primary, #1e232c); background: var(--dsw-alias-bg-layer-1, #f7f8fb); }",
			".bs-workbench-header { min-height: 48px; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 12px; padding: 8px 14px; border-bottom: 1px solid var(--bs-border); background: var(--bs-surface); }",
			".bs-header-left, .bs-header-center, .bs-header-right { min-width: 0; display: flex; align-items: center; gap: 8px; white-space: nowrap; }",
			".bs-header-center { justify-content: center; }",
			".bs-header-right { justify-content: flex-end; }",
			".bs-workbench-topic { min-width: 140px; max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; letter-spacing: -.01em; }",
			".bs-workbench-count { color: var(--bs-muted); font-size: 11px; padding: 2px 7px; border: 1px solid var(--bs-border); border-radius: 999px; }",
			".bs-frame-bar { min-height: 34px; display: flex; align-items: center; gap: 14px; padding: 5px 14px; border-bottom: 1px solid var(--bs-border); background: color-mix(in srgb, var(--bs-surface) 97%, var(--bs-active)); color: var(--bs-muted); font-size: 11px; }",
			".bs-frame-item { min-width: 0; display: flex; align-items: baseline; gap: 5px; }",
			".bs-frame-item strong { flex: 0 0 auto; color: var(--bs-active); font-size: 10px; }",
			".bs-frame-item span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
			".bs-frame-empty { border: 0; background: transparent; color: var(--bs-active); font-size: 11px; cursor: pointer; }",
			".bs-frame-edit { flex: 1; display: grid; grid-template-columns: 1fr 1fr auto; align-items: center; gap: 8px; }",
			".bs-frame-edit input { min-width: 0; border: 1px solid var(--bs-border); border-radius: 7px; padding: 5px 8px; background: var(--bs-surface); color: inherit; font: inherit; }",
			".bs-workbench-body { position: relative; display: flex; flex: 1; min-height: 0; min-width: 0; }",
			".bs-workbench-primary { display: flex; flex: 1; min-width: 0; min-height: 0; padding: 10px; }",
			".bs-workbench-primary > .bs-root { border-radius: 10px; min-width: 0; }",
			".bs-empty-map { box-sizing: border-box; width: min(620px, calc(100% - 48px)); margin: auto; padding: 28px; border: 1px solid var(--bs-border, var(--dsw-alias-border-l2, #dfe5ef)); border-radius: 14px; background: var(--bs-surface, var(--dsw-alias-bg-layer-2, #fff)); box-shadow: 0 12px 34px rgba(0,0,0,.12); }",
			".bs-empty-map h3 { margin: 0 0 8px; font-size: 19px; letter-spacing: -.02em; }",
			".bs-empty-map p { margin: 0 0 20px; color: var(--dsw-alias-label-secondary, #667085); font-size: 13px; line-height: 1.55; }",
			".bs-backfill-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }",
			".bs-backfill-card { position: relative; min-height: 84px; border: 1px solid var(--dsw-alias-border-l2, #dfe5ef); border-radius: 10px; padding: 14px; background: transparent; color: var(--dsw-alias-label-primary, #1e232c); text-align: left; font-size: 13px; cursor: pointer; }",
			".bs-backfill-card:hover { border-color: var(--dsw-alias-brand-primary, #4f6bff); background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4f6bff) 5%, transparent); }",
			".bs-backfill-card[data-primary='true'] { border-color: color-mix(in srgb, var(--dsw-alias-brand-primary, #4f6bff) 48%, var(--dsw-alias-border-l2, #dfe5ef)); }",
			".bs-backfill-badge { display: inline-flex; margin-bottom: 7px; padding: 2px 6px; border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4f6bff) 11%, transparent); color: var(--dsw-alias-brand-primary, #4f6bff); font-size: 9px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }",
			".bs-backfill-progress { display: flex; align-items: center; gap: 9px; margin-top: 16px; color: var(--dsw-alias-label-secondary, #667085); font-size: 12px; }",
			".bs-backfill-spinner { width: 12px; height: 12px; border: 2px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #4f6bff) 20%, transparent); border-top-color: var(--dsw-alias-brand-primary, #4f6bff); border-radius: 50%; animation: bs-spin .8s linear infinite; }",
			".bs-execution { display: flex; flex: 1; min-width: 0; height: 100%; overflow: auto; background: var(--bs-surface); border: 1px solid var(--bs-border); border-radius: 10px; }",
			".bs-plan-shell { width: min(860px, calc(100% - 48px)); margin: 0 auto; padding: 30px 0 56px; }",
			".bs-plan-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 18px; align-items: end; padding-bottom: 22px; border-bottom: 1px solid var(--bs-border); }",
			".bs-plan-kicker { margin-bottom: 7px; color: var(--bs-active); font-size: 10px; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }",
			".bs-plan-head h2 { margin: 0; font-size: 24px; line-height: 1.15; letter-spacing: -.035em; }",
			".bs-plan-head p { margin: 8px 0 0; color: var(--bs-muted); font-size: 12px; line-height: 1.55; }",
			".bs-plan-progress { text-align: right; min-width: 126px; }",
			".bs-plan-progress strong { display: block; color: var(--bs-active); font-size: 25px; font-variant-numeric: tabular-nums; letter-spacing: -.04em; }",
			".bs-plan-progress span { color: var(--bs-muted); font-size: 10px; letter-spacing: .06em; text-transform: uppercase; }",
			".bs-plan-actions { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 14px; }",
			".bs-plan-list { position: relative; margin-top: 26px; }",
			".bs-plan-list::before { content: ''; position: absolute; left: 20px; top: 22px; bottom: 22px; width: 2px; background: color-mix(in srgb, var(--bs-active) 24%, var(--bs-border)); }",
			".bs-plan-item { position: relative; display: grid; grid-template-columns: 42px minmax(0, 1fr); gap: 16px; padding: 0 0 22px; }",
			".bs-plan-index { position: relative; z-index: 1; display: grid; place-items: center; width: 42px; height: 42px; border: 2px solid var(--bs-active); border-radius: 8px; background: var(--bs-surface); color: var(--bs-active); font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums; }",
			".bs-plan-item[data-done='true'] .bs-plan-index { background: var(--bs-active); color: #fff; }",
			".bs-plan-card { padding: 15px 17px; border: 1px solid var(--bs-border); border-radius: 10px; background: color-mix(in srgb, var(--bs-surface) 96%, var(--bs-active)); box-shadow: 0 4px 14px rgba(0,0,0,.09); }",
			".bs-plan-item[data-done='true'] .bs-plan-card { opacity: .68; }",
			".bs-plan-title-row { display: flex; align-items: flex-start; gap: 10px; }",
			".bs-plan-check { margin-top: 2px; accent-color: var(--bs-active); }",
			".bs-plan-title { flex: 1; margin: 0; font-size: 15px; line-height: 1.4; }",
			".bs-plan-next { margin: 12px 0 0 24px; padding-left: 12px; border-left: 3px solid var(--bs-active); color: var(--dsw-alias-label-primary, #1f2937); font-size: 13px; line-height: 1.55; }",
			".bs-plan-next span { display: block; margin-bottom: 3px; color: var(--bs-muted); font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }",
			".bs-plan-note { margin: 9px 0 0 24px; color: var(--bs-muted); font-size: 11px; line-height: 1.55; }",
			".bs-plan-sources { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin: 12px 0 0 24px; }",
			".bs-plan-source { border: 1px solid var(--bs-border); border-radius: 999px; padding: 3px 8px; background: transparent; color: var(--bs-active); font-size: 10px; cursor: pointer; }",
			".bs-plan-source:hover { background: color-mix(in srgb, var(--bs-active) 7%, transparent); }",
			".bs-plan-edit { display: grid; gap: 8px; }",
			".bs-plan-edit input, .bs-plan-edit textarea { box-sizing: border-box; width: 100%; border: 1px solid var(--bs-border); border-radius: 7px; padding: 8px 10px; background: transparent; color: inherit; font: inherit; }",
			".bs-plan-edit textarea { min-height: 76px; resize: vertical; }",
			".bs-plan-gaps { margin-top: 14px; padding: 18px; border: 1px solid var(--bs-border); border-radius: 10px; background: color-mix(in srgb, #f4a261 5%, transparent); }",
			".bs-plan-gaps h3 { margin: 0 0 10px; font-size: 13px; }",
			".bs-plan-gap { padding: 8px 0; border-top: 1px solid color-mix(in srgb, var(--bs-border) 72%, transparent); font-size: 12px; line-height: 1.5; }",
			".bs-plan-gap:first-of-type { border-top: 0; }",
			".bs-plan-gap span { display: block; color: var(--bs-muted); font-size: 11px; }",
			".bs-plan-prepare { width: min(620px, calc(100% - 48px)); margin: auto; padding: 30px; border: 1px solid var(--bs-border); border-radius: 12px; background: var(--bs-surface); }",
			".bs-plan-prepare.bs-selection-workspace { box-sizing: border-box; width: min(1060px, calc(100% - 34px)); padding: 22px; }",
			".bs-plan-prepare h2 { margin: 0 0 8px; font-size: 20px; letter-spacing: -.025em; }",
			".bs-plan-prepare > p { margin: 0 0 18px; color: var(--bs-muted); font-size: 12px; line-height: 1.55; }",
			".bs-plan-pool { display: grid; gap: 7px; margin-bottom: 18px; }",
			".bs-plan-pool-item { display: flex; align-items: center; gap: 8px; padding: 9px 11px; border: 1px solid var(--bs-border); border-radius: 8px; font-size: 12px; }",
			".bs-plan-pool-item span:last-child { margin-left: auto; color: #a56b14; font-size: 10px; }",
			".bs-prep-toolbar { display: grid; grid-template-columns: minmax(180px, 1fr) minmax(150px, auto); gap: 8px; margin-bottom: 12px; }",
			".bs-prep-toolbar input, .bs-prep-toolbar select { min-width: 0; height: 34px; box-sizing: border-box; border: 1px solid var(--bs-border); border-radius: 8px; padding: 0 9px; background: var(--bs-surface); color: inherit; font: inherit; font-size: 11px; }",
			".bs-prep-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(260px, .65fr); gap: 16px; min-height: 340px; }",
			".bs-prep-column { min-width: 0; border: 1px solid var(--bs-border); border-radius: 10px; padding: 13px; background: color-mix(in srgb, var(--bs-surface) 97%, var(--bs-active)); }",
			".bs-prep-column-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }",
			".bs-prep-column-head strong { flex: 1; font-size: 12px; }",
			".bs-prep-count { color: var(--bs-muted); font-size: 10px; font-variant-numeric: tabular-nums; }",
			".bs-prep-scroll { max-height: min(52vh, 520px); overflow: auto; }",
			".bs-prep-group + .bs-prep-group { margin-top: 13px; padding-top: 11px; border-top: 1px solid var(--bs-border); }",
			".bs-prep-group-title { margin: 0 0 6px; color: var(--bs-active); font-size: 10px; font-weight: 750; }",
			".bs-prep-item { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 8px; align-items: start; padding: 8px 6px; border-radius: 8px; }",
			".bs-prep-item:hover { background: color-mix(in srgb, var(--bs-active) 6%, transparent); }",
			".bs-prep-item input { margin-top: 3px; accent-color: var(--bs-active); }",
			".bs-prep-title { display: block; border: 0; padding: 0; background: transparent; color: inherit; text-align: left; font: inherit; font-size: 11.5px; font-weight: 650; cursor: pointer; }",
			".bs-prep-summary { display: block; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--bs-muted); font-size: 9.5px; }",
			".bs-prep-meta { color: var(--bs-muted); font-size: 9px; white-space: nowrap; }",
			".bs-prep-remove { border: 0; background: transparent; color: var(--bs-muted); cursor: pointer; }",
			".bs-prep-footer { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--bs-border); }",
			".bs-project-chip-wrap { position: relative; }",
			".bs-project-chip { display: inline-flex; align-items: center; gap: 6px; max-width: 220px; border: 1px solid color-mix(in srgb, var(--bs-active) 28%, var(--bs-border)); border-radius: 999px; padding: 5px 9px; background: color-mix(in srgb, var(--bs-active) 6%, transparent); color: var(--bs-active); font-size: 10px; cursor: pointer; }",
			".bs-project-chip strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
			".bs-export-wrap { position: relative; }",
			".bs-export-popover { position: absolute; z-index: 40; top: calc(100% + 8px); right: 0; width: 230px; padding: 12px; border: 1px solid var(--bs-border); border-radius: 10px; background: var(--bs-surface); box-shadow: 0 14px 36px rgba(31,45,70,.18); }",
			".bs-export-actions { display: grid; gap: 6px; }",
			".bs-export-actions .bs-tool { justify-content: flex-start; width: 100%; }",
			".bs-export-result { margin-top: 9px; padding-top: 9px; border-top: 1px solid var(--bs-border); color: var(--bs-muted); font-size: 9px; line-height: 1.5; overflow-wrap: anywhere; }",
			".bs-project-popover { position: absolute; z-index: 40; top: calc(100% + 8px); left: 0; width: 320px; padding: 14px; border: 1px solid var(--bs-border); border-radius: 10px; background: var(--bs-surface); box-shadow: 0 14px 36px rgba(31,45,70,.18); }",
			".bs-project-popover label { display: grid; gap: 5px; margin-bottom: 10px; color: var(--bs-muted); font-size: 10px; font-weight: 650; letter-spacing: .05em; text-transform: uppercase; }",
			".bs-project-popover input, .bs-project-popover textarea { box-sizing: border-box; width: 100%; border: 1px solid var(--bs-border); border-radius: 7px; padding: 8px 9px; background: transparent; color: inherit; font: inherit; text-transform: none; letter-spacing: normal; }",
			".bs-project-popover textarea { min-height: 72px; resize: vertical; }",
			".bs-project-switch-list { display: grid; gap: 5px; margin-top: 11px; padding-top: 11px; border-top: 1px solid var(--bs-border); }",
			".bs-project-switch { display: flex; align-items: center; gap: 7px; border: 0; border-radius: 7px; padding: 7px 8px; background: transparent; color: inherit; text-align: left; font-size: 11px; cursor: pointer; }",
			".bs-project-switch:hover { background: color-mix(in srgb, var(--bs-active) 6%, transparent); }",
			".bs-project-overview { flex: 1; height: 100%; overflow: auto; border: 1px solid var(--bs-border); border-radius: 10px; background: var(--bs-surface); }",
			".bs-project-shell { width: min(1040px, calc(100% - 42px)); margin: 0 auto; padding: 26px 0 52px; }",
			".bs-project-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 18px; align-items: end; padding-bottom: 20px; border-bottom: 1px solid var(--bs-border); }",
			".bs-project-head h2 { margin: 0; font-size: 22px; letter-spacing: -.035em; }",
			".bs-project-goal { max-width: 680px; margin: 7px 0 0; color: var(--bs-muted); font-size: 12px; line-height: 1.55; }",
			".bs-project-index { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 16px; }",
			".bs-project-stat { min-width: 70px; }",
			".bs-project-stat strong { display: block; font-size: 18px; font-variant-numeric: tabular-nums; }",
			".bs-project-stat span { color: var(--bs-muted); font-size: 9px; letter-spacing: .06em; text-transform: uppercase; }",
			".bs-project-sessions { display: grid; gap: 12px; margin-top: 20px; }",
			".bs-project-session { display: grid; grid-template-columns: 7px minmax(0, 1fr); overflow: hidden; border: 1px solid var(--bs-border); border-radius: 10px; background: color-mix(in srgb, var(--bs-surface) 97%, var(--bs-active)); }",
			".bs-project-session-rail { background: linear-gradient(180deg, var(--bs-active), color-mix(in srgb, var(--bs-active) 28%, transparent)); }",
			".bs-project-session-body { padding: 15px 17px; }",
			".bs-project-session-head { display: flex; align-items: flex-start; gap: 10px; }",
			".bs-project-session-title { flex: 1; min-width: 0; }",
			".bs-project-session-title h3 { margin: 0; font-size: 14px; }",
			".bs-project-session-title p { margin: 4px 0 0; color: var(--bs-muted); font-size: 11px; }",
			".bs-project-session-stats { display: flex; flex-wrap: wrap; gap: 6px 12px; margin-top: 11px; color: var(--bs-muted); font-size: 10px; }",
			".bs-project-roots { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 7px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--bs-border); }",
			".bs-project-root { border: 1px solid var(--bs-border); border-radius: 8px; padding: 9px 10px; background: transparent; color: inherit; text-align: left; cursor: pointer; }",
			".bs-project-root strong { display: block; font-size: 11px; }",
			".bs-project-root span { display: block; margin-top: 4px; color: var(--bs-muted); font-size: 9px; line-height: 1.4; }",
			".bs-project-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }",
			".bs-project-related { margin-top: 18px; padding: 15px; border: 1px dashed color-mix(in srgb, var(--bs-active) 34%, var(--bs-border)); border-radius: 10px; }",
			".bs-project-related h3 { margin: 0; font-size: 13px; }",
			".bs-project-related p { margin: 5px 0 10px; color: var(--bs-muted); font-size: 11px; }",
			".bs-focus-dock { position: relative; flex: 0 0 auto; height: 100%; min-width: 420px; max-width: 680px; border-left: 1px solid var(--bs-border); background: var(--bs-surface); box-shadow: -8px 0 26px rgba(33,52,82,.06); display: flex; flex-direction: column; z-index: 18; transition: width .18s ease, min-width .18s ease, max-width .18s ease; }",
			".bs-focus-dock.bs-compact { width: 46px !important; min-width: 46px; max-width: 46px; align-items: center; padding-top: 10px; }",
			".bs-focus-compact-open { writing-mode: vertical-rl; display: flex; align-items: center; gap: 8px; border: 0; background: transparent; color: var(--bs-active); padding: 10px 8px; border-radius: 8px; font-size: 11px; font-weight: 650; letter-spacing: .04em; cursor: pointer; }",
			".bs-focus-compact-open:hover { background: color-mix(in srgb, var(--bs-active) 9%, transparent); }",
			".bs-focus-resize { position: absolute; left: -4px; top: 0; bottom: 0; width: 8px; cursor: ew-resize; z-index: 3; }",
			".bs-focus-resize:hover::after { content: ''; position: absolute; left: 3px; top: 0; bottom: 0; width: 2px; background: var(--bs-active); }",
			".bs-focus-header { height: 43px; flex: 0 0 43px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border-bottom: 1px solid var(--bs-border); }",
			".bs-focus-header strong { font-size: 12px; letter-spacing: .03em; text-transform: uppercase; }",
			".bs-focus-close { margin-left: auto; border: 0; background: transparent; color: var(--bs-muted); width: 28px; height: 28px; border-radius: 7px; cursor: pointer; }",
			".bs-focus-close:hover { color: var(--bs-active); background: color-mix(in srgb, var(--bs-active) 9%, transparent); }",
			".bs-focus-body { display: grid; grid-template-columns: minmax(240px, 1fr); flex: 1; min-height: 0; animation: bs-content-in .12s ease .06s both; }",
			".bs-focus-body[data-tree-open='true'] { grid-template-columns: 168px minmax(240px, 1fr); }",
			".bs-focus-structure-toggle { flex: 0 0 auto; height: 27px; border: 1px solid var(--bs-border); border-radius: 7px; padding: 0 8px; background: transparent; color: var(--bs-muted); font-size: 10px; cursor: pointer; }",
			".bs-focus-structure-toggle[data-open='true'] { color: var(--bs-active); border-color: color-mix(in srgb, var(--bs-active) 35%, var(--bs-border)); background: color-mix(in srgb, var(--bs-active) 7%, transparent); }",
			".bs-focus-tree { overflow: auto; border-right: 1px solid var(--bs-border); padding: 10px 8px 18px; background: color-mix(in srgb, var(--bs-surface) 97%, #eaf2ff); }",
			".bs-tree-search { position: sticky; top: -10px; z-index: 2; margin: -2px 0 9px; padding: 2px 0 7px; background: color-mix(in srgb, var(--bs-surface) 97%, #eaf2ff); }",
			".bs-tree-search input { box-sizing: border-box; width: 100%; height: 30px; border: 1px solid var(--bs-border); border-radius: 7px; padding: 0 9px; outline: none; background: var(--bs-surface); color: var(--dsw-alias-label-primary, #1e232c); font-size: 11px; }",
			".bs-tree-search input:focus { border-color: var(--bs-active); box-shadow: 0 0 0 2px color-mix(in srgb, var(--bs-active) 12%, transparent); }",
			".bs-dock-eyebrow { color: var(--bs-muted); font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; margin: 2px 7px 8px; }",
			".bs-tree-item { display: flex; align-items: center; min-width: 0; }",
			".bs-tree-toggle { flex: 0 0 18px; width: 18px; height: 25px; padding: 0; border: 0; background: transparent; color: var(--bs-muted); font-size: 10px; cursor: pointer; }",
			".bs-tree-toggle[data-empty='true'] { visibility: hidden; }",
			".bs-tree-row { position: relative; min-width: 0; flex: 1; display: flex; align-items: center; gap: 6px; min-height: 29px; padding: 4px 6px; border: 0; border-radius: 7px; background: transparent; color: var(--dsw-alias-label-primary, #1e232c); font-size: 11px; text-align: left; cursor: pointer; }",
			".bs-tree-row:hover { background: color-mix(in srgb, var(--bs-active) 7%, transparent); }",
			".bs-tree-row[data-active='true'] { color: var(--bs-active); background: color-mix(in srgb, var(--bs-active) 11%, transparent); font-weight: 700; }",
			".bs-tree-row[data-path='true']::before { content: ''; position: absolute; left: 0; top: 4px; bottom: 4px; width: 2px; border-radius: 2px; background: var(--bs-active); opacity: .46; }",
			".bs-tree-dot { width: 6px; height: 6px; border-radius: 50%; flex: 0 0 auto; }",
			".bs-tree-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
			".bs-tree-count { margin-left: auto; color: var(--bs-muted); font-size: 9px; font-variant-numeric: tabular-nums; }",
			".bs-tree-candidate { color: var(--bs-active); font-size: 9px; font-weight: 700; }",
			".bs-tree-topic { margin-bottom: 6px; border-bottom: 1px solid var(--bs-border); padding-bottom: 6px; }",
			".bs-tree-empty { padding: 8px; color: var(--bs-muted); font-size: 11px; line-height: 1.45; }",
			".bs-node-detail { overflow: auto; padding: 18px 20px 28px; }",
			".bs-node-workbench { display: flex; flex-direction: column; min-height: 0; overflow: hidden; padding: 0; } .bs-node-detail-scroll { min-height: 0; flex: 1; overflow: auto; padding: 18px 20px 28px; }",
			".bs-personal-note { margin: 12px 0 16px; padding: 12px 13px 11px; border: 1px solid color-mix(in srgb, var(--bs-active) 24%, var(--bs-border)); border-left: 3px solid var(--bs-active); border-radius: 9px; background: color-mix(in srgb, var(--bs-surface) 96%, var(--bs-active)); }",
			".bs-personal-note-head, .bs-section-heading { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }",
			".bs-personal-note-head strong, .bs-section-heading strong { min-width: 0; flex: 1; font-size: 11px; }",
			".bs-personal-note-state { color: var(--bs-muted); font-size: 9px; font-variant-numeric: tabular-nums; } .bs-personal-note-state[data-dirty='true'] { color: #b77b22; }",
			".bs-personal-note-field { box-sizing: border-box; width: 100%; min-height: 108px; resize: vertical; border: 0; border-radius: 7px; padding: 9px 10px; outline: none; background: var(--bs-surface); color: var(--dsw-alias-label-primary, #1e232c); font: inherit; font-size: 12px; line-height: 1.55; }",
			".bs-personal-note-field:focus { box-shadow: 0 0 0 2px color-mix(in srgb, var(--bs-active) 16%, transparent); }",
			".bs-personal-note-foot { display: flex; align-items: center; gap: 7px; margin-top: 8px; } .bs-personal-note-foot small { min-width: 0; flex: 1; color: var(--bs-muted); font-size: 9px; }",
			".bs-personal-note-foot .bs-tool:disabled { opacity: .42; cursor: default; }",
			".bs-work-summary { margin-top: 4px; padding-top: 13px; border-top: 1px solid var(--bs-border); }",
			".bs-work-summary-compact { display: grid; gap: 5px; } .bs-work-summary-row { display: grid; grid-template-columns: 78px minmax(0,1fr); gap: 8px; font-size: 11px; line-height: 1.45; } .bs-work-summary-row strong { color: var(--bs-muted); font-size: 9px; } .bs-work-summary-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
			".bs-detail-action-bar { flex: 0 0 auto; display: flex; gap: 7px; flex-wrap: wrap; margin: 0; padding: 10px 20px 14px; border-top: 1px solid var(--bs-border); background: var(--bs-surface); }",
			".bs-detail-crumbs { display: flex; gap: 5px; flex-wrap: wrap; color: var(--bs-muted); font-size: 10px; margin-bottom: 10px; }",
			".bs-detail-crumb { border: 0; padding: 0; background: transparent; color: inherit; cursor: pointer; }",
			".bs-detail-crumb:hover { color: var(--bs-active); }",
			".bs-detail-title { font-size: 19px; line-height: 1.28; margin: 0; letter-spacing: -.025em; }",
			".bs-detail-title-row { display: flex; align-items: flex-start; gap: 8px; }",
			".bs-detail-title-row .bs-detail-title { flex: 1; }",
			".bs-detail-icon { flex: 0 0 auto; width: 25px; height: 25px; border: 0; border-radius: 6px; background: transparent; color: var(--bs-muted); cursor: pointer; }",
			".bs-detail-icon:hover { color: var(--bs-active); background: color-mix(in srgb, var(--bs-active) 8%, transparent); }",
			".bs-detail-meta { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; margin: 9px 0 15px; color: var(--bs-muted); font-size: 10px; }",
			".bs-status-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 999px; font-weight: 650; }",
			".bs-detail-note-head { display: flex; align-items: center; gap: 8px; margin: 13px 0 5px; }",
			".bs-detail-note-head .bs-dock-eyebrow { margin: 0; flex: 1; }",
			".bs-detail-note { border-left: 2px solid color-mix(in srgb, var(--bs-active) 40%, transparent); padding: 8px 0 8px 12px; color: var(--bs-muted); font-size: 12px; line-height: 1.55; white-space: pre-wrap; }",
			".bs-detail-note[data-expanded='false'] { display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }",
			".bs-detail-note-empty { padding: 8px 0; color: var(--bs-muted); font-size: 12px; font-style: italic; }",
			".bs-work-card { display: grid; gap: 9px; margin: 12px 0 4px; }",
			".bs-work-section { padding: 11px 12px; border: 1px solid var(--bs-border); border-radius: 9px; background: color-mix(in srgb, var(--bs-surface) 97%, var(--bs-active)); }",
			".bs-work-section h3 { margin: 0 0 6px; color: var(--bs-active); font-size: 10px; letter-spacing: .04em; }",
			".bs-work-section-content { color: var(--dsw-alias-label-primary, #1e232c); font-size: 12px; line-height: 1.55; white-space: pre-wrap; }",
			".bs-work-section-empty { color: var(--bs-muted); font-size: 11px; font-style: italic; }",
			".bs-work-card-edit { display: grid; gap: 9px; }",
			".bs-work-card-edit label { display: grid; gap: 5px; color: var(--bs-muted); font-size: 10px; font-weight: 700; }",
			".bs-nav-summary { margin-top: 17px; padding-top: 13px; border-top: 1px solid var(--bs-border); }",
			".bs-nav-summary-head { display: flex; align-items: center; gap: 8px; }",
			".bs-nav-summary-head strong { flex: 1; font-size: 11px; }",
			".bs-detail-field { box-sizing: border-box; width: 100%; border: 1px solid var(--bs-border); border-radius: 8px; padding: 8px 10px; outline: none; background: var(--bs-surface); color: var(--dsw-alias-label-primary, #1e232c); font: inherit; font-size: 12px; line-height: 1.45; }",
			".bs-detail-field:focus { border-color: var(--bs-active); box-shadow: 0 0 0 2px color-mix(in srgb, var(--bs-active) 12%, transparent); }",
			"textarea.bs-detail-field { min-height: 112px; resize: vertical; }",
			".bs-edit-actions { display: flex; gap: 7px; margin-top: 8px; }",
			".bs-edit-actions button { border: 1px solid var(--bs-border); border-radius: 7px; padding: 5px 10px; background: transparent; color: var(--dsw-alias-label-primary, #1e232c); font-size: 11px; cursor: pointer; }",
			".bs-edit-actions button:first-child { border-color: var(--bs-active); background: var(--bs-active); color: #fff; }",
			".bs-detail-error { margin: 8px 0; color: var(--dsw-alias-danger, #d94f5c); font-size: 11px; }",
			".bs-status-select { height: 29px; border: 1px solid var(--bs-border); border-radius: 7px; padding: 0 7px; background: var(--bs-surface); color: var(--dsw-alias-label-primary, #1e232c); font-size: 11px; }",
			".bs-detail-actions { display: flex; gap: 7px; flex-wrap: wrap; margin: 16px 0 20px; }",
			".bs-detail-actions .bs-tool:first-child { color: #fff; border-color: var(--bs-active); background: var(--bs-active); }",
			".bs-detail-section { margin-top: 17px; padding-top: 13px; border-top: 1px solid var(--bs-border); }",
			".bs-detail-link { width: 100%; display: flex; align-items: center; gap: 7px; border: 0; border-radius: 7px; background: transparent; padding: 6px 4px; color: var(--dsw-alias-label-primary, #1e232c); text-align: left; font-size: 11px; cursor: pointer; }",
			".bs-detail-link:hover { color: var(--bs-active); background: color-mix(in srgb, var(--bs-active) 7%, transparent); }",
			".bs-detail-link-title { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
			".bs-detail-link-meta { color: var(--bs-muted); font-size: 9px; white-space: nowrap; }",
			".bs-detail-empty { padding: 8px 4px 12px; color: var(--bs-muted); font-size: 11px; line-height: 1.5; }",
			".bs-create-child { display: flex; gap: 6px; margin-top: 8px; }",
			".bs-create-child .bs-detail-field { min-width: 0; flex: 1; }",
			".bs-composer-context { display: flex; align-items: center; min-width: 0; gap: 7px; padding: 3px 2px 1px; color: var(--bs-muted, var(--dsw-alias-label-secondary, #667085)); font-size: 10px; }",
			".bs-composer-kicker { font-weight: 700; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; }",
			".bs-composer-node { display: inline-flex; align-items: center; min-width: 0; max-width: 420px; gap: 6px; padding: 3px 8px; border: 1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 28%, transparent); border-radius: 999px; color: var(--dsw-alias-state-business-primary, #4176e6); background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 7%, transparent); cursor: pointer; }",
			".bs-composer-node span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
			".bs-composer-actions { margin-left: auto; display: flex; gap: 5px; }",
			".bs-composer-action { border: 0; background: transparent; color: var(--bs-muted, var(--dsw-alias-label-secondary, #667085)); padding: 2px 5px; border-radius: 5px; font-size: 10px; cursor: pointer; }",
			".bs-composer-action:hover { color: var(--dsw-alias-state-business-primary, #4176e6); background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 8%, transparent); }",
			".bs-exec-workspace { box-sizing: border-box; width: 100%; min-width: 0; padding: 20px; }",
			".bs-exec-head { display: flex; align-items: flex-start; gap: 16px; padding-bottom: 15px; border-bottom: 1px solid var(--bs-border); }",
			".bs-exec-head-main { min-width: 0; flex: 1; } .bs-exec-head h2 { margin: 0; font-size: 21px; line-height: 1.3; } .bs-exec-head p { margin: 7px 0 0; color: var(--bs-muted); font-size: 12px; line-height: 1.5; }",
			".bs-exec-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; margin: 13px 0; } .bs-exec-actions .bs-seg { margin-right: auto; }",
			".bs-exec-run-status { color: var(--bs-active); font-size: 12px; text-align: right; white-space: nowrap; } .bs-exec-run-status small { display: block; margin-top: 6px; color: var(--bs-muted); }",
			".bs-exec-body { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 320px); gap: 14px; align-items: start; }",
			".bs-exec-chart { position: relative; min-width: 0; height: clamp(280px, calc(100dvh - 520px), 600px); overflow: hidden; touch-action: none; border: 1px solid var(--bs-border); border-radius: 10px; background-color: color-mix(in srgb, var(--bs-surface) 96%, var(--bs-active)); background-image: radial-gradient(circle, color-mix(in srgb, var(--bs-muted) 20%, transparent) 1px, transparent 1px); background-size: 20px 20px; }",
			".bs-exec-stage { position: absolute; left: 0; top: 0; transform-origin: 0 0; } .bs-exec-stage svg { position: absolute; inset: 0; overflow: visible; }",
			".bs-exec-controls { position: absolute; right: 10px; top: 10px; z-index: 3; display: flex; align-items: center; gap: 5px; padding: 5px; border: 1px solid var(--bs-border); border-radius: 8px; background: var(--bs-surface); font-size: 10px; }",
			".bs-exec-edge { fill: none; stroke: color-mix(in srgb, var(--bs-muted) 52%, transparent); stroke-width: 1.6; } .bs-exec-edge[data-condition='failure'] { stroke-dasharray: 5 4; } .bs-exec-edge[data-active='true'] { stroke: var(--bs-active); stroke-width: 2.7; } .bs-exec-edge[data-unvisited='true'] { stroke-dasharray: 4 4; opacity: .38; }",
			".bs-exec-edge-label { fill: var(--bs-muted); font-size: 10px; paint-order: stroke; stroke: var(--bs-surface); stroke-width: 4px; stroke-linejoin: round; }",
			".bs-exec-node { --exec-color: var(--bs-muted); position: absolute; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; text-align: left; border: 1px solid var(--bs-border); border-left: 3px solid var(--exec-color); border-radius: 10px; background: var(--bs-surface); color: inherit; cursor: pointer; box-shadow: 0 1px 3px rgba(20,32,50,.1); }",
			".bs-exec-node strong { font-size: 13px; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; } .bs-exec-node small { font-size: 10px; color: var(--exec-color); }",
			".bs-exec-node[data-kind='decision'] { border-radius: 22px 5px 22px 5px; } .bs-exec-node[data-kind='checkpoint'] { border-top: 3px solid #7656d8; }",
			".bs-exec-node[data-status='completed'], .bs-exec-list-item[data-status='completed'] { --exec-color: #2f9b68; } .bs-exec-node[data-status='ready'], .bs-exec-node[data-status='running'] { --exec-color: var(--bs-active); } .bs-exec-node[data-status='waiting'] { --exec-color: #7656d8; } .bs-exec-node[data-status='blocked'] { --exec-color: #b77b22; } .bs-exec-node[data-status='failed'] { --exec-color: #c84c5c; border-color: #c84c5c; } .bs-exec-node[data-status='unvisited'] { opacity: .45; border-style: dashed; }",
			".bs-exec-node[data-current='true'] { outline: 3px solid color-mix(in srgb, var(--bs-active) 18%, transparent); } .bs-exec-node[data-selected='true'] { box-shadow: 0 0 0 2px var(--bs-active); }",
			".bs-exec-list { display: grid; gap: 9px; } .bs-exec-list-item { --exec-color: var(--bs-muted); display: grid; grid-template-columns: 28px minmax(0,1fr) auto; gap: 10px; padding: 13px; border: 1px solid var(--bs-border); border-left: 3px solid var(--exec-color); border-radius: 9px; background: var(--bs-surface); color: inherit; text-align: left; cursor: pointer; } .bs-exec-list-item[data-current='true'], .bs-exec-list-item[data-selected='true'] { border-color: var(--bs-active); background: color-mix(in srgb, var(--bs-active) 5%, var(--bs-surface)); } .bs-exec-list-item[data-status='unvisited'] { opacity: .5; border-style: dashed; }",
			".bs-exec-list-item strong { display: block; font-size: 13px; } .bs-exec-list-item p { margin: 6px 0 0; color: var(--bs-muted); font-size: 11px; line-height: 1.5; } .bs-exec-list-item small { color: var(--bs-muted); font-size: 10px; } .bs-exec-index { color: var(--bs-active); font-size: 12px; font-variant-numeric: tabular-nums; }",
			".bs-exec-inspector { box-sizing: border-box; min-width: 0; padding: 15px; border: 1px solid var(--bs-border); border-radius: 10px; background: var(--bs-surface); overflow-wrap: anywhere; } .bs-exec-inspector h3 { margin: 6px 0 10px; font-size: 17px; line-height: 1.3; } .bs-exec-inspector h4 { margin: 16px 0 6px; color: var(--bs-muted); font-size: 10px; font-weight: 700; } .bs-exec-inspector p, .bs-exec-inspector li { font-size: 12px; line-height: 1.55; white-space: pre-wrap; } .bs-exec-inspector p { margin: 0; } .bs-exec-inspector ul { margin: 0; padding-left: 17px; }",
			".bs-exec-inspector label { display: grid; gap: 5px; margin-top: 10px; color: var(--bs-muted); font-size: 11px; } .bs-exec-inspector textarea { min-height: 76px; } .bs-exec-results { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--bs-border); } .bs-exec-hint { margin-top: 9px !important; color: var(--bs-muted); font-size: 10px !important; }",
			"@container (max-width: 900px) { .bs-exec-body { grid-template-columns: minmax(0, 1fr); } .bs-exec-chart { height: 320px; } .bs-exec-inspector { display: block; } }",
			"@container (max-width: 1279px) { .bs-workbench-header { grid-template-columns: minmax(0, 1fr) auto auto; gap: 8px; } .bs-project-chip { max-width: 150px; } .bs-workbench-topic { max-width: 190px; } .bs-focus-dock { position: absolute; right: 0; top: 0; bottom: 0; height: auto; box-shadow: -14px 0 34px rgba(33,52,82,.16); } .bs-focus-dock.bs-compact { position: relative; box-shadow: none; } }",
			"@media (max-width: 760px) { .bs-workbench-header { grid-template-columns: 1fr auto; } .bs-header-center { display: none; } .bs-frame-bar { align-items: flex-start; flex-direction: column; gap: 4px; } .bs-frame-edit { width: 100%; grid-template-columns: 1fr; } .bs-focus-dock { left: 0; width: 100% !important; min-width: 0; } .bs-focus-dock.bs-compact { left: auto; right: 0; width: 46px !important; min-width: 46px; } .bs-focus-body[data-tree-open='true'] { grid-template-columns: 132px minmax(0, 1fr); } .bs-composer-kicker { display: none; } .bs-backfill-actions { grid-template-columns: 1fr; } .bs-plan-shell { width: calc(100% - 28px); padding-top: 20px; } .bs-plan-head { grid-template-columns: 1fr; } .bs-plan-progress { text-align: left; } .bs-prep-grid { grid-template-columns: 1fr; } .bs-prep-toolbar { grid-template-columns: 1fr; } }",
			"@keyframes bs-pop { from { opacity: 0; transform: translateY(4px) scale(.98); } to { opacity: 1; transform: none; } }",
			"@keyframes bs-fade { from { opacity: 0; } to { opacity: 1; } }",
			"@keyframes bs-content-in { from { opacity: 0; } to { opacity: 1; } }",
			"@keyframes bs-spin { to { transform: rotate(360deg); } }",
			"@keyframes bs-exploring { 0%,100% { opacity: .55; transform: scale(.92); } 50% { opacity: 1; transform: scale(1.08); } }",
			"@media (prefers-reduced-motion: reduce) { .bs-node, .bs-node-dot, .bs-edge, .bs-fade, .bs-focus-body, .bs-backfill-spinner { animation: none !important; } .bs-node, .bs-focus-dock, .bs-minimap { transition: none !important; } }",
		].join("\n");
		//#endregion

		//#region dsh-ariadne: balanced tree layout + orthogonal routing
		const CANVAS_W = 2200;
		const CANVAS_H = 1500;
		const TOPIC_SIZE = { w: 260, h: 76 };
		const CANVAS_PADDING = 150;
		const GROUP_GAP = 42;
		const NODE_GAP_X = 34;
		const NODE_GAP_Y = 70;
		const GROUP_PALETTE = ["#5577d9", "#3e8796", "#6574c4", "#4f8a72", "#7a6fb4", "#527caa", "#6f8296", "#587a72", "#806f9e", "#4b7592"];

		function treeFacts(map) {
			const byId = new Map(map.nodes.map((n) => [n.id, n]));
			const children = new Map();
			const parentOf = new Map();
			const hasParent = new Set();
			for (const link of map.links) {
				if (link.kind !== "parent") continue;
				if (!byId.has(link.from) || !byId.has(link.to)) continue;
				const list = children.get(link.from) ?? [];
				list.push(byId.get(link.to));
				children.set(link.from, list);
				parentOf.set(link.to, link.from);
				hasParent.add(link.to);
			}
			const roots = map.nodes.filter((node) => !hasParent.has(node.id));
			const depthById = new Map();
			const visit = (node, depth) => {
				depthById.set(node.id, depth);
				for (const child of children.get(node.id) ?? []) visit(child, depth + 1);
			};
			roots.forEach((root) => visit(root, 1));
			return { byId, children, parentOf, hasParent, roots, depthById };
		}

		function noteSummary(note, limit = 58) {
			const first = String(note ?? "").split(/\n\s*\n|\n/)[0].replace(/\s+/g, " ").trim();
			return first.length > limit ? `${first.slice(0, limit - 1)}…` : first;
		}

		function parseNodeNote(note) {
			const text = String(note ?? "").replace(/\r\n?/g, "\n").trim();
			const empty = { understanding: "", unresolved: "", nextStep: "" };
			if (!text) return empty;
			const matches = [...text.matchAll(/^## (当前理解|待解决|下一步)$/gm)];
			if (matches.length === 0) return { ...empty, understanding: text, rawFallback: text };
			const result = { ...empty };
			const keyOf = { 当前理解: "understanding", 待解决: "unresolved", 下一步: "nextStep" };
			const preamble = text.slice(0, matches[0].index).trim();
			for (let index = 0; index < matches.length; index += 1) {
				const match = matches[index];
				const start = match.index + match[0].length;
				const end = matches[index + 1]?.index ?? text.length;
				const key = keyOf[match[1]];
				const value = text.slice(start, end).trim();
				if (!result[key]) result[key] = value;
			}
			if (preamble) result.understanding = [preamble, result.understanding].filter(Boolean).join("\n\n");
			return result;
		}

		function serializeNodeNote(value) {
			return [
				`## 当前理解\n\n${String(value?.understanding ?? "").trim()}`,
				`## 待解决\n\n${String(value?.unresolved ?? "").trim()}`,
				`## 下一步\n\n${String(value?.nextStep ?? "").trim()}`,
			].join("\n\n");
		}

		function candidateGroups(map, query = "", rootId = "") {
			const facts = treeFacts(map);
			const rootOf = (nodeId) => {
				let cursor = nodeId;
				const seen = new Set();
				while (facts.parentOf.has(cursor) && !seen.has(cursor)) {
					seen.add(cursor);
					cursor = facts.parentOf.get(cursor);
				}
				return cursor;
			};
			const needle = query.trim().toLocaleLowerCase();
			return facts.roots
				.filter((root) => !rootId || root.id === rootId)
				.map((root) => ({
					root,
					nodes: map.nodes
						.filter((node) => rootOf(node.id) === root.id)
						.filter((node) => !needle || `${node.title}\n${node.note ?? ""}\n${node.userNote ?? ""}`.toLocaleLowerCase().includes(needle))
						.map((node) => ({ node, depth: facts.depthById.get(node.id) ?? 1 })),
				}))
				.filter((group) => group.nodes.length > 0);
		}

		function executionDisplayPath(graph, run) {
			if (!graph || !run) return [];
			const path = [];
			let id = graph.startNodeId;
			while (id && !path.includes(id)) {
				path.push(id);
				if (id === run.currentNodeId) break;
				const state = run.nodeStates?.[id];
				const node = graph.nodes.find((item) => item.id === id);
				if (!node || !["completed", "failed"].includes(state?.status)) break;
				const condition = state.status === "failed" ? "failure" : node.kind === "decision" ? "route" : "success";
				id = graph.edges.find((edge) => edge.from === id && edge.condition === condition && (condition !== "route" || edge.routeKey === state.routeKey))?.to;
			}
			return path;
		}
		function isLinearPlanGraph(graph) {
			if (!graph?.nodes.length || graph.nodes.some((node) => node.kind !== "task") || graph.edges.some((edge) => edge.condition !== "success")) return false;
			const seen = new Set();
			let id = graph.startNodeId;
			while (id && !seen.has(id)) {
				seen.add(id);
				const outgoing = graph.edges.filter((edge) => edge.from === id);
				if (outgoing.length > 1 || graph.edges.filter((edge) => edge.to === id).length > (id === graph.startNodeId ? 0 : 1)) return false;
				id = outgoing[0]?.to;
			}
			return !id && seen.size === graph.nodes.length;
		}
		function executionGraphLayout(graph) {
			const indegree = new Map(graph.nodes.map((node) => [node.id, 0]));
			const layers = new Map(graph.nodes.map((node) => [node.id, 0]));
			for (const edge of graph.edges) indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
			const queue = graph.nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
			for (let cursor = 0; cursor < queue.length; cursor += 1) {
				const id = queue[cursor];
				for (const edge of graph.edges.filter((item) => item.from === id)) {
					layers.set(edge.to, Math.max(layers.get(edge.to) ?? 0, (layers.get(id) ?? 0) + 1));
					indegree.set(edge.to, indegree.get(edge.to) - 1);
					if (indegree.get(edge.to) === 0) queue.push(edge.to);
				}
			}
			const columns = [];
			for (const node of graph.nodes) {
				const level = layers.get(node.id) ?? 0;
				(columns[level] ??= []).push(node);
			}
			const rows = Math.max(1, ...columns.map((column) => column?.length ?? 0));
			const rects = {};
			for (let column = 0; column < columns.length; column += 1) {
				const items = columns[column] ?? [];
				items.forEach((node, row) => { rects[node.id] = { x: 44 + column * 334, y: 44 + ((rows - items.length) / 2 + row) * 174, w: 224, h: 108 }; });
			}
			return { rects, order: columns.flat().filter(Boolean).map((node) => node.id), width: Math.max(360, 88 + columns.length * 334 - 110), height: Math.max(210, 88 + rows * 174 - 66) };
		}
		function executionRemainingIds(graph, run) {
			if (!run) return new Set(graph.nodes.map((node) => node.id));
			const remaining = new Set();
			const queue = run.currentNodeId ? [run.currentNodeId] : [];
			for (let cursor = 0; cursor < queue.length; cursor += 1) {
				const id = queue[cursor];
				if (remaining.has(id)) continue;
				remaining.add(id);
				queue.push(...graph.edges.filter((edge) => edge.from === id).map((edge) => edge.to));
			}
			return remaining;
		}

		function measureNode(node, root = false, manual) {
			if (manual) return { w: manual.w, h: manual.h };
			const count = [...String(node.title ?? "")].length;
			const minW = root ? 216 : 196;
			const maxW = root ? 252 : 224;
			const w = Math.max(minW, Math.min(maxW, count * 12 + 52));
			const h = root ? (node.note ? 98 : 86) : (node.note ? 88 : 76);
			return { w, h };
		}

		function autoWidth(title) {
			return measureNode({ title }).w;
		}

		function branchColorOf(map, node, phase) {
			if (phase === "executing") return EXECUTING_COLOR;
			const parentOf = new Map();
			for (const link of map.links) if (link.kind === "parent") parentOf.set(link.to, link.from);
			const rootOf = (id) => {
				const seen = new Set();
				let cursor = id;
				while (cursor !== undefined && !seen.has(cursor)) {
					seen.add(cursor);
					const parent = parentOf.get(cursor);
					if (parent === undefined) return cursor;
					cursor = parent;
				}
				return id;
			};
			const roots = map.nodes.filter((node) => !parentOf.has(node.id));
			const palette = new Map(roots.map((root, index) => [root.id, GROUP_PALETTE[index % GROUP_PALETTE.length]]));
			const rootId = rootOf(node.id);
			return palette.get(rootId) ?? GROUP_PALETTE[[...node.id].reduce((h, ch) => (h * 31 + ch.codePointAt(0)) >>> 0, 7) % GROUP_PALETTE.length];
		}

		// "Hot" nodes = most discussed / deepest explored subtrees. Not depth-shrunk:
		// hot nodes may grow a little, everything else stays neutral.
		function heatRank(map, facts) {
			const score = new Map();
			const deepest = new Map();
			const activity = new Map();
			const statusScore = { unexplored: 0, parked: 0, expanded: 1, exploring: 2, selected: 3 };
			const calc = (node) => {
				const kids = facts.children.get(node.id) ?? [];
				let subtree = 0;
				const nodeDepth = facts.depthById.get(node.id) ?? 1;
				let deep = nodeDepth;
				let act = statusScore[node.status] ?? 0;
				for (const kid of kids) {
					subtree += calc(kid);
					deep = Math.max(deep, deepest.get(kid.id) ?? nodeDepth);
					act += activity.get(kid.id) ?? 0;
				}
				deepest.set(node.id, deep);
				activity.set(node.id, act);
				const s = subtree + (deep - nodeDepth) * 2 + act;
				score.set(node.id, s);
				return s + 1;
			};
			for (const node of map.nodes) if (!score.has(node.id)) calc(node);
			const ranked = [...map.nodes].sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0));
			return new Set(ranked.slice(0, 3).map((n) => n.id));
		}

		function visibleChildrenOf(facts, nodeId, collapsedIds) {
			return collapsedIds.has(nodeId) ? [] : (facts.children.get(nodeId) ?? []);
		}

		function layoutRootGroup(root, facts, sizeOf, collapsedIds) {
			const spanById = new Map();
			const spanOf = (node) => {
				const kids = visibleChildrenOf(facts, node.id, collapsedIds);
				const own = sizeOf(node).w;
				const childrenWidth = kids.reduce((sum, child) => sum + spanOf(child), 0) + Math.max(0, kids.length - 1) * NODE_GAP_X;
				const span = Math.max(own, childrenWidth);
				spanById.set(node.id, span);
				return span;
			};
			spanOf(root);
			const positions = new Map();
			const ids = [];
			const place = (node, x, y) => {
				const size = sizeOf(node);
				positions.set(node.id, { x, y: y + size.h / 2 });
				ids.push(node.id);
				const kids = visibleChildrenOf(facts, node.id, collapsedIds);
				if (kids.length === 0) return;
				const total = kids.reduce((sum, child) => sum + spanById.get(child.id), 0) + Math.max(0, kids.length - 1) * NODE_GAP_X;
				let cursor = x - total / 2;
				for (const child of kids) {
					const span = spanById.get(child.id);
					const childX = cursor + span / 2;
					cursor += span + NODE_GAP_X;
					place(child, childX, y + size.h + NODE_GAP_Y);
				}
			};
			place(root, 0, 0);
			let nodeBounds = null;
			for (const id of ids) nodeBounds = nodeBounds ? union(nodeBounds, rectOf(facts.byId.get(id), positions.get(id), sizeOf(facts.byId.get(id)))) : rectOf(facts.byId.get(id), positions.get(id), sizeOf(facts.byId.get(id)));
			const bounds = { x: nodeBounds.x - 28, y: nodeBounds.y - 50, w: nodeBounds.w + 56, h: nodeBounds.h + 78 };
			const shifted = new Map();
			for (const [id, pos] of positions) shifted.set(id, { x: pos.x - bounds.x, y: pos.y - bounds.y });
			return { root, positions: shifted, ids, bounds: { x: 0, y: 0, w: bounds.w, h: bounds.h }, area: bounds.w * bounds.h };
		}

		function partitionRootGroups(groupLayouts) {
			const count = groupLayouts.length;
			const sideSlots = count <= 6 ? Math.ceil(count / 2) : Math.ceil(count / 3);
			const remaining = Math.max(0, count - sideSlots * 2);
			const slots = {
				left: sideSlots,
				right: Math.min(sideSlots, count - sideSlots),
				top: Math.ceil(remaining / 2),
				bottom: Math.floor(remaining / 2),
			};
			const zones = { left: [], right: [], top: [], bottom: [] };
			const loads = { left: 0, right: 0, top: 0, bottom: 0 };
			const order = ["left", "right", "top", "bottom"];
			const sorted = [...groupLayouts].sort((a, b) => b.area - a.area || a.root.id.localeCompare(b.root.id));
			for (const group of sorted) {
				const available = order.filter((zone) => zones[zone].length < slots[zone]);
				available.sort((a, b) => loads[a] - loads[b] || order.indexOf(a) - order.indexOf(b));
				const zone = available[0] ?? "right";
				zones[zone].push(group);
				loads[zone] += zone === "left" || zone === "right" ? group.bounds.h : group.bounds.w;
			}
			return zones;
		}

		function balancedTreeLayout(map, sizeOf, collapsed = new Set()) {
			const facts = treeFacts(map);
			const collapsedIds = collapsed instanceof Set ? collapsed : new Set(collapsed);
			const rootGroups = facts.roots.map((root) => layoutRootGroup(root, facts, sizeOf, collapsedIds));
			const zones = partitionRootGroups(rootGroups);
			const placements = [];
			const sideGap = TOPIC_SIZE.w / 2 + 170;
			const stackHeight = (list) => list.reduce((sum, group) => sum + group.bounds.h, 0) + Math.max(0, list.length - 1) * GROUP_GAP;
			for (const zone of ["left", "right"]) {
				const list = zones[zone];
				let cursor = -stackHeight(list) / 2;
				for (const group of list) {
					placements.push({ group, zone, x: zone === "left" ? -sideGap - group.bounds.w : sideGap, y: cursor });
					cursor += group.bounds.h + GROUP_GAP;
				}
			}
			const sideExtent = Math.max(stackHeight(zones.left), stackHeight(zones.right), TOPIC_SIZE.h) / 2;
			for (const zone of ["top", "bottom"]) {
				const list = zones[zone];
				const totalWidth = list.reduce((sum, group) => sum + group.bounds.w, 0) + Math.max(0, list.length - 1) * GROUP_GAP;
				let cursor = -totalWidth / 2;
				for (const group of list) {
					placements.push({ group, zone, x: cursor, y: zone === "top" ? -sideExtent - GROUP_GAP - group.bounds.h : sideExtent + GROUP_GAP });
					cursor += group.bounds.w + GROUP_GAP;
				}
			}

			const positions = new Map([["__topic__", { x: 0, y: 0 }]]);
			const groups = [];
			for (const placement of placements) {
				for (const [id, pos] of placement.group.positions) positions.set(id, { x: placement.x + pos.x, y: placement.y + pos.y });
				groups.push({ root: placement.group.root, zone: placement.zone, ids: placement.group.ids, bounds: { x: placement.x, y: placement.y, w: placement.group.bounds.w, h: placement.group.bounds.h } });
			}
			let overall = { x: -TOPIC_SIZE.w / 2, y: -TOPIC_SIZE.h / 2, w: TOPIC_SIZE.w, h: TOPIC_SIZE.h };
			for (const group of groups) overall = union(overall, group.bounds);
			const shift = { x: CANVAS_PADDING - overall.x, y: CANVAS_PADDING - overall.y };
			for (const [id, pos] of positions) positions.set(id, { x: pos.x + shift.x, y: pos.y + shift.y });
			for (const group of groups) group.bounds = { ...group.bounds, x: group.bounds.x + shift.x, y: group.bounds.y + shift.y };
			const center = positions.get("__topic__");
			const canvas = { w: Math.ceil(overall.w + CANVAS_PADDING * 2), h: Math.ceil(overall.h + CANVAS_PADDING * 2) };
			return { positions, center, groups, chain: [], canvas, visibleIds: new Set([...positions.keys()].filter((id) => id !== "__topic__")) };
		}

		const centerFourLayout = balancedTreeLayout;

		function chainLayout(map, sizeOf) {
			const facts = treeFacts(map);
			const positions = new Map();
			const center = { x: CANVAS_W / 2, y: CANVAS_H / 2 };
			const planNodes = map.finalPlan?.graph
				? executionGraphLayout(map.finalPlan.graph).order.map((id) => map.finalPlan.graph.nodes.find((node) => node.id === id))
				: map.finalPlan?.items;
			const orderedIds = planNodes
				? [...new Set(planNodes.flatMap((item) => item.sourceNodeIds))]
				: (map.selectedIds ?? []);
			const selected = orderedIds
				.map((id) => facts.byId.get(id))
				.filter(Boolean);
			if (selected.length === 0) return { positions, center, groups: [], chain: [], canvas: { w: CANVAS_W, h: CANVAS_H }, visibleIds: new Set() };
			const spacing = Math.max(300, ...selected.map((n) => sizeOf(n).w + 70));
			const total = (selected.length - 1) * spacing;
			selected.forEach((node, index) => {
				positions.set(node.id, { x: center.x - total / 2 + index * spacing, y: center.y });
			});
			return { positions, center, groups: [], chain: selected.map((n) => n.id), canvas: { w: CANVAS_W, h: CANVAS_H }, visibleIds: new Set(selected.map((node) => node.id)) };
		}

		function layoutFor(map, phase, sizeOf, collapsedIds = new Set()) {
			return phase === "executing" ? chainLayout(map, sizeOf) : balancedTreeLayout(map, sizeOf, collapsedIds);
		}

		function canvasRectsForMap(map, offsets = {}, sizes = {}) {
			const facts = treeFacts(map);
			const roots = new Set(facts.roots.map((node) => node.id));
			const sizeOf = (node) => measureNode(node, roots.has(node.id), sizes[node.id]);
			const layout = balancedTreeLayout(map, sizeOf, new Set());
			const rects = {};
			for (const node of map.nodes) {
				const position = layout.positions.get(node.id);
				if (!position) continue;
				const offset = offsets[node.id] ?? { dx: 0, dy: 0 };
				const rect = rectOf(node, { x: position.x + offset.dx, y: position.y + offset.dy }, sizeOf(node));
				rects[node.id] = { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.w), h: Math.round(rect.h) };
			}
			return rects;
		}

		function rectOf(node, pos, size) {
			return { x: pos.x - size.w / 2, y: pos.y - size.h / 2, w: size.w, h: size.h };
		}
		function union(a, b) {
			const x = Math.min(a.x, b.x);
			const y = Math.min(a.y, b.y);
			return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
		}

		function centerOf(rect) {
			return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
		}

		function constrainCanvasView(view, rects, viewport, edge = 72) {
			const usableW = viewport.usableW || viewport.w || 0;
			const usableH = viewport.h || 0;
			const contentRects = Array.isArray(rects) ? rects : rects ? [rects] : [];
			if (contentRects.length === 0 || usableW <= 0 || usableH <= 0) return view;
			let closest = null;
			for (const rect of contentRects) {
				const keepX = Math.min(edge, (rect.w * view.scale) / 2, usableW);
				const keepY = Math.min(edge, (rect.h * view.scale) / 2, usableH);
				const minTx = keepX - (rect.x + rect.w) * view.scale;
				const maxTx = usableW - keepX - rect.x * view.scale;
				const minTy = keepY - (rect.y + rect.h) * view.scale;
				const maxTy = usableH - keepY - rect.y * view.scale;
				const tx = Math.max(minTx, Math.min(maxTx, view.tx));
				const ty = Math.max(minTy, Math.min(maxTy, view.ty));
				if (tx === view.tx && ty === view.ty) return view;
				const distance = (tx - view.tx) ** 2 + (ty - view.ty) ** 2;
				if (!closest || distance < closest.distance) closest = { tx, ty, distance };
			}
			return { ...view, tx: closest.tx, ty: closest.ty };
		}

		function nodeMenuPosition(x, y, width, height) {
			const gutter = 8;
			const menuWidth = 196;
			const menuHeight = 196;
			return {
				x: Math.max(gutter, Math.min(x, Math.max(gutter, width - menuWidth - gutter))),
				y: Math.max(gutter, Math.min(y, Math.max(gutter, height - menuHeight - gutter))),
			};
		}

		function anchorFor(rect, target, axis) {
			const center = centerOf(rect);
			if (axis === "horizontal") return { x: target.x >= center.x ? rect.x + rect.w : rect.x, y: center.y };
			return { x: center.x, y: target.y >= center.y ? rect.y + rect.h : rect.y };
		}

		function compactPoints(points) {
			const unique = points.filter((point, index) => index === 0 || point.x !== points[index - 1].x || point.y !== points[index - 1].y);
			return unique.filter((point, index) => {
				if (index === 0 || index === unique.length - 1) return true;
				const prev = unique[index - 1];
				const next = unique[index + 1];
				return !((prev.x === point.x && point.x === next.x) || (prev.y === point.y && point.y === next.y));
			});
		}

		function segmentIntersectsRect(a, b, rect, clearance = 12) {
			const left = rect.x - clearance;
			const right = rect.x + rect.w + clearance;
			const top = rect.y - clearance;
			const bottom = rect.y + rect.h + clearance;
			if (a.x === b.x) return a.x > left && a.x < right && Math.max(a.y, b.y) > top && Math.min(a.y, b.y) < bottom;
			if (a.y === b.y) return a.y > top && a.y < bottom && Math.max(a.x, b.x) > left && Math.min(a.x, b.x) < right;
			return false;
		}

		function candidateScore(points, obstacles) {
			let collisions = 0;
			let length = 0;
			for (let index = 0; index < points.length - 1; index += 1) {
				const a = points[index];
				const b = points[index + 1];
				length += Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
				for (const rect of obstacles) if (segmentIntersectsRect(a, b, rect)) collisions += 1;
			}
			return collisions * 100000 + length + points.length;
		}

		function routeCollisions(points, obstacles) {
			let collisions = 0;
			for (let index = 0; index < points.length - 1; index += 1) {
				for (const rect of obstacles) if (segmentIntersectsRect(points[index], points[index + 1], rect)) collisions += 1;
			}
			return collisions;
		}

		function roundedOrthogonalPath(points, radius = 10) {
			if (points.length < 2) return "";
			let d = `M ${points[0].x} ${points[0].y}`;
			for (let index = 1; index < points.length - 1; index += 1) {
				const prev = points[index - 1];
				const point = points[index];
				const next = points[index + 1];
				const before = { x: point.x + Math.sign(prev.x - point.x) * Math.min(radius, Math.abs(prev.x - point.x) / 2), y: point.y + Math.sign(prev.y - point.y) * Math.min(radius, Math.abs(prev.y - point.y) / 2) };
				const after = { x: point.x + Math.sign(next.x - point.x) * Math.min(radius, Math.abs(next.x - point.x) / 2), y: point.y + Math.sign(next.y - point.y) * Math.min(radius, Math.abs(next.y - point.y) / 2) };
				d += ` L ${before.x} ${before.y} Q ${point.x} ${point.y} ${after.x} ${after.y}`;
			}
			const last = points[points.length - 1];
			return `${d} L ${last.x} ${last.y}`;
		}

		function routeOrthogonal(sourceRect, targetRect, obstacles = []) {
			const sourceCenter = centerOf(sourceRect);
			const targetCenter = centerOf(targetRect);
			const horizontalStart = anchorFor(sourceRect, targetCenter, "horizontal");
			const horizontalEnd = anchorFor(targetRect, sourceCenter, "horizontal");
			const verticalStart = anchorFor(sourceRect, targetCenter, "vertical");
			const verticalEnd = anchorFor(targetRect, sourceCenter, "vertical");
			const midX = (horizontalStart.x + horizontalEnd.x) / 2;
			const midY = (verticalStart.y + verticalEnd.y) / 2;
			const candidates = [
				compactPoints([horizontalStart, { x: midX, y: horizontalStart.y }, { x: midX, y: horizontalEnd.y }, horizontalEnd]),
				compactPoints([verticalStart, { x: verticalStart.x, y: midY }, { x: verticalEnd.x, y: midY }, verticalEnd]),
			];
			const xRails = new Set([midX]);
			const yRails = new Set([midY]);
			for (const rect of obstacles) {
				xRails.add(rect.x - 18);
				xRails.add(rect.x + rect.w + 18);
				yRails.add(rect.y - 18);
				yRails.add(rect.y + rect.h + 18);
			}
			for (const x of xRails) candidates.push(compactPoints([horizontalStart, { x, y: horizontalStart.y }, { x, y: horizontalEnd.y }, horizontalEnd]));
			for (const y of yRails) candidates.push(compactPoints([verticalStart, { x: verticalStart.x, y }, { x: verticalEnd.x, y }, verticalEnd]));
			candidates.sort((a, b) => candidateScore(a, obstacles) - candidateScore(b, obstacles));
			const points = candidates[0];
			return { points, d: roundedOrthogonalPath(points), collisions: routeCollisions(points, obstacles) };
		}

		function edgePath(a, b, obstacles = []) {
			return routeOrthogonal(a, b, obstacles).d;
		}

		function topicEdgeKey(rootId) {
			return `__topic__->${rootId}`;
		}

		function activePathFacts(map, activeNodeId) {
			const facts = treeFacts(map);
			const chain = [];
			let cursor = activeNodeId;
			while (cursor && facts.byId.has(cursor) && !chain.includes(cursor)) {
				chain.unshift(cursor);
				cursor = facts.parentOf.get(cursor);
			}
			const edgeKeys = new Set();
			if (chain[0]) edgeKeys.add(topicEdgeKey(chain[0]));
			for (let index = 0; index < chain.length - 1; index += 1) edgeKeys.add(`${chain[index]}->${chain[index + 1]}`);
			const secondaryEdgeKeys = new Set((facts.children.get(activeNodeId) ?? []).map((node) => `${activeNodeId}->${node.id}`));
			return { nodeIds: new Set(chain), edgeKeys, secondaryEdgeKeys };
		}

		function rectsOverlap(a, b, gap = 0) {
			return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
		}
		//#endregion

		//#region dsh-ariadne: node card + menu
		function NodeCard({ node, pos, offset, size, viewScale, branchColor, isQuestion, isKey, isRoot, selected, active, inPath, collapsed, statusLabel, dim, onMenu, onDrag, onResize, onDoubleClick, onToggleCollapse }) {
			const dragRef = useRef(null);
			const resizeRef = useRef(null);
			const color = STATUS_COLORS[node.status] ?? "#9aa4b2";
			const dx = offset?.dx ?? 0;
			const dy = offset?.dy ?? 0;
			const left = pos.x + dx - size.w / 2;
			const top = pos.y + dy - size.h / 2;

			const startDrag = (event) => {
				if (event.button !== undefined && event.button !== 0) return;
				event.stopPropagation();
				dragRef.current = { x: event.clientX, y: event.clientY, moved: false, dx, dy };
				try {
					event.currentTarget.setPointerCapture(event.pointerId);
				} catch {}
			};
			const moveDrag = (event) => {
				const drag = dragRef.current;
				if (!drag) return;
				const mx = (event.clientX - drag.x) / viewScale;
				const my = (event.clientY - drag.y) / viewScale;
				if (Math.abs(mx) + Math.abs(my) > 5) {
					drag.moved = true;
					onDrag(node, drag.dx + mx, drag.dy + my);
				}
			};
			const endDrag = (event) => {
				const drag = dragRef.current;
				dragRef.current = null;
				if (drag && !drag.moved) onMenu(node, pos, event);
			};

			const startResize = (event) => {
				event.stopPropagation();
				resizeRef.current = { x: event.clientX, y: event.clientY, w: size.w, h: size.h };
				try {
					event.currentTarget.setPointerCapture(event.pointerId);
				} catch {}
			};
			const moveResize = (event) => {
				const r = resizeRef.current;
				if (!r) return;
				onResize(node, r.w + (event.clientX - r.x) / viewScale, r.h + (event.clientY - r.y) / viewScale);
			};
			const endResize = () => {
				resizeRef.current = null;
			};

			return React.createElement(
				"div",
				{
					className: `bs-node${isQuestion ? " bs-question" : ""}${isKey ? " bs-key" : ""}${active ? " bs-active" : ""}${inPath ? " bs-path" : ""}${dim ? " bs-dim" : ""}`,
					"data-node-id": node.id,
					"data-status": node.status,
					style: {
						left,
						top,
						width: size.w,
						height: size.h,
						background: isRoot ? `${branchColor}16` : "var(--bs-surface, var(--dsw-alias-bg-layer-2, #fff))",
						border: `1px solid ${isRoot ? `${branchColor}58` : "var(--dsw-alias-border-l2, #dfe5ef)"}`,
						borderLeft: `3px solid ${branchColor}`,
						color: "var(--dsw-alias-label-primary, #1e232c)",
					},
					onPointerDown: startDrag,
					onPointerMove: moveDrag,
					onPointerUp: endDrag,
					onDoubleClick: (event) => {
						event.stopPropagation();
						onDoubleClick?.(node);
					},
					title: node.note ? `${node.title}\n${node.note}` : node.title,
				},
				React.createElement("span", { className: "bs-node-title" }, node.title),
				node.note && size.h >= 82 && React.createElement("span", { className: "bs-note" }, noteSummary(node.note)),
				React.createElement(
					"span",
					{ className: "bs-node-meta" },
					React.createElement("span", { className: "bs-node-dot", style: { background: color } }),
					React.createElement("span", null, statusLabel),
					selected && React.createElement("span", { className: "bs-candidate", title: "定案池", "aria-label": "定案池" }, "◆"),
				),
				isQuestion &&
					React.createElement(
						"button",
						{
							className: "bs-collapse",
							onPointerDown: (event) => event.stopPropagation(),
							onClick: (event) => {
								event.stopPropagation();
								onToggleCollapse(node.id);
							},
							title: collapsed ? "展开子树" : "折叠子树",
							"aria-label": collapsed ? "展开子树" : "折叠子树",
						},
						collapsed ? "+" : "−",
					),
				React.createElement("span", {
					className: "bs-resize",
					onPointerDown: startResize,
					onPointerMove: moveResize,
					onPointerUp: endResize,
				}),
			);
		}

		function NodeMenu({ node, x, y, t, session, map, onFocus, onClose }) {
			const [statusOpen, setStatusOpen] = useState(false);
			const [busy, setBusy] = useState(false);
			const send = (prompt) => {
				onClose();
				queuePrompt(session, prompt).catch((error) => console.error("[dsh-ariadne] prompt failed:", error));
			};
			const apply = (ops) => {
				setBusy(true);
				directOp(session, ops)
					.then(() => onClose())
					.catch((error) => console.error("[dsh-ariadne] direct op failed:", error))
					.finally(() => setBusy(false));
			};
			const selected = map?.selectedIds ?? [];
			const inPool = selected.includes(node.id);
			const row = (label, action) => React.createElement("button", { key: label, style: menuRowStyle, disabled: busy, onClick: action }, label);
			const body = statusOpen
				? STATUSES.filter((status) => status !== "selected").map((status) => row(`${STATUS_COLORS[status] === STATUS_COLORS[node.status] ? "● " : "○ "}${t(`status.${status}`)}`, () => apply({ upsertNodes: [{ id: node.id, title: node.title, status }] })))
				: [
						row(t("menu.continue"), () => send(continuePrompt(node))),
						row(t("menu.explore"), () => send(explorePrompt(node))),
						row(t("menu.status"), () => setStatusOpen(true)),
						row(inPool ? "移出定案池" : t("menu.select"), () =>
							apply({ selectedIds: inPool ? selected.filter((id) => id !== node.id) : [...selected, node.id] }),
						),
						row(t("menu.focus"), () => {
							onClose();
							onFocus(node.id);
						}),
					];
			return React.createElement(
				"div",
				{
					style: {
						position: "absolute",
						left: Math.max(8, Math.min(x, 9999 - 200)),
						top: y,
						zIndex: 40,
						width: 196,
						background: "var(--dsw-alias-bg-layer-3, #fff)",
						border: "1px solid var(--dsw-alias-border-l2, #e5e7eb)",
						borderRadius: 10,
						boxShadow: "0 8px 24px rgba(15,23,42,.16)",
						overflow: "hidden",
						display: "flex",
						flexDirection: "column",
						animation: "bs-pop .2s ease both",
					},
					onPointerDown: (event) => event.stopPropagation(),
				},
				React.createElement("div", { style: { padding: "7px 12px", fontWeight: 600, fontSize: 12, borderBottom: "1px solid var(--dsw-alias-border-l2, #e5e7eb)" } }, node.title),
				...body,
			);
		}
		const menuRowStyle = {
			textAlign: "left",
			padding: "7px 12px",
			border: "none",
			background: "transparent",
			fontSize: 13,
			color: "var(--dsw-alias-label-primary, #1e232c)",
			cursor: "pointer",
		};
		//#endregion

		//#region dsh-ariadne: canvas
		function MiniMap({ rectById, canvas, view, viewport, activeNodeId, focused, open, onToggle, onNavigate }) {
			if (!open) {
				return React.createElement("button", { className: "bs-minimap-toggle", onPointerDown: (event) => event.stopPropagation(), onClick: onToggle, title: "展开缩略图", "aria-label": "展开缩略图" }, "⌑");
			}
			const viewRect = {
				x: -view.tx / view.scale,
				y: -view.ty / view.scale,
				w: (viewport.usableW || viewport.w) / view.scale,
				h: viewport.h / view.scale,
			};
			return React.createElement(
				"div",
				{
					className: "bs-minimap",
					"data-focused": focused ? "true" : "false",
					"aria-label": "地图缩略图",
					onPointerDown: (event) => event.stopPropagation(),
					onClick: (event) => {
						const rect = event.currentTarget.getBoundingClientRect();
						onNavigate({ x: ((event.clientX - rect.left) / rect.width) * canvas.w, y: ((event.clientY - rect.top) / rect.height) * canvas.h });
					},
				},
				React.createElement("button", { className: "bs-minimap-close", onPointerDown: (event) => event.stopPropagation(), onClick: (event) => { event.stopPropagation(); onToggle(); }, title: "收起缩略图", "aria-label": "收起缩略图" }, "−"),
				React.createElement(
					"svg",
					{ viewBox: `0 0 ${canvas.w} ${canvas.h}`, preserveAspectRatio: "none" },
					...[...rectById].map(([id, rect]) =>
						React.createElement("rect", {
							key: id,
							className: `bs-minimap-node${id === activeNodeId ? " bs-active" : ""}`,
							x: rect.x,
							y: rect.y,
							width: rect.w,
							height: rect.h,
							rx: 4,
						}),
					),
					React.createElement("rect", { className: "bs-minimap-viewport", x: viewRect.x, y: viewRect.y, width: viewRect.w, height: viewRect.h, rx: 8, vectorEffect: "non-scaling-stroke" }),
				),
			);
		}

		function MapCanvas({ map, phase, t, session, offsets, onOffsetChange, sizes, onSizeChange, fitNonce, activeNodeId, onActiveNodeChange, focusId, onFocusIdChange, collapsedIds, onToggleCollapse, minimapOpen, onToggleMinimap, dockOpen, dockWidth }) {
			const containerRef = useRef(null);
			const [view, setView] = useState({ scale: 0.78, tx: 80, ty: 60 });
			const [viewport, setViewport] = useState({ w: 0, h: 0, usableW: 0 });
			const [menu, setMenu] = useState(null);
			const dragRef = useRef(null);

			const facts = useMemo(() => treeFacts(map), [map]);
			const roots = useMemo(() => new Set(facts.roots.map((root) => root.id)), [facts]);
			const collapsed = useMemo(() => new Set(collapsedIds ?? []), [collapsedIds]);
			const subtreeSet = useMemo(() => {
				if (!focusId) return null;
				const set = new Set([focusId]);
				const walk = (id) => {
					for (const kid of facts.children.get(id) ?? []) {
						set.add(kid.id);
						walk(kid.id);
					}
				};
				walk(focusId);
				return set;
			}, [facts, focusId]);
			const path = useMemo(() => activePathFacts(map, activeNodeId), [map, activeNodeId]);
			const hot = useMemo(() => heatRank(map, facts), [map, facts]);
			const sizeOf = useMemo(() => {
				return (node) => measureNode(node, roots.has(node.id), sizes[node.id]);
			}, [roots, sizes]);

			const { positions, groups, chain, canvas } = useMemo(() => layoutFor(map, phase, sizeOf, collapsed), [map, phase, sizeOf, collapsed]);
			const finalPositions = useMemo(() => {
				const next = new Map(positions);
				for (const [id, pos] of positions) {
					const offset = offsets[id];
					if (offset) next.set(id, { x: pos.x + offset.dx, y: pos.y + offset.dy });
				}
				return next;
			}, [positions, offsets]);

			const { rectById, finalGroups, stageCanvas, viewRects } = useMemo(() => {
				const rectById = new Map();
				for (const [id, pos] of finalPositions) {
					if (id === "__topic__") {
						rectById.set(id, { x: pos.x - TOPIC_SIZE.w / 2, y: pos.y - TOPIC_SIZE.h / 2, ...TOPIC_SIZE });
						continue;
					}
					const node = facts.byId.get(id);
					if (!node) continue;
					rectById.set(id, rectOf(node, pos, sizeOf(node)));
				}
				const finalGroups = groups.map((group) => {
					let bounds = null;
					for (const id of group.ids) {
						const rect = rectById.get(id);
						if (rect) bounds = bounds ? union(bounds, rect) : rect;
					}
					return { ...group, bounds: bounds ? { x: bounds.x - 28, y: bounds.y - 50, w: bounds.w + 56, h: bounds.h + 78 } : group.bounds };
				});
				const stageCanvas = {
					w: Math.ceil(Math.max(canvas.w, ...[...rectById.values()].map((rect) => rect.x + rect.w + 80))),
					h: Math.ceil(Math.max(canvas.h, ...[...rectById.values()].map((rect) => rect.y + rect.h + 80))),
				};
				const viewRects = rectById.size > 0 ? [...rectById.values()] : [{ x: 0, y: 0, w: stageCanvas.w, h: stageCanvas.h }];
				return { rectById, finalGroups, stageCanvas, viewRects };
			}, [finalPositions, facts, sizeOf, groups, canvas]);

			useEffect(() => {
				const element = containerRef.current;
				if (!element) return;
				const measure = () => {
					const rect = element.getBoundingClientRect();
					const dock = element.closest(".bs-workbench-body")?.querySelector(".bs-focus-dock");
					const covered = dock && getComputedStyle(dock).position === "absolute" ? dock.getBoundingClientRect().width : 0;
					setViewport({ w: Math.round(rect.width), h: Math.round(rect.height), usableW: Math.round(Math.max(280, rect.width - covered)) });
				};
				measure();
				if (typeof ResizeObserver === "undefined") return;
				const observer = new ResizeObserver(measure);
				observer.observe(element);
				return () => observer.disconnect();
			}, [dockOpen, dockWidth]);

			useEffect(() => {
				if (viewport.w < 80 || viewport.h < 80) return;
				const boxes = [];
				if (subtreeSet) {
					for (const [id, box] of rectById) {
						if (id === "__topic__") continue;
						if (subtreeSet.has(id)) boxes.push(box);
					}
				} else {
					boxes.push(...rectById.values());
				}
				if (boxes.length === 0) return;
				const minX = Math.min(...boxes.map((b) => b.x));
				const maxX = Math.max(...boxes.map((b) => b.x + b.w));
				const minY = Math.min(...boxes.map((b) => b.y));
				const maxY = Math.max(...boxes.map((b) => b.y + b.h));
				const bw = Math.max(160, maxX - minX);
				const bh = Math.max(160, maxY - minY);
				const rawScale = Math.min((viewport.usableW - 84) / bw, (viewport.h - 84) / bh);
				const scale = subtreeSet ? Math.min(1.35, Math.max(0.78, rawScale)) : rawScale < 0.65 ? 0.78 : Math.min(1.05, Math.max(0.65, rawScale));
				const activeCenter = !subtreeSet && rawScale < 0.65 && rectById.has(activeNodeId) ? centerOf(rectById.get(activeNodeId)) : null;
				setView({
					scale,
					tx: activeCenter ? viewport.usableW / 2 - activeCenter.x * scale : (viewport.usableW - bw * scale) / 2 - minX * scale,
					ty: activeCenter ? viewport.h / 2 - activeCenter.y * scale : (viewport.h - bh * scale) / 2 - minY * scale,
				});
			}, [positions, phase, fitNonce, focusId, activeNodeId, viewport.usableW, viewport.h]);

			useEffect(() => {
				const box = rectById.get(activeNodeId);
				if (!box || viewport.w < 80 || viewport.h < 80) return;
				const center = centerOf(box);
				const screen = { x: center.x * view.scale + view.tx, y: center.y * view.scale + view.ty };
				if (screen.x > 70 && screen.x < viewport.usableW - 70 && screen.y > 70 && screen.y < viewport.h - 70) return;
				setView((current) => ({ ...current, tx: viewport.usableW / 2 - center.x * current.scale, ty: viewport.h / 2 - center.y * current.scale }));
			}, [activeNodeId, viewport.usableW, viewport.h]);

			useEffect(() => {
				if (!menu) return;
				const close = () => setMenu(null);
				window.addEventListener("pointerdown", close);
				return () => window.removeEventListener("pointerdown", close);
			}, [menu]);

			const onWheel = (event) => {
				event.preventDefault();
				const rect = containerRef.current?.getBoundingClientRect();
				if (!rect) return;
				const px = event.clientX - rect.left;
				const py = event.clientY - rect.top;
				setView((current) => {
					const nextScale = Math.min(2.2, Math.max(0.35, current.scale * (event.deltaY < 0 ? 1.1 : 0.9)));
					const ratio = nextScale / current.scale;
					return constrainCanvasView({ scale: nextScale, tx: px - (px - current.tx) * ratio, ty: py - (py - current.ty) * ratio }, viewRects, viewport);
				});
			};
			useEffect(() => {
				const node = containerRef.current;
				if (!node) return;
				node.addEventListener("wheel", onWheel, { passive: false });
				return () => node.removeEventListener("wheel", onWheel);
			});

			const onPointerDown = (event) => {
				if (event.button !== undefined && event.button !== 0) return;
				if (event.target.closest?.(".bs-node, .bs-minimap, button, input, textarea, select, a")) return;
				dragRef.current = { x: event.clientX, y: event.clientY, tx: view.tx, ty: view.ty };
				try {
					event.currentTarget.setPointerCapture(event.pointerId);
				} catch {}
			};
			const onPointerMove = (event) => {
				const drag = dragRef.current;
				if (!drag) return;
				setView((current) =>
					constrainCanvasView(
						{ ...current, tx: drag.tx + (event.clientX - drag.x), ty: drag.ty + (event.clientY - drag.y) },
						viewRects,
						viewport,
					),
				);
			};
			const endPointerDrag = () => {
				dragRef.current = null;
			};

			const openMenu = (node, pos, event) => {
				const rect = containerRef.current.getBoundingClientRect();
				const position = nodeMenuPosition(event.clientX - rect.left, event.clientY - rect.top + 8, viewport.usableW || rect.width, rect.height);
				onActiveNodeChange(node.id);
				setMenu({ node, ...position });
			};

			const edges = useMemo(() => {
				const obstaclesFor = (from, to) => [...rectById].filter(([id]) => id !== from && id !== to && id !== "__topic__").map(([, rect]) => rect);
				const makeEdge = (from, to, key, exec = false) => {
					const source = rectById.get(from);
					const target = rectById.get(to);
					if (!source || !target) return null;
					const route = routeOrthogonal(source, target, obstaclesFor(from, to));
					return { key, from, to, d: route.d, collisions: route.collisions, exec };
				};
				const edges = [];
				if (phase === "executing") {
					for (let i = 0; i < chain.length - 1; i += 1) {
						const edge = makeEdge(chain[i], chain[i + 1], `chain-${i}`, true);
						if (edge) edges.push(edge);
					}
				} else {
					for (const root of facts.roots) {
						const edge = makeEdge("__topic__", root.id, topicEdgeKey(root.id));
						if (edge) edges.push(edge);
					}
					for (const link of map.links) {
						if (link.kind !== "parent") continue;
						const edge = makeEdge(link.from, link.to, `${link.from}->${link.to}`);
						if (edge) edges.push(edge);
					}
				}
				return edges;
			}, [rectById, phase, chain, facts, map.links]);
			const topicRect = rectById.get("__topic__");

			return React.createElement(
				"div",
				{
					ref: containerRef,
					className: "bs-root",
					onPointerDown,
					onPointerMove,
					onPointerUp: endPointerDrag,
					onPointerCancel: endPointerDrag,
					onLostPointerCapture: endPointerDrag,
				},
				React.createElement(
					"div",
					{
						className: `bs-stage bs-fade`,
						style: { width: stageCanvas.w, height: stageCanvas.h, transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})` },
						onDoubleClick: () => onFocusIdChange(null),
					},
					React.createElement(
						"svg",
						{ width: stageCanvas.w, height: stageCanvas.h, style: { position: "absolute", left: 0, top: 0, overflow: "visible" } },
						phase === "exploring" &&
							finalGroups.map((group) => {
								const color = branchColorOf(map, group.root, phase);
								const bounds = group.bounds;
								const dimmed = subtreeSet !== null && !subtreeSet.has(group.root.id);
								return React.createElement(
									"g",
									{
										key: `group-${group.root.id}`,
										"data-root-id": group.root.id,
										style: dimmed ? { opacity: 0.12 } : undefined,
										onDoubleClick: (event) => {
											event.stopPropagation();
											onActiveNodeChange(group.root.id);
											onFocusIdChange(focusId === group.root.id ? null : group.root.id);
										},
									},
									React.createElement("rect", {
										className: "bs-group",
										x: bounds.x,
										y: bounds.y,
										width: bounds.w,
										height: bounds.h,
										rx: 14,
										fill: `${color}0B`,
										stroke: `${color}38`,
									}),
									React.createElement("g", { transform: `translate(${bounds.x + 16}, ${bounds.y + 21})` },
										React.createElement("circle", { cx: 3, cy: -4, r: 3, fill: color }),
										React.createElement("text", { x: 13, y: 0, className: "bs-group-label", fill: color, fontSize: 12 }, group.root.title.length > 28 ? `${group.root.title.slice(0, 28)}…` : group.root.title),
						React.createElement("text", { x: 13, y: 17, fill: "var(--dsw-alias-label-secondary, #667085)", fontSize: 10.5 }, `${group.ids.length} 个节点`),
									),
								);
							}),
						...edges.map((edge) => {
							const active = path.edgeKeys.has(edge.key);
							const secondary = path.secondaryEdgeKeys.has(edge.key);
							const dimmed = subtreeSet !== null && !active && !(subtreeSet.has(edge.from) && subtreeSet.has(edge.to));
							return React.createElement("path", {
								key: edge.key,
								className: `bs-edge${edge.exec ? " bs-exec" : ""}${active ? " bs-path" : ""}${secondary ? " bs-secondary" : ""}${dimmed ? " bs-dim" : ""}`,
								d: edge.d,
								"data-edge-key": edge.key,
								"data-from": edge.from,
								"data-to": edge.to,
								"data-collisions": edge.collisions,
							});
						}),
					),
					phase === "exploring" &&
						topicRect &&
						React.createElement(
							"div",
							{
								className: "bs-node bs-topic bs-path",
								"data-node-id": "__topic__",
								style: {
									left: topicRect.x,
									top: topicRect.y,
									width: topicRect.w,
									height: topicRect.h,
									background: "linear-gradient(135deg, #3f62d6, #5878e3)",
									color: "#fff",
									border: "none",
									zIndex: 2,
								},
							},
							map.topic,
						),
						...map.nodes.map((node) => {
							const pos = positions.get(node.id);
						if (!pos) return null;
							return React.createElement(NodeCard, {
								key: node.id,
								node,
								pos,
								offset: offsets[node.id],
								size: sizeOf(node),
								viewScale: view.scale,
							branchColor: branchColorOf(map, node, phase),
							isQuestion: (facts.children.get(node.id)?.length ?? 0) > 0,
							isKey: hot.has(node.id),
							isRoot: roots.has(node.id),
							selected: (map.selectedIds ?? []).includes(node.id),
							active: activeNodeId === node.id,
							inPath: path.nodeIds.has(node.id),
							collapsed: collapsed.has(node.id),
							statusLabel: t(`status.${node.status}`),
							dim: subtreeSet !== null && !subtreeSet.has(node.id) && !path.nodeIds.has(node.id),
							onDoubleClick: (doubleNode) => {
								setMenu(null);
								onActiveNodeChange(doubleNode.id);
								onFocusIdChange(focusId === doubleNode.id ? null : doubleNode.id);
							},
							onMenu: openMenu,
							onToggleCollapse,
							onDrag: (dragged, dx, dy) =>
								onOffsetChange((prev) => ({ ...prev, [dragged.id]: { dx: Math.round(dx / 12) * 12, dy: Math.round(dy / 12) * 12 } })),
							onResize: (resized, w, h) =>
								onSizeChange((prev) => ({
									...prev,
									[resized.id]: {
										w: Math.max(160, Math.min(360, Math.round(w))),
										h: Math.max(64, Math.min(240, Math.round(h))),
									},
								})),
						});
					}),
					phase === "executing" && chain.length === 0 && React.createElement("div", { className: "bs-chain-hint" }, t("executing.hint")),
				),
				menu && React.createElement(NodeMenu, { node: menu.node, x: menu.x, y: menu.y, t, session, map, onFocus: (nodeId) => { onActiveNodeChange(nodeId); onFocusIdChange(nodeId); }, onClose: () => setMenu(null) }),
				React.createElement("div", { className: "bs-zoom-readout" }, `${Math.round(view.scale * 100)}%`),
				React.createElement(MiniMap, {
					rectById,
					canvas: stageCanvas,
					view,
					viewport,
					activeNodeId,
					focused: subtreeSet !== null,
					open: minimapOpen,
					onToggle: onToggleMinimap,
					onNavigate: (point) =>
						setView((current) =>
							constrainCanvasView(
								{ ...current, tx: viewport.usableW / 2 - point.x * current.scale, ty: viewport.h / 2 - point.y * current.scale },
								viewRects,
								viewport,
							),
						),
				}),
				subtreeSet !== null &&
					React.createElement(
						"button",
						{ className: "bs-focus-exit", onClick: () => onFocusIdChange(null) },
						"退出聚焦",
					),
			);
		}
		//#endregion

		//#region dsh-ariadne: toolbar / switch / project / focus
		function BrainstormSwitch({ sessionId, t, map }) {
			const enabled = useSessionEnabled(sessionId);
			const [busy, setBusy] = useState(false);
			const activeRun = map?.executionRun && !["completed", "cancelled"].includes(map.executionRun.status);
			useEffect(() => {
				enabledStore.refresh(sessionId);
			}, [sessionId]);
			const isOn = enabled === true;
			const label = enabled === "loading" ? t("toggle.loading") : enabled === "error" ? `${t("toggle.label")} !` : `${t("toggle.label")} ${isOn ? t("toggle.on") : t("toggle.off")}`;
			return React.createElement(
				"button",
				{
					className: "bs-switch",
					"data-on": isOn ? "true" : "false",
					"data-busy": busy ? "true" : "false",
					disabled: busy || !!activeRun,
					onClick: () => {
						if (busy || activeRun) return;
						if (enabled !== true && enabled !== false) {
							enabledStore.refresh(sessionId);
							return;
						}
						setBusy(true);
						enabledStore.toggle(sessionId).catch((error) => {
							console.error("[dsh-ariadne] toggle failed:", error);
							enabledStore.refresh(sessionId);
						}).finally(() => setBusy(false));
					},
					"aria-pressed": isOn,
					title: activeRun ? t("execution.frozen") : t("view.disabled.hint"),
				},
				React.createElement("span", { className: "bs-switch-dot" }),
				busy ? t("toggle.loading") : label,
			);
		}

		function Segmented({ options, value, onChange }) {
			return React.createElement(
				"div",
				{ className: "bs-seg" },
				...options.map((option) =>
					React.createElement("button", { key: option.value, "data-active": value === option.value ? "true" : "false", onClick: () => onChange(option.value) }, option.label),
				),
			);
		}
		function ToolButton({ label, onClick, title, disabled, kind }) {
			return React.createElement("button", { className: "bs-tool", "data-kind": kind, onClick, title, disabled }, label);
		}
		function FrameBar({ map, session, t }) {
			const [editing, setEditing] = useState(false);
			const [goal, setGoal] = useState(map.frame?.goal ?? "");
			const [principle, setPrinciple] = useState(map.frame?.organizingPrinciple ?? "");
			const [busy, setBusy] = useState(false);
			const [error, setError] = useState("");
			useEffect(() => {
				if (editing) return;
				setGoal(map.frame?.goal ?? "");
				setPrinciple(map.frame?.organizingPrinciple ?? "");
			}, [editing, map.frame?.goal, map.frame?.organizingPrinciple]);
			const save = async () => {
				setBusy(true);
				setError("");
				try {
					await directOp(session, { type: "set-frame", goal, organizingPrinciple: principle });
					setEditing(false);
				} catch (cause) {
					setError(cause?.message ?? String(cause));
				} finally {
					setBusy(false);
				}
			};
			if (editing) {
				return React.createElement("div", { className: "bs-frame-bar" },
					React.createElement("div", { className: "bs-frame-edit" },
						React.createElement("input", { value: goal, maxLength: 500, placeholder: t("frame.goal"), onChange: (event) => setGoal(event.target.value) }),
						React.createElement("input", { value: principle, maxLength: 500, placeholder: t("frame.organizingPrinciple"), onChange: (event) => setPrinciple(event.target.value) }),
						React.createElement("div", { className: "bs-edit-actions", style: { margin: 0 } },
							React.createElement("button", { onClick: save, disabled: busy }, t("frame.save")),
							React.createElement("button", { onClick: () => setEditing(false), disabled: busy }, t("frame.cancel")),
						),
					),
					error && React.createElement("span", { className: "bs-detail-error" }, error),
				);
			}
			if (!map.frame) return React.createElement("div", { className: "bs-frame-bar" }, React.createElement("button", { className: "bs-frame-empty", onClick: () => setEditing(true) }, `＋ ${t("frame.empty")}`));
			return React.createElement("div", { className: "bs-frame-bar" },
				React.createElement("div", { className: "bs-frame-item" }, React.createElement("strong", null, `${t("frame.goal")}：`), React.createElement("span", { title: map.frame.goal }, map.frame.goal || "—")),
				React.createElement("div", { className: "bs-frame-item", style: { flex: 1 } }, React.createElement("strong", null, `${t("frame.organizingPrinciple")}：`), React.createElement("span", { title: map.frame.organizingPrinciple }, map.frame.organizingPrinciple || "—")),
				React.createElement("button", { className: "bs-frame-empty", onClick: () => setEditing(true) }, t("frame.edit")),
			);
		}
		function DisabledView({ t, sessionId }) {
			return React.createElement(
				"div",
				{ style: { padding: 40, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" } },
				React.createElement("h3", null, t("view.disabled.title")),
				React.createElement("p", { style: { color: "var(--dsw-alias-label-secondary, #667085)", margin: 0, maxWidth: 560 } }, t("view.disabled.hint")),
				React.createElement(BrainstormSwitch, { sessionId, t }),
			);
		}
		function EmptyMapView({ t, session }) {
			const [pending, setPending] = useState(false);
			const [error, setError] = useState("");
			const start = async (prompt) => {
				setPending(true);
				setError("");
				try {
					await queuePrompt(session, prompt);
				} catch (cause) {
					setPending(false);
					setError(cause?.message ?? String(cause));
				}
			};
			return React.createElement(
				"div",
				{ className: "bs-workbench", style: { padding: 24 } },
				React.createElement(
					"section",
					{ className: "bs-empty-map" },
					React.createElement("h3", null, t("backfill.title")),
					React.createElement("p", null, t("backfill.hint")),
					!pending && React.createElement(
						"div",
						{ className: "bs-backfill-actions" },
						React.createElement(
							"button",
							{ className: "bs-backfill-card", "data-primary": "true", onClick: () => start(createPrompt()) },
							React.createElement("strong", null, t("backfill.current")),
							React.createElement("span", { className: "bs-prep-summary" }, t("backfill.currentHint")),
						),
						React.createElement("button", { className: "bs-backfill-card", onClick: () => start(backfillPrompt()) }, React.createElement("strong", null, t("backfill.action")), React.createElement("span", { className: "bs-prep-summary" }, t("backfill.actionHint"))),
					),
					pending && React.createElement(
						"div",
						{ className: "bs-backfill-progress" },
						React.createElement("span", { className: "bs-backfill-spinner" }),
						React.createElement("span", { style: { flex: 1 } }, t("backfill.running")),
						React.createElement("button", { className: "bs-tool", onClick: () => setPending(false) }, t("backfill.retry")),
					),
					error && React.createElement("div", { className: "bs-detail-error" }, error),
				),
			);
		}
		function ExecutionGraphView({ graph, run, selectedId, onSelect, t }) {
			const layout = useMemo(() => executionGraphLayout(graph), [graph]);
			const viewportRef = useRef(null);
			const dragRef = useRef(null);
			const [viewport, setViewport] = useState({ w: 0, h: 0 });
			const [view, setView] = useState({ scale: 1, tx: 20, ty: 20 });
			const path = executionDisplayPath(graph, run);
			const activeEdges = new Set(path.slice(1).map((id, index) => path[index] + "->" + id));
			const remaining = executionRemainingIds(graph, run);
			const fit = () => {
				const rect = viewportRef.current?.getBoundingClientRect();
				if (!rect?.width || !rect?.height) return;
				const scale = Math.max(.05, Math.min(1, (rect.width - 36) / layout.width, (rect.height - 44) / layout.height));
				setView({ scale, tx: (rect.width - layout.width * scale) / 2, ty: (rect.height - layout.height * scale) / 2 });
			};
			useEffect(() => {
				const element = viewportRef.current;
				if (!element) return;
				const measure = () => { const rect = element.getBoundingClientRect(); setViewport({ w: rect.width, h: rect.height }); };
				measure();
				const observer = new ResizeObserver(measure);
				observer.observe(element);
				return () => observer.disconnect();
			}, []);
			useEffect(fit, [layout.width, layout.height, viewport.w, viewport.h]);
			useEffect(() => {
				const element = viewportRef.current;
				if (!element) return;
				const wheel = (event) => {
					event.preventDefault();
					const rect = element.getBoundingClientRect();
					const px = event.clientX - rect.left;
					const py = event.clientY - rect.top;
					setView((current) => {
						const scale = Math.max(.05, Math.min(1.8, current.scale * (event.deltaY < 0 ? 1.1 : .9)));
						const ratio = scale / current.scale;
						return { scale, tx: px - (px - current.tx) * ratio, ty: py - (py - current.ty) * ratio };
					});
				};
				element.addEventListener("wheel", wheel, { passive: false });
				return () => element.removeEventListener("wheel", wheel);
			}, []);
			const down = (event) => {
				if (event.button !== 0 || event.target.closest("button")) return;
				dragRef.current = { x: event.clientX, y: event.clientY, tx: view.tx, ty: view.ty };
				event.currentTarget.setPointerCapture(event.pointerId);
			};
			const move = (event) => {
				const drag = dragRef.current;
				if (!drag) return;
				const dx = event.clientX - drag.x;
				const dy = event.clientY - drag.y;
				setView((current) => ({ ...current, tx: drag.tx + dx, ty: drag.ty + dy }));
			};
			const stop = () => { dragRef.current = null; };
			const zoom = (factor) => {
				const rect = viewportRef.current?.getBoundingClientRect();
				const px = (rect?.width ?? 0) / 2;
				const py = (rect?.height ?? 0) / 2;
				setView((current) => {
					const scale = Math.max(.05, Math.min(1.8, current.scale * factor));
					const ratio = scale / current.scale;
					return { scale, tx: px - (px - current.tx) * ratio, ty: py - (py - current.ty) * ratio };
				});
			};
			return React.createElement("div", { className: "bs-exec-chart", ref: viewportRef, onPointerDown: down, onPointerMove: move, onPointerUp: stop, onPointerCancel: stop, onLostPointerCapture: stop },
				React.createElement("div", { className: "bs-exec-stage", style: { width: layout.width, height: layout.height, transform: "translate(" + view.tx + "px," + view.ty + "px) scale(" + view.scale + ")" } },
					React.createElement("svg", { width: layout.width, height: layout.height, "aria-label": t("execution.graph") },
						React.createElement("defs", null, React.createElement("marker", { id: "bs-execution-arrow", viewBox: "0 0 8 8", refX: 7, refY: 4, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" }, React.createElement("path", { d: "M 0 0 L 8 4 L 0 8 z", fill: "context-stroke" }))),
						...graph.edges.map((edge) => {
							const from = layout.rects[edge.from];
							const to = layout.rects[edge.to];
							const route = routeOrthogonal(from, to, Object.entries(layout.rects).filter(([id]) => id !== edge.from && id !== edge.to).map(([, rect]) => rect));
							const point = route.points[Math.floor(route.points.length / 2)];
							const unvisited = run && !activeEdges.has(edge.from + "->" + edge.to) && !remaining.has(edge.to) && run.nodeStates[edge.to]?.status === "pending";
							const label = [edge.condition === "route" ? edge.routeKey : edge.condition === "failure" ? "failure" : "", edge.label].filter(Boolean).join(" · ");
							return React.createElement("g", { key: edge.id },
								React.createElement("path", { className: "bs-exec-edge", d: route.d, markerEnd: "url(#bs-execution-arrow)", "data-execution-edge-id": edge.id, "data-condition": edge.condition, "data-active": activeEdges.has(edge.from + "->" + edge.to) ? "true" : "false", "data-unvisited": unvisited ? "true" : "false" }),
								label && React.createElement("text", { className: "bs-exec-edge-label", x: point.x + 5, y: point.y - 7 }, label),
							);
						}),
					),
					...graph.nodes.map((node) => {
						const state = run?.nodeStates[node.id];
						const status = state?.status === "pending" && !remaining.has(node.id) ? "unvisited" : state?.status ?? "pending";
						const rect = layout.rects[node.id];
						const symbol = node.kind === "decision" ? "◇" : node.kind === "checkpoint" ? "Ⅱ" : "□";
						return React.createElement("button", { key: node.id, className: "bs-exec-node", style: { left: rect.x, top: rect.y, width: rect.w, height: rect.h }, "data-execution-node-id": node.id, "data-kind": node.kind, "data-status": status, "data-current": run?.currentNodeId === node.id ? "true" : "false", "data-selected": selectedId === node.id ? "true" : "false", onClick: () => onSelect(node.id) },
							React.createElement("small", null, symbol + " " + t("execution." + node.kind)),
							React.createElement("strong", null, node.title),
							React.createElement("small", null, t("execution.status." + status)),
						);
					}),
				),
				React.createElement("div", { className: "bs-exec-controls" },
					React.createElement(ToolButton, { label: "−", onClick: () => zoom(1 / 1.15) }),
					React.createElement("span", null, Math.round(view.scale * 100) + "%"),
					React.createElement(ToolButton, { label: "+", onClick: () => zoom(1.15) }),
					React.createElement(ToolButton, { label: t("execution.fit"), onClick: fit }),
				),
			);
		}

		function ExecutionNodeInspector({ node, map, session, t, busy, agentBusy, onAction, onExecute, onJumpSource }) {
			const run = map.executionRun;
			const result = run?.nodeStates[node.id];
			const current = run?.currentNodeId === node.id && !["completed", "cancelled"].includes(run.status);
			const [editing, setEditing] = useState(false);
			const draftFor = () => ({ title: node.title, instruction: node.instruction, completionCriteria: node.completionCriteria.join("\n"), requiredInputs: (node.requiredInputs ?? []).join("\n"), expectedOutputs: (node.expectedOutputs ?? []).join("\n") });
			const [draft, setDraft] = useState(draftFor);
			useEffect(() => { setEditing(false); setDraft(draftFor()); }, [node.id, map.finalPlan.generatedAt, run?.id]);
			const lines = (value) => value.split("\n").map((line) => line.trim()).filter(Boolean);
			const save = async () => {
				if (run) return;
				const result = await onAction([
					{ type: "set-execution-node-title", nodeId: node.id, title: draft.title },
					{ type: "set-execution-node-instruction", nodeId: node.id, instruction: draft.instruction },
					{ type: "set-execution-node-criteria", nodeId: node.id, completionCriteria: lines(draft.completionCriteria) },
					{ type: "set-execution-node-inputs", nodeId: node.id, requiredInputs: lines(draft.requiredInputs) },
					{ type: "set-execution-node-outputs", nodeId: node.id, expectedOutputs: lines(draft.expectedOutputs) },
				]);
				if (result) setEditing(false);
			};
			const list = (label, values) => React.createElement(React.Fragment, null, React.createElement("h4", null, label), values?.length ? React.createElement("ul", null, ...values.map((value, index) => React.createElement("li", { key: index }, value))) : React.createElement("p", { className: "bs-exec-hint" }, t("execution.none")));
			const field = (name, label, multiline = true) => React.createElement("label", { key: name }, label, React.createElement(multiline ? "textarea" : "input", { className: "bs-detail-field", value: draft[name], onChange: (event) => setDraft((current) => ({ ...current, [name]: event.target.value })) }));
			return React.createElement("aside", { className: "bs-exec-inspector", "data-inspecting-node": node.id },
				React.createElement("div", { className: "bs-plan-kicker" }, t("execution." + node.kind) + (current ? " · " + t("execution.current") : "")),
				editing && !run ? React.createElement(React.Fragment, null,
					field("title", t("dock.editTitle"), false),
					field("instruction", t("execution.instruction")),
					field("completionCriteria", t("execution.criteria")),
					field("requiredInputs", t("execution.inputs")),
					field("expectedOutputs", t("execution.outputs")),
					React.createElement("div", { className: "bs-exec-actions" }, React.createElement(ToolButton, { label: t("execution.save"), kind: "primary", disabled: busy, onClick: save }), React.createElement(ToolButton, { label: t("dock.cancel"), disabled: busy, onClick: () => setEditing(false) })),
				) : React.createElement(React.Fragment, null,
					React.createElement("h3", null, node.title),
					!run && React.createElement("div", { className: "bs-exec-actions" }, React.createElement(ToolButton, { label: t("execution.edit"), onClick: () => { setDraft(draftFor()); setEditing(true); } })),
					current && React.createElement("div", { className: "bs-exec-actions" },
						result?.status === "ready" && React.createElement(ToolButton, { label: t("execution.runNode"), kind: "primary", disabled: busy || agentBusy, onClick: () => onExecute(node.id) }),
						["failed", "blocked"].includes(result?.status) && React.createElement(ToolButton, { label: t("execution.retry"), kind: "primary", disabled: busy || agentBusy, onClick: () => onExecute(node.id, true) }),
						node.kind === "checkpoint" && result?.status === "waiting" && React.createElement(ToolButton, { label: t("execution.approve"), kind: "primary", disabled: busy, onClick: () => onAction({ type: "approve-execution-checkpoint", nodeId: node.id }) }),
						result?.status === "running" && !agentBusy && React.createElement(ToolButton, { label: t("execution.reset"), disabled: busy, onClick: () => onAction({ type: "reset-execution-node", nodeId: node.id, reason: "User restored an idle interrupted node" }) }),
					),
					React.createElement("h4", null, t("execution.instruction")),
					React.createElement("p", null, node.instruction),
					list(t("execution.inputs"), node.requiredInputs),
					list(t("execution.outputs"), node.expectedOutputs),
					list(t("execution.criteria"), node.completionCriteria),
				),
				React.createElement("h4", null, t("plan.sources")),
				React.createElement("div", { className: "bs-plan-actions", style: { marginTop: 0 } }, ...node.sourceNodeIds.map((id) => React.createElement("button", { className: "bs-plan-source", key: id, onClick: () => onJumpSource(id) }, map.nodes.find((source) => source.id === id)?.title ?? id))),
				run && React.createElement("p", { className: "bs-exec-hint" }, t("execution.frozen")),
				current && node.kind === "checkpoint" && React.createElement("p", { className: "bs-exec-hint" }, t("execution.waitingHint")),
				current && agentBusy && node.kind !== "checkpoint" && React.createElement("p", { className: "bs-exec-hint" }, t("execution.agentBusy")),
				current && result?.status === "running" && !agentBusy && React.createElement("p", { className: "bs-exec-hint" }, t("execution.recoveryHint")),
				result && React.createElement("div", { className: "bs-exec-results" },
					React.createElement("h4", null, t("execution.status." + result.status) + " · " + t("execution.attempts") + " " + result.attempts),
					result.summary && React.createElement(React.Fragment, null, React.createElement("h4", null, t("execution.summary")), React.createElement("p", null, result.summary)),
					result.routeKey && React.createElement("p", null, "routeKey: " + result.routeKey),
					result.outputRefs?.length > 0 && list(t("execution.outputRefs"), result.outputRefs),
					result.evidence?.length > 0 && list(t("execution.evidence"), result.evidence),
				),
			);
		}

		function ExecutionView({ map, session, t, onShowMap, onOpenCandidate, onJumpSource }) {
			const [busy, setBusy] = useState(false);
			const [generating, setGenerating] = useState(false);
			const [error, setError] = useState("");
			const [exportPath, setExportPath] = useState("");
			const [query, setQuery] = useState("");
			const [rootFilter, setRootFilter] = useState("");
			const [viewMode, setViewMode] = useState(() => isLinearPlanGraph(map.finalPlan?.graph) ? "list" : "graph");
			const [selectedExecutionId, setSelectedExecutionId] = useState(map.executionRun?.currentNodeId ?? map.finalPlan?.graph?.startNodeId ?? "");
			const snapshot = useSyncExternalStore((notify) => session.subscribe?.(notify) ?? (() => {}), () => session.getSnapshot?.() ?? EMPTY_SESSION_SNAPSHOT, () => EMPTY_SESSION_SNAPSHOT);
			const agentBusy = snapshot.running || (snapshot.queue?.length ?? 0) > 0;
			const selectedNodes = (map.selectedIds ?? []).map((id) => map.nodes.find((node) => node.id === id)).filter(Boolean);
			useEffect(() => { setGenerating(false); setExportPath(""); setError(""); setViewMode(isLinearPlanGraph(map.finalPlan?.graph) ? "list" : "graph"); setSelectedExecutionId(map.executionRun?.currentNodeId ?? map.finalPlan?.graph?.startNodeId ?? ""); }, [map.finalPlan?.generatedAt]);
			useEffect(() => { if (map.executionRun?.currentNodeId) setSelectedExecutionId(map.executionRun.currentNodeId); }, [map.executionRun?.currentNodeId]);
			const run = async (fn) => {
				setBusy(true);
				setError("");
				try {
					return await fn();
				} catch (cause) {
					setError(cause?.message ?? String(cause));
					return null;
				} finally {
					setBusy(false);
				}
			};
			const askForPlan = async (regenerate) => {
				setGenerating(true);
				setError("");
				try {
					await queuePrompt(session, planPrompt(map, regenerate));
				} catch (cause) {
					setError(cause?.message ?? String(cause));
				} finally {
					setGenerating(false);
				}
			};
			const continueExploring = async () => {
				if (map.phase === "executing") {
					const result = await run(() => directOp(session, { type: "return-to-exploring", stopAgent: map.executionRun?.status === "running" }));
					if (!result) return;
				}
				onShowMap();
			};
			const exportPlan = async () => {
				const result = await run(() => directOp(session, { type: "export-execution", format: "both" }));
				if (result?.paths) setExportPath(Object.values(result.paths).join(" · "));
			};
			const executeNode = async (nodeId, retry = false) => {
				setBusy(true);
				setError("");
				try {
					if (retry) await directOp(session, { type: "retry-execution-node", nodeId });
					const begun = await directOp(session, { type: "begin-execution-node", nodeId });
					const currentMap = begun.map;
					const node = currentMap.finalPlan.graph.nodes.find((item) => item.id === nodeId);
					try {
						await queuePrompt(session, executionNodePrompt(currentMap, currentMap.executionRun, node, begun.project));
					} catch (cause) {
						try { await directOp(session, { type: "reset-execution-node", nodeId, reason: cause?.message ?? String(cause) }); }
						catch (resetError) { throw new Error((cause?.message ?? String(cause)) + " · " + (resetError?.message ?? String(resetError))); }
						throw cause;
					}
				} catch (cause) {
					setError(cause?.message ?? String(cause));
				} finally {
					setBusy(false);
				}
			};

			if (!map.finalPlan) {
				const facts = treeFacts(map);
				const groups = candidateGroups(map, query, rootFilter);
				const selectedSet = new Set(map.selectedIds ?? []);
				const candidateCount = groups.reduce((sum, group) => sum + group.nodes.length, 0);
				const toggle = (node, selected) => run(() => directOp(session, { type: "toggle-selection", nodeId: node.id, selected }));
				const candidateItem = ({ node, depth }) => React.createElement("label", { key: node.id, className: "bs-prep-item" },
					React.createElement("input", { type: "checkbox", checked: selectedSet.has(node.id), disabled: busy, onChange: (event) => toggle(node, event.target.checked) }),
					React.createElement("span", null,
						React.createElement("button", { type: "button", className: "bs-prep-title", onClick: (event) => { event.preventDefault(); onOpenCandidate?.(node.id); } }, node.title),
						React.createElement("span", { className: "bs-prep-summary" }, node.note ? noteSummary(node.note, 88) : t("dock.noNote")),
					),
					React.createElement("span", { className: "bs-prep-meta" }, `d${depth} · ${t(`status.${node.status}`)}`),
				);
				return React.createElement(
					"section",
					{ className: "bs-execution" },
					React.createElement(
						"div",
						{ className: "bs-plan-prepare bs-selection-workspace" },
						React.createElement("div", { className: "bs-plan-kicker" }, t("plan.title")),
						React.createElement("h2", null, t("plan.prepare")),
						React.createElement("p", null, t("plan.prepareHint")),
						React.createElement("div", { className: "bs-prep-toolbar" },
							React.createElement("input", { value: query, placeholder: t("plan.search"), "aria-label": t("plan.search"), onChange: (event) => setQuery(event.target.value) }),
							React.createElement("select", { value: rootFilter, "aria-label": t("plan.allRoots"), onChange: (event) => setRootFilter(event.target.value) }, React.createElement("option", { value: "" }, t("plan.allRoots")), ...facts.roots.map((root) => React.createElement("option", { key: root.id, value: root.id }, root.title))),
						),
						React.createElement("div", { className: "bs-prep-grid" },
							React.createElement("section", { className: "bs-prep-column" },
								React.createElement("div", { className: "bs-prep-column-head" }, React.createElement("strong", null, t("plan.candidates")), React.createElement("span", { className: "bs-prep-count" }, candidateCount)),
								React.createElement("div", { className: "bs-prep-scroll" }, ...(groups.length ? groups.map((group) => React.createElement("section", { className: "bs-prep-group", key: group.root.id }, React.createElement("h3", { className: "bs-prep-group-title" }, group.root.title), ...group.nodes.map(candidateItem))) : [React.createElement("div", { className: "bs-detail-empty", key: "empty" }, t("plan.noCandidates"))])),
							),
							React.createElement("section", { className: "bs-prep-column" },
								React.createElement("div", { className: "bs-prep-column-head" }, React.createElement("strong", null, t("plan.selected")), React.createElement("span", { className: "bs-prep-count" }, selectedNodes.length)),
								React.createElement("div", { className: "bs-prep-scroll" }, ...(selectedNodes.length ? selectedNodes.map((node) => React.createElement("div", { className: "bs-prep-item", key: node.id }, React.createElement("span", { className: "bs-tree-dot", style: { marginTop: 4, background: STATUS_COLORS[node.status] } }), React.createElement("span", null, React.createElement("button", { className: "bs-prep-title", onClick: () => onOpenCandidate?.(node.id) }, node.title), node.status === "unexplored" && React.createElement("span", { className: "bs-prep-summary" }, t("plan.infoGap"))), React.createElement("button", { className: "bs-prep-remove", onClick: () => toggle(node, false), title: t("dock.removeSelected") }, "×"))) : [React.createElement("div", { className: "bs-detail-empty", key: "empty" }, t("plan.emptySelected"))])),
								React.createElement("div", { className: "bs-prep-footer" },
									React.createElement(ToolButton, { label: generating ? t("plan.generating") : t("plan.generate"), kind: "primary", onClick: () => askForPlan(false), title: t("plan.prepareHint"), disabled: generating || selectedNodes.length === 0 }),
									selectedNodes.length === 0 && React.createElement("div", { className: "bs-detail-empty" }, t("plan.emptySelected")),
								),
							),
						),
						React.createElement("div", { className: "bs-plan-actions" }, React.createElement(ToolButton, { label: t("plan.continueExplore"), onClick: onShowMap })),
						error && React.createElement("div", { className: "bs-detail-error" }, error),
					),
				);
			}

			const plan = map.finalPlan;
			const executionRun = map.executionRun;
			const activeRun = executionRun && !["completed", "cancelled"].includes(executionRun.status);
			const selectedNode = plan.graph.nodes.find((node) => node.id === selectedExecutionId) ?? plan.graph.nodes.find((node) => node.id === executionRun?.currentNodeId) ?? plan.graph.nodes.find((node) => node.id === plan.graph.startNodeId);
			const layout = executionGraphLayout(plan.graph);
			const remaining = executionRemainingIds(plan.graph, executionRun);
			const completed = Object.values(executionRun?.nodeStates ?? {}).filter((state) => state.status === "completed").length;
			const onAction = (ops) => run(() => directOp(session, ops));
			return React.createElement("section", { className: "bs-execution" },
				React.createElement("div", { className: "bs-exec-workspace" },
					React.createElement("header", { className: "bs-exec-head" },
						React.createElement("div", { className: "bs-exec-head-main" },
							React.createElement("div", { className: "bs-plan-kicker" }, t(executionRun ? "execution.run" : "execution.review")),
							React.createElement("h2", null, map.frame?.goal || map.topic),
							React.createElement("p", null, map.frame?.organizingPrinciple || t("execution.reviewHint")),
						),
						React.createElement("div", { className: "bs-exec-run-status" },
							executionRun ? t("execution.status." + executionRun.status) : t("execution.review"),
							React.createElement("small", null, plan.graph.nodes.length + " " + t("stats.nodes") + (executionRun ? " · " + t("execution.completedCount") + " " + completed : "")),
						),
					),
					React.createElement("div", { className: "bs-exec-actions" },
						React.createElement(Segmented, { options: [{ value: "list", label: t("execution.list") }, { value: "graph", label: t("execution.graph") }], value: viewMode, onChange: setViewMode }),
						!activeRun && React.createElement(ToolButton, { label: t(executionRun ? "execution.restart" : "execution.confirm"), kind: "primary", disabled: busy, onClick: () => onAction({ type: "start-execution-run" }) }),
						React.createElement(ToolButton, { label: t("execution.back"), disabled: busy, onClick: continueExploring }),
						React.createElement(ToolButton, { label: generating ? t("plan.generating") : t("plan.regenerate"), disabled: busy || generating || !!activeRun, onClick: () => askForPlan(true) }),
						React.createElement(ToolButton, { label: t("execution.export"), disabled: busy, onClick: exportPlan }),
						activeRun && React.createElement(ToolButton, { label: t(executionRun.status === "running" ? "execution.stopCancel" : "execution.cancel"), disabled: busy, onClick: () => onAction({ type: "cancel-execution-run", stopAgent: executionRun.status === "running" }) }),
					),
					error && React.createElement("div", { className: "bs-detail-error", role: "alert" }, error),
					exportPath && React.createElement("div", { className: "bs-export-result" }, t("plan.exported") + ": " + exportPath),
					React.createElement("div", { className: "bs-exec-body" },
						viewMode === "graph"
							? React.createElement(ExecutionGraphView, { key: plan.generatedAt, graph: plan.graph, run: executionRun, selectedId: selectedNode.id, onSelect: setSelectedExecutionId, t })
							: React.createElement("div", { className: "bs-exec-list" },
								...layout.order.map((id, index) => {
									const node = plan.graph.nodes.find((item) => item.id === id);
									const state = executionRun?.nodeStates[id];
									const status = state?.status === "pending" && !remaining.has(id) ? "unvisited" : state?.status ?? "pending";
									return React.createElement("button", { key: id, className: "bs-exec-list-item", "data-execution-node-id": id, "data-current": executionRun?.currentNodeId === id ? "true" : "false", "data-selected": selectedNode.id === id ? "true" : "false", "data-status": status, onClick: () => setSelectedExecutionId(id) },
										React.createElement("span", { className: "bs-exec-index" }, String(index + 1).padStart(2, "0")),
										React.createElement("span", null,
											React.createElement("strong", null, node.title),
											React.createElement("p", null, node.instruction),
											React.createElement("p", null, t("execution.criteria") + ": " + node.completionCriteria.join(" · ")),
											React.createElement("p", null, t("plan.sources") + ": " + node.sourceNodeIds.map((sourceId) => map.nodes.find((source) => source.id === sourceId)?.title ?? sourceId).join(" · ")),
										),
										React.createElement("small", null, t("execution." + node.kind) + " · " + t("execution.status." + status)),
									);
								}),
							),
						React.createElement(ExecutionNodeInspector, { key: selectedNode.id, node: selectedNode, map, session, t, busy, agentBusy, onAction, onExecute: executeNode, onJumpSource }),
					),
					React.createElement("section", { className: "bs-plan-gaps" },
						React.createElement("h3", null, t("plan.uncovered")),
						...(plan.uncovered.length ? plan.uncovered.map((gap) => React.createElement("div", { className: "bs-plan-gap", key: gap.id }, React.createElement("strong", null, gap.title), React.createElement("span", null, gap.reason || t("execution.none")))) : [React.createElement("div", { className: "bs-plan-gap", key: "none" }, t("plan.noGaps"))]),
					),
				),
			);
		}
		function ExportMenu({ session, map, offsets, sizes, t, onResetView, onRefreshProject }) {
			const [open, setOpen] = useState(false);
			const [busy, setBusy] = useState(false);
			const [result, setResult] = useState(null);
			const [error, setError] = useState("");
			const run = async (format) => {
				setBusy(true);
				setError("");
				try {
					setResult(await directOp(session, { type: "export-map", format, rects: canvasRectsForMap(map, offsets, sizes) }));
				} catch (cause) {
					setError(cause?.message ?? String(cause));
				} finally {
					setBusy(false);
				}
			};
			const runExtra = async (action) => {
				setBusy(true);
				setError("");
				try {
					await action();
					setOpen(false);
				} catch (cause) {
					setError(cause?.message ?? String(cause));
				} finally {
					setBusy(false);
				}
			};
			return React.createElement("div", { className: "bs-export-wrap" },
				React.createElement(ToolButton, { label: t("action.more"), onClick: () => setOpen(!open) }),
				open && React.createElement("div", { className: "bs-export-popover" },
					React.createElement("div", { className: "bs-export-actions" },
						onRefreshProject && React.createElement(ToolButton, { label: t("action.projectRefresh"), onClick: () => runExtra(onRefreshProject), disabled: busy }),
						onResetView && React.createElement(ToolButton, { label: t("action.resetView"), onClick: () => runExtra(onResetView), disabled: busy }),
						React.createElement(ToolButton, { label: t("export.markdown"), onClick: () => run("markdown"), disabled: busy }),
						React.createElement(ToolButton, { label: t("export.canvas"), onClick: () => run("canvas"), disabled: busy }),
						React.createElement(ToolButton, { label: t("export.both"), onClick: () => run("both"), disabled: busy }),
					),
					result && React.createElement("div", { className: "bs-export-result" }, `${t("export.done")}：${Object.values(result.paths).join(" · ")}`),
					error && React.createElement("div", { className: "bs-detail-error" }, error),
				),
			);
		}

		function ProjectChip({ session, map, t }) {
			const [state, setState] = useState({ project: null, projects: [] });
			const [open, setOpen] = useState(false);
			const [title, setTitle] = useState("");
			const [goal, setGoal] = useState("");
			const [error, setError] = useState("");
			const accept = (result) => {
				setState({ project: result.project, projects: result.projects ?? [] });
				setTitle(result.project.title);
				setGoal(result.project.goal ?? "");
				return result;
			};
			useEffect(() => {
				projectApi(session, "ensure").then(accept).catch((cause) => setError(cause?.message ?? String(cause)));
			}, [session.sessionId, map.projectId]);
			const act = async (action, payload) => {
				setError("");
				try {
					return accept(await projectApi(session, action, payload));
				} catch (cause) {
					setError(cause?.message ?? String(cause));
					return null;
				}
			};
			const project = state.project;
			return React.createElement(
				"div",
				{ className: "bs-project-chip-wrap" },
				React.createElement("button", { className: "bs-project-chip", onClick: () => setOpen(!open), title: t("project.edit") },
					React.createElement("span", null, "◈"),
					React.createElement("strong", null, project?.title ?? t("project.current")),
					error && React.createElement("span", null, "!"),
				),
				open && project && React.createElement("div", { className: "bs-project-popover" },
					React.createElement("label", null, t("project.current"), React.createElement("input", { value: title, onChange: (event) => setTitle(event.target.value) })),
					React.createElement("label", null, t("project.goal"), React.createElement("textarea", { value: goal, onChange: (event) => setGoal(event.target.value), placeholder: t("project.noGoal") })),
					React.createElement("div", { className: "bs-edit-actions" },
						React.createElement("button", { onClick: async () => { if (await act("update", { title, goal })) setOpen(false); }, disabled: !title.trim() }, t("project.save")),
						React.createElement("button", { onClick: () => setOpen(false) }, t("project.cancel")),
						React.createElement("button", { onClick: () => act("create", { title: map.topic }) }, t("project.new")),
					),
					state.projects.length > 1 && React.createElement("div", { className: "bs-project-switch-list" },
						React.createElement("div", { className: "bs-dock-eyebrow" }, t("project.move")),
						...state.projects.filter((item) => item.id !== project.id).map((item) => React.createElement("button", { key: item.id, className: "bs-project-switch", onClick: () => act("attach", { projectId: item.id }) }, "◈ ", item.title)),
					),
					error && React.createElement("div", { className: "bs-detail-error" }, error),
				),
			);
		}

		function ProjectOverview({ session, map, t, onOpenSession }) {
			const face = session.projections.faceOf("brainstorm.project");
			const overview = useSyncExternalStore(face.subscribe, face.getSnapshot, face.getSnapshot);
			const [busy, setBusy] = useState(false);
			const [error, setError] = useState("");
			const [expanded, setExpanded] = useState([]);
			const refresh = async () => {
				setBusy(true);
				setError("");
				try {
					await projectApi(session, "refresh");
				} catch (cause) {
					setError(cause?.message ?? String(cause));
				} finally {
					setBusy(false);
				}
			};
			useEffect(() => {
				if (!overview || (map.projectId && overview.project?.id !== map.projectId)) refresh();
			}, [session.sessionId, map.projectId]);
			if (!overview || (map.projectId && overview.project?.id !== map.projectId)) {
				return React.createElement("div", { className: "bs-project-overview" }, React.createElement("div", { className: "bs-plan-prepare" },
					React.createElement("div", { className: "bs-plan-kicker" }, t("project.overview")),
					React.createElement("h2", null, t("project.empty")),
					React.createElement("p", null, busy ? t("project.refreshing") : t("project.emptyHint")),
					React.createElement(ToolButton, { label: t("project.generate"), onClick: refresh, disabled: busy }),
					error && React.createElement("div", { className: "bs-detail-error" }, error),
				));
			}
			const toggle = (id) => setExpanded((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
			const stat = (label, value) => React.createElement("div", { className: "bs-project-stat", key: label }, React.createElement("strong", null, value), React.createElement("span", null, label));
			return React.createElement("section", { className: "bs-project-overview" }, React.createElement("div", { className: "bs-project-shell" },
				React.createElement("header", { className: "bs-project-head" },
					React.createElement("div", null,
						React.createElement("div", { className: "bs-plan-kicker" }, t("project.overview")),
						React.createElement("h2", null, overview.project.title),
						React.createElement("p", { className: "bs-project-goal" }, overview.project.goal ?? t("project.noGoal")),
						React.createElement("div", { className: "bs-project-index" },
							stat(t("project.sessions"), overview.totals.sessions),
							stat(t("project.nodes"), overview.totals.nodes),
							stat(t("project.roots"), overview.totals.roots),
							stat(t("project.unexplored"), overview.totals.unexplored),
							stat(t("project.selected"), overview.totals.selected),
						),
					),
					React.createElement(ToolButton, { label: busy ? t("project.refreshing") : t("project.generate"), onClick: refresh, disabled: busy }),
				),
				error && React.createElement("div", { className: "bs-detail-error" }, error),
				overview.sessions.length === 0 && React.createElement("div", { className: "bs-detail-empty", style: { marginTop: 18 } }, t("project.noSessions")),
				React.createElement("div", { className: "bs-project-sessions" }, ...overview.sessions.map((item) => {
					const open = expanded.includes(item.sessionId);
					return React.createElement("article", { key: item.sessionId, className: "bs-project-session" },
						React.createElement("div", { className: "bs-project-session-rail" }),
						React.createElement("div", { className: "bs-project-session-body" },
							React.createElement("div", { className: "bs-project-session-head" },
								React.createElement("div", { className: "bs-project-session-title" }, React.createElement("h3", null, item.title), React.createElement("p", null, item.map.topic)),
								React.createElement(ToolButton, { label: t("project.openSession"), onClick: () => onOpenSession(item.sessionId, null) }),
								React.createElement(ToolButton, { label: open ? t("project.hideDetails") : t("project.showDetails"), onClick: () => toggle(item.sessionId) }),
							),
							React.createElement("div", { className: "bs-project-session-stats" },
								React.createElement("span", null, `${item.stats.nodeCount} ${t("project.nodes")}`),
								React.createElement("span", null, `${item.stats.rootCount} ${t("project.roots")}`),
								React.createElement("span", null, `${t("project.depth")} ${item.stats.depthMax}`),
								React.createElement("span", null, `${item.stats.statuses.unexplored} ${t("project.unexplored")}`),
								React.createElement("span", null, `${item.stats.selectedCount} ${t("project.selected")}`),
							),
							item.selected.length > 0 && React.createElement("div", { className: "bs-project-tags" }, ...item.selected.map((node) => React.createElement("button", { key: node.id, className: "bs-plan-source", onClick: () => onOpenSession(item.sessionId, node.id) }, `◆ ${node.title}`))),
							open && React.createElement("div", { className: "bs-project-roots" }, ...item.roots.map((root) => React.createElement("button", { key: root.id, className: "bs-project-root", onClick: () => onOpenSession(item.sessionId, root.id) }, React.createElement("strong", null, root.title), React.createElement("span", null, `${root.nodeCount} ${t("project.nodes")}${root.note ? ` · ${root.note}` : ""}`)))),
						),
					);
				})),
				overview.related.length > 0 && React.createElement("section", { className: "bs-project-related" },
					React.createElement("h3", null, `${t("project.related")} · ${overview.related.length}`),
					React.createElement("p", null, t("project.relatedHint")),
					React.createElement("div", { className: "bs-project-tags" }, ...overview.related.map((item) => React.createElement("button", { key: item.sessionId, className: "bs-plan-source", onClick: () => onOpenSession(item.sessionId, null) }, item.title))),
				),
			));
		}

		function nodeChain(nodeId, facts) {
			const chain = [];
			const seen = new Set();
			let cursor = nodeId;
			while (cursor && !seen.has(cursor)) {
				seen.add(cursor);
				const node = facts.byId.get(cursor);
				if (!node) break;
				chain.unshift(node);
				cursor = facts.parentOf.get(cursor);
			}
			return chain;
		}

		function FocusTreeRows({ nodes, facts, activeNodeId, activePath, expandedIds, selectedIds, depth, onSelect, onFocus, onToggle }) {
			return nodes.flatMap((node) => {
				const children = facts.children.get(node.id) ?? [];
				const open = expandedIds.has(node.id);
				const item = React.createElement(
					"div",
					{ key: node.id, className: "bs-tree-item", style: { marginLeft: depth * 10 } },
					React.createElement(
						"button",
						{
							className: "bs-tree-toggle",
							"data-empty": children.length === 0 ? "true" : "false",
							onClick: () => onToggle(node.id),
							title: open ? "折叠" : "展开",
						},
						open ? "▾" : "▸",
					),
					React.createElement(
						"button",
						{
							className: "bs-tree-row",
							"data-active": activeNodeId === node.id ? "true" : "false",
							"data-path": activePath.has(node.id) ? "true" : "false",
							onClick: () => onSelect(node.id),
							onDoubleClick: () => onFocus(node.id),
							title: node.title,
						},
						React.createElement("span", { className: "bs-tree-dot", style: { background: STATUS_COLORS[node.status] ?? STATUS_COLORS.unexplored } }),
						React.createElement("span", { className: "bs-tree-label" }, node.title),
						selectedIds.has(node.id) && React.createElement("span", { className: "bs-tree-candidate" }, "◆"),
						children.length > 0 && React.createElement("span", { className: "bs-tree-count" }, children.length),
					),
				);
				return open ? [item, ...FocusTreeRows({ nodes: children, facts, activeNodeId, activePath, expandedIds, selectedIds, depth: depth + 1, onSelect, onFocus, onToggle })] : [item];
			});
		}

		function formatTimestamp(value) {
			const date = new Date(value);
			return Number.isNaN(date.getTime()) ? String(value ?? "") : date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
		}

		function TopicDetail({ map, facts, session, t, onSelect }) {
			const [error, setError] = useState("");
			const evaluate = () => {
				setError("");
				queuePrompt(session, evaluationPrompt(map, t("dock.evaluateOverall"), facts.roots)).catch((cause) => setError(cause?.message ?? String(cause)));
			};
			return React.createElement(
				"div",
				{ className: "bs-node-detail" },
				React.createElement("div", { className: "bs-dock-eyebrow", style: { marginLeft: 0 } }, t("dock.topic")),
				React.createElement("h2", { className: "bs-detail-title" }, map.topic),
				React.createElement(
					"div",
					{ className: "bs-detail-meta" },
					React.createElement("span", null, `${map.nodes.length} ${t("stats.nodes")}`),
					React.createElement("span", null, `${facts.roots.length} ${t("dock.roots")}`),
					React.createElement("span", null, `${map.selectedIds.length} ${t("dock.selectedCount")}`),
				),
				map.frame && React.createElement("div", { className: "bs-work-card" },
					React.createElement("section", { className: "bs-work-section" }, React.createElement("h3", null, t("frame.goal")), React.createElement("div", { className: map.frame.goal ? "bs-work-section-content" : "bs-work-section-empty" }, map.frame.goal || t("dock.emptySection"))),
					React.createElement("section", { className: "bs-work-section" }, React.createElement("h3", null, t("frame.organizingPrinciple")), React.createElement("div", { className: map.frame.organizingPrinciple ? "bs-work-section-content" : "bs-work-section-empty" }, map.frame.organizingPrinciple || t("dock.emptySection"))),
				),
				React.createElement("div", { className: "bs-detail-empty" }, t("dock.selectNode")),
				facts.roots.length >= 2 && React.createElement(ToolButton, { label: t("dock.evaluateOverall"), onClick: evaluate, kind: "primary" }),
				error && React.createElement("div", { className: "bs-detail-error" }, error),
				React.createElement(
					"section",
					{ className: "bs-detail-section" },
					React.createElement("div", { className: "bs-dock-eyebrow", style: { marginLeft: 4 } }, t("dock.roots")),
					...facts.roots.map((root) =>
						React.createElement(
							"button",
							{ key: root.id, className: "bs-detail-link", onClick: () => onSelect(root.id) },
							React.createElement("span", { className: "bs-tree-dot", style: { background: STATUS_COLORS[root.status] } }),
							React.createElement("span", { className: "bs-detail-link-title" }, root.title),
							React.createElement("span", { className: "bs-detail-link-meta" }, (facts.children.get(root.id) ?? []).length),
						),
					),
				),
			);
		}

		function NodeDetail({ map, node, facts, session, t, onSelect, onFocus }) {
			const [busy, setBusy] = useState(false);
			const [error, setError] = useState("");
			const [editingTitle, setEditingTitle] = useState(false);
			const [editingNote, setEditingNote] = useState(false);
			const [titleDraft, setTitleDraft] = useState(node.title);
			const [noteDraft, setNoteDraft] = useState(() => parseNodeNote(node.note));
			const [userNoteDraft, setUserNoteDraft] = useState(node.userNote ?? "");
			const [summaryOpen, setSummaryOpen] = useState(false);
			const [broughtToTurn, setBroughtToTurn] = useState(false);
			const [navigationOpen, setNavigationOpen] = useState(false);
			const [creatingChild, setCreatingChild] = useState(false);
			const [childTitle, setChildTitle] = useState("");
			useEffect(() => {
				if (!editingTitle) setTitleDraft(node.title);
			}, [node.title, editingTitle]);
			useEffect(() => {
				if (!editingNote) setNoteDraft(parseNodeNote(node.note));
			}, [node.note, editingNote]);
			useEffect(() => {
				setUserNoteDraft(node.userNote ?? "");
			}, [node.userNote]);

			const chain = nodeChain(node.id, facts);
			const children = facts.children.get(node.id) ?? [];
			const parentId = facts.parentOf.get(node.id);
			const siblings = parentId ? (facts.children.get(parentId) ?? []).filter((item) => item.id !== node.id) : facts.roots.filter((item) => item.id !== node.id);
			const selectedSet = new Set(map.selectedIds ?? []);
			const inPool = selectedSet.has(node.id);
			const userNoteDirty = userNoteDraft !== (node.userNote ?? "");
			const unresolvedCount = noteDraft.unresolved.split("\n").filter((line) => line.trim()).length;
			const executionActive = map.executionRun && !["completed", "cancelled"].includes(map.executionRun.status);
			const evaluation = children.length >= 2
				? { label: t("dock.convergeChildren"), nodes: children }
				: siblings.length >= 1
					? { label: t("dock.compareSiblings"), nodes: [node, ...siblings] }
					: facts.roots.length >= 2 && !parentId
						? { label: t("dock.evaluateOverall"), nodes: facts.roots }
						: null;
			const apply = async (ops) => {
				setBusy(true);
				setError("");
				try {
					await directOp(session, ops);
					return true;
				} catch (cause) {
					setError(cause?.message ?? String(cause));
					return false;
				} finally {
					setBusy(false);
				}
			};
			const send = async (prompt) => {
				setBusy(true);
				setError("");
				try {
					await queuePrompt(session, prompt);
					return true;
				} catch (cause) {
					setError(cause?.message ?? String(cause));
					return false;
				} finally {
					setBusy(false);
				}
			};
			const saveTitle = async () => {
				if (await apply({ type: "set-title", nodeId: node.id, title: titleDraft })) setEditingTitle(false);
			};
			const saveNote = async () => {
				const note = serializeNodeNote(noteDraft);
				if (note.length > 3000) {
					setError(t("dock.noteTooLong"));
					return;
				}
				if (await apply({ type: "set-note", nodeId: node.id, note })) setEditingNote(false);
			};
			const saveUserNote = async () => {
				if (userNoteDraft.length > 3000) {
					setError(t("dock.personalNoteTooLong"));
					return false;
				}
				if (!userNoteDirty) return true;
				return apply({ type: "set-user-note", nodeId: node.id, userNote: userNoteDraft });
			};
			const bringUserNoteToTurn = async () => {
				if (!userNoteDraft.trim() || !(await saveUserNote())) return;
				if (await send(personalNotePrompt(map, node, userNoteDraft))) setBroughtToTurn(true);
			};
			const saveChild = async () => {
				if (await apply({ type: "create-child", parentId: node.id, title: childTitle })) {
					setChildTitle("");
					setCreatingChild(false);
				}
			};
			const workSection = (label, value) => React.createElement("section", { className: "bs-work-section", key: label },
				React.createElement("h3", null, label),
				React.createElement("div", { className: value ? "bs-work-section-content" : "bs-work-section-empty" }, value || t("dock.emptySection")),
			);
			const compactWorkRow = (label, value) => React.createElement("div", { className: "bs-work-summary-row", key: label }, React.createElement("strong", null, label), React.createElement("span", null, value || t("dock.emptySection")));
			const navItem = (item) => React.createElement("button", { key: item.id, className: "bs-detail-link", onClick: () => onSelect(item.id) },
				React.createElement("span", { className: "bs-tree-dot", style: { background: STATUS_COLORS[item.status] ?? STATUS_COLORS.unexplored } }),
				React.createElement("span", { className: "bs-detail-link-title" }, item.title),
				selectedSet.has(item.id) && React.createElement("span", { className: "bs-tree-candidate" }, "◆"),
			);

			return React.createElement("div", { className: "bs-node-detail bs-node-workbench" },
				React.createElement("div", { className: "bs-node-detail-scroll" },
				React.createElement("div", { className: "bs-detail-crumbs" },
					React.createElement("button", { className: "bs-detail-crumb", onClick: () => onSelect(null) }, map.topic),
					...chain.map((item) => React.createElement(React.Fragment, { key: item.id }, React.createElement("span", null, "/"), React.createElement("button", { className: "bs-detail-crumb", onClick: () => onSelect(item.id) }, item.title))),
				),
				editingTitle
					? React.createElement(React.Fragment, null,
						React.createElement("input", { className: "bs-detail-field", value: titleDraft, onChange: (event) => setTitleDraft(event.target.value), onKeyDown: (event) => { if (event.key === "Enter") saveTitle(); if (event.key === "Escape") setEditingTitle(false); }, autoFocus: true }),
						React.createElement("div", { className: "bs-edit-actions" }, React.createElement("button", { onClick: saveTitle, disabled: busy }, t("dock.save")), React.createElement("button", { onClick: () => setEditingTitle(false) }, t("dock.cancel"))),
					)
					: React.createElement("div", { className: "bs-detail-title-row" }, React.createElement("h2", { className: "bs-detail-title" }, node.title), React.createElement("button", { className: "bs-detail-icon", onClick: () => setEditingTitle(true), title: t("dock.editTitle") }, "✎")),
				React.createElement("div", { className: "bs-detail-meta" },
					React.createElement("span", { className: "bs-status-pill", style: { color: STATUS_COLORS[node.status], background: `${STATUS_COLORS[node.status]}16` } }, React.createElement("span", { className: "bs-tree-dot", style: { background: STATUS_COLORS[node.status] } }), t(`status.${node.status}`)),
					inPool && React.createElement("span", { className: "bs-tree-candidate" }, `◆ ${t("dock.selectedMark")}`),
					React.createElement("span", null, `${children.length} ${t("dock.children")}`),
					unresolvedCount > 0 && React.createElement("span", null, `${unresolvedCount} ${t("dock.unresolved")}`),
					React.createElement("span", null, `${t("dock.updated")} ${formatTimestamp(node.updatedAt)}`),
				),
				React.createElement("section", { className: "bs-personal-note" },
					React.createElement("div", { className: "bs-personal-note-head" },
						React.createElement("strong", null, t("dock.personalNote")),
						React.createElement("span", { className: "bs-personal-note-state", "data-dirty": userNoteDirty ? "true" : "false" }, userNoteDirty ? t("dock.unsaved") : `${t("dock.saved")}${node.userNoteUpdatedAt ? ` · ${formatTimestamp(node.userNoteUpdatedAt)}` : ""}`),
					),
					React.createElement("textarea", { className: "bs-personal-note-field", value: userNoteDraft, maxLength: 3000, placeholder: t("dock.personalNotePlaceholder"), "aria-label": t("dock.personalNote"), onChange: (event) => { setUserNoteDraft(event.target.value); setBroughtToTurn(false); }, onKeyDown: (event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); saveUserNote(); } } }),
					React.createElement("div", { className: "bs-personal-note-foot" },
						React.createElement("small", null, `${t("dock.personalNoteHint")} · ${userNoteDraft.length}/3000`),
						React.createElement(ToolButton, { label: t("dock.save"), kind: "primary", disabled: busy || !userNoteDirty, onClick: saveUserNote }),
						React.createElement(ToolButton, { label: t(broughtToTurn ? "dock.broughtToTurn" : "dock.bringToTurn"), disabled: busy || !userNoteDraft.trim() || executionActive, onClick: bringUserNoteToTurn }),
					),
				),
				React.createElement("section", { className: "bs-work-summary" },
					React.createElement("div", { className: "bs-section-heading" },
						React.createElement("strong", null, t("dock.workSummary")),
						React.createElement(ToolButton, { label: t(summaryOpen ? "dock.hideSummary" : "dock.showSummary"), onClick: () => setSummaryOpen(!summaryOpen) }),
					),
					React.createElement("div", { className: "bs-detail-actions", style: { margin: "0 0 8px" } },
						React.createElement(ToolButton, { label: t("dock.editNote"), disabled: busy, onClick: () => { setSummaryOpen(true); setEditingNote(true); } }),
						React.createElement(ToolButton, { label: t("dock.organizeNode"), disabled: busy, onClick: () => send(organizeNodePrompt(map, node)) }),
						evaluation && React.createElement(ToolButton, { label: evaluation.label, disabled: busy, onClick: () => send(evaluationPrompt(map, evaluation.label, evaluation.nodes)) }),
					),
					summaryOpen
						? editingNote
							? React.createElement("div", { className: "bs-work-card-edit" },
								...[ ["understanding", t("dock.currentUnderstanding")], ["unresolved", t("dock.unresolved")], ["nextStep", t("dock.nextStep")] ].map(([key, label]) => React.createElement("label", { key }, label, React.createElement("textarea", { className: "bs-detail-field", value: noteDraft[key], onChange: (event) => setNoteDraft((current) => ({ ...current, [key]: event.target.value })) }))),
								React.createElement("div", { className: "bs-edit-actions" }, React.createElement("button", { onClick: saveNote, disabled: busy }, t("dock.save")), React.createElement("button", { onClick: () => { setNoteDraft(parseNodeNote(node.note)); setEditingNote(false); } }, t("dock.cancel"))),
							)
							: React.createElement("div", { className: "bs-work-card" }, workSection(t("dock.currentUnderstanding"), noteDraft.understanding), workSection(t("dock.unresolved"), noteDraft.unresolved), workSection(t("dock.nextStep"), noteDraft.nextStep))
						: React.createElement("div", { className: "bs-work-summary-compact" }, compactWorkRow(t("dock.currentUnderstanding"), noteDraft.understanding), compactWorkRow(t("dock.unresolved"), noteDraft.unresolved), compactWorkRow(t("dock.nextStep"), noteDraft.nextStep)),
				),
				error && React.createElement("div", { className: "bs-detail-error" }, error),
				React.createElement("section", { className: "bs-detail-section" },
					React.createElement("div", { className: "bs-section-heading" }, React.createElement("strong", null, t("dock.structure")), React.createElement("span", { className: "bs-personal-note-state" }, `${t("dock.siblings")} ${siblings.length} · ${t("dock.children")} ${children.length}`)),
					React.createElement("div", { className: "bs-detail-actions", style: { margin: 0 } },
						React.createElement(ToolButton, { label: t("dock.focusBranch"), onClick: () => onFocus(node.id) }),
						React.createElement("select", { className: "bs-status-select", value: node.status === "selected" ? "expanded" : node.status, onChange: (event) => apply({ type: "set-status", nodeId: node.id, status: event.target.value }), disabled: busy }, ...STATUSES.filter((status) => status !== "selected").map((status) => React.createElement("option", { key: status, value: status }, t(`status.${status}`)))),
					),
					React.createElement("div", { className: "bs-create-child" },
						creatingChild
							? React.createElement(React.Fragment, null, React.createElement("input", { className: "bs-detail-field", value: childTitle, placeholder: t("dock.childPlaceholder"), onChange: (event) => setChildTitle(event.target.value), onKeyDown: (event) => { if (event.key === "Enter") saveChild(); }, autoFocus: true }), React.createElement("button", { className: "bs-detail-icon", onClick: saveChild, title: t("dock.save") }, "✓"), React.createElement("button", { className: "bs-detail-icon", onClick: () => { setChildTitle(""); setCreatingChild(false); }, title: t("dock.cancel") }, "✕"))
							: React.createElement(ToolButton, { label: t("dock.createChild"), onClick: () => setCreatingChild(true) }),
					),
				),
				React.createElement("section", { className: "bs-nav-summary" },
					React.createElement("div", { className: "bs-nav-summary-head" }, React.createElement("strong", null, `${t("dock.siblings")} ${siblings.length}　${t("dock.children")} ${children.length}`), React.createElement(ToolButton, { label: navigationOpen ? t("dock.showLess") : t("dock.viewAll"), onClick: () => setNavigationOpen(!navigationOpen) })),
					...(!navigationOpen ? [...children, ...siblings].slice(0, 3).map(navItem) : [React.createElement("div", { className: "bs-detail-section", key: "siblings" }, React.createElement("div", { className: "bs-dock-eyebrow" }, `${t("dock.siblings")} · ${siblings.length}`), ...(siblings.length ? siblings.map(navItem) : [React.createElement("div", { className: "bs-detail-empty", key: "empty" }, t("dock.noSiblings"))])), React.createElement("div", { className: "bs-detail-section", key: "children" }, React.createElement("div", { className: "bs-dock-eyebrow" }, `${t("dock.children")} · ${children.length}`), ...(children.length ? children.map(navItem) : [React.createElement("div", { className: "bs-detail-empty", key: "empty" }, t("dock.noChildren"))]))]),
				),
				),
				React.createElement("div", { className: "bs-detail-action-bar" },
					React.createElement(ToolButton, { label: t("menu.continue"), kind: "primary", disabled: busy, onClick: () => send(continuePrompt(node)) }),
					React.createElement(ToolButton, { label: t("menu.explore"), disabled: busy, onClick: () => send(explorePrompt(node)) }),
					React.createElement(ToolButton, { label: inPool ? t("dock.removeSelected") : t("dock.addSelected"), disabled: busy, onClick: () => apply({ type: "toggle-selection", nodeId: node.id, selected: !inPool }) }),
					React.createElement(ToolButton, { label: node.status === "parked" ? t("dock.restore") : t("dock.park"), disabled: busy, onClick: () => apply({ type: "set-status", nodeId: node.id, status: node.status === "parked" ? "expanded" : "parked" }) }),
				),
			);
		}

		function FocusDock({ sessionId, state, t }) {
			const resizeRef = useRef(null);
			const [query, setQuery] = useState("");
			if (!state.open || !state.map) return null;
			if (state.compact) {
				return React.createElement(
					"aside",
					{ className: "bs-focus-dock bs-compact", "aria-label": t("dock.title") },
					React.createElement("button", { className: "bs-focus-compact-open", onClick: () => workbenchStore.setCompact(sessionId, false), title: t("dock.expand") }, React.createElement("span", { className: "bs-tree-dot", style: { background: "var(--bs-active)" } }), t("dock.expand")),
				);
			}
			const facts = treeFacts(state.map);
			const activeNode = facts.byId.get(state.activeNodeId);
			const activePath = new Set(nodeChain(state.activeNodeId, facts).map((node) => node.id));
			const expandedIds = new Set([...state.treeExpandedIds, ...activePath]);
			const selectedIds = new Set(state.map.selectedIds ?? []);
			const normalizedQuery = query.trim().toLocaleLowerCase();
			const searchResults = normalizedQuery
				? state.map.nodes.filter((node) => `${node.title}\n${node.note ?? ""}\n${node.userNote ?? ""}`.toLocaleLowerCase().includes(normalizedQuery))
				: [];
			const onResizeStart = (event) => {
				event.preventDefault();
				resizeRef.current = { x: event.clientX, width: state.width };
				const move = (moveEvent) => {
					if (!resizeRef.current) return;
					workbenchStore.resize(sessionId, resizeRef.current.width + resizeRef.current.x - moveEvent.clientX);
				};
				const up = () => {
					resizeRef.current = null;
					window.removeEventListener("pointermove", move);
					window.removeEventListener("pointerup", up);
				};
				window.addEventListener("pointermove", move);
				window.addEventListener("pointerup", up);
			};
			const onSelect = (nodeId) => workbenchStore.activate(sessionId, nodeId);
			const onFocus = (nodeId) => workbenchStore.update(sessionId, { activeNodeId: nodeId, focusId: nodeId, open: true });
			return React.createElement(
				"aside",
				{ className: "bs-focus-dock", style: { width: state.width }, "aria-label": t("dock.title") },
				React.createElement("div", { className: "bs-focus-resize", onPointerDown: onResizeStart }),
				React.createElement(
					"header",
					{ className: "bs-focus-header" },
					React.createElement("span", { className: "bs-tree-dot", style: { background: "var(--bs-active)" } }),
					React.createElement("strong", null, t("dock.title")),
					React.createElement("button", { className: "bs-focus-structure-toggle", "data-open": state.treeOpen ? "true" : "false", onClick: () => workbenchStore.toggleTreePanel(sessionId), title: t(state.treeOpen ? "dock.hideStructure" : "dock.showStructure") }, t("dock.structure")),
					React.createElement("button", { className: "bs-detail-icon", onClick: () => workbenchStore.setCompact(sessionId, true), title: t("dock.compact") }, "◫"),
					React.createElement("button", { className: "bs-focus-close", onClick: () => workbenchStore.close(sessionId), title: t("dock.close") }, "✕"),
				),
				React.createElement(
					"div",
					{ className: "bs-focus-body", "data-tree-open": state.treeOpen ? "true" : "false" },
					state.treeOpen && React.createElement(
						"nav",
						{ className: "bs-focus-tree", "aria-label": t("dock.tree") },
						React.createElement(
							"div",
							{ className: "bs-tree-search" },
							React.createElement("input", { value: query, onChange: (event) => setQuery(event.target.value), placeholder: t("dock.searchPlaceholder"), "aria-label": t("dock.search") }),
						),
						React.createElement("div", { className: "bs-tree-topic" },
							React.createElement("button", { className: "bs-tree-row", "data-active": state.activeNodeId === null ? "true" : "false", onClick: () => onSelect(null), title: state.map.topic },
								React.createElement("span", { className: "bs-tree-dot", style: { background: "var(--bs-active)" } }),
								React.createElement("span", { className: "bs-tree-label" }, state.map.topic),
								React.createElement("span", { className: "bs-tree-count" }, state.map.nodes.length),
							),
						),
						normalizedQuery
							? React.createElement(React.Fragment, null,
								React.createElement("div", { className: "bs-dock-eyebrow" }, `${t("dock.results")} · ${searchResults.length}`),
								...(searchResults.length > 0 ? searchResults.map((node) =>
									React.createElement("button", { key: node.id, className: "bs-tree-row", onClick: () => onSelect(node.id), onDoubleClick: () => onFocus(node.id), title: node.title },
										React.createElement("span", { className: "bs-tree-dot", style: { background: STATUS_COLORS[node.status] } }),
										React.createElement("span", { className: "bs-tree-label" }, node.title),
										selectedIds.has(node.id) && React.createElement("span", { className: "bs-tree-candidate" }, "◆"),
									),
								) : [React.createElement("div", { key: "empty", className: "bs-tree-empty" }, t("dock.noResults"))]),
							)
							: React.createElement(React.Fragment, null,
								React.createElement("div", { className: "bs-dock-eyebrow" }, t("dock.tree")),
								...FocusTreeRows({ nodes: facts.roots, facts, activeNodeId: state.activeNodeId, activePath, expandedIds, selectedIds, depth: 0, onSelect, onFocus, onToggle: (nodeId) => workbenchStore.toggleTree(sessionId, nodeId) }),
							),
					),
					activeNode
						? React.createElement(NodeDetail, { key: activeNode.id, map: state.map, node: activeNode, facts, session: state.session, t, onSelect, onFocus })
						: React.createElement(TopicDetail, { map: state.map, facts, session: state.session, t, onSelect }),
				),
			);
		}

		function ComposerContextDock({ sessionId, brainstormSession, t }) {
			const state = useSyncExternalStore(
				(fn) => workbenchStore.subscribe(sessionId, fn),
				() => workbenchStore.get(sessionId),
			);
			if (!state.map) return null;
			const node = state.map.nodes.find((item) => item.id === state.activeNodeId);
			return React.createElement(
				"div",
				{ className: "bs-composer-context" },
				React.createElement("span", { className: "bs-composer-kicker" }, t("composer.context")),
				node
					? React.createElement(
							"button",
							{ className: "bs-composer-node", onClick: () => workbenchStore.open(sessionId, node.id), title: node.title },
							React.createElement("span", { className: "bs-tree-dot", style: { background: STATUS_COLORS[node.status] ?? STATUS_COLORS.unexplored } }),
							React.createElement("span", null, node.title),
						)
					: React.createElement("span", null, t("composer.noActive")),
				node &&
					React.createElement(
						"span",
						{ className: "bs-composer-actions" },
						React.createElement("button", { className: "bs-composer-action", onClick: () => queuePrompt(brainstormSession, continuePrompt(node)).catch(() => {}) }, t("menu.continue")),
						React.createElement("button", { className: "bs-composer-action", onClick: () => queuePrompt(brainstormSession, explorePrompt(node)).catch(() => {}) }, t("menu.explore")),
					),
			);
		}

		//#endregion

		//#region dsh-ariadne: main view
		function BrainstormView({ session, t }) {
			const mapFace = session.projections.faceOf("brainstorm");
			const map = useSyncExternalStore(mapFace.subscribe, mapFace.getSnapshot);
			const enabled = useSessionEnabled(session.sessionId);
			const workbench = useSyncExternalStore(
				(fn) => workbenchStore.subscribe(session.sessionId, fn),
				() => workbenchStore.get(session.sessionId),
			);
			const [innerView, setInnerView] = useState("session");
			const [viewPhase, setViewPhase] = useState(map?.phase ?? "exploring");
			const [offsets, setOffsets] = useState({});
			const [sizes, setSizes] = useState({});
			const [fitNonce, setFitNonce] = useState(0);
			const loadedSession = useRef(null);
			const layoutDirty = useRef(false);

			useEffect(() => {
				enabledStore.refresh(session.sessionId);
			}, [session.sessionId]);
			useEffect(() => {
				if (!map?.phase) return;
				setViewPhase(map.phase);
				if (map.phase === "executing") workbenchStore.setCompact(session.sessionId, true);
			}, [map?.phase, session.sessionId]);
			useEffect(() => {
				workbenchStore.setContext(session, map);
			}, [session, map]);

			// Load persisted manual layout once per session.
			useEffect(() => {
				if (!map || loadedSession.current === session.sessionId) return;
				loadedSession.current = session.sessionId;
				layoutDirty.current = false;
				setOffsets(map.layout?.offsets ?? {});
				setSizes(map.layout?.sizes ?? {});
			}, [map, session.sessionId]);

			// Persist manual layout (drag/resize) through the direct-op route, debounced.
			useEffect(() => {
				if (loadedSession.current !== session.sessionId || !layoutDirty.current) return;
				const timer = setTimeout(() => {
					directOp(session, { layout: { offsets, sizes } })
						.then(() => {
							layoutDirty.current = false;
						})
						.catch((error) => console.error("[dsh-ariadne] layout save failed:", error));
				}, 500);
				return () => clearTimeout(timer);
			}, [offsets, sizes, session]);

			if (enabled !== true) return React.createElement(DisabledView, { t, sessionId: session.sessionId });
			if (!map) return React.createElement(EmptyMapView, { t, session });
			const openProjectSession = (sessionId, nodeId) => {
				workbenchStore.update(sessionId, { activeNodeId: nodeId, focusId: null, open: true, compact: false });
				sessionsRuntime?.open(sessionId);
			};
			const resetView = () => {
				layoutDirty.current = true;
				setOffsets({});
				setSizes({});
				setFitNonce((value) => value + 1);
			};
			const refreshProject = async () => {
				setInnerView("project");
				await projectApi(session, "refresh");
			};
			const changeViewPhase = (phase) => {
				setViewPhase(phase);
				workbenchStore.setCompact(session.sessionId, phase === "executing");
			};

			return React.createElement(
				"div",
				{ className: "bs-workbench" },
				React.createElement(
					"header",
					{ className: "bs-workbench-header" },
					React.createElement("div", { className: "bs-header-left" },
						React.createElement(ProjectChip, { session, map, t }),
						React.createElement("strong", { className: "bs-workbench-topic", title: map.topic }, map.topic),
						React.createElement("span", { className: "bs-workbench-count" }, `${map.nodes.length} ${t("stats.nodes")}`),
					),
					React.createElement("div", { className: "bs-header-center" },
						React.createElement(Segmented, { options: [{ value: "session", label: t("view.session") }, { value: "project", label: t("view.project") }], value: innerView, onChange: setInnerView }),
						innerView === "session" && React.createElement(Segmented, { options: [{ value: "exploring", label: t("phase.exploring") }, { value: "executing", label: t("phase.executing") }], value: viewPhase, onChange: changeViewPhase }),
					),
					React.createElement("div", { className: "bs-header-right" },
						innerView === "session" && viewPhase === "exploring" && React.createElement(ToolButton, { label: t("action.organize"), kind: "primary", onClick: () => queuePrompt(session, organizePrompt()).catch((error) => console.error("[dsh-ariadne] organize prompt failed:", error)) }),
						React.createElement(BrainstormSwitch, { sessionId: session.sessionId, t, map }),
						innerView === "session" && React.createElement(ToolButton, { label: "◫", kind: "icon", title: t("dock.title"), onClick: () => workbench.open ? workbenchStore.close(session.sessionId) : workbenchStore.open(session.sessionId, workbench.activeNodeId) }),
						React.createElement(ExportMenu, { session, map, offsets, sizes, t, onResetView: innerView === "session" && viewPhase === "exploring" ? resetView : null, onRefreshProject: innerView === "project" ? refreshProject : null }),
					),
				),
				innerView === "session" && React.createElement(FrameBar, { map, session, t }),
				React.createElement(
					"div",
					{ className: "bs-workbench-body" },
					React.createElement(
						"main",
						{ className: "bs-workbench-primary" },
						innerView === "project"
							? React.createElement(ProjectOverview, { session, map, t, onOpenSession: openProjectSession })
							: viewPhase === "executing"
								? React.createElement(ExecutionView, {
									map,
									session,
									t,
									onShowMap: () => changeViewPhase("exploring"),
									onOpenCandidate: (nodeId) => workbenchStore.update(session.sessionId, { activeNodeId: nodeId, focusId: null, open: true, compact: false }),
									onJumpSource: (nodeId) => {
										changeViewPhase("exploring");
										workbenchStore.update(session.sessionId, { activeNodeId: nodeId, focusId: null, open: true, compact: false });
									},
								})
								: React.createElement(MapCanvas, {
								map,
								phase: viewPhase,
								t,
								session,
								offsets,
								onOffsetChange: (next) => {
									layoutDirty.current = true;
									setOffsets(next);
								},
								sizes,
								onSizeChange: (next) => {
									layoutDirty.current = true;
									setSizes(next);
								},
								fitNonce,
								activeNodeId: workbench.activeNodeId,
								onActiveNodeChange: (nodeId) => workbenchStore.activate(session.sessionId, nodeId),
								focusId: workbench.focusId,
								onFocusIdChange: (nodeId) => workbenchStore.focus(session.sessionId, nodeId),
								collapsedIds: workbench.collapsedIds,
								onToggleCollapse: (nodeId) => workbenchStore.toggleCollapse(session.sessionId, nodeId),
								minimapOpen: workbench.minimapOpen,
								onToggleMinimap: () => workbenchStore.toggleMinimap(session.sessionId),
								dockOpen: workbench.open,
								dockWidth: workbench.compact ? 46 : workbench.width,
							}),
					),
					innerView === "session" && React.createElement(FocusDock, { sessionId: session.sessionId, state: workbench, t }),
				),
			);
		}
		//#endregion

		//#region dsh-ariadne: plugin body
		const inject = ["slots", "sessions", "locale", "connection"];

		function apply(ctx) {
			const connection = ctx.get?.("connection") ?? ctx.connection;
			enabledState.api = connection?.api ?? null;
			sessionsRuntime = ctx.sessions;

			ctx.effect(() => {
				if (typeof document === "undefined") return;
				if (!document.getElementById("dsh-ariadne-style")) {
					const style = document.createElement("style");
					style.id = "dsh-ariadne-style";
					style.textContent = STYLE_CSS;
					document.head.appendChild(style);
				}
				return () => document.getElementById("dsh-ariadne-style")?.remove();
			}, "dsh-ariadne: styles");
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-ariadne: locale");
			const t = ctx.locale.bind(NS);

			ctx.slots.inject("conversation.view", () =>
				ctx.slots.register(
					{
						name: "conversation.view",
						id: "brainstorm",
						order: 20,
						locale: NS,
						label: () => t("view.brainstorm"),
						inject: (sessionId) => {
							const session = ctx.sessions.binding(sessionId)?.session;
							if (session === undefined) throw new Error(`dsh-ariadne: session "${sessionId}" is unavailable`);
							return { session, t };
						},
					},
					BrainstormView,
				),
			);

			ctx.slots.inject("conversation.composer.dock", () =>
				ctx.slots.register(
					{
						name: "conversation.composer.dock",
						id: "brainstorm-context",
						order: -20,
						locale: NS,
						inject: (sessionId) => {
							const brainstormSession = ctx.sessions.binding(sessionId)?.session;
							return { sessionId, brainstormSession, t };
						},
					},
					ComposerContextDock,
				),
			);

		}
		//#endregion

		exports.__layout = {
			layoutFor,
			balancedTreeLayout,
			centerFourLayout,
			chainLayout,
			edgePath,
			routeOrthogonal,
			anchorFor,
			segmentIntersectsRect,
			rectsOverlap,
			rectOf,
			treeFacts,
			activePathFacts,
			measureNode,
			canvasRectsForMap,
			constrainCanvasView,
			nodeMenuPosition,
			noteSummary,
			heatRank,
			autoWidth,
			TOPIC_SIZE,
			CANVAS_W,
			CANVAS_H,
		};
		exports.__stores = { workbenchStore };
		exports.__components = { BrainstormView, MapCanvas, FocusDock, NodeDetail, FrameBar, ComposerContextDock, EmptyMapView, ExecutionView, ExecutionGraphView, ExecutionNodeInspector, ProjectChip, ProjectOverview, ExportMenu };
		exports.__prompts = { backfillPrompt, createPrompt, continuePrompt, explorePrompt, organizePrompt, organizeNodePrompt, personalNotePrompt, evaluationPrompt, planPrompt, executionNodePrompt };
		exports.__execution = { isLinearPlanGraph, executionGraphLayout, executionDisplayPath, executionRemainingIds };
		exports.__notes = { parseNodeNote, serializeNodeNote };
		exports.__preparation = { candidateGroups };
		exports.__queuePrompt = queuePrompt;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	},
});
