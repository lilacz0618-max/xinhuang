#!/bin/bash
# LibreOffice 预览：render_preview.sh 新晃城乡公交研究进展汇报.pptx 输出目录 [dpi]
# 生成 输出目录/deck.pdf 与逐页 s-XX.jpg，用于逐页人工查看（与 quick_render.py 互补：后者用思源黑体测量并标出溢出框）。
# 环境变量 SOFFICE 可指向 soffice 包装脚本（沙箱中可用 Anthropic pptx skill 的 scripts/office/soffice.py）。
set -e
OUT=$2; mkdir -p "$OUT"; cp "$1" "$OUT/deck.pptx"
if [ -n "${SOFFICE:-}" ]; then python3 "$SOFFICE" --headless --convert-to pdf --outdir "$OUT" "$OUT/deck.pptx" >/dev/null 2>&1
else soffice --headless --convert-to pdf --outdir "$OUT" "$OUT/deck.pptx" >/dev/null 2>&1; fi
pdftoppm -jpeg -r "${3:-80}" "$OUT/deck.pdf" "$OUT/s"
ls "$OUT" | grep -c '^s-'
