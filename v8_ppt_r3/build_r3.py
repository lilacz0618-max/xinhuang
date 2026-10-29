"""第三轮构建脚本：从 ppt/ppt_spec_r3.json 生成《新晃城乡公交研究进展汇报_第三轮.pptx》（27 页）。
在第二轮 build_r2.py 的基础上增加两种版式：policy_map（规划对接定位）与 policy_table（规划条款对接表）。

    cd v8 && python ppt/build_r2.py [输出文件名]

页面文字、数字与文献编号全部取自 spec，原文照录，只做拆分排版（如“标签：正文”拆成色块标签 + 正文）。
每页（封面、参考文献页除外）都有：结论式标题、“通俗地说”解释框（形状名 plain）、有引用时的“本页文献”脚注带
（形状名 footnote，8.5—9 磅）、讲稿备注（talk → 完整要点： → 本页文献：完整著录）。
所有文字框与表格都经过拟合，结果写入 ppt/fit_log.json（与第一轮格式相同）。
"""
import sys, os, re, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tools'))
from pptkit import *
import pptkit
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

os.chdir(V8)
spec = json.load(open('ppt/ppt_spec_r3.json', encoding='utf-8'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '新晃城乡公交研究进展汇报_第三轮.pptx'
TOTAL = len(spec['slides'])
SYN = '模拟数据检验结果（SYNTHETIC），仅用于检验研究路径，不代表新晃实际情况'
W = C['white']
YEL, YEL_L = 'E9C46A', 'FFF4D1'            # “诚实说明”浅黄底
RED, RED_L = 'C0392B', 'FBECEA'            # 缺口编号
BLUE_L = 'E4EDF7'                          # “本研究选用”浅蓝底
NO = [0]
TOP = 2.02                                 # 通俗解释框下方的内容起点
BOT = 6.92                                 # 无脚注时的内容底线（页脚区 y ≥ 7.0）
X0, XW = 0.5, 12.33


# ---------- 通用工具 ----------
def T(s, x, y, w, h, paras, size=14, minimum=None, name='text', **kw):
    """带拟合日志的文本框。"""
    tb, sz, over = textbox(s, x, y, w, h, paras, size=size, minimum=minimum or size,
                           tag={'slide': NO[0], 'box': name}, **kw)
    return tb, sz, over


def log(name, size, need, have):
    pptkit.FIT_LOG.append(dict(slide=NO[0], box=name, size=size, overflow=need > have + 1e-6,
                               need_in=round(need, 2), have_in=round(have, 2)))


def need_h(text, size, w, bullet=False, bold=False, line=LINE):
    """单段文字放进宽 w 的框所需高度（与 textbox 的边距规则一致）。"""
    h = est_height_in([text], size, w, bullet, bold, line, h_in=0.3)
    return h if h < 0.5 else est_height_in([text], size, w, bullet, bold, line, h_in=1.0)


def split_label(t, sep='：'):
    k = t.index(sep)
    return t[:k], t[k + 1:]


def lbox(s, x, y, w, h, paras, fill=C['light'], line=None, color=C['text'], size=14, minimum=None, bold=False,
         align='c', anchor='m', shape='rect', name='box', inset=0.0, bullet=False, emph=None, line_w=1.0):
    box(s, x, y, w, h, fill=fill, line=line, shape=shape, line_w=line_w)
    return T(s, x + inset, y, w - 2 * inset, h, paras, size, minimum, name, color=color, bold=bold, align=align,
             anchor=anchor, bullet=bullet, emph=emph)


def vstack(s, x, y, w, h, items, size=14, minimum=10, gap=0.1, name='stack', bullet=True):
    """把若干段文字自上而下排成独立文本框，统一选字号使总高不超过 h。
    items：[(text, kind, emph)]，kind 为 'n' 普通、'honest' 浅黄底“诚实说明”框。"""
    def heights(sz):
        return [need_h(t, sz, w - (0.16 if k == 'honest' else 0), bullet and k != 'honest') +
                (0.06 if k == 'honest' else 0) for t, k, _ in items]
    sz = size
    while True:
        hs = heights(sz); tot = sum(hs) + gap * (len(items) - 1)
        if tot <= h or sz <= minimum:
            break
        sz -= 0.5
    log(name, sz, tot, h)
    extra = max(0.0, (h - tot) / max(1, len(items)) * 0.35)      # 剩余空间少量分给段距，避免挤在上方
    yy = y
    for (t, k, em), hh in zip(items, hs):
        if k == 'honest':
            box(s, x, yy, w, hh, fill=YEL_L, line=YEL, line_w=1.25)
            textbox(s, x + 0.08, yy + 0.03, w - 0.16, hh - 0.06, [t], size=sz, fit=False, emph=em)
        else:
            textbox(s, x, yy, w, hh, [t], size=sz, fit=False, bullet=bullet, emph=em)
        yy += hh + gap + extra
    return sz


def ntable(s, x, y, w, rows, col_w, max_h, size=12, minimum=10, name='table', col_fill=None,
           head_fill=C['navy'], bold_col0=True, lh=1.42):
    """原生表格：按文字测量设定行高并选字号，写入拟合日志。返回表格实际高度。"""
    col_fill = col_fill or {}
    pad = 0.06

    def row_hs(sz):
        out = []
        for i, r in enumerate(rows):
            m = 1
            for j, v in enumerate(r):
                m = max(m, len(wrap_lines(str(v), sz, (col_w[j] - 2 * pad) * 72, i == 0 or (j == 0 and bold_col0))))
            out.append(m * sz * lh / 72 + 0.1)
        return out
    sz = size
    while True:
        hs = row_hs(sz)
        if sum(hs) <= max_h or sz <= minimum:
            break
        sz -= 0.5
    log(name, sz, sum(hs), max_h)
    gt = s.shapes.add_table(len(rows), len(rows[0]), Inches(x), Inches(y), Inches(w), Inches(sum(hs))).table
    gt.first_row = True
    for j, cw in enumerate(col_w):
        gt.columns[j].width = Inches(cw)
    for i, r in enumerate(rows):
        gt.rows[i].height = Inches(hs[i])
        for j, v in enumerate(r):
            cell = gt.cell(i, j); cell.text = ''
            cell.margin_left = cell.margin_right = Inches(pad)
            cell.margin_top = cell.margin_bottom = Inches(0.05)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            p = cell.text_frame.paragraphs[0]; p.line_spacing = 1.0
            hd = i == 0
            add_rich(p, str(v), sz, W if hd else C['navy'] if (j == 0 and bold_col0) else C['text'],
                     bold=hd or (j == 0 and bold_col0))
            cell.fill.solid()
            if hd:
                cell.fill.fore_color.rgb = rgb(head_fill)
            elif j in col_fill:
                cell.fill.fore_color.rgb = rgb(col_fill[j])
            else:
                cell.fill.fore_color.rgb = rgb(C['light'] if i % 2 == 0 else W)
    return sum(hs)


def plain_box(s, sp):
    box(s, X0, 1.47, XW, 0.47, fill=C['teal_l'])
    box(s, X0, 1.47, 0.07, 0.47, fill=C['teal'])
    tb, _, _ = T(s, X0 + 0.12, 1.47, XW - 0.17, 0.47, [sp['plain']], 14, 11, 'plain', color=C['navy'], anchor='m',
                 emph=['通俗地说：'])
    tb.name = 'plain'


def footnote(s, sp):
    """本页文献脚注带；返回内容区可用的底线。"""
    if not sp['refs']:
        return BOT
    txt = '本页文献：' + sp['footnote']
    sz = 9.0
    h = need_h(txt, sz, XW, line=1.0)
    if h > 0.95:
        sz = 8.5; h = need_h(txt, sz, XW, line=1.0)
    y = 6.97 - h
    box(s, X0, y - 0.03, XW, 0.012, fill=C['silver'])
    tb, _, _ = T(s, X0, y, XW, h, [txt], sz, 8.5, 'footnote', color=C['grey'], line=1.0, space_after=0)
    tb.name = 'footnote'
    return y - 0.1


def fig_panel(s, path, x, y, w, h, halign='c', cap_h=0.28):
    """等比放入单面板（不拉伸、不裁剪）+ 图注；图注宽度不超过图宽，窄图时图注分两行（cap_h 需留 0.46）。"""
    pic, (px, py, pw, ph) = picture_fit(s, path, x, y, w, h - cap_h, valign='t', halign=halign)
    name, note = '图：' + os.path.basename(path)[2:-4], '（模拟数据，SYNTHETIC）'
    one = text_width_pt(name + note, 10) / 72 + 0.2 <= pw
    paras = [name + note] if one else [name, note] if text_width_pt(note, 10) / 72 + 0.2 <= pw else \
        [name, note[:6], note[6:]]
    T(s, px, py + ph + 0.02, pw, cap_h - 0.02, paras, 10, 10, 'caption', color=C['grey'], space_after=0, line=1.0)
    return px, py, pw, ph


def head_card(s, x, y, w, h, head, paras, col, bg, size=14, minimum=10, head_h=0.4, head_size=14, name='card',
              bullet=False, head_color=W, anchor='t', emph=None):
    box(s, x, y, w, h, fill=bg)
    box(s, x, y, w, head_h, fill=col)
    T(s, x + 0.06, y, w - 0.12, head_h, [head], head_size, min(head_size, 12), name + '_head', color=head_color,
      bold=True, anchor='m')
    return T(s, x + 0.06, y + head_h + 0.05, w - 0.12, h - head_h - 0.08, paras, size, minimum, name,
             bullet=bullet, anchor=anchor, emph=emph)


def section_frame(s, sp):
    vm, pptkit.vmargin = pptkit.vmargin, lambda h: 0.0          # 两行标题在 0.30—1.36 英寸内保持 ≥ 26 磅
    SIZE['title_min'] = 26
    tw = (XW - 2 * pptkit.MARGIN) * 72
    ts = next((z for z in (28, 27.5, 27, 26.5, 26) if len(wrap_lines(sp['title'], z, tw, True)) == 1), 28)
    try:
        frame(s, sp['no'], TOTAL, sp['title'], sp['section'], footer=SYN if sp['synthetic'] else None, title_size=ts)
    finally:
        pptkit.vmargin = vm


NUMS = lambda sp: [v + '%' for v in sp['numbers'].values()]      # 结果页数字着色（只在出现处生效）


# ---------- 逐页版式 ----------
def L_cover(s, sp, bot):
    t1, _, t2 = sp['title'].partition('——')
    k = t1.index('供需')
    box(s, 0, 0, SW, 0.22, fill=C['navy'])
    T(s, 0.9, 1.1, 11.5, 2.6, [t1[:k], t1[k:], '——' + t2], 34, 28, 'title', color=C['navy'], bold=True, anchor='b',
      space_after=0.1)
    box(s, 0.9, 3.82, 1.2, 0.05, fill=C['teal'])
    T(s, 0.9, 3.95, 11.5, 0.65, [sp['bullets'][0]], 22, 20, 'subtitle', color=C['teal'], bold=True)
    T(s, 0.9, 4.65, 11.5, 1.2, sp['bullets'][1:3], 16, 16, 'info', color=C['grey'])
    lbox(s, 0.9, 6.45, 11.5, 0.5, [sp['bullets'][3]], fill=C['orange_l'], color=C['orange'], size=11, align='l',
         name='synthetic', inset=0.08)


def L_one_page(s, sp, bot):
    b = sp['bullets']
    lab, txt = split_label(b[0])
    lbox(s, X0, TOP, 1.25, 0.82, [lab], fill=C['grey'], color=W, size=16, bold=True, name='phen_lab')
    lbox(s, X0 + 1.3, TOP, XW - 1.3, 0.82, [txt], fill=C['light'], size=15, minimum=12, align='l', inset=0.1,
         name='phen')
    # 四个编号步骤（RQ1→RQ4），右侧用括注标出“需求”“供给”两段
    y0, sh, sg = TOP + 0.98, 0.56, 0.16
    sw = XW - 2.35
    for i, t in enumerate(b[1:5]):
        y = y0 + i * (sh + sg); col = C['teal'] if i < 2 else C['orange']
        lab, txt = split_label(t)
        box(s, X0, y, sh, sh, fill=col, shape='oval', text=str(i + 1), size=18, color=W, bold=True)
        lbox(s, X0 + 0.65, y, 1.75, sh, [lab], fill=col, color=W, size=14, bold=True, name=f'step{i + 1}_lab')
        lbox(s, X0 + 2.45, y, sw - 2.45, sh, [txt], fill=C['teal_l'] if i < 2 else C['orange_l'], size=15,
             minimum=12, align='l', inset=0.1, name=f'step{i + 1}')
        if i < 3:
            arrow(s, X0 + sh / 2, y + sh + 0.01, X0 + sh / 2, y + sh + sg - 0.01, color=C['navy'], width=2)
    for k, (lab, col) in enumerate([('需求是什么', C['teal']), ('供给怎么配', C['orange'])]):
        y = y0 + k * 2 * (sh + sg)
        lbox(s, X0 + sw + 0.15, y, XW - sw - 0.15, 2 * sh + sg, [lab], fill=W, line=col, color=col, size=16,
             bold=True, name=f'brace{k + 1}', line_w=1.5)
    y = y0 + 4 * (sh + sg) + 0.04
    lab, txt = split_label(b[5])
    lbox(s, X0, y, 1.25, bot - y, [lab[:4], lab[4:]], fill=C['navy'], color=W, size=13, minimum=11,
         bold=True, name='find_lab')
    lbox(s, X0 + 1.3, y, XW - 1.3, bot - y, [txt], fill=C['light'], line=C['navy'], size=15,
         minimum=12, align='l', inset=0.12, name='find', emph=NUMS(sp) + ['0.5 个百分点'])


def L_two_col(s, sp, bot):
    b = sp['bullets']
    if sp['no'] == 3:
        left, right = b[:2], b[2:]
    else:
        left, right = [b[0], b[3], b[4]], [b[1], b[2]]
    cw = (XW - 0.25) / 2
    for ci, items in enumerate((left, right)):
        x = X0 + ci * (cw + 0.25)
        n = len(items); g = 0.14
        # 各卡片高度按文字量分配
        lens = [len(t) + 40 for t in items]
        avail = bot - TOP - g * (n - 1)
        y = TOP
        for i, t in enumerate(items):
            h = avail * lens[i] / sum(lens)
            if '：' in t[:8]:
                lab, txt = split_label(t)
                col = [C['navy'], C['teal'], C['orange'], C['grey']][(ci * 2 + i) % 4]
                box(s, x, y, cw, h, fill=C['light'])
                lbox(s, x, y, 1.35, h, [lab], fill=col, color=W, size=15, minimum=12, bold=True,
                     name=f'c{ci}{i}_lab', inset=0.05)
                T(s, x + 1.45, y, cw - 1.5, h, [txt], 15, 11, f'c{ci}{i}', anchor='m')
            else:
                lbox(s, x, y, cw, h, [t], fill=W, line=C['silver'], size=15, minimum=11, align='l', inset=0.1,
                     name=f'c{ci}{i}', color=C['navy'])
            y += h + g


def L_cards3(s, sp, bot):
    b = sp['bullets']
    cw, gap = (XW - 0.5) / 3, 0.25
    cols = [(C['teal'], C['teal_l']), (C['navy'], C['light']), (C['orange'], C['orange_l'])]
    if sp['no'] == 4:
        ch = bot - TOP
        for i, t in enumerate(b):
            x = X0 + i * (cw + gap); col, bg = cols[i]
            head, body = split_label(t)
            body, conseq = body.split('后果：')
            box(s, x, TOP, cw, ch, fill=W, line=C['silver'])
            box(s, x, TOP, cw, 0.08, fill=col)
            T(s, x + 0.15, TOP + 0.15, cw - 0.3, 0.5, [head], 20, 16, f'card{i + 1}_head', color=col, bold=True)
            hc = need_h('后果：' + conseq, 15, cw - 0.3, bold=True) + 0.12
            T(s, x + 0.15, TOP + 0.75, cw - 0.3, ch - 0.95 - hc, [body], 15, 11, f'card{i + 1}_body')
            lbox(s, x + 0.12, TOP + ch - hc - 0.12, cw - 0.24, hc, ['后果：' + conseq], fill=bg, color=col, size=15,
                 minimum=11, bold=True, align='l', inset=0.06, name=f'card{i + 1}_conseq')
    else:
        ch = 3.05
        for i, t in enumerate(b[:3]):
            x = X0 + i * (cw + gap); col, bg = cols[i]
            head, body = split_label(t)
            head_card(s, x, TOP, cw, ch, head, [body], col, bg, size=15, minimum=11, head_h=0.45, head_size=16,
                      name=f'card{i + 1}')
        parts = b[3].split('；')
        y = TOP + ch + 0.2
        T(s, X0, y - 0.03, 3, 0.4, ['成果'], 15, 15, 'out_head', color=C['navy'], bold=True)
        y += 0.36
        pw = (XW - 0.3) / 3
        for i, p in enumerate(parts):
            lab, txt = split_label(p)
            col = [C['teal'], C['orange'], C['navy']][i]
            x = X0 + i * (pw + 0.15)
            box(s, x, y, pw, bot - y, fill=W if i < 2 else C['navy'], line=col, line_w=1.25)
            T(s, x + 0.1, y + 0.05, pw - 0.2, 0.36, [lab], 15, 13, f'out{i + 1}_lab', color=W if i == 2 else col,
              bold=True)
            T(s, x + 0.1, y + 0.42, pw - 0.2, bot - y - 0.47, [txt], 14, 11, f'out{i + 1}',
              color=W if i == 2 else C['text'])


def L_three_rows(s, sp, bot):
    labs = ['理论', '方法', '实践']
    cols = [C['teal'], C['navy'], C['orange']]
    g = 0.16; rh = (bot - TOP - 2 * g) / 3
    for i, t in enumerate(sp['bullets']):
        y = TOP + i * (rh + g)
        _, txt = split_label(t)
        box(s, X0, y, XW, rh, fill=C['light'])
        lbox(s, X0, y, 1.6, rh, [labs[i]], fill=cols[i], color=W, size=24, bold=True, name=f'row{i + 1}_lab')
        T(s, X0 + 1.75, y, XW - 1.85, rh, [txt], 16, 12, f'row{i + 1}', anchor='m')


def L_chain(s, sp, bot):
    rows = []
    for t in sp['bullets']:
        a, gap_txt = t.split('→ ')
        lab, lit = split_label(a.strip())
        rows.append((lab, lit, gap_txt))
    lw, gw, aw = 1.6, 3.75, 0.45
    tw = XW - lw - gw - aw - 0.2
    g = 0.1
    sz = 14
    while True:
        hs = [max(need_h(lit, sz, tw), need_h(gt, sz, gw - 0.12, bold=True), 0.5) for _, lit, gt in rows]
        if sum(hs) + g * 4 <= bot - TOP or sz <= 10:
            break
        sz -= 0.5
    log('chain_rows', sz, sum(hs) + g * 4, bot - TOP)
    extra = (bot - TOP - sum(hs) - g * 4) / 5
    y = TOP
    for i, ((lab, lit, gt), h) in enumerate(zip(rows, hs)):
        h += extra
        col = C['teal'] if i < 4 else C['orange']
        box(s, X0, y, lw, h, fill=col, shape='pentagon' if i == 0 else 'rect')
        T(s, X0 + 0.05, y, lw - 0.1, h, [lab], 15, 12, f'stage{i + 1}', color=W, bold=True, align='c', anchor='m')
        box(s, X0 + lw, y, tw + 0.1, h, fill=C['light'])
        textbox(s, X0 + lw + 0.05, y, tw, h, [lit], size=sz, fit=False, anchor='m')
        ax = X0 + lw + tw + 0.15
        arrow(s, ax + 0.03, y + h / 2, ax + aw - 0.05, y + h / 2, color=RED, width=2)
        box(s, ax + aw, y, gw, h, fill=RED_L, line=RED, shape='round', line_w=1.5)
        textbox(s, ax + aw + 0.06, y, gw - 0.12, h, [gt], size=sz, color=RED, bold=True, fit=False, anchor='m')
        if i < 4:
            arrow(s, X0 + lw / 2, y + h + 0.005, X0 + lw / 2, y + h + g - 0.005, color=C['navy'], width=1.5)
        y += h + g


def L_rq_matrix(s, sp, bot):
    b = sp['bullets']
    lw = 1.75; qw = 5.05; hw = XW - lw - qw - 0.2
    T(s, X0 + lw + 0.1, TOP - 0.02, qw, 0.38, ['研究问题'], 14, 14, 'h_q', color=C['navy'], bold=True)
    T(s, X0 + lw + qw + 0.2, TOP - 0.02, hw, 0.38, ['假设'], 14, 14, 'h_h', color=C['navy'], bold=True)
    rows = []
    for t in b[:4]:
        lab, rest = split_label(t)
        q, h = rest.split('——')
        rows.append((lab, q, h))
    out_h = 0.95
    y0 = TOP + 0.36; avail = bot - y0 - out_h - 0.15 - 3 * 0.08
    sz = 14
    while True:
        hs = [max(need_h(q, sz, qw - 0.16), need_h(h, sz, hw - 0.16), 0.75) for _, q, h in rows]
        if sum(hs) <= avail or sz <= 10:
            break
        sz -= 0.5
    log('rq_rows', sz, sum(hs), avail)
    extra = (avail - sum(hs)) / 4
    y = y0
    for i, ((lab, q, h), hh) in enumerate(zip(rows, hs)):
        hh += extra; col, bg = (C['teal'], C['teal_l']) if i < 2 else (C['orange'], C['orange_l'])
        lbox(s, X0, y, lw, hh, lab.split(' ', 1), fill=col, color=W, size=15, minimum=12, bold=True, name=f'rq{i + 1}')
        box(s, X0 + lw + 0.1, y, qw, hh, fill=bg)
        textbox(s, X0 + lw + 0.18, y, qw - 0.16, hh, [q], size=sz, fit=False, anchor='m')
        box(s, X0 + lw + qw + 0.2, y, hw, hh, fill=W, line=col)
        textbox(s, X0 + lw + qw + 0.28, y, hw - 0.16, hh, [h], size=sz, fit=False, anchor='m')
        y += hh + 0.08
    y = bot - out_h
    lab, rest = split_label(b[4])
    p1, p2 = rest.split('；')
    lbox(s, X0, y, lw, out_h, [lab], fill=C['navy'], color=W, size=16, bold=True, name='out_lab')
    pw = (XW - lw - 0.2) / 2
    lbox(s, X0 + lw + 0.1, y, pw, out_h, [p1], fill=C['teal_l'], line=C['teal'], size=14, minimum=11, bold=True,
         color=C['teal'], name='paper1', inset=0.1)
    lbox(s, X0 + lw + 0.2 + pw, y, pw, out_h, [p2], fill=C['orange_l'], line=C['orange'], size=14, minimum=11,
         bold=True, color=C['orange'], name='paper2', inset=0.1)


def L_matrix_table(s, sp, bot):
    note_h = need_h(sp['bullets'][0], 14, XW) + 0.05
    th = ntable(s, X0, TOP, XW, sp['table'], [3.3, 3.65, 2.0, 3.38], bot - TOP - note_h - 0.25, size=13,
                name='data_table', col_fill={2: BLUE_L})
    y = TOP + th + 0.2
    box(s, X0, y, 0.07, note_h, fill=C['grey'])
    T(s, X0 + 0.12, y, XW - 0.12, note_h, sp['bullets'], 14, 11, 'note', color=C['navy'])


def L_censor(s, sp, bot):
    lw = 5.55
    # 删失示意：19 座车（坐满）+ 车外 6 人
    bx, by, bw, bh = X0 + 0.05, TOP + 0.1, 3.35, 2.0
    box(s, bx, by, bw, bh, fill=C['light'], line=C['navy'], shape='round', line_w=2)
    box(s, bx + bw - 0.08, by + 0.25, 0.08, 0.6, fill=C['navy'])                        # 车门
    for k in range(2):
        box(s, bx + 0.45 + k * (bw - 1.25), by + bh - 0.12, 0.38, 0.38, fill=C['navy'], shape='oval')
    for k in range(19):
        r, c = divmod(k, 5)
        box(s, bx + 0.25 + c * 0.55, by + 0.2 + r * 0.4, 0.42, 0.3, fill=C['teal'], shape='round')
    px0 = bx + bw + 0.35
    for k in range(6):
        r, c = divmod(k, 3)
        x = px0 + c * 0.55; y = by + 0.25 + r * 0.85
        box(s, x + 0.1, y, 0.24, 0.24, fill=C['orange'], shape='oval')
        box(s, x + 0.04, y + 0.27, 0.36, 0.38, fill=C['orange'], shape='round')
    y = by + bh + 0.3
    lbox(s, X0, y, lw, 0.46, ['台账记 19，真实需求≥19'], fill=C['orange_l'], line=C['orange'], color=C['orange'],
         size=16, bold=True, name='censor_lab')
    y += 0.58
    vstack(s, X0, y, lw, bot - y, [(t, 'n', None) for t in sp['bullets']], 14, 10, name='left_bullets')
    # 术语表
    tx = X0 + lw + 0.3
    ntable(s, tx, TOP, XW - lw - 0.3, sp['table'], [1.55, XW - lw - 0.3 - 1.55], bot - TOP, size=13,
           name='glossary')


def L_route(s, sp, bot):
    nodes = sp['route']; n = len(nodes)
    g = 0.28; nw = (XW - g * (n - 1)) / n; nh = 2.0
    cols = [C['grey'], C['teal'], C['teal'], C['orange'], C['orange'], C['navy']]
    for i, (h, t) in enumerate(nodes):
        x = X0 + i * (nw + g)
        head_card(s, x, TOP, nw, nh, h, [t], cols[i], C['teal_l'] if i in (1, 2) else C['orange_l'] if i in (3, 4)
                  else C['light'], size=14, minimum=11, head_h=0.48, head_size=15, name=f'node{i + 1}')
        if i < n - 1:
            arrow(s, x + nw + 0.03, TOP + nh / 2, x + nw + g - 0.03, TOP + nh / 2, color=C['navy'], width=2.25)
    # 删失负二项结构项从模型一传给模型二、模型二的预测分布传给模型四：用下方弧线示意
    y = TOP + nh + 0.08
    x1 = X0 + 1 * (nw + g) + nw / 2; x2 = X0 + 2 * (nw + g) + nw / 2; x4 = X0 + 4 * (nw + g) + nw / 2
    for xa, xb, col in ((x1, x2, C['teal']), (x2, x4, C['orange'])):
        box(s, xa - 0.01, y, 0.02, 0.18, fill=col); box(s, xa, y + 0.17, xb - xa, 0.02, fill=col)
        arrow(s, xb, y + 0.18, xb, y + 0.01, color=col, width=1.5)
    vstack(s, X0, y + 0.35, XW, bot - y - 0.35, [(t, 'n', None) for t in sp['bullets']], 15, 10, name='bullets')


def L_fig_numbers(s, sp, bot):
    lw = 8.85
    px, py, pw, ph = fig_panel(s, sp['figures'][0], X0, TOP, lw, 3.2, halign='l')
    y = py + ph + 0.36
    vstack(s, X0, y, lw, bot - y, [(t, 'n', ['852', '116127', '3.0%', '255', '808']) for t in sp['bullets']], 14, 10,
           name='bullets')
    cards = [('852', '天', '模拟天数'), ('116127', '个', '班次观测'), ('3.0', '%', '满载删失班次占比'),
             ('255', '次', '调度员临时加班'), ('808', '份', '四套模拟问卷')]
    x = X0 + lw + 0.3; w = XW + X0 - x
    ch = (bot - TOP - 0.1 * 4) / 5
    for i, (v, u, lab) in enumerate(cards):
        y = TOP + i * (ch + 0.1)
        box(s, x, y, w, ch, fill=C['light'])
        box(s, x, y, 0.07, ch, fill=C['orange'])
        T(s, x + 0.15, y + 0.04, w - 0.2, ch * 0.58, [v + u], 24, 16, 'num' + str(i + 1), color=C['orange'],
          bold=True, anchor='m')
        T(s, x + 0.15, y + ch * 0.6, w - 0.2, ch * 0.38, [lab], 13, 11, 'numlab' + str(i + 1), color=C['grey'],
          anchor='t')


def L_method_table(s, sp, bot):
    ntable(s, X0, TOP, XW, sp['table'], [1.85, 2.3, 3.45, 2.55, 2.18], bot - TOP, size=14, name='method_table',
           col_fill={2: RED_L, 3: BLUE_L})


BLOCKS = ['要回答的问题', '为什么选这个方法', '和其他方法比', '怎么证明它有效']
BCOL = [C['navy'], C['teal'], C['grey'], C['orange']]
BBG = [C['light'], C['teal_l'], 'EEF0F2', C['orange_l']]


def L_model4(s, sp, bot):
    y0 = TOP
    if sp.get('formula'):
        lbox(s, X0, y0, 0.9, 0.5, ['公式'], fill=C['navy'], color=W, size=14, bold=True, name='f_lab')
        lbox(s, X0 + 0.95, y0, XW - 0.95, 0.5, [sp['formula']], fill=C['light'], size=13, minimum=10, align='l',
             inset=0.1, name='formula')
        y0 += 0.6
    g = 0.14; cw = (XW - g) / 2; hh = 0.4
    bl = sp['blocks']
    # 两行高度按文字量分配，统一字号
    avail = bot - y0 - g
    sz = 14
    while True:
        need = [need_h(bl[k], sz, cw - 0.16) + hh + 0.1 for k in BLOCKS]
        r1, r2 = max(need[0], need[1]), max(need[2], need[3])
        if r1 + r2 <= avail or sz <= 10:
            break
        sz -= 0.5
    log('blocks', sz, r1 + r2, avail)
    extra = (avail - r1 - r2) / 2
    rh = [r1 + extra, r2 + extra]
    for i, k in enumerate(BLOCKS):
        r, c = divmod(i, 2)
        x = X0 + c * (cw + g); y = y0 + r * (rh[0] + g)
        box(s, x, y, cw, rh[r], fill=BBG[i])
        lbox(s, x, y, cw, hh, [f'{i + 1}  {k}'], fill=BCOL[i], color=W, size=15, bold=True, align='l', inset=0.1,
             name=f'b{i + 1}_head')
        textbox(s, x + 0.08, y + hh + 0.04, cw - 0.16, rh[r] - hh - 0.08, [bl[k]], size=sz, fit=False)


def L_result(s, sp, bot):
    figs = sp['figures']
    from PIL import Image
    asp = [Image.open(f).size[0] / Image.open(f).size[1] for f in figs]
    lw = 7.95; g = 0.15
    fh = bot - TOP                               # 图区高度（含图注）
    cap_h = 0.64 if min(asp) < 0.7 else 0.46     # 竖长窄面板的图注需三行
    ph = fh - cap_h
    ws = [a * ph for a in asp]
    if min(asp) < 0.7:                           # 竖长窄面板按满高放置，另一面板占余下宽度（高度随比例）
        i = asp.index(min(asp)); ws[1 - i] = min(lw - g - ws[i], asp[1 - i] * ph)
    elif sum(ws) + g > lw:                       # 宽度受限时按同一高度等比缩小
        k = (lw - g) / sum(ws); ws = [w * k for w in ws]
    x = X0
    for f, w in zip(figs, ws):
        fig_panel(s, f, x, TOP, w, min(fh, w / Image.open(f).size[0] * Image.open(f).size[1] + cap_h), cap_h=cap_h)
        x += w + g
    rx = x + 0.15; rw = XW + X0 - rx
    items = []
    for t in sp['bullets']:
        items.append((t, 'honest' if t.startswith('诚实说明') else 'n', NUMS(sp)))
    vstack(s, rx, TOP, rw, bot - TOP, items, 14, 10, name='bullets', gap=0.12)


def L_progress(s, sp, bot):
    b = sp['bullets']
    tl_h = 1.2
    lw = 7.3; g = 0.1
    stat = [(C['green'], W), (C['yellow'], C['navy']), (C['silver'], C['navy']), (C['navy'], W)]
    avail = bot - TOP - tl_h - 0.2 - 3 * g
    sz = 14
    while True:
        hs = [max(need_h(split_label(t)[1], sz, lw - 1.45), 0.45) for t in b[:4]]
        if sum(hs) <= avail or sz <= 10:
            break
        sz -= 0.5
    log('progress_rows', sz, sum(hs), avail)
    extra = (avail - sum(hs)) / 4
    y = TOP
    for i, (t, hh) in enumerate(zip(b[:4], hs)):
        hh += extra
        lab, txt = split_label(t)
        lbox(s, X0, y, 1.3, hh, [lab], fill=stat[i][0], color=stat[i][1], size=15, bold=True, name=f'st{i + 1}_lab')
        box(s, X0 + 1.35, y, lw - 1.35, hh, fill=C['light'])
        textbox(s, X0 + 1.42, y, lw - 1.49, hh, [txt], size=sz, fit=False, anchor='m')
        y += hh + g
    lab, txt = split_label(b[4])
    rx = X0 + lw + 0.25; rw = XW + X0 - rx
    items = [x for x in txt.rstrip('。').split('；')]
    head_card(s, rx, TOP, rw, bot - TOP - tl_h - 0.2, lab, items, C['grey'], C['light'], size=14, minimum=10,
              head_h=0.45, head_size=15, name='limits', bullet=True)
    # 时间轴
    lab, txt = split_label(b[5])
    stages = [x.strip() for x in txt.rstrip('。').split('→')]
    y = bot - tl_h
    T(s, X0, y, 1.2, 0.3, [lab], 12, 12, 'tl_lab', color=C['navy'], bold=True)
    segs = chain(s, [''] * 6, X0, y + 0.32, XW, tl_h - 0.32, colors=[C['yellow']] * 2 + [C['silver']] * 4)
    for (x, w), st in zip(segs, stages):
        m = re.match(r'(第 [\d—]+ 月) (.+)', st)
        T(s, x + 0.2, y + 0.32, w - 0.3, tl_h - 0.32, [m.group(1), m.group(2)], 11, 10, 'timeline',
          color=C['navy'], bold=True, align='c', anchor='m', space_after=0)


def L_refs(s, sp, bot):
    refs = {r['no']: r for r in spec['references']}
    ents = [f"[{i}] {refs[i]['gbt']}" for i in sp['ref_range']]
    cw, ind, ln, sa = 6.12, 0.25, 0.9, 0.05            # 两栏、悬挂缩进 0.25 英寸、行距 0.9（西文著录为主）
    h = [need_h(e, 9, cw - ind, line=ln) for e in ents]
    cut = min(range(1, len(ents)), key=lambda k: max(sum(h[:k]), sum(h[k:])))
    keep, pptkit.REF_RE = pptkit.REF_RE, re.compile(r'(?!)')      # 著录中的方括号不做上标
    try:
        cols = (((X0, 'col1'), ents[:cut]), ((X0 + XW - cw, 'col2'), ents[cut:]))
        size = min(fit_size(part, cw - ind, 5.5, 10, 9, line=ln, space_after=sa)[0] for _, part in cols)
        for (x, nm), part in cols:                     # 两栏统一字号
            fit_size(part, cw - ind, 5.5, size, 9, tag={'slide': NO[0], 'box': nm}, line=ln, space_after=sa)
            tb, _, _ = textbox(s, x, 1.47, cw, 5.5, part, size=size, line=ln, space_after=sa, fit=False)
            for para in tb.text_frame.paragraphs:
                pPr = para._p.get_or_add_pPr()
                pPr.set('marL', str(int(Inches(ind)))); pPr.set('indent', str(-int(Inches(ind))))
    finally:
        pptkit.REF_RE = keep


def label_rows(s, x, y, w, h, rows, lw=1.35, size=14, minimum=10, gap=0.1, name='rows'):
    """左侧色块标签 + 右侧正文的多行，统一字号，按文字量分配行高。rows：[(标签, 正文, 标签色, 底色)]。"""
    tw = w - lw - 0.08
    sz = size
    while True:
        hs = [max(need_h(t, sz, tw - 0.12), 0.5) for _, t, _, _ in rows]
        if sum(hs) + gap * (len(rows) - 1) <= h or sz <= minimum:
            break
        sz -= 0.5
    log(name, sz, sum(hs) + gap * (len(rows) - 1), h)
    extra = (h - sum(hs) - gap * (len(rows) - 1)) / len(rows)
    yy = y
    for i, ((lab, t, col, bg), hh) in enumerate(zip(rows, hs)):
        hh += extra
        lbox(s, x, yy, lw, hh, lab.split('\n'), fill=col, color=W if col not in (C['silver'], C['yellow']) else C['navy'],
             size=14, minimum=11, bold=True, name=f'{name}{i + 1}_lab', inset=0.04)
        box(s, x + lw + 0.08, yy, tw, hh, fill=bg)
        textbox(s, x + lw + 0.14, yy, tw - 0.12, hh, [t], size=sz, fit=False, anchor='m')
        yy += hh + gap


def L_policy_map(s, sp, bot):
    # 左：多层级枢纽体系（自上而下收窄），县域末端高亮
    lv = sp['levels']; lw = 5.35; n = len(lv); g = 0.17
    bh = (bot - TOP - g * (n - 1)) / n
    for i, (h, d) in enumerate(lv):
        w = lw - i * 0.25; x = X0 + (lw - w) / 2; y = TOP + i * (bh + g)
        last = i == n - 1
        box(s, x, y, w, bh, fill=C['orange'] if last else C['light'], line=None if last else C['silver'])
        T(s, x + 0.08, y + 0.03, w - 0.16, bh * 0.45, [h], 14, 11, f'lv{i + 1}_h', color=W if last else C['navy'],
          bold=True, align='c', anchor='m')
        T(s, x + 0.08, y + bh * 0.45, w - 0.16, bh * 0.55 - 0.03, [d], 12, 10, f'lv{i + 1}_d',
          color=W if last else C['grey'], align='c', anchor='m')
        if i < n - 1:
            arrow(s, X0 + lw / 2, y + bh + 0.01, X0 + lw / 2, y + bh + g - 0.01, color=C['navy'], width=1.75)
    # 右：定位、三类对接、判断
    b = sp['bullets']
    rx = X0 + lw + 0.3; rw = XW + X0 - rx
    rows = [('规划定位', b[0], C['navy'], C['light'])]
    for t, col, bg in ((b[1], C['teal'], C['teal_l']), (b[2], C['grey'], 'EEF0F2'), (b[3], C['silver'], C['light'])):
        lab, txt = split_label(t)
        rows.append((lab.replace('（', '\n（'), txt, col, bg))
    rows.append(('判断', split_label(b[4])[1], C['yellow'], YEL_L))
    rows[0] = ('规划定位', split_label(b[0])[1], C['navy'], C['light'])
    label_rows(s, rx, TOP, rw, bot - TOP, rows, lw=1.3, size=14, minimum=10, name='map')


def L_policy_table(s, sp, bot):
    note = sp['bullets'][0]
    note_h = need_h(note, 13, XW - 0.16) + 0.08
    th = ntable(s, X0, TOP, XW, sp['table'], [2.4, 3.5, 4.1, 2.33], bot - TOP - note_h - 0.25, size=13,
                name='policy_table', col_fill={2: BLUE_L})
    y = TOP + th + 0.2
    box(s, X0, y, XW, note_h, fill=YEL_L, line=YEL, line_w=1.25)
    T(s, X0 + 0.08, y, XW - 0.16, note_h, [note], 13, 10, 'improve', anchor='m')


LAYOUT = dict(cover=L_cover, one_page=L_one_page, two_col=L_two_col, cards3=L_cards3, three_rows=L_three_rows,
              chain=L_chain, rq_matrix=L_rq_matrix, matrix_table=L_matrix_table, censor_glossary=L_censor,
              route_shapes=L_route, fig_left60_numbers=L_fig_numbers, method_table=L_method_table,
              model4=L_model4, result_fig=L_result, progress=L_progress, refs=L_refs,
              policy_map=L_policy_map, policy_table=L_policy_table)


def notes_text(sp):
    parts = [sp['talk']]
    if sp['layout_id'] != 'refs':
        full = []
        if sp.get('plain'):
            full.append(sp['plain'])
        full += sp.get('bullets', [])
        if sp.get('formula'):
            full.append('公式：' + sp['formula'])
        for k, v in (sp.get('blocks') or {}).items():
            full.append(f'{k}：{v}')
        for h, t in (sp.get('route') or []) + (sp.get('levels') or []):
            full.append(f'{h}：{t}')
        for r in sp.get('table') or []:
            full.append('｜'.join(r))
        parts.append('完整要点：\n' + '\n'.join(f'{i + 1}. {t}' for i, t in enumerate(full)))
    if sp.get('notes_refs'):
        parts.append('本页文献：\n' + '\n'.join(sp['notes_refs']))
    if sp['synthetic']:
        parts.append('本页数字为 SYNTHETIC 模拟结果。' + SYN + '。')
    return '\n\n'.join(parts)


prs = new_prs()
for sp in spec['slides']:
    s = blank(prs); NO[0] = sp['no']
    bot = BOT
    if sp['layout_id'] != 'cover':
        section_frame(s, sp)
        if sp.get('plain'):
            plain_box(s, sp)
        bot = footnote(s, sp)
    LAYOUT[sp['layout_id']](s, sp, bot)
    s.notes_slide.notes_text_frame.text = notes_text(sp)
prs.save(OUT)
json.dump(pptkit.FIT_LOG, open('ppt/fit_log.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
over = [f"{d['slide']}:{d['box']}" for d in pptkit.FIT_LOG if d['overflow']]
print(OUT, len(prs.slides), '页；溢出', len(over), '个：', ' '.join(over))
