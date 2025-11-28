<!-- AI 不修改这个文件 -->
# Lixinger API 接口文档

## 股票 - non_financial
* url: https://open.lixinger.com/api/cn/company/fundamental/

## 指数 
* url: https://open.lixinger.com/api/cn/index/fundamental

## 基金
* url: https://open.lixinger.com/api/cn/fund/net-value-of-dividend-reinvestment

## 国债
* url: https://open.lixinger.com/api/macro/national-debt




# Index metricsList: 说明
-----------------------
指标列表。例如：['mc', 'pe_ttm.ew', 'pe_ttm.y10.ew.cvpos’]。
需要注意的是，共有三种形式的指标格式：
[metricsName].[granularity].[metricsType].[statisticsDataType]: 支持指标有 pe_ttm, pb, ps_ttm
[metricsName].[metricsType]: 支持指标有 dyr(股息率), pe_ttm, pb, ps_ttm
[metricsName] : 被剩余的指标支持，如 , mc(市值), tv(成交量), ta(成交金额) , cp(收盘点位) , cpc(涨跌幅) , r_cp(全收益收盘点位) , r_cpc(全收益收盘点位涨跌幅)
当前支持:
metricsName
PE-TTM :pe_ttm
PB :pb
PS-TTM :ps_ttm
股息率 :dyr
成交量 :tv
成交金额 :ta
换手率 :to_r
收盘点位 :cp
涨跌幅 :cpc
指数点位振幅 :cpa
全收益收盘点位 :r_cp
全收益收盘点位涨跌幅 :r_cpc
市值 :mc
A股市值 :mc_om
流通市值 :cmc
自由流通市值 :ecmc
融资买入金额 :fpa
融资偿还金额 :fra
融资净买入金额 :fnpa
融资余额 :fb
融券卖出金额 :ssa
融券偿还金额 :sra
融券净卖出金额 :snsa
融券余额 :sb
陆股通持仓金额 :ha_shm
陆股通净买入金额 :mm_nba
A股场内基金资产规模 :fet_as_ma
A股场内基金认购净流入 :fet_snif_ma
发布时间 :launchDate
granularity
上市以来 :fs
20年 :y20
10年 :y10
5年 :y5
3年 :y3
1年 :y1
metricsType
市值加权 :mcw
等权 :ew
正数等权 :ewpvo
平均值 :avg
中位数 :median
statisticsDataType
当前值 :cv
分位点% :cvpos
最小值 :minv
最大值 :maxv
最大正值 :maxpv
50%分位点值 :q5v
80%分位点值 :q8v
20%分位点值 :q2v
平均值 :avgv