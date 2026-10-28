# PPT 自检报告

- 文件：`新晃城乡公交研究进展汇报.pptx`
- 页数：20
- 结论：**通过**（未通过 0 项，提醒 0 项）

## 逐页记录

| 页 | 版式 | 数字键 | 页面文献编号 | 最小字号 | 模拟页 |
|---|---|---|---|---|---|
| 1 | cover | — | — | 11.0 |  |
| 2 | toc | — | — | 10.0 |  |
| 3 | two_col | — | 1,2,3,4,5,6,7 | 10.0 |  |
| 4 | banner_cards3 | — | 8,9,10,11,12 | 10.0 |  |
| 5 | chain_gaps | — | 13,14,15,16,17,18,19,20,21 | 10.0 |  |
| 6 | rq_matrix | — | — | 10.0 |  |
| 7 | fig_left_tags | — | 22,23,24 | 10.0 |  |
| 8 | fig_left55 | — | 14,25,26,27 | 10.0 |  |
| 9 | fig_left60_numbers | sim_days,sim_nobs,sim_full,sim_extra,sv_total | — | 10.0 | Y |
| 10 | flow_formula | — | 28,29,30,31,32 | 10.0 |  |
| 11 | fig_left60_hyp | fwt_cnb_tod,fwt_cnb_tod_lo,fwt_cnb_tod_hi,fwt_true_tod,fwd_cnb_sf,fwd_cnb_hol,fwd_cnb_mkt,fwd_cnb_wx,fe_cnb_mae,fe_grey_mae,fe_shap_mae,fe_ent_mae,fe_ent_rho,fe_grey_rho | 14 | 10.0 | Y |
| 12 | flow3_two_col | — | 33,34,35,36,37,38 | 10.0 |  |
| 13 | fig_left60_hyp | fc_hyb_all_wape,fc_snaive_all_wape,fc_cnb_all_wape,fc_lgb_all_wape,fc_imp_all_wape,dm_m_lgb_abs_p,fc_lgb_cen_under,fc_hyb_cen_under,cv_mon_sf,cv_glo_sf,cv_mon_nd,cv_mon_wx | — | 10.0 | Y |
| 14 | two_col_formula | — | 39,40,41,42,43,44,45 | 10.0 |  |
| 15 | two_col_formula | — | 19,21,46,47,48,49 | 10.0 |  |
| 16 | fig_left60_hyp | fx_cur_all_trips,fx_opt_all_trips,fxd_opt_trips,fxd_opt_vkm,fx_cur_all_srv,fx_opt_all_srv,fx_opt_all_red,fx_wait_change,fx_cur_all_full,fx_opt_all_full,fx_main_all_red,fxg_main_all,fxg_main_he,fxg_main_sf,fxg_main_nd,voi_main,voi_imp,fx_orac_all_red | — | 10.0 | Y |
| 17 | cards3_roadmap | — | 16,19 | 10.0 |  |
| 18 | progress | — | — | 10.0 |  |
| 19 | refs | — | — | 9.0 |  |
| 20 | refs | — | — | 9.0 |  |

## 未通过项

- 无

## 提醒项

- 无

## 溢出调整记录

预览方式：LibreOffice 导出 PDF + pdftoppm 逐页人工查看（20 页），并运行 quick_render.py 生成 render_issues.json（问题 0 个）；拟合日志 ppt/fit_log.json 中溢出文本框 0 个。

| 页 | 起步版问题 | 处理 |
|---|---|---|
| 1 | 主标题在“半／柔性”处断行 | 按语义分三行（研究对象／研究内容／案例地），文字不变 |
| 3、4、5、6、10、12、14、15、17、18 | diagram 区域为占位虚线框，要点原样塞入 | 按 spec 的 layout 字段改为原生形状图示（色块、卡片、箭头链、2×2 矩阵、流程框、格子图、进度三栏、六阶段时间轴）；图示文字由该页要点压缩得到 |
| 3 | — | 右栏“研究对象”卡片加入第 8 页同一张真实 GIS 线网底图（整图等比缩放，图注注明“真实 GIS 底图”），备注中说明 |
| 6 | hyp 溢出（需 5.09，有 4.25 英寸） | H1—H6 改为六个分色小框，压缩措辞，每框标注对应 RQ；假设栏加高到整栏 5.3 英寸，论文横条只占矩阵下方 |
| 7 | — | 技术路线图左对齐、按高度撑满，右侧文字区随实际图宽加宽；要点轻度压缩 |
| 8 | right 溢出（需 7.99，有 5.45 英寸） | 右栏拆为“真实可得的数据”“需要调查的数据”两张小表 + 灰底“观测口径”；“对照因子”“不纳入模型”两条移到底图下方；正文 13—14 磅 |
| 9 | right 溢出（需 3.95，有 3.9 英寸） | 插图左对齐，右栏加宽；要点压缩 |
| 11、13、16 | 13、16 页 right 溢出（需 5.0／5.32，有 4.15 英寸） | 插图左对齐，右栏加宽约 1.2 英寸；要点压缩为每条两行左右，关键数字橙色加粗；第 16 页分“固定层”“柔性层”两组 |
| 16 | 甘特图样例宽高比 3.0 | 按 layout_note 不放入页面，在讲稿备注中说明，答问时展示 |
| 18 | timeline 溢出（需 0.53，有 0.35 英寸） | 时间轴改为六段箭头链，月份标在箭头上方，阶段名放在箭头内；按进度着色（第 1—2 阶段黄色“进行中”，其余灰色“待开展”） |
| 6、9、15、18 | 标题在 28 磅下第二行只剩一两个字 | 标题降为 26.5—27 磅放成一行（不低于 26 磅） |
| 19、20 | 著录中的 [1]、[2026-09-30] 被当作文献编号做成上标 | 参考文献页关闭上标转换，编号悬挂缩进，9 磅（第 4 节下限） |
| 全部 | 两行标题在 28 磅下超出 1.06 英寸标题区 | 标题框上下内边距取 0，两行标题保持 28 磅（第 4 节要求 26—30 磅） |

所有页面压缩的文字均未改动数字、文献编号和“删失”“偏离预注册”“对照因子”等术语；完整原文以“完整要点：”写在每页备注末尾。模拟结果页（9、11、13、16）页脚和备注都保留 SYNTHETIC 说明，封面有同样说明。

## 需汇报人确认的事项

- 封面的“［姓名］”“［学院／专业］”“2026 年［月］”按 spec 保留为占位，请填入后再汇报。
- 第 18 页“进行中”一栏保留了 spec 中的“［请汇报人按实际情况确认］”，以及时间轴的着色，请按实际进度确认。
- 页面字体写的是“微软雅黑”（Windows 放映）；如在没有微软雅黑的电脑上放映，把 ppt/tools/pptkit.py 中的 FONT_EA 改为“思源黑体”后重新运行 build_ppt.py。
