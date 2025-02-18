import { writeFile } from 'node:fs/promises';

const shapeIndex = {
  'interactive-discover-1': {
    v0: {
      n_results: 6,
      n_http_requests: 87,
      execution_time: {
        average: 4499.062177999997,
        min: 4206.713386000003,
        max: 4743.2906229999935,
        std: 213.18487982018038,
      },
    },
    v1: {
      n_results: 4,
      n_http_requests: 15,
      execution_time: {
        average: 333.75085090000067,
        min: 323.1522590000095,
        max: 350.54739999999583,
        std: 10.437087409521174,
      },
    },
    v2: {
      n_results: 1,
      n_http_requests: 18,
      execution_time: {
        average: 291.7934536000001,
        min: 281.418875000003,
        max: 301.56722399999853,
        std: 8.347144393901988,
      },
    },
    v3: {
      n_results: 14,
      n_http_requests: 33,
      execution_time: {
        average: 710.100213699996,
        min: 682.694811999987,
        max: 766.8527800000011,
        std: 24.375007453674286,
      },
    },
    v4: {
      n_results: 8,
      n_http_requests: 75,
      execution_time: {
        average: 4184.7315355,
        min: 3983.2554579999996,
        max: 4518.312082999997,
        std: 208.5132528315359,
      },
    },
  },
  'interactive-discover-2': {
    v0: {
      n_results: 66,
      n_http_requests: 127,
      execution_time: {
        average: 6028.928554599996,
        min: 5520.564064999999,
        max: 6456.99674599999,
        std: 337.59397999784136,
      },
    },
    v1: {
      n_results: 4,
      n_http_requests: 15,
      execution_time: {
        average: 356.2466329999996,
        min: 340.2409779999871,
        max: 377.3756480000011,
        std: 11.711965299848798,
      },
    },
    v2: {
      n_results: 32,
      n_http_requests: 19,
      execution_time: {
        average: 766.999689699999,
        min: 740.8096439999936,
        max: 833.8124709999975,
        std: 23.967596727219224,
      },
    },
    v3: {
      n_results: 198,
      n_http_requests: 218,
      execution_time: {
        average: 5743.435510400001,
        min: 5178.987410999995,
        max: 6096.800857000009,
        std: 324.3350179999544,
      },
    },
    v4: {
      n_results: 98,
      n_http_requests: 122,
      execution_time: {
        average: 6181.336903999998,
        min: 5511.397389999998,
        max: 6938.877867999996,
        std: 385.65655945205515,
      },
    },
  },
  'interactive-discover-3': {
    v0: {
      n_results: 71,
      n_http_requests: 253,
      execution_time: {
        average: 4034.7478462000013,
        min: 3658.812346000006,
        max: 5001.750620000006,
        std: 411.0646383437707,
      },
    },
    v1: {
      n_results: 22,
      n_http_requests: 98,
      execution_time: {
        average: 1230.9726217999996,
        min: 1038.8153029999958,
        max: 1337.4739039999986,
        std: 89.4925524714889,
      },
    },
    v2: {
      n_results: 55,
      n_http_requests: 103,
      execution_time: {
        average: 1712.5443419000003,
        min: 1483.2107300000062,
        max: 1913.7711859999981,
        std: 152.18064541093145,
      },
    },
    v3: {
      n_results: 203,
      n_http_requests: 424,
      execution_time: {
        average: 6115.364954999997,
        min: 5680.481372999988,
        max: 7013.195606999987,
        std: 345.66846859396804,
      },
    },
    v4: {
      n_results: 142,
      n_http_requests: 273,
      execution_time: {
        average: 4931.463786899998,
        min: 3871.0207200000004,
        max: 6168.4258319999935,
        std: 619.8991286977687,
      },
    },
  },
  'interactive-discover-4': {
    v0: {
      n_results: 5,
      n_http_requests: 62,
      execution_time: {
        average: 1320.8585819,
        min: 1216.0144029999938,
        max: 1383.176827999996,
        std: 49.88523618335488,
      },
    },
    v1: {
      n_results: 3,
      n_http_requests: 43,
      execution_time: {
        average: 1160.2578544000019,
        min: 1110.3205949999974,
        max: 1206.2995599999995,
        std: 38.2741512038555,
      },
    },
    v2: {
      n_results: 3,
      n_http_requests: 21,
      execution_time: {
        average: 659.581104999999,
        min: 622.0060060000105,
        max: 708.7506159999903,
        std: 25.99783919465799,
      },
    },
    v3: {
      n_results: 3,
      n_http_requests: 205,
      execution_time: {
        average: 4226.2524175,
        min: 3889.8095480000047,
        max: 4641.440504999991,
        std: 246.58652100829147,
      },
    },
    v4: {
      n_results: 7,
      n_http_requests: 71,
      execution_time: {
        average: 1676.7631461000012,
        min: 1575.8897930000094,
        max: 1819.7372990000003,
        std: 93.932407931302,
      },
    },
  },
  'interactive-discover-5': {
    v0: {
      n_results: 15,
      n_http_requests: 127,
      execution_time: {
        average: 2922.8263539999984,
        min: 2401.280025,
        max: 3356.7060400000046,
        std: 397.98355109475204,
      },
    },
    v1: {
      n_results: 1,
      n_http_requests: 15,
      execution_time: {
        average: 283.93816389999995,
        min: 274.1523349999916,
        max: 319.7649620000011,
        std: 15.57558203845664,
      },
    },
    v2: {
      n_results: 3,
      n_http_requests: 19,
      execution_time: {
        average: 377.39246889999924,
        min: 356.0025959999912,
        max: 409.6018069999991,
        std: 16.879503597371897,
      },
    },
    v3: {
      n_results: 4,
      n_http_requests: 218,
      execution_time: {
        average: 3299.188266800002,
        min: 3116.923868999991,
        max: 3431.4953160000005,
        std: 122.77991466366687,
      },
    },
    v4: {
      n_results: 20,
      n_http_requests: 122,
      execution_time: {
        average: 3019.0372621,
        min: 2375.057798000009,
        max: 3348.126759000006,
        std: 394.66016329293296,
      },
    },
  },
  'interactive-discover-6': {
    v0: {
      timeout: 120000,
    },
    v1: {
      n_results: 1,
      n_http_requests: 39,
      execution_time: {
        average: 1133.2371794000005,
        min: 1046.2626759999985,
        max: 1173.7041180000087,
        std: 41.80634981091017,
      },
    },
    v2: {
      n_results: 1,
      n_http_requests: 27,
      execution_time: {
        average: 781.2670681000003,
        min: 746.639439000006,
        max: 802.8524139999936,
        std: 18.031442507513987,
      },
    },
    v3: {
      timeout: 120000,
    },
    v4: {
      n_results: 27,
      n_http_requests: 133,
      execution_time: {
        average: 6476.219508899999,
        min: 6229.867211999997,
        max: 6844.411198000002,
        std: 192.4515811094605,
      },
    },
  },
  'interactive-discover-7': {
    v0: {
      timeout: 120000,
    },
    v1: {
      n_results: 1,
      n_http_requests: 39,
      execution_time: {
        average: 1144.8612609000018,
        min: 1072.7116020000103,
        max: 1195.7470230000035,
        std: 41.4492492895286,
      },
    },
    v2: {
      n_results: 1,
      n_http_requests: 27,
      execution_time: {
        average: 788.3000204999989,
        min: 759.3048489999928,
        max: 818.8727369999979,
        std: 24.703510447805186,
      },
    },
    v3: {
      timeout: 120000,
    },
    v4: {
      n_results: 1,
      n_http_requests: 133,
      execution_time: {
        average: 6305.561871099999,
        min: 5801.4142710000015,
        max: 6877.360501999996,
        std: 258.7470727461676,
      },
    },
  },
  'interactive-discover-8': {
    v0: {
      timeout: 120000,
    },
    v1: {
      timeout: 120000,
    },
    v2: {
      n_results: 10,
      n_http_requests: 1901,
      execution_time: {
        average: 1580.462954400001,
        min: 1478.2657029999973,
        max: 1759.4375759999966,
        std: 91.72807515929227,
      },
    },
    v3: {
      timeout: 120000,
    },
    v4: {
      timeout: 120000,
    },
  },
  'interactive-short-1': {
    v0: {
      n_results: 1,
      n_http_requests: 17,
      execution_time: {
        average: 337.57011499999936,
        min: 327.3293010000052,
        max: 347.6341689999972,
        std: 7.9298756311455785,
      },
    },
    v1: {
      n_results: 1,
      n_http_requests: 14,
      execution_time: {
        average: 302.79238729999923,
        min: 294.961095000006,
        max: 309.63921599999594,
        std: 7.622718244047545,
      },
    },
    v2: {
      n_results: 1,
      n_http_requests: 17,
      execution_time: {
        average: 321.31740540000027,
        min: 308.70820999999705,
        max: 353.1806119999965,
        std: 11.591958842831025,
      },
    },
    v3: {
      n_results: 1,
      n_http_requests: 17,
      execution_time: {
        average: 338.1419457999975,
        min: 328.6179099999863,
        max: 371.26148299999477,
        std: 13.84893209698056,
      },
    },
    v4: {
      n_results: 1,
      n_http_requests: 17,
      execution_time: {
        average: 324.9940737999976,
        min: 319.2935509999952,
        max: 335.01215399999637,
        std: 7.470557592951652,
      },
    },
  },
  'interactive-short-2': {
    v0: {
      timeout: 120000,
    },
    v1: {
      n_results: 4,
      n_http_requests: 16,
      execution_time: {
        average: 831.8149876000025,
        min: 792.7559980000078,
        max: 860.4899949999963,
        std: 23.83862543293793,
      },
    },
    v2: {
      timeout: 120000,
    },
    v3: {
      timeout: 120000,
    },
    v4: {
      timeout: 120000,
    },
  },
  'interactive-short-3': {
    v0: {
      timeout: 120000,
    },
    v1: {
      timeout: 120000,
    },
    v2: {
      timeout: 120000,
    },
    v3: {
      timeout: 120000,
    },
    v4: {
      timeout: 120000,
    },
  },
  'interactive-short-4': {
    v0: {
      n_results: 1,
      n_http_requests: 16,
      execution_time: {
        average: 697.979331400001,
        min: 657.3970669999981,
        max: 742.1912239999947,
        std: 30.873480683855192,
      },
    },
    v1: {
      n_results: 1,
      n_http_requests: 16,
      execution_time: {
        average: 769.8003310999978,
        min: 727.2976039999921,
        max: 821.8690410000127,
        std: 33.3642908152384,
      },
    },
    v2: {
      n_results: 1,
      n_http_requests: 17,
      execution_time: {
        average: 254.2385518999974,
        min: 249.65455599999405,
        max: 261.274379999988,
        std: 6.585459277003698,
      },
    },
    v3: {
      n_results: 1,
      n_http_requests: 17,
      execution_time: {
        average: 273.01489470000377,
        min: 265.3204320000077,
        max: 289.35242700000526,
        std: 9.670230147612775,
      },
    },
    v4: {
      n_results: 1,
      n_http_requests: 16,
      execution_time: {
        average: 616.8248053000003,
        min: 582.032487000004,
        max: 661.4355660000001,
        std: 26.677409056781634,
      },
    },
  },
  'interactive-short-5': {
    v0: {
      n_results: 1,
      n_http_requests: 18,
      execution_time: {
        average: 561.5885690999988,
        min: 530.2697359999875,
        max: 597.4140360000019,
        std: 23.378627147058364,
      },
    },
    v1: {
      n_results: 1,
      n_http_requests: 16,
      execution_time: {
        average: 838.5288444999999,
        min: 791.5788969999994,
        max: 870.1819090000063,
        std: 28.627229020529867,
      },
    },
    v2: {
      n_results: 1,
      n_http_requests: 16,
      execution_time: {
        average: 1835.0604460999966,
        min: 1666.874060000002,
        max: 1946.0230620000075,
        std: 85.72059120354558,
      },
    },
    v3: {
      n_results: 1,
      n_http_requests: 19,
      execution_time: {
        average: 366.545289,
        min: 353.48345600000175,
        max: 384.99646100000245,
        std: 10.795060928074882,
      },
    },
    v4: {
      n_results: 1,
      n_http_requests: 50,
      execution_time: {
        average: 977.0323483000029,
        min: 928.6755869999906,
        max: 1077.278277999998,
        std: 52.52236483405065,
      },
    },
  },
  'interactive-short-6': {
    v0: {
      timeout: 120000,
    },
    v1: {
      timeout: 120000,
    },
    v2: {
      timeout: 120000,
    },
    v3: {
      timeout: 120000,
    },
    v4: {
      timeout: 120000,
    },
  },
  'interactive-short-7': {
    v0: {
      timeout: 120000,
    },
    v1: {
      timeout: 120000,
    },
    v2: {
      timeout: 120000,
    },
    v3: {
      n_results: 0,
      n_http_requests: 1027,
      execution_time: {
        average: 9526.760115500005,
        min: 9324.807921,
        max: 9658.11144600001,
        std: 107.30177715535609,
      },
    },
    v4: {
      timeout: 120000,
    },
  },
};

