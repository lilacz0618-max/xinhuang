# PPT 自检报告

- 文件：`新晃城乡公交研究进展汇报.pptx`
- 页数：20
- 结论：**通过**（未通过 0 项，提醒 0 项）

## 逐页记录

| 页 | 版式 | 数字键 | 页面文献编号 | 最小字号 | 模拟页 |
|---|---|---|---|---|---|
| 1 | cover | — | — | 11.0 |  |
| 2 | toc | — | — | 10.0 |  |
| 3 | two_col | — | 1,2,3,4,5,6,7,8 | 10.0 |  |
| 4 | banner_cards3 | — | 9,10,11,12,13 | 10.0 |  |
| 5 | chain_gaps | — | 14,15,16,17,18,19,20,21,22 | 10.0 |  |
| 6 | rq_matrix | — | — | 10.0 |  |
| 7 | fig_left_tags | — | 23,24,25 | 10.0 |  |
| 8 | fig_left55 | — | 15,26,27,28 | 10.0 |  |
| 9 | fig_left60_numbers | sim_days,sim_nobs,sim_full,sim_extra,sv_total,sim_r2,sv_sum,sv_win,sv_hh,sv_on,fwt_cnb_tod,fwt_true_tod,fwd_cnb_mkt,fwd_cnb_wx,fc_lgb_cen_under,fc_hyb_cen_under,fxd_opt_trips,fx_opt_all_red,fxg_main_all,fxg_main_he,fxg_main_sf | — | 10.0 | Y |
| 10 | flow_formula | — | 29,30,31,32,33 | 10.0 |  |
| 11 | fig_left60_hyp | fwt_cnb_tod,fwt_cnb_tod_lo,fwt_cnb_tod_hi,fwt_true_tod,fwd_cnb_sf,fwd_cnb_hol,fwd_cnb_mkt,fwd_cnb_wx,fe_cnb_mae,fe_grey_mae,fe_shap_mae,fe_ent_mae,fe_ent_rho,fe_grey_rho | 15 | 10.0 | Y |
| 12 | flow3_two_col | — | 34,35,36,37,38,39 | 10.0 |  |
| 13 | fig_left60_hyp | fc_hyb_all_wape,fc_snaive_all_wape,fc_cnb_all_wape,fc_lgb_all_wape,fc_imp_all_wape,dm_m_lgb_abs_p,fc_lgb_cen_under,fc_hyb_cen_under,cv_mon_sf,cv_glo_sf,cv_mon_nd,cv_mon_wx | — | 10.0 | Y |
| 14 | two_col_formula | — | 40,41,42,43,44,45,46 | 10.0 |  |
| 15 | two_col_formula | — | 20,22,47,48,49,50 | 10.0 |  |
| 16 | fig_left60_hyp | fx_cur_all_trips,fx_opt_all_trips,fxd_opt_trips,fxd_opt_vkm,fx_cur_all_srv,fx_opt_all_srv,fx_opt_all_red,fx_wait_change,fx_cur_all_full,fx_opt_all_full,fx_main_all_red,fxg_main_all,fxg_main_he,fxg_main_sf,fxg_main_nd,voi_main,voi_imp,fx_orac_all_red | — | 10.0 | Y |
| 17 | cards3_roadmap | — | 3,17,20 | 10.0 |  |
| 18 | progress | — | — | 10.0 |  |
| 19 | refs | — | — | 9.0 |  |
| 20 | refs | — | — | 9.0 |  |

## 未通过项

- 无

## 提醒项

- 无

## 第四轮修改与检查记录

底稿为第一轮 20 页版本（汇报人上传的 PDF），版式与配色不变，页数仍为 20 页。

| 页 | 修改 |
|---|---|
| 2 | 第六部分改名为“创新点、政策对接与研究进度” |
| 3 | “政策要求”加入《综合交通枢纽发展“十五五”规划》（运行时刻对接、客流高峰期预警、适老化），新增文献 [3] |
| 6 | 研究问题与假设改为通俗表述（“客流由什么决定／明天每班有多少人／固定班车怎么排／机动车怎么派”），H1—H6 改为大白话；第一轮技术表述移入备注 |
| 7 | 不再贴技术路线图，改为原生形状六步流程（准备数据 → 找规律 → 做预测 → 排固定班 → 派机动车 → 统一评价），每步写明“得到什么”；预注册等三条规则改为通俗说明 |
| 9 | 新增模拟系统的四步做法（生成需求、锚定总量、模拟乘车、生成观测）与 RQ1—RQ4 计算结果摘要；插图改用单面板 `fig_slide/图_模拟数据核对_a.png` |
| 10、12、14、15 | 四个模型页改为通俗版式：“通俗地说”通栏 + 三步流程（输入／怎么算／得到）+“为什么这样做、和常用方法比”；公式和第一轮技术表述移入备注 |
| 17 | 下半部分由“成果路线图”改为与“十五五”规划的四项对接（论文规划仍见第 6 页底部及备注） |
| 18 | “待确认事项”加入“十五五”规划相关的补强方向 |
| 19—20 | 新增“十五五”规划为 [3]，原 [3]—[49] 顺延为 [4]—[50]；全部页面的文献编号同步更新 |

- 文献编号：页面文字按第一轮编号书写，写入幻灯片时统一映射为新编号；参考文献页按新编号排列。
- 第 11、13、16 页（结果页）及其他页面内容未改。
- 数字全部来自 `tab/numbers.json`；第 9 页新增的数字键已写入 spec 并通过自检。
- 预览：LibreOffice 导出 PDF 逐页查看；`quick_render.py` 问题 0 个；拟合日志无溢出。第 9 页曾有两处文字框过紧（第一步说明、“真实数据到位后”），已调整框高与图宽。
