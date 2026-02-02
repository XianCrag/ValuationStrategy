/**
 * AH股票配置
 * A股和H股同时上市的股票列表
 */

export interface AHStockPair {
    aCode: string; // A股代码
    hCode: string; // H股代码
    name: string; // 股票名称
    industry: string; // 行业
}

/**
 * AH股票列表
 * 数据来源：港交所和上交所/深交所
 * 更新时间：2026年2月
 */
export const AH_STOCKS: AHStockPair[] = [

    // 金融
    { aCode: '000166', hCode: '06806', name: '申万宏源', industry: '金融' },
    { aCode: '000776', hCode: '01776', name: '广发证券', industry: '金融' },
    { aCode: '002936', hCode: '06196', name: '郑州银行', industry: '金融' },
    { aCode: '002948', hCode: '03866', name: '青岛银行', industry: '金融' },
    { aCode: '600016', hCode: '01988', name: '民生银行', industry: '金融' },
    { aCode: '600030', hCode: '06030', name: '中信证券', industry: '金融' },
    { aCode: '600036', hCode: '03968', name: '招商银行', industry: '金融' },
    { aCode: '600958', hCode: '03958', name: '东方证券', industry: '金融' },
    { aCode: '600999', hCode: '06099', name: '招商证券', industry: '金融' },
    { aCode: '601066', hCode: '06066', name: '中信建投', industry: '金融' },
    { aCode: '601077', hCode: '03618', name: '渝农商行', industry: '金融' },
    { aCode: '601211', hCode: '02611', name: '国泰海通', industry: '金融' },
    { aCode: '601288', hCode: '01288', name: '农业银行', industry: '金融' },
    { aCode: '601318', hCode: '02318', name: '中国平安', industry: '金融' },
    { aCode: '601319', hCode: '01339', name: '中国人保', industry: '金融' },
    { aCode: '601328', hCode: '03328', name: '交通银行', industry: '金融' },
    { aCode: '601336', hCode: '01336', name: '新华保险', industry: '金融' },
    { aCode: '601375', hCode: '01375', name: '中原证券', industry: '金融' },
    { aCode: '601398', hCode: '01398', name: '工商银行', industry: '金融' },
    { aCode: '601456', hCode: '01456', name: '国联民生', industry: '金融' },
    { aCode: '601601', hCode: '02601', name: '中国太保', industry: '金融' },
    { aCode: '601628', hCode: '02628', name: '中国人寿', industry: '金融' },
    { aCode: '601658', hCode: '01658', name: '邮储银行', industry: '金融' },
    { aCode: '601688', hCode: '06886', name: '华泰证券', industry: '金融' },
    { aCode: '601788', hCode: '06178', name: '光大证券', industry: '金融' },
    { aCode: '601818', hCode: '06818', name: '光大银行', industry: '金融' },
    { aCode: '601916', hCode: '02016', name: '浙商银行', industry: '金融' },
    { aCode: '601939', hCode: '00939', name: '建设银行', industry: '金融' },
    { aCode: '601988', hCode: '03988', name: '中国银行', industry: '金融' },

    // 能源
    { aCode: '000898', hCode: '00347', name: '鞍钢股份', industry: '能源' },
    { aCode: '002202', hCode: '02208', name: '金风科技', industry: '能源' },
    { aCode: '002460', hCode: '01772', name: '赣锋锂业', industry: '能源' },
    { aCode: '002490', hCode: '00568', name: '山东墨龙', industry: '能源' },
    { aCode: '003816', hCode: '01816', name: '中国广核', industry: '能源' },
    { aCode: '600011', hCode: '00902', name: '华能国际', industry: '能源' },
    { aCode: '600027', hCode: '01071', name: '华电国际', industry: '能源' },
    { aCode: '600028', hCode: '00386', name: '中国石化', industry: '能源' },
    { aCode: '600188', hCode: '01171', name: '兖矿能源', industry: '能源' },
    { aCode: '600362', hCode: '00358', name: '江西铜业', industry: '能源' },
    { aCode: '600547', hCode: '01787', name: '山东黄金', industry: '能源' },
    { aCode: '600688', hCode: '00338', name: '上海石化', industry: '能源' },
    { aCode: '600808', hCode: '00323', name: '马鞍山钢铁', industry: '能源' },
    { aCode: '600871', hCode: '01033', name: '石化油服', industry: '能源' },
    { aCode: '600938', hCode: '00883', name: '中国海油', industry: '能源' },
    { aCode: '600956', hCode: '00956', name: '新天绿能', industry: '能源' },
    { aCode: '601005', hCode: '01053', name: '重庆钢铁', industry: '能源' },
    { aCode: '601068', hCode: '02068', name: '中铝国际', industry: '能源' },
    { aCode: '601088', hCode: '01088', name: '中国神华', industry: '能源' },
    { aCode: '601600', hCode: '02600', name: '中国铝业', industry: '能源' },
    { aCode: '601808', hCode: '02883', name: '中海油服', industry: '能源' },
    { aCode: '601857', hCode: '00857', name: '中国石油', industry: '能源' },
    { aCode: '601899', hCode: '02899', name: '紫金矿业', industry: '能源' },
    { aCode: '603993', hCode: '03993', name: '洛阳钼业', industry: '能源' },

    // 交通运输
    { aCode: '600012', hCode: '00995', name: '皖通高速', industry: '交通运输' },
    { aCode: '600026', hCode: '01138', name: '中远海能', industry: '交通运输' },
    { aCode: '600029', hCode: '01055', name: '南方航空', industry: '交通运输' },
    { aCode: '600115', hCode: '00670', name: '中国东航', industry: '交通运输' },
    { aCode: '600377', hCode: '00177', name: '宁沪高速', industry: '交通运输' },
    { aCode: '600548', hCode: '00548', name: '深高速', industry: '交通运输' },
    { aCode: '601107', hCode: '00107', name: '四川成渝', industry: '交通运输' },
    { aCode: '601111', hCode: '00753', name: '中国国航', industry: '交通运输' },
    { aCode: '601298', hCode: '06198', name: '青岛港', industry: '交通运输' },
    { aCode: '601326', hCode: '03369', name: '秦港股份', industry: '交通运输' },
    { aCode: '601333', hCode: '00525', name: '广深铁路', industry: '交通运输' },
    { aCode: '601598', hCode: '00598', name: '中国外运', industry: '交通运输' },
    { aCode: '601919', hCode: '01919', name: '中远海控', industry: '交通运输' },

    // 制造
    { aCode: '000039', hCode: '02039', name: '中集集团', industry: '制造' },
    { aCode: '000157', hCode: '01157', name: '中联重科', industry: '制造' },
    { aCode: '000338', hCode: '02338', name: '潍柴动力', industry: '制造' },
    { aCode: '000921', hCode: '00921', name: '海信家电', industry: '制造' },
    { aCode: '002594', hCode: '01211', name: '比亚迪', industry: '制造' },
    { aCode: '002672', hCode: '00895', name: '东江环保', industry: '制造' },
    { aCode: '002703', hCode: '01057', name: '浙江世宝', industry: '制造' },
    { aCode: '600660', hCode: '03606', name: '福耀玻璃', industry: '制造' },
    { aCode: '600685', hCode: '00317', name: '中船防务', industry: '制造' },
    { aCode: '600690', hCode: '06690', name: '海尔智家', industry: '制造' },
    { aCode: '600775', hCode: '00553', name: '南京熊猫', industry: '制造' },
    { aCode: '600860', hCode: '01872', name: '京城股份', industry: '制造' },
    { aCode: '600875', hCode: '01072', name: '东方电气', industry: '制造' },
    { aCode: '600876', hCode: '01108', name: '凯盛新能', industry: '制造' },
    { aCode: '601038', hCode: '00038', name: '一拖股份', industry: '制造' },
    { aCode: '601238', hCode: '02238', name: '广汽集团', industry: '制造' },
    { aCode: '601633', hCode: '02333', name: '长城汽车', industry: '制造' },
    { aCode: '601717', hCode: '00564', name: '中创智领', industry: '制造' },
    { aCode: '601727', hCode: '02727', name: '上海电气', industry: '制造' },
    { aCode: '601766', hCode: '01766', name: '中国中车', industry: '制造' },
    { aCode: '688981', hCode: '00981', name: '中芯国际', industry: '制造' },

    // 医药健康
    { aCode: '000513', hCode: '01513', name: '丽珠集团', industry: '医药' },
    { aCode: '000756', hCode: '00719', name: '新华制药', industry: '医药' },
    { aCode: '002399', hCode: '09989', name: '海普瑞', industry: '医药' },
    { aCode: '300347', hCode: '03347', name: '泰格医药', industry: '医药' },
    { aCode: '300759', hCode: '03759', name: '康龙化成', industry: '医药' },
    { aCode: '600196', hCode: '02196', name: '复星医药', industry: '医药' },
    { aCode: '600276', hCode: '01276', name: '恒瑞医药', industry: '医药' },
    { aCode: '600332', hCode: '00874', name: '白云山', industry: '医药' },
    { aCode: '601607', hCode: '02607', name: '上海医药', industry: '医药' },
    { aCode: '688180', hCode: '01877', name: '君实生物', industry: '医药' },

    // 消费品
    { aCode: '600600', hCode: '00168', name: '青岛啤酒', industry: '食品饮料' },
    { aCode: '601811', hCode: '00811', name: '新华文轩', industry: '食品饮料' },

    // 地产建筑
    { aCode: '000002', hCode: '02202', name: '万 科Ａ', industry: '地产建筑' },
    { aCode: '600585', hCode: '00914', name: '海螺水泥', industry: '地产建筑' },
    { aCode: '600635', hCode: '01635', name: '大众公用', industry: '地产建筑' },
    { aCode: '600874', hCode: '01065', name: '创业环保', industry: '地产建筑' },
    { aCode: '601186', hCode: '01186', name: '中国铁建', industry: '地产建筑' },
    { aCode: '601330', hCode: '01330', name: '绿色动力', industry: '地产建筑' },
    { aCode: '601390', hCode: '00390', name: '中国中铁', industry: '地产建筑' },
    { aCode: '601588', hCode: '00588', name: '北辰实业', industry: '地产建筑' },
    { aCode: '601618', hCode: '01618', name: '中国中冶', industry: '地产建筑' },
    { aCode: '601800', hCode: '01800', name: '中国交建', industry: '地产建筑' },

    // 电信
    { aCode: '000063', hCode: '00763', name: '中兴通讯', industry: '通信' },
    { aCode: '600941', hCode: '00941', name: '中国移动', industry: '通信' },
    { aCode: '601728', hCode: '00728', name: '中国电信', industry: '通信' },

];

/**
 * 按行业分组的AH股票
 */
export const AH_STOCKS_BY_INDUSTRY = AH_STOCKS.reduce((acc, stock) => {
    if (!acc[stock.industry]) {
        acc[stock.industry] = [];
    }
    acc[stock.industry].push(stock);
    return acc;
}, {} as Record<string, AHStockPair[]>);

/**
 * 获取所有行业列表
 */
export const AH_INDUSTRIES = Object.keys(AH_STOCKS_BY_INDUSTRY).sort();

/**
 * 根据A股代码查找股票对
 */
export function findByACode(aCode: string): AHStockPair | undefined {
    return AH_STOCKS.find(stock => stock.aCode === aCode);
}

/**
 * 根据H股代码查找股票对
 */
export function findByHCode(hCode: string): AHStockPair | undefined {
    return AH_STOCKS.find(stock => stock.hCode === hCode);
}

/**
 * 根据股票名称查找股票对
 */
export function findByName(name: string): AHStockPair | undefined {
    return AH_STOCKS.find(stock => stock.name === name);
}