const typeIndex = {
  'interactive-discover-1': {
    v0: {
      n_results: 6,
      n_http_requests: 134,
      execution_time: {
        average: 5675.264234099998,
        min: 5248.302041999996,
        max: 6329.934404,
        std: 299.3218753860877,
      },
    },
    v1: {
      n_results: 4,
      n_http_requests: 25,
      execution_time: {
        average: 1107.4634537000006,
        min: 1026.1184829999984,
        max: 1187.9646150000044,
        std: 56.41529429277495,
      },
    },
    v2: {
      n_results: 1,
      n_http_requests: 23,
      execution_time: {
        average: 929.0551242999994,
        min: 845.9321269999928,
        max: 1021.8935999999958,
        std: 53.16519654158677,
      },
    },
    v3: {
      n_results: 14,
      n_http_requests: 230,
      execution_time: {
        average: 4651.955885999998,
        min: 4223.444168999995,
        max: 5523.250394000002,
        std: 294.2525520118365,
      },
    },
    v4: {
      n_results: 8,
      n_http_requests: 129,
      execution_time: {
        average: 5701.891546399997,
        min: 5306.5767100000085,
        max: 6142.874658999994,
        std: 306.7739276842663,
      },
    },
  },
  'interactive-discover-2': {
    v0: {
      n_results: 66,
      n_http_requests: 134,
      execution_time: {
        average: 6066.238386499998,
        min: 5665.700106000004,
        max: 6653.9661449999985,
        std: 291.6402849554551,
      },
    },
    v1: {
      n_results: 46,
      n_http_requests: 25,
      execution_time: {
        average: 1249.4415502000018,
        min: 1179.5140189999947,
        max: 1362.8434719999932,
        std: 70.78368301540806,
      },
    },
    v2: {
      n_results: 32,
      n_http_requests: 23,
      execution_time: {
        average: 1054.1121953999987,
        min: 949.1071389999997,
        max: 1091.889221999998,
        std: 21.564411519705487,
      },
    },
    v3: {
      n_results: 198,
      n_http_requests: 230,
      execution_time: {
        average: 5209.845036900001,
        min: 4740.659033000004,
        max: 6637.892453000008,
        std: 561.6599995890044,
      },
    },
    v4: {
      n_results: 98,
      n_http_requests: 129,
      execution_time: {
        average: 6207.042991500001,
        min: 5927.076415999996,
        max: 6568.495475999996,
        std: 240.6429593727041,
      },
    },
  },
  'interactive-discover-3': {
    v0: {
      n_results: 71,
      n_http_requests: 260,
      execution_time: {
        average: 4201.7360411,
        min: 3732.2023990000016,
        max: 4578.325061999989,
        std: 280.2170263111755,
      },
    },
    v1: {
      n_results: 67,
      n_http_requests: 153,
      execution_time: {
        average: 2530.8046609,
        min: 2010.2701229999948,
        max: 3175.201780000003,
        std: 330.63524773932795,
      },
    },
    v2: {
      n_results: 55,
      n_http_requests: 107,
      execution_time: {
        average: 1764.9237748999992,
        min: 1580.9163470000058,
        max: 1988.1829339999967,
        std: 136.0976343329302,
      },
    },
    v3: {
      n_results: 203,
      n_http_requests: 436,
      execution_time: {
        average: 4961.432673999998,
        min: 4760.759775999992,
        max: 5164.713524999999,
        std: 125.3413064383309,
      },
    },
    v4: {
      n_results: 142,
      n_http_requests: 280,
      execution_time: {
        average: 5214.1837913,
        min: 4681.4896080000035,
        max: 5733.439378999989,
        std: 340.6713063720998,
      },
    },
  },
  'interactive-discover-4': {
    v0: {
      n_results: 5,
      n_http_requests: 150,
      execution_time: {
        average: 4750.844520600001,
        min: 4384.114773000008,
        max: 4996.091950999995,
        std: 188.269850035377,
      },
    },
    v1: {
      n_results: 3,
      n_http_requests: 29,
      execution_time: {
        average: 1043.567922999998,
        min: 938.6343990000023,
        max: 1107.9906770000089,
        std: 56.46553884420579,
      },
    },
    v2: {
      n_results: 3,
      n_http_requests: 27,
      execution_time: {
        average: 904.5904215000016,
        min: 834.4273759999924,
        max: 963.5748299999977,
        std: 41.18591981936077,
      },
    },
    v3: {
      n_results: 3,
      n_http_requests: 235,
      execution_time: {
        average: 3980.9098048999963,
        min: 3592.5278049999906,
        max: 4490.472641999993,
        std: 262.2336380672975,
      },
    },
    v4: {
      n_results: 7,
      n_http_requests: 149,
      execution_time: {
        average: 5209.210810899998,
        min: 4531.5244079999975,
        max: 5563.263561999993,
        std: 295.18369864436073,
      },
    },
  },
  'interactive-discover-5': {
    v0: {
      n_results: 15,
      n_http_requests: 134,
      execution_time: {
        average: 2924.939224599996,
        min: 2351.9595319999935,
        max: 3372.7388109999883,
        std: 348.1422823038002,
      },
    },
    v1: {
      n_results: 3,
      n_http_requests: 25,
      execution_time: {
        average: 595.170775000003,
        min: 563.8862800000061,
        max: 655.5282129999978,
        std: 27.656929068053238,
      },
    },
    v2: {
      n_results: 3,
      n_http_requests: 23,
      execution_time: {
        average: 503.437361000001,
        min: 485.071437000006,
        max: 529.0153469999932,
        std: 15.32560712783588,
      },
    },
    v3: {
      n_results: 4,
      n_http_requests: 230,
      execution_time: {
        average: 2784.4517054999988,
        min: 2551.262229999993,
        max: 2947.847557000001,
        std: 120.75653678988502,
      },
    },
    v4: {
      n_results: 20,
      n_http_requests: 129,
      execution_time: {
        average: 2785.959690300001,
        min: 2429.1941499999957,
        max: 3519.5444140000036,
        std: 416.5683155961713,
      },
    },
  },
  'interactive-discover-6': {
    v0: {
      timeout: 120000,
    },
    v1: {
      n_results: 1,
      n_http_requests: 25,
      execution_time: {
        average: 998.6852788999968,
        min: 930.9937459999928,
        max: 1044.6414550000045,
        std: 38.994964372383826,
      },
    },
    v2: {
      n_results: 1,
      n_http_requests: 23,
      execution_time: {
        average: 777.2921880000024,
        min: 738.0730579999945,
        max: 834.5739489999978,
        std: 37.45092467577482,
      },
    },
    v3: {
      timeout: 120000,
    },
    v4: {
      n_results: 27,
      n_http_requests: 129,
      execution_time: {
        average: 6106.892981,
        min: 5763.360743000012,
        max: 6593.113889,
        std: 299.3368363175942,
      },
    },
  },
  'interactive-discover-7': {
    v0: {
      timeout: 120000,
    },
    v1: {
      n_results: 1,
      n_http_requests: 25,
      execution_time: {
        average: 1015.3283257999981,
        min: 926.7954249999893,
        max: 1087.9372890000086,
        std: 56.51312209693922,
      },
    },
    v2: {
      n_results: 1,
      n_http_requests: 23,
      execution_time: {
        average: 798.2276110000006,
        min: 743.2723870000045,
        max: 834.9553920000035,
        std: 37.89336325128937,
      },
    },
    v3: {
      timeout: 120000,
    },
    v4: {
      n_results: 1,
      n_http_requests: 129,
      execution_time: {
        average: 6139.783166300001,
        min: 5824.175485999993,
        max: 6721.906512999994,
        std: 294.82506824096595,
      },
    },
  },
  'interactive-discover-8': {
    v0: {
      timeout: 120000,
    },
    v1: {
      timeout: 120000,
    },
    v2: {
      timeout: 120000,
    },
    v3: {
      timeout: 120000,
    },
    v4: {
      timeout: 120000,
    },
  },
  'interactive-short-1': {
    v0: {
      n_results: 1,
      n_http_requests: 135,
      execution_time: {
        average: 1663.2364164999992,
        min: 1500.613280999998,
        max: 1910.899126000004,
        std: 116.82578693529499,
      },
    },
    v1: {
      n_results: 1,
      n_http_requests: 26,
      execution_time: {
        average: 576.4014102999979,
        min: 550.9462700000004,
        max: 629.1290319999971,
        std: 25.567258558504356,
      },
    },
    v2: {
      n_results: 1,
      n_http_requests: 24,
      execution_time: {
        average: 530.6505922000011,
        min: 495.94818099999975,
        max: 589.5760900000023,
        std: 26.820811191471083,
      },
    },
    v3: {
      n_results: 1,
      n_http_requests: 231,
      execution_time: {
        average: 2425.710852999998,
        min: 2319.291096000001,
        max: 2547.108303000001,
        std: 70.88530171337953,
      },
    },
    v4: {
      n_results: 1,
      n_http_requests: 130,
      execution_time: {
        average: 1608.2594011000008,
        min: 1459.5003940000024,
        max: 1886.153019999998,
        std: 134.39072273988697,
      },
    },
  },
  'interactive-short-2': {
    v0: {
      timeout: 120000,
    },
    v1: {
      timeout: 120000,
    },
    v2: {
      timeout: 120000,
    },
    v3: {
      timeout: 120000,
    },
    v4: {
      timeout: 120000,
    },
  },
  'interactive-short-3': {
    v0: {
      timeout: 120000,
    },
    v1: {
      timeout: 120000,
    },
    v2: {
      timeout: 120000,
    },
    v3: {
      timeout: 120000,
    },
    v4: {
      timeout: 120000,
    },
  },
  'interactive-short-4': {
    v0: {
      n_results: 1,
      n_http_requests: 1,
      execution_time: {
        average: 516.2157334000003,
        min: 484.5557620000036,
        max: 567.2262699999992,
        std: 28.455312532324786,
      },
    },
    v1: {
      n_results: 1,
      n_http_requests: 1,
      execution_time: {
        average: 599.5273430000001,
        min: 549.6607299999887,
        max: 654.9583039999998,
        std: 30.4787366558755,
      },
    },
    v2: {
      n_results: 1,
      n_http_requests: 2,
      execution_time: {
        average: 91.78291900000185,
        min: 89.14365500000713,
        max: 93.90452799999912,
        std: 3.5798497719506988,
      },
    },
    v3: {
      n_results: 1,
      n_http_requests: 2,
      execution_time: {
        average: 108.70167010000151,
        min: 106.87250500000664,
        max: 113.13502499999595,
        std: 3.6634099931745183,
      },
    },
    v4: {
      n_results: 1,
      n_http_requests: 1,
      execution_time: {
        average: 443.86237950000213,
        min: 414.36278100000345,
        max: 463.3423080000066,
        std: 17.11576297211743,
      },
    },
  },
  'interactive-short-5': {
    v0: {
      n_results: 1,
      n_http_requests: 47,
      execution_time: {
        average: 916.9818681000004,
        min: 871.4273669999966,
        max: 994.5311740000034,
        std: 35.407031460535975,
      },
    },
    v1: {
      n_results: 1,
      n_http_requests: 45,
      execution_time: {
        average: 1124.8776485999988,
        min: 1047.6337619999977,
        max: 1204.8987900000066,
        std: 54.14811027205541,
      },
    },
    v2: {
      n_results: 1,
      n_http_requests: 109,
      execution_time: {
        average: 3146.248375399996,
        min: 2930.9423099999985,
        max: 3315.1172910000023,
        std: 139.36564367417833,
      },
    },
    v3: {
      n_results: 1,
      n_http_requests: 45,
      execution_time: {
        average: 728.1505844,
        min: 698.1264470000024,
        max: 803.3442829999985,
        std: 19.48175329226439,
      },
    },
    v4: {
      n_results: 1,
      n_http_requests: 60,
      execution_time: {
        average: 1444.9442203000028,
        min: 1381.699593000012,
        max: 1547.8461050000042,
        std: 34.0902599505408,
      },
    },
  },
  'interactive-short-6': {
    v0: {
      timeout: 120000,
    },
    v1: {
      timeout: 120000,
    },
    v2: {
      timeout: 120000,
    },
    v3: {
      timeout: 120000,
    },
    v4: {
      timeout: 120000,
    },
  },
  'interactive-short-7': {
    v0: {
      timeout: 120000,
    },
    v1: {
      timeout: 120000,
    },
    v2: {
      timeout: 120000,
    },
    v3: {
      timeout: 120000,
    },
    v4: {
      timeout: 120000,
    },
  },
};

const resp = {};
for (const [ queryTemplate, versions ] of Object.entries(typeIndex)) {
  resp[queryTemplate] = {};
  for (const [ version, results ] of Object.entries(versions)) {
    const shapeIndexResult = shapeIndex[queryTemplate][version];
    if (shapeIndexResult.n_results !== results.n_results) {
      resp[queryTemplate][version] = {
        done: false,
        n_results: results.n_results,
      };
    }
  }
}

await writeFile('./problems.json', JSON.stringify(resp, null, 2));
console.log(resp);
