---
name: xh-v8-progress-deck
description: Build or rebuild the Simplified-Chinese research-progress deck for the Xinhuang (新晃) rural bus study from the v8 PPT package (ppt/ppt_spec.json + pptkit). Use when regenerating 新晃城乡公交研究进展汇报.pptx, changing a page's native diagram, compressing on-slide text, or re-running the self-check.
---

# 新晃城乡公交研究进展汇报（v8）制作流程

只适用于 v8 制作包（《PPT 制作指导书》+ `ppt/ppt_spec.json`）。不要沿用 v4/v5 英文会议稿（`deck/`）的内容、数据或脚本。

## 输入与产物
- 输入：解压后的 `v8/`（`ppt/ppt_spec.json` 是唯一内容来源；`ppt/tools/pptkit.py`、`self_check.py`、`quick_render.py`）。
- 产物：`新晃城乡公交研究进展汇报.pptx`、`build_ppt.py`、`ppt_check.md`（本仓库 `v8_ppt/` 存一份）。

## 步骤
1. `pip install python-pptx pillow`，确认 `soffice`、`pdftoppm` 可用。
2. 把 `v8_ppt/build_ppt.py` 放到 `v8/` 根目录：`cd v8 && python build_ppt.py`（写出 `ppt/fit_log.json`，打印溢出框个数）。
3. 预览：`python ppt/tools/quick_render.py 新晃城乡公交研究进展汇报.pptx preview_quick 96`，
   再 `scripts/render_preview.sh 新晃城乡公交研究进展汇报.pptx preview_lo` 逐页看 JPG。
4. 自检：`python ppt/tools/self_check.py 新晃城乡公交研究进展汇报.pptx ppt/fit_log.json preview_quick/render_issues.json`，
   “未通过”必须为 0；self_check 会重写 `ppt_check.md`，之后再补“溢出调整记录”。

## build_ppt.py 的写法（在 pptkit 之上）
- `T()`：所有文字都走 `textbox(..., tag=...)`，拟合结果进 FIT_LOG，self_check 才能查溢出。
- `lbox()`：色块与文字分开画（色块 `box()` 不测量文字），文字框单独拟合。
- `head_card()`：标题条 + 正文卡片；`fig()`：插图左对齐，右侧文字区按实际图宽加宽。
- 标题：调用 `frame()` 时把 `pptkit.vmargin` 临时设为 0、`SIZE['title_min']=26`，两行标题保持 28 磅；
  在 28 磅下只多出一两个字的标题降到 26—27 磅放成一行。
- 参考文献页：临时把 `pptkit.REF_RE` 换成不匹配的正则，避免把 `[1]`、`[2026-09-30]` 做成上标；编号悬挂缩进。

## 硬性规则（摘自指导书）
不增改、不四舍五入数字；不新增文献；模拟结果页页脚与备注都有 SYNTHETIC 说明；“删失”不写成“截断”；
集日与天气只作对照因子；保留“偏离预注册”；公式用纯文本；压缩后的要点上屏，完整原文写入备注“完整要点：”；
正文 ≥ 16 磅（图示内文字 ≥ 12 磅，参考文献 9—10 磅）；页边距 0.5 英寸，标题区 y = 0.30—1.36，页脚区 y ≥ 7.0。
